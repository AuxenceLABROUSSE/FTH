/* FTH reporting core: the calculation engine shared by the client portal (/ifrs-tool) and the
   specialist workspace (/workspace). No DOM, no network: pure functions over plain data, so the
   same file runs in the browser and in Node (tools/test-platform.mjs).

   Data flow
     ОСВ grid ──parseSheet──▶ tb {company, period, rows[code, oD, oC, tD, tC, cD, cC]}
     tb + mapping overrides + journals ──compute──▶ result (accounts, lines, statements, checks)
     result ──snapshot──▶ the numbers released to a client (no working data)

   Accounting rules
   - net = debit - credit; class 0 (off-balance) ignored;
   - a parent account (10) is used only when none of its sub-accounts carries an amount;
   - category of an account: manual override, else the account in the mapping, else its longest
     prefix of at least 2 characters that has a category;
   - balance sheet from classes 1-6 (assets +net, equity and liabilities -net);
   - the result not yet closed to retained earnings, -(class 7-9 balances), is added to
     retained earnings;
   - P&L from class 7-9 period movements, 79 excluded. When the TB was closed through 79 during
     the period (net movement ~0), the P&L is rebuilt from the natural side of the turnovers and
     reconciled to the movement of retained earnings (44): the gap is reported, never hidden;
   - journals (reclassifications, IFRS adjustments) post on IFRS categories, never on chart
     accounts. Scope "current": closing balances and P&L of the period; "opening": opening and
     closing balances (no P&L lines); "extraction": P&L only, to correct a turnover-based P&L
     (does not flow to equity, allowed only when the TB is closed through 79). */
(function (root) {
  'use strict';

  var EPS = 0.005;
  var CORE_VERSION = '2.0.0';

  /* ---------------- model ---------------- */

  /* base: window.FTH_IFRS_DATA (generated from the Excel workbook), v2: window.FTH_IFRS_MODEL. */
  function buildModel(base, v2) {
    var mapping = {}, fixes = {};
    Object.keys(base.mapping).forEach(function (k) { mapping[k] = { name: base.mapping[k].name, category: base.mapping[k].category, source: 'fth' }; });
    v2.chartAdditions.forEach(function (a) {
      if (!mapping[a[0]] || !mapping[a[0]].category) mapping[a[0]] = { name: (mapping[a[0]] && mapping[a[0]].name) || a[2], category: a[1], source: 'chart' };
    });
    v2.mappingFixes.forEach(function (f) {
      var m = mapping[f[0]] || (mapping[f[0]] = { name: '', category: '', source: 'fix' });
      fixes[f[0]] = { was: m.category, reasonEn: f[2], reasonUk: f[3] };
      m.category = f[1]; m.source = 'fix';
    });
    var balanceLines = v2.balanceLines.map(function (l) { return { id: l[0], section: l[1], en: l[2], uk: l[3], categories: l[4], st: 'bs' }; });
    var pnlLines = v2.pnlLines.map(function (l) { return { id: l[0], group: l[1], en: l[2], uk: l[3], categories: l[4], st: 'pl' }; });
    var lineOf = {};
    balanceLines.concat(pnlLines).forEach(function (l) { l.categories.forEach(function (c) { lineOf[c] = l; }); });
    var categoryUk = {};
    Object.keys(base.categoryUk).forEach(function (k) { categoryUk[k] = base.categoryUk[k]; });
    Object.keys(v2.categoryUk).forEach(function (k) { categoryUk[k] = v2.categoryUk[k]; });
    return {
      version: v2.version, coreVersion: CORE_VERSION, mapping: mapping, fixes: fixes,
      balanceLines: balanceLines, pnlLines: pnlLines, lineOf: lineOf, categoryUk: categoryUk,
      revenueDeductions: v2.revenueDeductions, findings: v2.findings, demo: base.demo,
      bsCategories: [].concat.apply([], balanceLines.map(function (l) { return l.categories; })),
      plCategories: [].concat.apply([], pnlLines.map(function (l) { return l.categories; }))
    };
  }

  function catLabel(model, c, lang) { return lang === 'uk' ? (model.categoryUk[c] || c) : c; }
  function lineLabel(l, lang) { return lang === 'uk' ? l.uk : l.en; }

  /* ---------------- reading the ОСВ ---------------- */

  function normCode(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return isFinite(v) ? String(v) : '';
    var s = String(v).trim();
    return /^\d+\.0$/.test(s) ? s.slice(0, -2) : s;
  }
  /* "1 234,56", "1,234.56", "1.234,56", "-1234.5", "(1 234,56)": with "," and "." the last one is
     the decimal mark; one kind only: several occurrences are thousands separators. */
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined) return 0;
    var t = String(v).replace(/[\s  ']/g, '');
    if (!t) return 0;
    var neg = /^\(.*\)$/.test(t);
    if (neg) t = t.slice(1, -1);
    var c = t.lastIndexOf(','), d = t.lastIndexOf('.');
    if (c >= 0 && d >= 0) t = c > d ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    else if (c >= 0) t = t.split(',').length > 2 ? t.replace(/,/g, '') : t.replace(',', '.');
    else if (d >= 0 && t.split('.').length > 2) t = t.replace(/\./g, '');
    var n = Number(t);
    return isFinite(n) ? (neg ? -n : n) : 0;
  }
  /* An account of the Ukrainian chart: 1-4 digits, optionally a short suffix (36Р, 4800.2).
     Longer numbers in column A (analytic codes, tax IDs) are analytic lines and are ignored. */
  function isAccount(code) { return /^\d{1,4}(?:[.A-Za-zЀ-ӿ][0-9A-Za-zЀ-ӿ]{0,3})?$/.test(code); }

  /* First sheet as an array of rows -> {company, period, rows, layout}. Columns are found from
     the header row (Дебет/Кредит/Debit/Credit x3, a pair may span several columns, as the B+C
     opening debit of 1C/BAS), else the FTH layout: A account, B+C, D, E, F, G, H. */
  function parseSheet(grid) {
    var company = '', period = '', groups = null, start = 0, layout = 'default';
    for (var r = 0; r < Math.min(grid.length, 20); r++) {
      var row = grid[r] || [];
      row.forEach(function (cell) {
        var s = String(cell).trim(), m = s.match(/(відомість|ведомость|balance)[^]*?\s(за|for)\s+(.+)$/i);
        if (m && !period) period = m[3].trim();
      });
      if (r === 0 && row[0] && !/(відомість|ведомость|balance)/i.test(String(row[0]))) company = String(row[0]).trim();
      var labels = [];
      row.forEach(function (cell, i) {
        var s = String(cell).trim().toLowerCase();
        if (/^(дебет|дт|debit|dr)$/.test(s)) labels.push({ i: i, d: true });
        if (/^(кредит|кт|credit|cr)$/.test(s)) labels.push({ i: i, d: false });
      });
      if (!groups && labels.length >= 6 && labels.slice(0, 6).every(function (l, k) { return l.d === (k % 2 === 0); })) {
        groups = labels.slice(0, 6).map(function (l, k) {
          var end = k < 5 ? labels[k + 1].i : l.i + 1, cols = [];
          for (var c = l.i; c < end; c++) cols.push(c);
          return cols;
        });
        start = r + 1; layout = 'header';
      }
    }
    groups = groups || [[1, 2], [3], [4], [5], [6], [7]];
    var rows = [], skipped = 0;
    for (var i = start; i < grid.length; i++) {
      var g = grid[i] || [];
      var code = typeof g[0] === 'number' && g[0] >= 1 && g[0] <= 9 && Number.isInteger(g[0]) ? '0' + g[0] : normCode(g[0]);
      if (!isAccount(code)) { if (code && /^\d/.test(code)) skipped++; continue; }
      rows.push([code].concat(groups.map(function (cols) { return round2(cols.reduce(function (s, c) { return s + num(g[c]); }, 0)); })));
    }
    return { company: company.slice(0, 200), period: period.slice(0, 100), rows: rows, layout: layout, skippedAnalytic: skipped };
  }

  /* Upload guard, before any parsing: size and real file type (magic bytes, not the name). */
  var MAX_BYTES = 15 * 1024 * 1024;
  function sniff(bytes) {
    if (bytes.length >= 8 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) return 'xls';
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return 'xlsx';
    return '';
  }
  /* buf: ArrayBuffer; XLSX: SheetJS. Returns {tb} or {error: code}. Formulas are not evaluated
     (cached values only), macros and external links are never run by SheetJS. */
  function readWorkbook(buf, XLSX) {
    if (buf.byteLength > MAX_BYTES) return { error: 'tooLarge' };
    var kind = sniff(new Uint8Array(buf, 0, Math.min(8, buf.byteLength)));
    if (!kind) return { error: 'badType' };
    var wb;
    try { wb = XLSX.read(buf, { type: 'array', cellFormula: false, cellHTML: false, cellStyles: false, bookVBA: false, WTF: false }); }
    catch (e) { return { error: 'unreadable', detail: String(e && e.message || e).slice(0, 200) }; }
    var best = null;
    wb.SheetNames.slice(0, 10).forEach(function (name) {
      var grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
      if (grid.length > 20000) grid = grid.slice(0, 20000);
      var tb = parseSheet(grid);
      tb.sheet = name;
      if (!best || tb.rows.length > best.rows.length) best = tb;
    });
    if (!best || !best.rows.length) return { error: 'noRows' };
    best.kind = kind;
    return { tb: best };
  }

  /* ---------------- mapping ---------------- */

  function mappedCategory(model, code) {
    var exact = model.mapping[code];
    if (exact && exact.category) return { category: exact.category, via: '', name: exact.name, source: exact.source };
    for (var i = code.length - 1; i >= 2; i--) {
      var m = model.mapping[code.slice(0, i)];
      if (m && m.category) return { category: m.category, via: code.slice(0, i), name: (exact && exact.name) || m.name, source: m.source };
    }
    return { category: '', via: '', name: exact ? exact.name : '', source: '' };
  }

  /* ---------------- compute ---------------- */

  function round2(v) { return Math.round(v * 100) / 100; }
  function z(v) { return Math.abs(v) < EPS; }
  var classOf = function (code) { return code.charAt(0); };
  var BUCKETS = ['local', 'reclass', 'adjust'];

  /* opts: {overrides: {code: category}, journals: [...], lang} */
  function compute(model, tb, opts) {
    opts = opts || {};
    var overrides = opts.overrides || {}, journals = opts.journals || [];
    var acc = {};
    tb.rows.forEach(function (r) {
      var code = normCode(r[0]);
      if (!isAccount(code) || code.charAt(0) === '0') return;
      var a = acc[code] || (acc[code] = { od: 0, oc: 0, td: 0, tc: 0, cd: 0, cc: 0 });
      a.od += num(r[1]); a.oc += num(r[2]); a.td += num(r[3]); a.tc += num(r[4]); a.cd += num(r[5]); a.cc += num(r[6]);
    });
    Object.keys(acc).forEach(function (c) { var a = acc[c]; a.o = a.od - a.oc; a.c = a.cd - a.cc; a.t = a.td - a.tc; });
    var has = function (a) { return !z(a.od) || !z(a.oc) || !z(a.td) || !z(a.tc) || !z(a.cd) || !z(a.cc); };
    var codes = Object.keys(acc).filter(function (c) { return has(acc[c]); }).sort();
    var hasSub = function (p) { return codes.some(function (c) { return c !== p && c.indexOf(p) === 0; }); };
    var leaves = codes.filter(function (c) { return !hasSub(c); });

    // TB integrity: totals of each column pair, roll-forward of each account, parents vs sub-accounts.
    var colSum = { o: 0, t: 0, c: 0 };
    leaves.forEach(function (c) { colSum.o += acc[c].o; colSum.t += acc[c].t; colSum.c += acc[c].c; });
    var rollBreaks = leaves.filter(function (c) { var a = acc[c]; return Math.abs(a.o + a.t - a.c) > 0.5; });
    var parentBreaks = [];
    codes.forEach(function (p) {
      if (!hasSub(p)) return;
      var subs = leaves.filter(function (c) { return c.indexOf(p) === 0; });
      var d = ['o', 'c'].map(function (k) { return acc[p][k] - subs.reduce(function (s, c) { return s + acc[c][k]; }, 0); });
      if ((Math.abs(d[0]) > 0.5 && !z(acc[p].o)) || (Math.abs(d[1]) > 0.5 && !z(acc[p].c))) parentBreaks.push({ code: p, diff: Math.abs(d[1]) > 0.5 ? d[1] : d[0] });
    });

    var closed79 = codes.some(function (c) { return c.indexOf('79') === 0 && (!z(acc[c].td) || !z(acc[c].tc)); });
    var turnover9 = leaves.some(function (c) { return classOf(c) === '9' && (!z(acc[c].td) || !z(acc[c].tc)); });
    var isDeduction = function (code) { return model.revenueDeductions.some(function (d) { return code.indexOf(d) === 0; }); };

    var bs = {}, pl = {};
    var bsB = function (id) { return bs[id] || (bs[id] = { local: [0, 0], reclass: [0, 0], adjust: [0, 0] }); };
    var plB = function (id) { return pl[id] || (pl[id] = { local: 0, reclass: 0, adjust: 0, extraction: 0 }); };
    var unplacedBs = [0, 0], unplacedPl = 0, plBal = [0, 0], unplacedBsCodes = [], unplacedPlCodes = [];
    var natural = closed79;

    var accounts = leaves.map(function (code) {
      var a = acc[code], m = mappedCategory(model, code);
      var manual = Object.prototype.hasOwnProperty.call(overrides, code);
      var cat = manual ? overrides[code] : m.category;
      var st = '123456'.indexOf(classOf(code)) >= 0 ? 'bs' : 'pl';
      var line = model.lineOf[cat] && model.lineOf[cat].st === st ? model.lineOf[cat] : null;
      var closing = code.indexOf('79') === 0;
      var status = closing ? 'closingAcc' : !cat ? 'unknown' : !line ? 'unplaced' : manual ? 'manual' : m.source === 'fix' ? 'fixed' : m.via ? 'via' : 'exact';
      var pv = 0;
      if (st === 'bs') {
        if (line) { var b = bsB(line.id); b.local[0] += a.o; b.local[1] += a.c; }
        else if (!z(a.o) || !z(a.c)) { unplacedBs[0] += a.o; unplacedBs[1] += a.c; unplacedBsCodes.push(code); }
      } else {
        plBal[0] += a.o; plBal[1] += a.c;
        if (!closing) {
          var k = classOf(code);
          if (!natural) pv = -a.t;
          else if (isDeduction(code)) pv = -a.td;
          else if (k === '7') pv = a.tc;
          else if (code.indexOf('91') === 0) pv = -a.t;           // production overheads: closed to 23, not to 79
          else if (k === '8' && turnover9) pv = 0;                // elements, already inside class 9
          else pv = -a.td;
          if (line) plB(line.id).local += pv;
          else if (!z(pv)) { unplacedPl += pv; unplacedPlCodes.push(code); }
        }
      }
      return { code: code, name: m.name, via: m.via, category: cat, mapped: m.category, statement: st, status: status, line: line ? line.id : '',
        opening: a.o, debit: a.td, credit: a.tc, movement: a.t, closing: a.c, plValue: pv, fix: model.fixes[code] || null };
    });

    // Journals
    var jIssues = [], resultAdj = { reclass: [0, 0], adjust: [0, 0] };
    journals.forEach(function (j) {
      if (j.status === 'void') return;
      var bucket = j.type === 'reclass' ? 'reclass' : 'adjust';
      var bal = journalBalance(j);
      if (j.scope !== 'extraction' && !z(bal)) jIssues.push({ id: j.id, no: j.no, kind: 'unbalanced', diff: bal });
      (j.lines || []).forEach(function (ln) {
        var line = model.lineOf[ln.category], net = num(ln.dr) - num(ln.cr);
        if (!line || z(net)) { if (!line && !z(net)) jIssues.push({ id: j.id, no: j.no, kind: 'noLine', category: ln.category }); return; }
        if (j.scope === 'extraction') {
          if (line.st === 'pl') plB(line.id).extraction += -net; else jIssues.push({ id: j.id, no: j.no, kind: 'extractionBs' });
          return;
        }
        if (line.st === 'bs') {
          var b = bsB(line.id)[bucket];
          b[1] += net; if (j.scope === 'opening') b[0] += net;
        } else {
          if (j.scope === 'opening') { jIssues.push({ id: j.id, no: j.no, kind: 'openingPl' }); return; }
          plB(line.id)[bucket] += -net;
          resultAdj[bucket][1] += -net;
        }
      });
    });

    // Statement of financial position
    var resultLocal = [-plBal[0], -plBal[1]];
    var sec = {}, balance = [];
    model.balanceLines.forEach(function (l) {
      var v = bs[l.id] || { local: [0, 0], reclass: [0, 0], adjust: [0, 0] }, sign = l.section === 'nca' || l.section === 'ca' ? 1 : -1;
      var row = { id: l.id, section: l.section, en: l.en, uk: l.uk };
      BUCKETS.forEach(function (bk) { row[bk] = [sign * v[bk][0], sign * v[bk][1]]; });
      if (l.id === 'retained_earnings') {
        row.local = [row.local[0] + resultLocal[0], row.local[1] + resultLocal[1]];
        row.reclass[1] += resultAdj.reclass[1]; row.adjust[1] += resultAdj.adjust[1];
      }
      row.ifrs = [0, 1].map(function (i) { return row.local[i] + row.reclass[i] + row.adjust[i]; });
      row.values = row.ifrs;
      var s = sec[l.section] || (sec[l.section] = { local: [0, 0], ifrs: [0, 0] });
      [0, 1].forEach(function (i) { s.local[i] += row.local[i]; s.ifrs[i] += row.ifrs[i]; });
      balance.push(row);
    });
    var tot = function (keys, col) { return [0, 1].map(function (i) { return keys.reduce(function (t, k) { return t + (sec[k] ? sec[k][col][i] : 0); }, 0); }); };
    var assets = tot(['nca', 'ca'], 'ifrs'), equity = tot(['eq'], 'ifrs'), liabilities = tot(['ncl', 'cl'], 'ifrs');
    var diff = [0, 1].map(function (i) { return assets[i] - equity[i] - liabilities[i]; });

    // Profit or loss
    var pnl = model.pnlLines.map(function (l) {
      var v = pl[l.id] || { local: 0, reclass: 0, adjust: 0, extraction: 0 };
      return { id: l.id, group: l.group, en: l.en, uk: l.uk, local: v.local + v.extraction, extraction: v.extraction, reclass: v.reclass, adjust: v.adjust, ifrs: v.local + v.extraction + v.reclass + v.adjust };
    });
    var sumG = function (groups, col) { return pnl.filter(function (r) { return groups.indexOf(r.group) >= 0; }).reduce(function (s, r) { return s + r[col]; }, 0); };
    var totals = {};
    ['local', 'ifrs'].forEach(function (col) {
      var extra = unplacedPl;
      totals[col] = {
        gross: sumG(['gross'], col),
        operating: sumG(['gross', 'operating'], col),
        pbt: sumG(['gross', 'operating', 'finance'], col),
        profit: sumG(['gross', 'operating', 'finance', 'tax'], col) + extra
      };
    });

    // Reconciliation of the P&L with retained earnings (only meaningful when the TB is closed through 79).
    var re = leaves.filter(function (c) { return c.indexOf('44') === 0; });
    var reMove = -re.reduce(function (s, c) { return s + acc[c].t; }, 0);
    var extractionTotal = pnl.reduce(function (s, r) { return s + r.extraction; }, 0);
    var turnoverProfit = totals.local.profit;                  // includes extraction corrections
    var recon = natural ? { reMovement: reMove, profit: turnoverProfit, gap: turnoverProfit - reMove, extraction: extractionTotal } : null;

    var unknownCount = accounts.filter(function (a) { return a.status === 'unknown' || a.status === 'unplaced'; }).length;
    var res = {
      coreVersion: CORE_VERSION, modelVersion: model.version,
      accounts: accounts, balance: balance, pnl: pnl, totals: totals,
      sections: sec, assets: assets, equity: equity, liabilities: liabilities, diff: diff,
      unplacedBs: unplacedBs, unplacedBsCodes: unplacedBsCodes, unplacedPl: unplacedPl, unplacedPlCodes: unplacedPlCodes,
      resultLocal: resultLocal, resultAdj: resultAdj, closed79: closed79, natural: natural, turnover9: turnover9, recon: recon,
      colSum: colSum, rollBreaks: rollBreaks, parentBreaks: parentBreaks, journalIssues: jIssues,
      unknownCount: unknownCount, accountCount: accounts.length,
      revenue: (pnl.filter(function (r) { return r.id === 'revenue'; })[0] || {}).ifrs || 0,
      profit: totals.ifrs.profit, raw: acc
    };
    res.balanced = z(diff[0]) && z(diff[1]) && !unplacedBsCodes.length;
    res.checkOk = res.balanced;
    res.checks = checks(res);
    return res;
  }

  function journalBalance(j) {
    return (j.lines || []).reduce(function (s, l) { return s + num(l.dr) - num(l.cr); }, 0);
  }

  /* ---------------- checks ---------------- */

  /* Each check: {id, level: 'ok' | 'warn' | 'error' | 'info', params}. Texts live in MSG. */
  function checks(res) {
    var out = [];
    var tbOk = Math.abs(res.colSum.o) < 0.5 && Math.abs(res.colSum.t) < 0.5 && Math.abs(res.colSum.c) < 0.5;
    out.push({ id: 'tbBalanced', level: tbOk ? 'ok' : 'error', params: { o: res.colSum.o, t: res.colSum.t, c: res.colSum.c } });
    out.push({ id: 'rollForward', level: res.rollBreaks.length ? 'error' : 'ok', params: { codes: res.rollBreaks.slice(0, 12) } });
    if (res.parentBreaks.length) out.push({ id: 'parents', level: 'warn', params: { items: res.parentBreaks.slice(0, 12) } });
    out.push({ id: 'mapping', level: res.unknownCount ? 'warn' : 'ok', params: { n: res.accountCount, u: res.unknownCount } });
    out.push({ id: 'sofp', level: res.balanced ? 'ok' : 'error', params: { d0: res.diff[0], d1: res.diff[1], codes: res.unplacedBsCodes.slice(0, 12) } });
    if (!z(res.unplacedPl)) out.push({ id: 'unplacedPl', level: 'warn', params: { v: res.unplacedPl, codes: res.unplacedPlCodes.slice(0, 12) } });
    out.push({ id: 'yearClosed', level: 'info', params: { closed: res.closed79, added: res.resultLocal } });
    if (res.recon) out.push({ id: 'recon', level: Math.abs(res.recon.gap) < 0.5 ? 'ok' : 'warn', params: res.recon });
    var sign = signAnomalies(res);
    if (sign.length) out.push({ id: 'signs', level: 'warn', params: { items: sign } });
    if (res.journalIssues.length) out.push({ id: 'journals', level: 'error', params: { items: res.journalIssues } });
    return out;
  }

  // Balances on the unusual side: cash or inventories in credit, payables in debit...
  function signAnomalies(res) {
    var rules = [['30', 1], ['31', 1], ['33', 1], ['20', 1], ['28', 1], ['10', 1], ['12', 1], ['13', -1], ['40', -1], ['50', -1], ['60', -1], ['66', -1], ['65', -1]];
    var out = [];
    res.accounts.forEach(function (a) {
      rules.forEach(function (r) {
        if (a.code.indexOf(r[0]) === 0 && a.closing * r[1] < -0.5 && out.length < 12) out.push({ code: a.code, v: a.closing });
      });
    });
    return out;
  }

  /* ---------------- IFRS readiness: indicators from the TB + the client's answers ---------------- */

  /* answers: {leases, fx, development, esop, contracts, related, group} each 'yes' | 'no' | 'unsure' | undefined */
  function diagnose(res, answers) {
    answers = answers || {};
    var bal = function (prefixes, col) {
      return res.accounts.filter(function (a) { return prefixes.some(function (p) { return a.code.indexOf(p) === 0; }); })
        .reduce(function (s, a) { return s + Math.abs(a[col || 'closing']); }, 0);
    };
    var turn = function (prefixes) { return res.accounts.filter(function (a) { return prefixes.some(function (p) { return a.code.indexOf(p) === 0; }); }).reduce(function (s, a) { return s + Math.abs(a.debit) + Math.abs(a.credit); }, 0); };
    var yes = function (k) { return answers[k] === 'yes'; }, unsure = function (k) { return answers[k] === 'unsure'; };
    var out = [];
    var add = function (id, std, level, params) { out.push({ id: id, standard: std, level: level, params: params || {} }); };

    var fxBal = bal(['312', '314', '334', '362', '3712', '632', '6812', '502', '602']);
    if (fxBal > 0.5 || yes('fx')) add('fx', 'IAS 21', fxBal > 0.5 ? 'high' : 'medium', { v: fxBal });
    else if (unsure('fx')) add('fx', 'IAS 21', 'info', { v: 0 });

    if (yes('leases') || bal(['53']) > 0.5) add('leases', 'IFRS 16', 'high');
    else if (unsure('leases') || answers.leases === undefined) add('leasesAsk', 'IFRS 16', 'info');

    var recv = bal(['36', '34']), allowance = bal(['38']);
    if (recv > 0.5) add('ecl', 'IFRS 9', allowance > 0.5 ? 'medium' : 'high', { recv: recv, allowance: allowance });

    var adv = bal(['681']), vatAdv = bal(['643']);
    if (adv > 0.5 || yes('contracts')) add('revenue', 'IFRS 15', adv > 0.5 && vatAdv > 0.5 ? 'high' : 'medium', { adv: adv, vat: vatAdv });

    var intang = bal(['12', '154']);
    if (intang > 0.5 || yes('development')) add('intangibles', 'IAS 38', 'medium', { v: intang });

    var payroll = turn(['66']), holiday = bal(['471']);
    if (payroll > 0.5 && holiday < 0.5) add('holiday', 'IAS 19', 'medium', { payroll: payroll });

    if (yes('esop')) add('esop', 'IFRS 2', 'high');
    if (yes('related') || bal(['50', '60', '685']) > 0.5) add('loans', 'IFRS 9 / IAS 24', yes('related') ? 'high' : 'info', { v: bal(['50', '60']) });
    if (yes('group')) add('group', 'IFRS 10', 'high');

    var hasDt = bal(['17', '54']) > 0.5;
    add('deferredTax', 'IAS 12', hasDt ? 'medium' : 'high', { has: hasDt });

    if (bal(['91'], 'debit') > 0.5 || turn(['23']) > 0.5) add('inventoryCost', 'IAS 2', 'info');
    if (bal(['352', '35']) > 0.5) add('cashEquivalents', 'IAS 7', 'info', { v: bal(['352', '35']) });
    if (bal(['424', '48']) > 0.5) add('grants', 'IAS 20', 'medium', { v: bal(['424', '48']) });

    var rank = { high: 0, medium: 1, info: 2 };
    out.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
    return out;
  }

  /* ---------------- calculators (proposed journals, reviewed by the specialist) ---------------- */

  function monthsBetween(a, b) { return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()); }
  function parseDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; }

  /* IFRS 16 lessee, monthly payments. p: {start, termMonths, payment, timing: 'advance' | 'arrears',
     rate (annual %), periodStart, periodEnd, expenseCategory}. Monthly schedule; the period covers
     whole months. Returns figures and two journals (opening and current period). */
  function leaseCalc(p) {
    var start = parseDate(p.start), ps = parseDate(p.periodStart), pe = parseDate(p.periodEnd);
    var n = Math.round(num(p.termMonths)), pay = num(p.payment), r = num(p.rate) / 100 / 12, adv = p.timing !== 'arrears';
    if (!start || !ps || !pe || n <= 0 || pay <= 0 || pe < ps) return { error: 'inputs' };
    var pv = 0;
    for (var k = 0; k < n; k++) pv += pay / Math.pow(1 + r, adv ? k : k + 1);
    // State after m months: liability, accumulated depreciation, payments, interest.
    function state(m) {
      m = Math.max(0, Math.min(n, m));
      var liab = pv, interest = 0, paid = 0;
      for (var i = 0; i < m; i++) {
        if (adv) { liab -= pay; paid += pay; var it = liab * r; interest += it; liab += it; }
        else { var it2 = liab * r; interest += it2; liab += it2 - pay; paid += pay; }
      }
      return { liab: Math.max(0, liab), dep: pv * m / n, interest: interest, paid: paid, m: m };
    }
    var mOpen = monthsBetween(start, ps), mClose = monthsBetween(start, pe) + 1;
    var begun = mOpen > 0;
    var so = begun ? state(mOpen) : { liab: 0, dep: 0, interest: 0, paid: 0, m: 0 };
    var sc = state(mClose);
    // Current portion: principal repaid within 12 months after each date.
    if (mClose <= 0) return { error: 'notStarted' };
    var current = function (s) { if (s.m >= n) return 0; return Math.max(0, s.liab - state(s.m + 12).liab); };
    var curO = begun ? current(so) : 0, curC = current(sc);
    var rouO = begun ? pv - so.dep : 0, rouC = mClose > 0 ? pv - sc.dep : 0;
    var dep = sc.dep - so.dep, interest = sc.interest - so.interest, paid = sc.paid - so.paid;
    var exp = p.expenseCategory || 'Administrative expenses';
    var L = function (category, dr, cr, memo) { return { category: category, dr: round2(dr), cr: round2(cr), memo: memo || '' }; };
    var opening = null;
    if (begun) {
      var reO = rouO - so.liab;   // ROU - liability at the start of the period (usually negative: debit RE)
      opening = { scope: 'opening', type: 'adjust', standard: 'IFRS 16', lines: [
        L('Right-of-use assets', rouO, 0, 'ROU, net'),
        L('Lease liabilities', 0, so.liab - curO, 'non-current'),
        L('Lease liabilities (current)', 0, curO, 'current'),
        reO < 0 ? L('Retained earnings', -reO, 0, 'cumulative effect') : L('Retained earnings', 0, reO, 'cumulative effect')
      ].filter(function (l) { return l.dr || l.cr; }) };
    }
    var dROU = rouC - rouO, dNc = (sc.liab - curC) - (so.liab - curO), dC = curC - curO;
    var lines = [
      L(exp, dep, 0, 'depreciation of ROU'),
      L('Finance costs', interest, 0, 'interest on lease liability'),
      L(exp, 0, paid, 'reversal of rent expensed in the TB'),
      dROU >= 0 ? L('Right-of-use assets', dROU, 0, 'ROU movement') : L('Right-of-use assets', 0, -dROU, 'ROU movement'),
      dNc >= 0 ? L('Lease liabilities', 0, dNc, 'liability movement') : L('Lease liabilities', -dNc, 0, 'liability movement'),
      dC >= 0 ? L('Lease liabilities (current)', 0, dC, 'current portion') : L('Lease liabilities (current)', -dC, 0, 'current portion')
    ].filter(function (l) { return l.dr || l.cr; });
    // Rounding: force the journal to balance on the ROU line (cents).
    var j = { scope: 'current', type: 'adjust', standard: 'IFRS 16', lines: lines };
    var gap = round2(journalBalance(j));
    if (gap) { var roul = lines.filter(function (l) { return l.category === 'Right-of-use assets'; })[0]; if (roul) { if (roul.dr) roul.dr = round2(roul.dr - gap); else roul.cr = round2(roul.cr + gap); } }
    if (opening) { var g2 = round2(journalBalance(opening)); if (g2) { var re0 = opening.lines[opening.lines.length - 1]; if (re0.dr) re0.dr = round2(re0.dr - g2); else re0.cr = round2(re0.cr + g2); } }
    return { pv: pv, rouOpen: rouO, rouClose: rouC, liabOpen: so.liab, liabClose: sc.liab, currentClose: curC, depreciation: dep, interest: interest, payments: paid, opening: opening, current: j };
  }

  /* IFRS 9 simplified approach, provision matrix. p: {buckets: [{amount, rate%}], existing} */
  function eclCalc(p) {
    var required = (p.buckets || []).reduce(function (s, b) { return s + num(b.amount) * num(b.rate) / 100; }, 0);
    var delta = round2(required - num(p.existing));
    var lines = delta >= 0
      ? [{ category: 'Impairment loss', dr: delta, cr: 0, memo: 'ECL charge' }, { category: 'Trade receivables', dr: 0, cr: delta, memo: 'loss allowance' }]
      : [{ category: 'Trade receivables', dr: -delta, cr: 0, memo: 'loss allowance released' }, { category: 'Impairment loss', dr: 0, cr: -delta, memo: 'ECL release' }];
    return { required: required, delta: delta, journal: z(delta) ? null : { scope: 'current', type: 'adjust', standard: 'IFRS 9', lines: lines } };
  }

  /* IAS 21 retranslation of a monetary item at the closing rate. p: {category, fcAmount, rate, carrying} (asset +, liability -) */
  function fxCalc(p) {
    var target = num(p.fcAmount) * num(p.rate), diff = round2(target - num(p.carrying));
    if (z(diff)) return { diff: 0, journal: null };
    var lines = [{ category: p.category, dr: diff > 0 ? diff : 0, cr: diff < 0 ? -diff : 0, memo: 'retranslation at closing rate' },
      { category: 'FX gain/loss', dr: diff < 0 ? -diff : 0, cr: diff > 0 ? diff : 0, memo: diff > 0 ? 'FX gain' : 'FX loss' }];
    return { diff: diff, journal: { scope: 'current', type: 'adjust', standard: 'IAS 21', lines: lines } };
  }

  /* IAS 12 on the adjustments booked so far: tax effect of their P&L and opening equity impact.
     A simplification (all differences temporary, one rate): the specialist reviews it. */
  function deferredTaxCalc(model, journals, ratePct) {
    var rate = num(ratePct) / 100, pl = 0, open = 0;
    journals.forEach(function (j) {
      if (j.status === 'void' || j.type !== 'adjust' || j.standard === 'IAS 12' || j.scope === 'extraction') return;
      j.lines.forEach(function (l) {
        var line = model.lineOf[l.category], net = num(l.dr) - num(l.cr);
        if (!line) return;
        if (line.st === 'pl' && line.id !== 'tax' && j.scope === 'current') pl += -net;
        if (l.category === 'Retained earnings' && j.scope === 'opening') open += -net;
      });
    });
    var taxPl = round2(-pl * rate), taxOpen = round2(-open * rate);  // positive = deferred tax asset arises
    var lines = [];
    var dta = taxPl + taxOpen;
    if (!z(dta)) lines.push(dta > 0 ? { category: 'Deferred tax asset', dr: dta, cr: 0, memo: 'deferred tax' } : { category: 'Deferred tax liability', dr: 0, cr: -dta, memo: 'deferred tax' });
    if (!z(taxPl)) lines.push(taxPl > 0 ? { category: 'Income tax expense', dr: 0, cr: taxPl, memo: 'deferred tax income' } : { category: 'Income tax expense', dr: -taxPl, cr: 0, memo: 'deferred tax expense' });
    if (!z(taxOpen)) lines.push(taxOpen > 0 ? { category: 'Retained earnings', dr: 0, cr: taxOpen, memo: 'tax on opening adjustments' } : { category: 'Retained earnings', dr: -taxOpen, cr: 0, memo: 'tax on opening adjustments' });
    return { plImpact: pl, openImpact: open, taxPl: taxPl, taxOpen: taxOpen, journal: lines.length ? { scope: 'current', type: 'adjust', standard: 'IAS 12', lines: lines } : null };
  }

  /* ---------------- release snapshot ---------------- */

  /* What a client receives: statement figures (IFRS column, plus local/adjustment split if
     allowed), never accounts, mapping or journals. */
  function snapshot(res, opts) {
    opts = opts || {};
    var r2 = function (a) { return a.map(round2); };
    return {
      balance: res.balance.filter(function (l) { return !z(l.ifrs[0]) || !z(l.ifrs[1]); }).map(function (l) {
        var o = { id: l.id, section: l.section, ifrs: r2(l.ifrs) };
        if (opts.split) { o.local = r2(l.local); o.adj = r2([l.reclass[0] + l.adjust[0], l.reclass[1] + l.adjust[1]]); }
        return o;
      }),
      pnl: res.pnl.filter(function (l) { return !z(l.ifrs) || l.id === 'revenue'; }).map(function (l) {
        var o = { id: l.id, group: l.group, ifrs: round2(l.ifrs) };
        if (opts.split) { o.local = round2(l.local); o.adj = round2(l.reclass + l.adjust); }
        return o;
      }),
      totals: { assets: r2(res.assets), equity: r2(res.equity), liabilities: r2(res.liabilities), gross: round2(res.totals.ifrs.gross), operating: round2(res.totals.ifrs.operating), pbt: round2(res.totals.ifrs.pbt), profit: round2(res.totals.ifrs.profit), unplacedPl: round2(res.unplacedPl) },
      balanced: res.balanced
    };
  }

  /* ---------------- messages (checks and indicators), EN / UK ---------------- */

  var MSG = {
    en: {
      tbBalanced: ['Trial balance totals', function (p) { return 'Debit = credit for opening balances, turnovers and closing balances.'; }, function (p) { return 'Debit − credit is not zero: opening ' + f(p.o) + ', turnovers ' + f(p.t) + ', closing ' + f(p.c) + '. Some lines may be missing or duplicated.'; }],
      rollForward: ['Roll-forward of each account', function () { return 'Opening + debit − credit = closing for every account.'; }, function (p) { return 'Opening + turnovers ≠ closing for: ' + p.codes.join(', ') + '.'; }],
      parents: ['Accounts and sub-accounts', null, function (p) { return 'Parent account differs from the sum of its sub-accounts (sub-accounts used): ' + p.items.map(function (i) { return i.code + ' (' + f(i.diff) + ')'; }).join(', ') + '.'; }],
      mapping: ['Account mapping', function (p) { return p.n + ' accounts with amounts, all classified.'; }, function (p) { return p.u + ' of ' + p.n + ' accounts need an IFRS category.'; }],
      sofp: ['Assets = equity + liabilities', function () { return 'Difference 0.00 at the beginning and at the end of the period.'; }, function (p) { return 'Difference ' + f(p.d0) + ' / ' + f(p.d1) + (p.codes.length ? '. Not classified: ' + p.codes.join(', ') : '') + '.'; }],
      unplacedPl: ['Income and expenses not classified', null, function (p) { return f(p.v) + ' in accounts ' + p.codes.join(', ') + ': shown on a separate line.'; }],
      yearClosed: ['Year-end closing', function (p) { return p.closed ? 'Income and expenses were closed through account 79: the result is already in retained earnings.' : 'The year is not closed in the books: the result (' + f(p.added[1]) + ') is added to retained earnings.'; }],
      recon: ['P&L ↔ retained earnings', function (p) { return 'Profit from turnovers ' + f(p.profit) + ' = movement of account 44 (' + f(p.reMovement) + ').'; }, function (p) { return 'The TB is closed through 79, so the P&L is rebuilt from turnovers: profit ' + f(p.profit) + ' vs movement of account 44 ' + f(p.reMovement) + ' (gap ' + f(p.gap) + '). Usual causes: VAT debited to 70, reversals, dividends, prior-year corrections.'; }],
      signs: ['Balances on the unusual side', null, function (p) { return p.items.map(function (i) { return i.code + ' ' + f(i.v); }).join(', ') + '.'; }],
      journals: ['Adjustment journals', null, function (p) { return p.items.map(function (i) { return '#' + i.no + ' ' + ({ unbalanced: 'does not balance (' + f(i.diff) + ')', noLine: 'category with no line: ' + i.category, openingPl: 'opening entry on a P&L line (ignored)', extractionBs: 'extraction correction on a balance-sheet line (ignored)' })[i.kind]; }).join('; ') + '.'; }]
    },
    uk: {
      tbBalanced: ['Підсумки ОСВ', function () { return 'Дебет = кредит для сальдо на початок, оборотів і сальдо на кінець.'; }, function (p) { return 'Дебет − кредит не дорівнює нулю: на початок ' + f(p.o) + ', обороти ' + f(p.t) + ', на кінець ' + f(p.c) + '. Можливо, бракує рядків або є дублі.'; }],
      rollForward: ['Рух по кожному рахунку', function () { return 'Сальдо на початок + дебет − кредит = сальдо на кінець для всіх рахунків.'; }, function (p) { return 'Сальдо на початок + обороти ≠ сальдо на кінець: ' + p.codes.join(', ') + '.'; }],
      parents: ['Рахунки та субрахунки', null, function (p) { return 'Рахунок не дорівнює сумі субрахунків (використано субрахунки): ' + p.items.map(function (i) { return i.code + ' (' + f(i.diff) + ')'; }).join(', ') + '.'; }],
      mapping: ['Мапінг рахунків', function (p) { return p.n + ' рахунків із сумами, усі класифіковано.'; }, function (p) { return p.u + ' з ' + p.n + ' рахунків потребують категорії МСФЗ.'; }],
      sofp: ['Активи = капітал + зобов’язання', function () { return 'Різниця 0,00 на початок і на кінець періоду.'; }, function (p) { return 'Різниця ' + f(p.d0) + ' / ' + f(p.d1) + (p.codes.length ? '. Не класифіковано: ' + p.codes.join(', ') : '') + '.'; }],
      unplacedPl: ['Некласифіковані доходи й витрати', null, function (p) { return f(p.v) + ' на рахунках ' + p.codes.join(', ') + ': показано окремим рядком.'; }],
      yearClosed: ['Закриття року', function (p) { return p.closed ? 'Доходи й витрати закрито через рахунок 79: результат уже в нерозподіленому прибутку.' : 'Рік не закрито в обліку: результат (' + f(p.added[1]) + ') додано до нерозподіленого прибутку.'; }],
      recon: ['Звіт про прибутки ↔ нерозподілений прибуток', function (p) { return 'Прибуток за оборотами ' + f(p.profit) + ' = рух рахунку 44 (' + f(p.reMovement) + ').'; }, function (p) { return 'ОСВ закрито через 79, тому звіт складено за оборотами: прибуток ' + f(p.profit) + ' проти руху рахунку 44 ' + f(p.reMovement) + ' (різниця ' + f(p.gap) + '). Типові причини: ПДВ у дебеті 70, сторно, дивіденди, виправлення минулих років.'; }],
      signs: ['Нетипове сальдо', null, function (p) { return p.items.map(function (i) { return i.code + ' ' + f(i.v); }).join(', ') + '.'; }],
      journals: ['Журнали коригувань', null, function (p) { return p.items.map(function (i) { return '№' + i.no + ' ' + ({ unbalanced: 'не збалансовано (' + f(i.diff) + ')', noLine: 'категорія без статті: ' + i.category, openingPl: 'вступне коригування на статті P&L (не враховано)', extractionBs: 'коригування вибірки на балансовій статті (не враховано)' })[i.kind]; }).join('; ') + '.'; }]
    }
  };
  var fmtCache = {};
  var curLang = 'en';
  function f(v) {
    var k = curLang;
    var fm = fmtCache[k] || (fmtCache[k] = new Intl.NumberFormat(k === 'uk' ? 'uk-UA' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    return fm.format(z(v) ? 0 : v);
  }
  function checkText(c, lang) {
    curLang = lang === 'uk' ? 'uk' : 'en';
    var m = MSG[curLang][c.id];
    var body = c.level === 'ok' || c.level === 'info' ? (m[1] || m[2]) : (m[2] || m[1]);
    return { title: m[0], text: body(c.params) };
  }

  var IND = {
    en: {
      fx: ['Foreign currency balances', 'Monetary items in foreign currency (312, 362, 632…: ' + '{v}' + ') must be retranslated at the closing rate; advances stay at historical rate.'],
      leases: ['Leases', 'Office or equipment leases over 12 months: a right-of-use asset and a lease liability replace the rent expense.'],
      leasesAsk: ['Leases (to confirm)', 'Most IT companies rent offices: if a lease runs over 12 months, IFRS 16 puts it on the balance sheet.'],
      ecl: ['Expected credit losses', 'Trade receivables {recv}; allowance in the TB {allowance}. IFRS 9 requires a forward-looking loss allowance, even without overdue debts.'],
      revenue: ['Revenue and contract balances', 'Advances received {adv} (VAT on advances {vat}): under IFRS 15 a contract liability is shown net of VAT, revenue follows performance obligations.'],
      intangibles: ['Development costs and software', 'Intangibles {v}: IAS 38 capitalises development only when the six criteria are met; research is expensed.'],
      holiday: ['Unused holiday pay', 'Payroll in the period but no holiday accrual (471): IAS 19 requires accruing unused paid leave.'],
      esop: ['Share options (ESOP)', 'Share-based payments are expensed over the vesting period at grant-date fair value.'],
      loans: ['Loans and related parties', 'Loans at off-market rates (often from owners or group companies) are measured at fair value; related-party disclosures under IAS 24.'],
      group: ['Group and consolidation', 'Controlled entities (e.g. a foreign parent or sister companies) may require consolidated statements.'],
      deferredTax: ['Deferred tax', 'Every IFRS adjustment creates a temporary difference: deferred tax at 18% (Ukraine) on each of them.'],
      inventoryCost: ['Cost of production', 'Production overheads (91, 23) must be allocated to work in progress and cost of sales.'],
      cashEquivalents: ['Cash equivalents', 'Current investments {v} are cash equivalents only if they mature within 3 months and carry insignificant risk.'],
      grants: ['Grants and donated assets', 'Targeted financing or donated assets {v}: government grant (IAS 20, deferred income) or owner contribution (equity).']
    },
    uk: {
      fx: ['Залишки в іноземній валюті', 'Монетарні статті в іноземній валюті (312, 362, 632…: {v}) перераховуються за курсом на кінець періоду; аванси — за історичним курсом.'],
      leases: ['Оренда', 'Оренда офісу чи обладнання понад 12 місяців: актив з права користування та зобов’язання з оренди замість витрат на оренду.'],
      leasesAsk: ['Оренда (уточнити)', 'Більшість IT-компаній орендують офіси: якщо оренда понад 12 місяців, МСФЗ 16 відображає її в балансі.'],
      ecl: ['Очікувані кредитні збитки', 'Дебіторська заборгованість {recv}; резерв в ОСВ {allowance}. МСФЗ 9 вимагає резерв очікуваних збитків навіть без простроченої заборгованості.'],
      revenue: ['Дохід і залишки за договорами', 'Отримані аванси {adv} (ПДВ з авансів {vat}): за МСФЗ 15 зобов’язання за договором показується без ПДВ, дохід — за виконанням зобов’язань.'],
      intangibles: ['Розробка та програмне забезпечення', 'Нематеріальні активи {v}: МСБО 38 капіталізує розробку лише за шести критеріїв; дослідження — у витрати.'],
      holiday: ['Невикористані відпустки', 'Є зарплата, але немає забезпечення відпусток (471): МСБО 19 вимагає його нарахувати.'],
      esop: ['Опціони (ESOP)', 'Виплати на основі акцій визнаються у витратах протягом періоду набуття прав за справедливою вартістю на дату надання.'],
      loans: ['Позики та пов’язані сторони', 'Позики за нерино­вими ставками (часто від власників чи компаній групи) оцінюються за справедливою вартістю; розкриття за МСБО 24.'],
      group: ['Група та консолідація', 'Контрольовані компанії (наприклад, іноземна материнська) можуть вимагати консолідованої звітності.'],
      deferredTax: ['Відстрочений податок', 'Кожне коригування МСФЗ створює тимчасову різницю: відстрочений податок за ставкою 18%.'],
      inventoryCost: ['Собівартість виробництва', 'Загальновиробничі витрати (91, 23) розподіляються на незавершене виробництво й собівартість.'],
      cashEquivalents: ['Еквіваленти грошей', 'Поточні інвестиції {v} — еквіваленти грошей лише зі строком до 3 місяців і незначним ризиком.'],
      grants: ['Гранти та безоплатні активи', 'Цільове фінансування чи безоплатні активи {v}: державний грант (МСБО 20) або внесок власника (капітал).']
    }
  };
  function indicatorText(ind, lang) {
    curLang = lang === 'uk' ? 'uk' : 'en';
    var m = IND[curLang][ind.id];
    var text = m[1].replace(/\{(\w+)\}/g, function (_, k) { return typeof ind.params[k] === 'number' ? f(ind.params[k]) : ''; });
    return { title: m[0], text: text };
  }

  /* ---------------- misc ---------------- */

  function uid() {
    var b = new Uint8Array(8);
    (root.crypto || globalThis.crypto).getRandomValues(b);
    return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  root.FTHCore = {
    version: CORE_VERSION, EPS: EPS, MAX_BYTES: MAX_BYTES,
    buildModel: buildModel, catLabel: catLabel, lineLabel: lineLabel,
    normCode: normCode, num: num, isAccount: isAccount, parseSheet: parseSheet, sniff: sniff, readWorkbook: readWorkbook,
    mappedCategory: mappedCategory, compute: compute, journalBalance: journalBalance,
    diagnose: diagnose, checkText: checkText, indicatorText: indicatorText,
    leaseCalc: leaseCalc, eclCalc: eclCalc, fxCalc: fxCalc, deferredTaxCalc: deferredTaxCalc,
    snapshot: snapshot, round2: round2, uid: uid
  };
})(typeof window !== 'undefined' ? window : globalThis);
