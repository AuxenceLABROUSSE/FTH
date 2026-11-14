/* Preliminary IFRS tool (/ifrs-tool, /ifrs-tool-ua).
   Everything happens in this page: the trial balance (ОСВ) is read with SheetJS from the
   file the visitor picks, and computed here. This script makes no network call (no fetch,
   XHR, beacon or form): the file never leaves the visitor's computer.

   Rules (also in tools/reference-ifrs.py, which checks the figures):
   - net = debit - credit (opening, period movement, closing); class 0 (off-balance) ignored;
   - a parent account (10) is used only if none of its sub-accounts in the file (103, 104...)
     has an amount, so nothing is counted twice; a parent whose amount differs from the sum
     of its sub-accounts is reported;
   - IFRS category: the account itself in the FTH mapping, else its longest prefix of at
     least 2 characters (as find_type_for_account in the FTH scripts); the visitor can change it;
   - balance sheet from classes 1-6, equity and liabilities shown as -net;
   - the result not yet closed to retained earnings is -(sum of class 7-9 balances): it is
     added to retained earnings, and is 0 when the TB is already closed through 79;
   - P&L from class 7-9 period movements (79x excluded) shown as -net; if accounts were
     closed through 79 during the period, the net movement is ~0, so the P&L uses the natural
     side instead (credit turnover of class 7, debit turnover of class 9 or 8, debit of the
     revenue deductions 704/7092) and says so. */
(function () {
  'use strict';
  var D = window.FTH_IFRS_DATA;
  var UK = document.documentElement.lang === 'uk';
  var T = UK ? {
    nca: 'Необоротні активи', ca: 'Оборотні активи', totalAssets: 'Усього активів',
    eq: 'Власний капітал', totalEquity: 'Усього власного капіталу',
    ncl: 'Довгострокові зобов’язання', cl: 'Поточні зобов’язання', totalLiab: 'Усього зобов’язань',
    totalEqLiab: 'Усього капіталу та зобов’язань', opening: 'На початок', closing: 'На кінець',
    item: 'Стаття', period: 'За період', line: 'Стаття', unplacedBs: 'Не класифіковано (рахунки 1–6)',
    revenue: 'Дохід від реалізації', gross: 'Валовий прибуток', operating: 'Операційний прибуток',
    pbt: 'Прибуток до оподаткування', unplacedPl: 'Не класифіковано (рахунки 7–9)', profit: 'Прибуток (збиток) за період',
    account: 'Рахунок', name: 'Назва', category: 'Категорія МСФЗ', status: 'Статус',
    exact: 'з мапінгу FTH', viaPrefix: 'за групою ', manual: 'змінено вами', unknown: 'немає категорії',
    unplaced: 'категорія без статті', closingAcc: 'рахунок закриття, не входить до звітів',
    none: '— не класифіковано —', noLine: ' (без статті у звітах)',
    checkOk: 'Контроль: активи = капітал + зобов’язання (різниця 0,00 на початок і на кінець).',
    checkKo: 'Контроль не пройдено: активи − (капітал + зобов’язання) = ',
    checkKoUnplaced: '. Некласифіковані рахунки 1–6 із сумами: ',
    resultAdded: 'Рік не закрито в обліку: результат, ще не перенесений на рахунок 44 (', resultAdded2: '), додано до нерозподіленого прибутку.',
    resultClosed: 'Рік уже закрито через рахунок 79: результат вже у нерозподіленому прибутку, нічого не додано.',
    naturalSide: 'Доходи й витрати закрито через рахунок 79 протягом періоду: звіт про прибутки та збитки складено за оборотами (кредит класу 7, дебет класу 9), без урахування сторнувань. Перевірте.',
    summary: function (n, u) { return n + ' рахунків із сумами' + (u ? ', з них ' + u + ' потребують категорії.' : ', усі класифіковано.'); },
    tbKo: 'Сальдо ОСВ не збігаються (дебет − кредит = ', tbKo2: '). Перевірте структуру файлу.',
    parentKo: function (p, x) { return 'Рахунок ' + p + ' не дорівнює сумі своїх субрахунків (різниця ' + x + '): використано субрахунки.'; },
    loading: 'Читання файлу на вашому комп’ютері…', loaded: function (n) { return 'Файл прочитано: ' + n + ' рахунків. Нічого не надіслано.'; },
    demoLoaded: 'Завантажено приклад: ОСВ «Добро» за 2015 р.', noRows: 'У файлі не знайдено рахунків. Потрібна ОСВ: рахунок у колонці A, далі сальдо на початок, обороти, сальдо на кінець (дебет / кредит).',
    readError: 'Не вдалося прочитати файл: ', fromFile: 'з файлу'
  } : {
    nca: 'Non-current assets', ca: 'Current assets', totalAssets: 'Total assets',
    eq: 'Equity', totalEquity: 'Total equity',
    ncl: 'Non-current liabilities', cl: 'Current liabilities', totalLiab: 'Total liabilities',
    totalEqLiab: 'Total equity and liabilities', opening: 'Opening', closing: 'Closing',
    item: 'Line item', period: 'Period', line: 'Line item', unplacedBs: 'Not classified (accounts 1–6)',
    revenue: 'Revenue', gross: 'Gross profit', operating: 'Profit from operations',
    pbt: 'Profit before tax', unplacedPl: 'Not classified (accounts 7–9)', profit: 'Profit (loss) for the period',
    account: 'Account', name: 'Name', category: 'IFRS category', status: 'Status',
    exact: 'FTH mapping', viaPrefix: 'via group ', manual: 'changed by you', unknown: 'no category',
    unplaced: 'category with no line', closingAcc: 'closing account, not in the statements',
    none: '— not classified —', noLine: ' (no statement line)',
    checkOk: 'Check: assets = equity + liabilities (difference 0.00 at opening and closing).',
    checkKo: 'Check failed: assets − (equity + liabilities) = ',
    checkKoUnplaced: '. Unclassified accounts 1–6 with amounts: ',
    resultAdded: 'The year is not closed in the books: the result not yet transferred to account 44 (', resultAdded2: ') is added to retained earnings.',
    resultClosed: 'The year is already closed through account 79: the result is in retained earnings, nothing added.',
    naturalSide: 'Income and expenses were closed through account 79 during the period: the P&L is built from turnovers (credit of class 7, debit of class 9), reversals not netted. Please check.',
    summary: function (n, u) { return n + ' accounts with amounts' + (u ? ', ' + u + ' need a category.' : ', all classified.'); },
    tbKo: 'The trial balance does not balance (debit − credit = ', tbKo2: '). Check the file layout.',
    parentKo: function (p, x) { return 'Account ' + p + ' differs from the sum of its sub-accounts (difference ' + x + '): the sub-accounts are used.'; },
    loading: 'Reading the file on your computer…', loaded: function (n) { return 'File read: ' + n + ' accounts. Nothing was sent.'; },
    demoLoaded: 'Sample loaded: trial balance of “Добро”, 2015.', noRows: 'No accounts found in the file. Expected a Ukrainian trial balance (ОСВ): account in column A, then opening balance, turnovers and closing balance (debit / credit).',
    readError: 'The file could not be read: ', fromFile: 'from the file'
  };
  var SECTIONS = { nca: T.nca, ca: T.ca, eq: T.eq, ncl: T.ncl, cl: T.cl };
  var fmt = new Intl.NumberFormat(UK ? 'uk-UA' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var EPS = 0.005;
  var money = function (v) { return fmt.format(Math.abs(v) < EPS ? 0 : v); };

  var lineOf = {};
  D.balanceLines.forEach(function (l) { l.categories.forEach(function (c) { lineOf[c] = { st: 'bs', line: l }; }); });
  D.pnlLines.forEach(function (l) { l.categories.forEach(function (c) { lineOf[c] = { st: 'pl', line: l }; }); });
  var catLabel = function (c) { return UK ? (D.categoryUk[c] || c) : c; };
  var label = function (l) { return UK ? l.uk : l.en; };

  function normCode(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return isFinite(v) ? String(v) : '';
    var s = String(v).trim();
    return /^\d+\.0$/.test(s) ? s.slice(0, -2) : s;
  }
  /* Amount cell: a number, or text such as "1 234,56", "1,234.56", "1.234,56", "-1234.5".
     Spaces are dropped; with both "," and "." the last one is the decimal mark; with only one
     kind, several occurrences are thousands separators and a single one is the decimal mark. */
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined) return 0;
    var t = String(v).replace(/[\s  ']/g, '');
    if (!t) return 0;
    var c = t.lastIndexOf(','), d = t.lastIndexOf('.');
    if (c >= 0 && d >= 0) t = c > d ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    else if (c >= 0) t = t.split(',').length > 2 ? t.replace(/,/g, '') : t.replace(',', '.');
    else if (d >= 0 && t.split('.').length > 2) t = t.replace(/\./g, '');
    var n = Number(t);
    return isFinite(n) ? n : 0;
  }
  /* An account of the Ukrainian chart: 1 to 4 digits (class, account, sub-account, 1C/BAS
     sub-sub-account), optionally with a short suffix (36Р, 4800.2). A longer number in column A
     (5 digits or more: analytic codes, tax IDs, item numbers) is an analytic line, ignored. */
  var isAccount = function (code) { return /^\d{1,4}(?:[.A-Za-zЀ-ӿ][0-9A-Za-zЀ-ӿ]{0,3})?$/.test(code); };
  var classOf = function (code) { return code.charAt(0); };
  var isRevenueDeduction = function (code) { return D.revenueDeductions.some(function (d) { return code.indexOf(d) === 0; }); };

  // Mapping category of an account: exact (even a one-digit class such as 6), else longest prefix of >= 2 characters.
  function mappedCategory(code) {
    var exact = D.mapping[code];
    if (exact) return { category: exact.category, via: '', name: exact.name };
    for (var i = code.length - 1; i >= 2; i--) {
      var m = D.mapping[code.slice(0, i)];
      if (m) return { category: m.category, via: i === code.length ? '' : code.slice(0, i), name: m.name };
    }
    return { category: '', via: '', name: '' };
  }

  /* tb.rows: [code, openDebit, openCredit, periodDebit, periodCredit, closeDebit, closeCredit]
     overrides: { code: category } chosen by the visitor. */
  function compute(tb, overrides) {
    overrides = overrides || {};
    var acc = {};
    tb.rows.forEach(function (r) {
      var code = normCode(r[0]);
      if (!isAccount(code) || code.charAt(0) === '0') return;
      var a = acc[code] || (acc[code] = { o: 0, t: 0, c: 0, td: 0, tc: 0 });
      a.o += num(r[1]) - num(r[2]); a.td += num(r[3]); a.tc += num(r[4]); a.c += num(r[5]) - num(r[6]);
      a.t = a.td - a.tc;
    });
    var amounts = function (a) { return Math.abs(a.o) > 1e-9 || Math.abs(a.c) > 1e-9 || Math.abs(a.td) > 1e-9 || Math.abs(a.tc) > 1e-9; };
    var codes = Object.keys(acc).filter(function (c) { return amounts(acc[c]); }).sort();
    var hasSub = function (p) { return codes.some(function (c) { return c !== p && c.indexOf(p) === 0; }); };
    var leaves = codes.filter(function (c) { return !hasSub(c); });
    var warnings = [], warned = {};
    codes.forEach(function (p) {
      if (!hasSub(p)) return;
      var subs = leaves.filter(function (c) { return c.indexOf(p) === 0; });
      ['o', 'c'].forEach(function (k) {
        var d = acc[p][k] - subs.reduce(function (s, c) { return s + acc[c][k]; }, 0);
        if (Math.abs(d) > 0.5 && Math.abs(acc[p][k]) > EPS && !warned[p]) { warned[p] = true; warnings.push(T.parentKo(p, money(d))); }
      });
    });

    var closed79 = codes.some(function (c) { return c.indexOf('79') === 0 && (acc[c].td || acc[c].tc); });
    var turnover9 = leaves.some(function (c) { return classOf(c) === '9' && (acc[c].td || acc[c].tc); });
    var unplacedBsCount = 0, bs = {}, pl = {}, unplacedBs = [0, 0], unplacedPl = 0, plBal = [0, 0], tbSum = [0, 0];
    var accounts = leaves.map(function (code) {
      var a = acc[code], m = mappedCategory(code);
      var manual = Object.prototype.hasOwnProperty.call(overrides, code);
      var cat = manual ? overrides[code] : m.category;
      var st = '123456'.indexOf(classOf(code)) >= 0 ? 'bs' : 'pl';
      var where = lineOf[cat] && lineOf[cat].st === st ? lineOf[cat].line : null;
      var status = code.indexOf('79') === 0 ? 'closingAcc' : !cat ? 'unknown' : !where ? 'unplaced' : manual ? 'manual' : m.via ? 'via' : 'exact';
      tbSum[0] += a.o; tbSum[1] += a.c;
      if (st === 'bs') {
        if (where) { var b = bs[where.id] || (bs[where.id] = [0, 0]); b[0] += a.o; b[1] += a.c; }
        else { unplacedBs[0] += a.o; unplacedBs[1] += a.c; if (Math.abs(a.o) > EPS || Math.abs(a.c) > EPS) unplacedBsCount++; }
      } else {
        plBal[0] += a.o; plBal[1] += a.c;
        if (code.indexOf('79') !== 0) {
          var k = classOf(code), v;
          if (!closed79) v = -a.t;
          else if (isRevenueDeduction(code)) v = -a.td;
          else if (k === '7') v = a.tc;
          else if (k === '8' && turnover9) v = 0;
          else v = -a.td;
          if (where) pl[where.id] = (pl[where.id] || 0) + v; else unplacedPl += v;
        }
      }
      return { code: code, name: m.name, via: m.via, category: cat, statement: st, status: status,
        opening: a.o, movement: a.t, closing: a.c };
    });

    // Balance sheet: assets +net, equity and liabilities -net; result not yet closed added to retained earnings.
    var resultAdded = [-plBal[0], -plBal[1]];
    var sections = {}, balance = [];
    D.balanceLines.forEach(function (l) {
      var v = bs[l.id] || [0, 0], sign = l.section === 'nca' || l.section === 'ca' ? 1 : -1;
      var row = { id: l.id, label: label(l), section: l.section, values: [sign * v[0], sign * v[1]] };
      if (l.id === 'retained_earnings') { row.values[0] += resultAdded[0]; row.values[1] += resultAdded[1]; }
      var s = sections[l.section] || (sections[l.section] = [0, 0]);
      s[0] += row.values[0]; s[1] += row.values[1];
      balance.push(row);
    });
    var tot = function (a, b) { return [0, 1].map(function (i) { return (sections[a] || [0, 0])[i] + (b ? (sections[b] || [0, 0])[i] : 0); }); };
    var assets = tot('nca', 'ca'), equity = tot('eq'), liabilities = tot('ncl', 'cl');
    var diff = [0, 1].map(function (i) { return assets[i] - equity[i] - liabilities[i]; });

    var p = function (id) { return pl[id] || 0; };
    var gross = p('revenue') + p('cost_of_sales') + p('impairment');
    var operating = gross + p('other_income') + p('administrative') + p('distribution') + p('other_expenses');
    var pbt = operating + p('finance_income') + p('finance_costs');
    var profit = pbt + p('tax') + unplacedPl;
    if (Math.abs(tbSum[0]) > 0.5 || Math.abs(tbSum[1]) > 0.5) warnings.unshift(T.tbKo + money(Math.abs(tbSum[0]) > 0.5 ? tbSum[0] : tbSum[1]) + T.tbKo2);
    var checkOk = Math.abs(diff[0]) < EPS && Math.abs(diff[1]) < EPS && unplacedBsCount === 0;
    return { checkOk: checkOk, unplacedBsCount: unplacedBsCount, accounts: accounts, balance: balance, sections: sections, assets: assets, equity: equity, liabilities: liabilities,
      diff: diff, unplacedBs: unplacedBs, resultAdded: resultAdded, closed79: closed79, pl: pl, unplacedPl: unplacedPl,
      gross: gross, operating: operating, pbt: pbt, profit: profit, revenue: p('revenue'), warnings: warnings };
  }

  /* Rows of the first sheet (array of arrays) -> { company, period, rows }.
     Columns: found from the header row (Дебет / Кредит / Debit / Credit, three pairs; a pair
     may span several columns, as the B+C opening debit of 1C/BAS exports), else the ОСВ
     layout of the FTH scripts: A account, B+C, D, E, F, G, H. */
  function parseSheet(grid) {
    var company = '', period = '', groups = null, start = 0;
    for (var r = 0; r < Math.min(grid.length, 15); r++) {
      var row = grid[r] || [];
      row.forEach(function (cell) {
        var s = String(cell).trim(), m = s.match(/(відомість|ведомость|balance)[^]*?\s(за|for)\s+(.+)$/i);
        if (m && !period) period = m[3];
      });
      if (r === 0 && row[0] && !/(відомість|ведомость)/i.test(String(row[0]))) company = String(row[0]).trim();
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
        start = r + 1;
      }
    }
    groups = groups || [[1, 2], [3], [4], [5], [6], [7]];
    var rows = [];
    for (var i = start; i < grid.length; i++) {
      var g = grid[i] || [];
      // Off-balance accounts 01-09 typed as numbers arrive as 1..9: keep them in class 0 (ignored).
      var code = typeof g[0] === 'number' && g[0] >= 1 && g[0] <= 9 && Number.isInteger(g[0]) ? '0' + g[0] : normCode(g[0]);
      if (!isAccount(code)) continue;
      rows.push([code].concat(groups.map(function (cols) { return cols.reduce(function (s, c) { return s + num(g[c]); }, 0); })));
    }
    return { company: company, period: period, rows: rows };
  }

  window.FTHIFRS = { compute: compute, parseSheet: parseSheet };

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ifrsDemo')) return;
  var tb = null, overrides = {};

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function numCell(tag, v, total) {
    var c = el(tag, 'ifrs-num' + (v < -EPS ? ' is-negative' : ''), money(v));
    if (total) c.setAttribute('data-total', total);
    return c;
  }
  function tr(cells, cls) { var r = el('tr', cls); cells.forEach(function (c) { r.appendChild(c); }); return r; }
  function head(cols) {
    var h = el('thead');
    h.appendChild(tr(cols.map(function (c, i) { var th = el('th', i ? 'ifrs-num' : '', c); th.scope = 'col'; return th; })));
    return h;
  }
  function th(text) { var h = el('th', '', text); h.scope = 'row'; return h; }

  function renderAccounts(res) {
    var wrap = $('ifrsAccounts'); wrap.textContent = '';
    var table = el('table', 'ifrs-table ifrs-accounts');
    table.appendChild(head([T.account, T.opening, T.period, T.closing, T.category]));
    var body = el('tbody'), todo = 0;
    res.accounts.forEach(function (a) {
      var flagged = a.status === 'unknown' || a.status === 'unplaced';
      if (flagged) todo++;
      var codeCell = th(a.code);
      if (a.name) codeCell.appendChild(el('span', 'ifrs-acc-name', a.name));
      var catCell = el('td', 'ifrs-cat');
      if (a.status === 'closingAcc') catCell.appendChild(el('span', 'ifrs-status', T.closingAcc));
      else {
        var sel = el('select'); sel.setAttribute('aria-label', T.category + ' — ' + a.code); sel.setAttribute('data-code', a.code);
        sel.appendChild(new Option(T.none, ''));
        var cats = (a.statement === 'bs' ? D.balanceLines : D.pnlLines).reduce(function (l, x) { return l.concat(x.categories); }, []);
        if (a.category && cats.indexOf(a.category) < 0) sel.appendChild(new Option(catLabel(a.category) + T.noLine, a.category));
        cats.forEach(function (c) { sel.appendChild(new Option(catLabel(c), c)); });
        sel.value = a.category;
        sel.addEventListener('change', function () {
          overrides[a.code] = sel.value;
          var res = run();
          // The table is rebuilt: give the focus back to this account's list, and read out the new totals.
          var again = $('ifrsAccounts').querySelector('select[data-code="' + a.code + '"]');
          if (again) again.focus();
          $('ifrsLive').textContent = T.totalAssets + ' ' + money(res.assets[1]) + '; ' + T.totalEquity + ' ' + money(res.equity[1]) + '; ' + T.totalLiab + ' ' + money(res.liabilities[1]) + '. ' + $('ifrsCheck').textContent;
        });
        catCell.appendChild(sel);
        var st = { exact: T.exact, via: T.viaPrefix + a.via, manual: T.manual, unknown: T.unknown, unplaced: T.unplaced }[a.status];
        catCell.appendChild(el('span', 'ifrs-status' + (flagged ? ' is-flagged' : ''), st));
      }
      body.appendChild(tr([codeCell, numCell('td', a.opening), numCell('td', a.movement), numCell('td', a.closing), catCell], flagged ? 'is-flagged' : ''));
    });
    table.appendChild(body); wrap.appendChild(table);
    $('ifrsClassSummary').textContent = T.summary(res.accounts.length, todo);
    var w = $('ifrsWarnings'); w.textContent = '';
    res.warnings.forEach(function (m) { w.appendChild(el('li', '', m)); });
    w.hidden = !res.warnings.length;
  }

  function renderBalance(res) {
    var table = $('ifrsBalance'); table.textContent = '';
    table.appendChild(head([T.item, T.opening, T.closing]));
    var body = el('tbody');
    var sub = function (text) { var c = el('th', '', text); c.colSpan = 3; c.scope = 'colgroup'; return tr([c], 'ifrs-sub'); };
    var total = function (text, v, key, cls) { return tr([th(text), numCell('td', v[0], key + '-open'), numCell('td', v[1], key + '-close')], cls || 'ifrs-total'); };
    [['nca', 'ca', T.totalAssets, res.assets, 'assets'], ['eq', null, T.totalEquity, res.equity, 'equity'], ['ncl', 'cl', T.totalLiab, res.liabilities, 'liabilities']].forEach(function (g) {
      [g[0], g[1]].forEach(function (s) {
        if (!s) return;
        var rows = res.balance.filter(function (l) { return l.section === s && (Math.abs(l.values[0]) > EPS || Math.abs(l.values[1]) > EPS); });
        if (rows.length) body.appendChild(sub(SECTIONS[s]));
        rows.forEach(function (l) { body.appendChild(tr([th(l.label), numCell('td', l.values[0]), numCell('td', l.values[1])])); });
      });
      body.appendChild(total(g[2], g[3], g[4]));
    });
    body.appendChild(total(T.totalEqLiab, [res.equity[0] + res.liabilities[0], res.equity[1] + res.liabilities[1]], 'equity-liabilities', 'ifrs-total ifrs-grand'));
    if (Math.abs(res.unplacedBs[0]) > EPS || Math.abs(res.unplacedBs[1]) > EPS) body.appendChild(total(T.unplacedBs, res.unplacedBs, 'unplaced', 'ifrs-unplaced'));
    table.appendChild(body);
    var ok = res.checkOk, check = $('ifrsCheck');
    check.className = 'ifrs-check ' + (ok ? 'is-ok' : 'is-ko');
    check.textContent = ok ? T.checkOk : T.checkKo + money(res.diff[0]) + ' / ' + money(res.diff[1]) + T.checkKoUnplaced + res.unplacedBsCount + ' (' + money(res.unplacedBs[0]) + ' / ' + money(res.unplacedBs[1]) + ')';
    var added = Math.abs(res.resultAdded[0]) > EPS || Math.abs(res.resultAdded[1]) > EPS;
    $('ifrsResultNote').textContent = added ? T.resultAdded + T.opening.toLowerCase() + ' ' + money(res.resultAdded[0]) + ', ' + T.closing.toLowerCase() + ' ' + money(res.resultAdded[1]) + ' UAH' + T.resultAdded2 : T.resultClosed;
  }

  function renderPnl(res) {
    var table = $('ifrsPnl'); table.textContent = '';
    table.appendChild(head([T.line, T.period]));
    var body = el('tbody');
    var line = function (id) { var l = D.pnlLines.filter(function (x) { return x.id === id; })[0]; var v = res.pl[id] || 0; if (Math.abs(v) > EPS || id === 'revenue') body.appendChild(tr([th(label(l)), numCell('td', v, id === 'revenue' ? 'revenue' : '')])); };
    var total = function (text, v, key, cls) { body.appendChild(tr([th(text), numCell('td', v, key)], cls || 'ifrs-total')); };
    ['revenue', 'cost_of_sales', 'impairment'].forEach(line); total(T.gross, res.gross);
    ['other_income', 'administrative', 'distribution', 'other_expenses'].forEach(line); total(T.operating, res.operating);
    ['finance_income', 'finance_costs'].forEach(line); total(T.pbt, res.pbt);
    line('tax');
    if (Math.abs(res.unplacedPl) > EPS) body.appendChild(tr([th(T.unplacedPl), numCell('td', res.unplacedPl)], 'ifrs-unplaced'));
    total(T.profit, res.profit, 'profit', 'ifrs-total ifrs-grand');
    table.appendChild(body);
    $('ifrsPnlNote').textContent = res.closed79 ? T.naturalSide : '';
    $('ifrsPnlNote').hidden = !res.closed79;
  }

  function run() {
    var res = compute(tb, overrides);
    renderAccounts(res); renderBalance(res); renderPnl(res);
    ['ifrsStep3', 'ifrsStep4'].forEach(function (id) { $(id).hidden = false; });
    return res;
  }

  function status(message, isError) {
    var st = $('ifrsStatus');
    st.textContent = message;
    st.className = 'ifrs-load-status' + (isError ? ' is-error' : '');
  }

  // Unreadable file or no accounts: no figures from a previous file stay on screen.
  function fail(message) {
    tb = null; overrides = {};
    ['ifrsStep3', 'ifrsStep4'].forEach(function (id) { $(id).hidden = true; });
    $('ifrsPeriod').textContent = '—';
    $('ifrsCompany').textContent = '—';
    status(message, true);
  }

  function load(data, message) {
    tb = data; overrides = {};
    $('ifrsPeriod').textContent = data.period || '—';
    $('ifrsCompany').textContent = data.company || '—';
    status(message, false);
    run();
  }

  $('ifrsDemo').addEventListener('click', function () {
    load(D.demo, T.demoLoaded);
    $('ifrsFile').value = '';
    $('ifrsStep3').scrollIntoView({ behavior: 'auto', block: 'start' });
  });

  $('ifrsFile').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    status(T.loading, false);
    file.arrayBuffer().then(function (buf) {
      var wb = window.XLSX.read(buf, { type: 'array' });
      var grid = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
      var data = parseSheet(grid);
      if (!data.rows.length) { fail(T.noRows); return; }
      load(data, T.loaded(data.rows.length));
    }).catch(function (e) { fail(T.readError + (e && e.message ? e.message : e)); });
  });
})();
