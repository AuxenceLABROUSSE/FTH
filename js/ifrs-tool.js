/* FTH Reporting Portal, client side (/ifrs-tool, /ifrs-tool-ua).

   Steps: 1 upload -> 2 data checks -> 3 mapping -> 4 preliminary statements -> 5 IFRS readiness
   -> 6 secure hand-over to FTH; plus "results from FTH" (signed release opened with a passphrase).

   Privacy: the ОСВ is read and computed in this page (js/fth/core.js). This script makes no
   network call (no fetch, XHR, beacon or form submit); the only output is a file the visitor
   saves: an Excel export, or a package sealed to the FTH public key (js/fth/vault.js) that only
   FTH can open. Nothing is stored in the browser. */
(function () {
  'use strict';
  var C = window.FTHCore, V = window.FTHVault;
  var $ = function (id) { return document.getElementById(id); };
  if (!C || !$('fthpUpload')) return;
  var M = C.buildModel(window.FTH_IFRS_DATA, window.FTH_IFRS_MODEL);
  var KEYS = window.FTH_KEYS;
  var LANG = document.documentElement.lang === 'uk' ? 'uk' : 'en';
  var UK = LANG === 'uk';

  var T = UK ? {
    nca: 'Необоротні активи', ca: 'Оборотні активи', totalAssets: 'Усього активів', eq: 'Власний капітал', totalEquity: 'Усього власного капіталу',
    ncl: 'Довгострокові зобов’язання', cl: 'Поточні зобов’язання', totalLiab: 'Усього зобов’язань', totalEqLiab: 'Усього капіталу та зобов’язань',
    opening: 'На початок', closing: 'На кінець', item: 'Стаття', period: 'За період', unplacedBs: 'Не класифіковано (рахунки 1–6)',
    gross: 'Валовий прибуток', operating: 'Операційний прибуток', pbt: 'Прибуток до оподаткування', unplacedPl: 'Не класифіковано (рахунки 7–9)', profit: 'Прибуток (збиток) за період',
    account: 'Рахунок', category: 'Категорія МСФЗ', movement: 'Обороти (нетто)',
    st: { exact: '', via: 'за групою ', fixed: '', manual: 'змінено Вами', unknown: 'потрібна категорія', unplaced: 'категорія без статті' },
    closingAcc: 'рахунок закриття, не входить до звітів', none: '— оберіть категорію —', noLine: ' (без статті)',
    reading: 'Читання файлу на Вашому комп’ютері…', read: function (n, s) { return 'Прочитано ' + n + ' рахунків з аркуша «' + s + '». Нічого не надіслано.'; },
    demo1: 'Приклад «Добро»: проста ОСВ, рік не закрито.', demo2: 'Приклад «Північ Софт», 2025: IT-компанія, рік закрито через 79.',
    err: { tooLarge: 'Файл більший за 15 МБ. Вивантажте ОСВ без аналітики.', badType: 'Це не файл Excel (.xls або .xlsx). Перевірте формат вивантаження.', unreadable: 'Не вдалося прочитати файл. ', noRows: 'У файлі не знайдено рахунків. Потрібна ОСВ: рахунок у колонці A, далі сальдо на початок, обороти й сальдо на кінець (дебет / кредит).' },
    tiles: ['Рахунків', 'Класифіковано', 'Перевірок пройдено', 'Баланс'], balancedYes: 'сходиться', balancedNo: 'не сходиться',
    shown: function (n, t) { return 'Показано ' + n + ' з ' + t; },
    kpi: ['Дохід', 'Прибуток за період', 'Усього активів', 'Власний капітал'],
    levels: { high: 'Ймовірно суттєво', medium: 'Перевірити', info: 'До уваги' },
    readinessSummary: function (h, m) { return h + ' ймовірно суттєвих і ' + m + ' до перевірки напрямів коригувань МСФЗ.'; },
    sent: function (id) { return 'Пакет зашифровано ключем FTH ' + id + '. Надішліть файл на contact@fthadvisory.com або через Ваш захищений канал: відкрити його може лише FTH.'; },
    needConsent: 'Підтвердьте, що маєте право передати ці дані FTH.', needName: 'Вкажіть назву компанії та контактну особу.', noKeys: 'Ключ FTH недоступний: оновіть сторінку.',
    sealing: 'Шифрування…', resOpening: 'Перевірка підпису й розшифрування…', resBad: 'Неправильна фраза-пароль або пошкоджений файл.', resNot: 'Це не файл результатів FTH (.fthres).',
    resVerified: 'Підпис FTH перевірено: результати не змінювалися після випуску.', resUnverified: 'Підпис не відповідає ключу FTH цього сайту: не довіряйте цьому файлу.',
    status: { draft: 'Чернетка', in_review: 'На перевірці', reviewed: 'Перевірено FTH', released: 'Випущено FTH' },
    releasedBy: 'Випустив', releasedAt: 'Дата', engagement: 'Проєкт', statusL: 'Статус', notesFTH: 'Коментар FTH', local: 'П(С)БО', adj: 'Коригування', ifrs: 'МСФЗ',
    xlsxName: 'FTH-попередня-звітність', sheetBs: 'Баланс', sheetPl: 'Прибутки та збитки', sheetMap: 'Мапінг', sheetChecks: 'Перевірки', nameCol: 'Назва', statusCol: 'Статус',
    prelimTag: 'ПОПЕРЕДНЬО — не є звітністю за МСФЗ'
  } : {
    nca: 'Non-current assets', ca: 'Current assets', totalAssets: 'Total assets', eq: 'Equity', totalEquity: 'Total equity',
    ncl: 'Non-current liabilities', cl: 'Current liabilities', totalLiab: 'Total liabilities', totalEqLiab: 'Total equity and liabilities',
    opening: 'Opening', closing: 'Closing', item: 'Line item', period: 'Period', unplacedBs: 'Not classified (accounts 1–6)',
    gross: 'Gross profit', operating: 'Operating profit', pbt: 'Profit before tax', unplacedPl: 'Not classified (accounts 7–9)', profit: 'Profit (loss) for the period',
    account: 'Account', category: 'IFRS category', movement: 'Net movement',
    st: { exact: '', via: 'via group ', fixed: '', manual: 'changed by you', unknown: 'needs a category', unplaced: 'category with no line' },
    closingAcc: 'closing account, not in the statements', none: '— choose a category —', noLine: ' (no line)',
    reading: 'Reading the file on your computer…', read: function (n, s) { return n + ' accounts read from sheet “' + s + '”. Nothing was sent.'; },
    demo1: 'Sample “Добро”: a simple TB, year not closed.', demo2: 'Sample “Північ Софт”, 2025: an IT company, year closed through 79.',
    err: { tooLarge: 'The file is over 15 MB. Export the trial balance without analytics.', badType: 'This is not an Excel file (.xls or .xlsx). Check the export format.', unreadable: 'The file could not be read. ', noRows: 'No accounts found. Expected a Ukrainian trial balance (ОСВ): account in column A, then opening balance, turnovers and closing balance (debit / credit).' },
    tiles: ['Accounts', 'Classified', 'Checks passed', 'Balance sheet'], balancedYes: 'balances', balancedNo: 'does not balance',
    shown: function (n, t) { return n + ' of ' + t + ' shown'; },
    kpi: ['Revenue', 'Profit for the period', 'Total assets', 'Equity'],
    levels: { high: 'Likely material', medium: 'To check', info: 'For information' },
    readinessSummary: function (h, m) { return h + ' likely material and ' + m + ' to-check areas of IFRS adjustment.'; },
    sent: function (id) { return 'Package encrypted with FTH key ' + id + '. E-mail the file to contact@fthadvisory.com or share it through your secure channel: only FTH can open it.'; },
    needConsent: 'Please confirm you are authorised to share this data with FTH.', needName: 'Please enter the company name and a contact person.', noKeys: 'The FTH key is not available: reload the page.',
    sealing: 'Encrypting…', resOpening: 'Checking the signature and decrypting…', resBad: 'Wrong passphrase or damaged file.', resNot: 'This is not an FTH results file (.fthres).',
    resVerified: 'FTH signature verified: the results have not been altered since release.', resUnverified: 'The signature does not match the FTH key of this site: do not rely on this file.',
    status: { draft: 'Draft', in_review: 'In review', reviewed: 'Reviewed by FTH', released: 'Released by FTH' },
    releasedBy: 'Released by', releasedAt: 'Date', engagement: 'Engagement', statusL: 'Status', notesFTH: 'Note from FTH', local: 'Local GAAP', adj: 'Adjustments', ifrs: 'IFRS',
    xlsxName: 'FTH-preliminary-statements', sheetBs: 'Balance sheet', sheetPl: 'Profit or loss', sheetMap: 'Mapping', sheetChecks: 'Checks', nameCol: 'Name', statusCol: 'Status',
    prelimTag: 'PRELIMINARY — not IFRS financial statements'
  };
  var SECTION = { nca: T.nca, ca: T.ca, eq: T.eq, ncl: T.ncl, cl: T.cl };
  var fmt = new Intl.NumberFormat(UK ? 'uk-UA' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var money = function (v) { return fmt.format(Math.abs(v) < C.EPS ? 0 : v); };
  var bsLine = {}, plLine = {};
  M.balanceLines.forEach(function (l) { bsLine[l.id] = l; });
  M.pnlLines.forEach(function (l) { plLine[l.id] = l; });

  var state = { tb: null, source: null, overrides: {}, answers: {}, res: null, filter: 'all', query: '' };

  /* ---------- DOM helpers ---------- */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  function numCell(tag, v, key) { var c = el(tag, 'ifrs-num' + (v < -C.EPS ? ' is-negative' : ''), money(v)); if (key) c.setAttribute('data-total', key); return c; }
  function tr(cells, cls) { var r = el('tr', cls); cells.forEach(function (c) { r.appendChild(c); }); return r; }
  function rowTh(text) { var h = el('th', '', text); h.scope = 'row'; return h; }
  function head(cols) { var h = el('thead'); h.appendChild(tr(cols.map(function (c, i) { var t = el('th', i ? 'ifrs-num' : '', c); t.scope = 'col'; return t; }))); return h; }
  function say(id, msg, kind) { var s = $(id); s.textContent = msg || ''; s.className = 'fthp-status' + (kind ? ' is-' + kind : ''); }
  function download(name, data, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    var url = URL.createObjectURL(blob), a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function slug(s) { return String(s || 'company').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'company'; }

  /* ---------- steps ---------- */
  var STEPS = ['fthpUpload', 'fthpChecks', 'fthpMapping', 'fthpStatements', 'fthpReadiness', 'fthpSend'];
  function unlock(on) {
    STEPS.slice(1).forEach(function (id) { $(id).hidden = !on; });
    document.querySelectorAll('.fthp-steps a').forEach(function (a, i) {
      var locked = i > 0 && i < STEPS.length && !on;
      a.classList.toggle('is-locked', locked);
      if (locked) a.setAttribute('aria-disabled', 'true'); else a.removeAttribute('aria-disabled');
      a.classList.toggle('is-done', on && i === 0);
    });
  }
  // Current step follows the scroll (IntersectionObserver: no layout reads on scroll).
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        document.querySelectorAll('.fthp-steps a').forEach(function (a) {
          var cur = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('is-current', cur);
          if (cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    STEPS.concat(['fthpResults']).forEach(function (id) { if ($(id)) io.observe($(id)); });
  }
  document.querySelectorAll('.fthp-steps a').forEach(function (a) {
    a.addEventListener('click', function (e) { if (a.classList.contains('is-locked')) { e.preventDefault(); $('fthpFile').focus(); } });
  });

  /* ---------- 1. upload ---------- */
  function load(tb, source, message) {
    state.tb = tb; state.source = source; state.overrides = {};
    $('fthpCompany').textContent = tb.company || '—';
    $('fthpPeriod').textContent = tb.period || '—';
    $('fthpFileName').textContent = source.name;
    $('fthpSha').textContent = source.sha256 ? source.sha256.slice(0, 16) + '…' : '—';
    $('fthpSha').title = source.sha256 || '';
    $('fthpSendCompany').value = tb.company && !/вигадан|fictitious|^Добро$/i.test(tb.company) ? tb.company : '';
    say('fthpStatus', message, 'ok');
    unlock(true);
    run();
  }
  function fail(msg) {
    state.tb = null; state.res = null; unlock(false);
    ['fthpCompany', 'fthpPeriod', 'fthpFileName', 'fthpSha'].forEach(function (id) { $(id).textContent = '—'; });
    say('fthpStatus', msg, 'error');
  }
  function readFile(file) {
    if (!file) return;
    say('fthpStatus', T.reading, '');
    if (file.size > C.MAX_BYTES) { fail(T.err.tooLarge); return; }
    file.arrayBuffer().then(function (buf) {
      var out = C.readWorkbook(buf, window.XLSX);
      if (out.error) { fail(T.err[out.error] + (out.detail || '')); return; }
      return V.sha256(buf).then(function (h) {
        load(out.tb, { name: file.name.slice(0, 120), size: file.size, sha256: h, kind: out.tb.kind, sheet: out.tb.sheet, layout: out.tb.layout }, T.read(out.tb.rows.length, out.tb.sheet));
      });
    }).catch(function (e) { fail(T.err.unreadable + (e && e.message ? e.message : '')); });
  }
  $('fthpFile').addEventListener('change', function () { readFile(this.files && this.files[0]); });
  var drop = $('fthpDrop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
  drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { $('fthpFile').value = ''; readFile(f); } });
  function demo(tb, name, msg) {
    $('fthpFile').value = '';
    load({ company: tb.company, period: tb.period, rows: tb.rows }, { name: name, size: 0, sha256: '', kind: 'sample' }, msg);
    $('fthpChecks').scrollIntoView({ block: 'start' });
  }
  $('fthpDemo1').addEventListener('click', function () { demo(M.demo, 'sample-dobro-2015', T.demo1); });
  $('fthpDemo2').addEventListener('click', function () { demo(window.FTH_IFRS_DEMO_IT, 'sample-pivnich-soft-2025', T.demo2); });

  /* ---------- compute + render ---------- */
  function run() {
    state.res = C.compute(M, state.tb, { overrides: state.overrides });
    renderChecks(); renderMapping(); renderStatements(); renderReadiness();
    return state.res;
  }

  function renderChecks() {
    var r = state.res, passed = r.checks.filter(function (c) { return c.level === 'ok'; }).length, gradable = r.checks.filter(function (c) { return c.level !== 'info'; }).length;
    var tiles = $('fthpTiles'); tiles.textContent = '';
    [[T.tiles[0], String(r.accountCount)], [T.tiles[1], (r.accountCount - r.unknownCount) + ' / ' + r.accountCount], [T.tiles[2], passed + ' / ' + gradable], [T.tiles[3], r.balanced ? T.balancedYes : T.balancedNo]].forEach(function (t, i) {
      var d = el('div', 'fthp-tile' + (i === 3 ? (r.balanced ? ' is-ok' : ' is-ko') : '')); d.appendChild(el('span', '', t[0])); d.appendChild(el('strong', '', t[1])); tiles.appendChild(d);
    });
    var list = $('fthpCheckList'); list.textContent = '';
    r.checks.forEach(function (c) {
      var x = C.checkText(c, LANG), li = el('li', 'fthp-check is-' + c.level);
      var icon = el('span', 'fthp-check-icon', { ok: '✓', warn: '!', error: '×', info: 'i' }[c.level]); icon.setAttribute('aria-hidden', 'true'); li.appendChild(icon);
      var body = el('div'); body.appendChild(el('strong', '', x.title)); body.appendChild(el('p', '', x.text)); li.appendChild(body);
      list.appendChild(li);
    });
  }

  function categoryOptions(sel, a) {
    sel.appendChild(new Option(T.none, ''));
    var lines = a.statement === 'bs' ? M.balanceLines : M.pnlLines;
    var cats = [].concat.apply([], lines.map(function (l) { return l.categories; }));
    if (a.category && cats.indexOf(a.category) < 0) sel.appendChild(new Option(C.catLabel(M, a.category, LANG) + T.noLine, a.category));
    lines.forEach(function (l) {
      var g = el('optgroup'); g.label = C.lineLabel(l, LANG);
      l.categories.forEach(function (c) { g.appendChild(new Option(C.catLabel(M, c, LANG), c)); });
      sel.appendChild(g);
    });
    sel.value = a.category;
  }

  function renderMapping() {
    var r = state.res, wrap = $('fthpAccounts'); wrap.textContent = '';
    var q = state.query.trim().toLowerCase();
    var rows = r.accounts.filter(function (a) {
      var flagged = a.status === 'unknown' || a.status === 'unplaced';
      if (state.filter === 'attention' && !flagged) return false;
      if (state.filter === 'changed' && a.status !== 'manual') return false;
      return !q || a.code.indexOf(q) === 0 || (a.name || '').toLowerCase().indexOf(q) >= 0;
    });
    var table = el('table', 'ifrs-table ifrs-accounts');
    table.appendChild(head([T.account, T.opening, T.movement, T.closing, T.category]));
    var body = el('tbody');
    rows.forEach(function (a) {
      var flagged = a.status === 'unknown' || a.status === 'unplaced';
      var codeCell = rowTh(a.code);
      if (a.name) codeCell.appendChild(el('span', 'ifrs-acc-name', a.name));
      var catCell = el('td', 'ifrs-cat');
      if (a.status === 'closingAcc') catCell.appendChild(el('span', 'ifrs-status', T.closingAcc));
      else {
        var sel = el('select'); sel.setAttribute('aria-label', T.category + ' — ' + a.code); sel.setAttribute('data-code', a.code);
        categoryOptions(sel, a);
        sel.addEventListener('change', function () {
          state.overrides[a.code] = sel.value;
          var res = run();
          var again = $('fthpAccounts').querySelector('select[data-code="' + a.code + '"]');
          if (again) again.focus();
          $('fthpLive').textContent = T.totalAssets + ' ' + money(res.assets[1]) + '. ' + (res.balanced ? T.balancedYes : T.balancedNo) + '.';
        });
        catCell.appendChild(sel);
        var stTxt = a.status === 'via' ? T.st.via + a.via : T.st[a.status];
        if (stTxt) catCell.appendChild(el('span', 'ifrs-status' + (flagged ? ' is-flagged' : ''), stTxt));
      }
      body.appendChild(tr([codeCell, numCell('td', a.opening), numCell('td', a.movement), numCell('td', a.closing), catCell], flagged ? 'is-flagged' : ''));
    });
    table.appendChild(body); wrap.appendChild(table);
    $('fthpShown').textContent = T.shown(rows.length, r.accounts.length);
    var att = r.accounts.filter(function (a) { return a.status === 'unknown' || a.status === 'unplaced'; }).length;
    $('fthpAttCount').textContent = att ? ' (' + att + ')' : '';
  }
  document.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.filter = b.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderMapping();
    });
  });
  $('fthpSearch').addEventListener('input', function () { state.query = this.value; renderMapping(); });

  /* Statements from a snapshot (also used for results released by FTH). opts.split: local / adjustments / IFRS. */
  function renderBalance(table, snap, opts) {
    opts = opts || {};
    table.textContent = '';
    var split = !!opts.split && snap.balance.some(function (l) { return l.local; });
    table.appendChild(head(split ? [T.item, T.local, T.adj, T.ifrs, T.opening] : [T.item, T.opening, T.closing]));
    var body = el('tbody');
    var sub = function (text) { var c = el('th', '', text); c.colSpan = split ? 5 : 3; c.scope = 'colgroup'; return tr([c], 'ifrs-sub'); };
    var vals = function (l) { return split ? [l.local[1], l.adj[1], l.ifrs[1], l.ifrs[0]] : [l.ifrs[0], l.ifrs[1]]; };
    var total = function (text, v, key, cls) {
      var cells = split ? [el('td'), el('td'), numCell('td', v[1], key + '-close'), numCell('td', v[0], key + '-open')] : [numCell('td', v[0], key + '-open'), numCell('td', v[1], key + '-close')];
      return tr([rowTh(text)].concat(cells), cls || 'ifrs-total');
    };
    var t = snap.totals;
    [['nca', 'ca', T.totalAssets, t.assets, 'assets'], ['eq', null, T.totalEquity, t.equity, 'equity'], ['ncl', 'cl', T.totalLiab, t.liabilities, 'liabilities']].forEach(function (g) {
      [g[0], g[1]].forEach(function (s) {
        if (!s) return;
        var rows = snap.balance.filter(function (l) { return l.section === s; });
        if (rows.length) body.appendChild(sub(SECTION[s]));
        rows.forEach(function (l) { body.appendChild(tr([rowTh(C.lineLabel(bsLine[l.id], LANG))].concat(vals(l).map(function (v) { return numCell('td', v); })))); });
      });
      body.appendChild(total(g[2], g[3], g[4]));
    });
    body.appendChild(total(T.totalEqLiab, [t.equity[0] + t.liabilities[0], t.equity[1] + t.liabilities[1]], 'equity-liabilities', 'ifrs-total ifrs-grand'));
    if (opts.unplaced && (Math.abs(opts.unplaced[0]) > C.EPS || Math.abs(opts.unplaced[1]) > C.EPS)) body.appendChild(total(T.unplacedBs, opts.unplaced, 'unplaced', 'ifrs-unplaced'));
    table.appendChild(body);
  }
  function renderPnl(table, snap, opts) {
    opts = opts || {};
    table.textContent = '';
    var split = !!opts.split && snap.pnl.some(function (l) { return l.local !== undefined; });
    table.appendChild(head(split ? [T.item, T.local, T.adj, T.ifrs] : [T.item, T.period]));
    var body = el('tbody');
    var pad = function (cell) { return split ? [el('td'), el('td'), cell] : [cell]; };
    var line = function (l) { var cells = split ? [l.local, l.adj, l.ifrs] : [l.ifrs]; body.appendChild(tr([rowTh(C.lineLabel(plLine[l.id], LANG))].concat(cells.map(function (v, i) { return numCell('td', v, l.id === 'revenue' && i === cells.length - 1 ? 'revenue' : ''); })))); };
    var total = function (text, v, key, cls) { body.appendChild(tr([rowTh(text)].concat(pad(numCell('td', v, key))), cls || 'ifrs-total')); };
    var group = function (g) { snap.pnl.filter(function (l) { return l.group === g; }).forEach(line); };
    group('gross'); total(T.gross, snap.totals.gross, 'gross');
    group('operating'); total(T.operating, snap.totals.operating, 'operating');
    group('finance'); total(T.pbt, snap.totals.pbt, 'pbt');
    group('tax');
    if (Math.abs(snap.totals.unplacedPl) > C.EPS) body.appendChild(tr([rowTh(T.unplacedPl)].concat(pad(numCell('td', snap.totals.unplacedPl))), 'ifrs-unplaced'));
    total(T.profit, snap.totals.profit, 'profit', 'ifrs-total ifrs-grand');
    table.appendChild(body);
  }
  function kpis(container, snap) {
    container.textContent = '';
    [[T.kpi[0], (snap.pnl.filter(function (l) { return l.id === 'revenue'; })[0] || { ifrs: 0 }).ifrs], [T.kpi[1], snap.totals.profit], [T.kpi[2], snap.totals.assets[1]], [T.kpi[3], snap.totals.equity[1]]].forEach(function (k) {
      var d = el('div', 'fthp-kpi'); d.appendChild(el('span', '', k[0])); d.appendChild(el('strong', k[1] < -C.EPS ? 'is-negative' : '', money(k[1]))); container.appendChild(d);
    });
  }

  function renderStatements() {
    var r = state.res, snap = C.snapshot(r);
    kpis($('fthpKpis'), snap);
    renderBalance($('fthpBalance'), snap, { unplaced: r.unplacedBs });
    renderPnl($('fthpPnl'), snap);
    var sofp = r.checks.filter(function (c) { return c.id === 'sofp'; })[0], x = C.checkText(sofp, LANG);
    var chk = $('fthpBalanceCheck'); chk.className = 'ifrs-check ' + (r.balanced ? 'is-ok' : 'is-ko'); chk.textContent = x.title + ': ' + x.text;
    $('fthpResultNote').textContent = C.checkText(r.checks.filter(function (c) { return c.id === 'yearClosed'; })[0], LANG).text;
    var rc = r.checks.filter(function (c) { return c.id === 'recon'; })[0], note = $('fthpPnlNote');
    note.hidden = !rc;
    if (rc) { var rt = C.checkText(rc, LANG); note.textContent = rt.title + ': ' + rt.text; note.className = 'ifrs-note' + (rc.level === 'warn' ? ' is-warn' : ''); }
  }

  /* ---------- 5. readiness ---------- */
  function renderReadiness() {
    var inds = C.diagnose(state.res, state.answers), list = $('fthpIndicators'); list.textContent = '';
    var h = 0, m = 0;
    inds.forEach(function (d) {
      if (d.level === 'high') h++; else if (d.level === 'medium') m++;
      var x = C.indicatorText(d, LANG), li = el('li', 'fthp-ind is-' + d.level);
      var top = el('div', 'fthp-ind-top'); top.appendChild(el('span', 'fthp-std', d.standard)); top.appendChild(el('span', 'fthp-level', T.levels[d.level]));
      li.appendChild(top); li.appendChild(el('strong', '', x.title)); li.appendChild(el('p', '', x.text));
      list.appendChild(li);
    });
    $('fthpReadinessSummary').textContent = T.readinessSummary(h, m);
  }
  document.querySelectorAll('.fthp-q input[type=radio]').forEach(function (inp) {
    inp.addEventListener('change', function () { state.answers[inp.name.replace('q_', '')] = inp.value; if (state.res) renderReadiness(); });
  });
  // Answers handed over by the survey on the home page: /ifrs-tool?a=group (yes) and ?n=group (no). Only the listed questions are set.
  (function () {
    var set = function (name, v) {
      var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
      if (!m) return;
      decodeURIComponent(m[1]).split(',').forEach(function (k) {
        var r = document.querySelector('.fthp-q input[name="q_' + k + '"][value="' + v + '"]');
        if (r) { r.checked = true; state.answers[k] = v; }
      });
    };
    set('a', 'yes'); set('n', 'no');
  })();

  /* ---------- exports ---------- */
  $('fthpXlsx').addEventListener('click', function () {
    var X = window.XLSX, r = state.res, snap = C.snapshot(r), wb = X.utils.book_new();
    var meta = [[T.prelimTag], [state.tb.company], [state.tb.period], []];
    var bs = meta.concat([[T.item, T.opening, T.closing]]);
    ['nca', 'ca', 'eq', 'ncl', 'cl'].forEach(function (s) {
      bs.push([SECTION[s]]);
      snap.balance.filter(function (l) { return l.section === s; }).forEach(function (l) { bs.push([C.lineLabel(bsLine[l.id], LANG), l.ifrs[0], l.ifrs[1]]); });
    });
    bs.push([T.totalAssets, snap.totals.assets[0], snap.totals.assets[1]], [T.totalEquity, snap.totals.equity[0], snap.totals.equity[1]], [T.totalLiab, snap.totals.liabilities[0], snap.totals.liabilities[1]]);
    var pl = meta.concat([[T.item, T.period]]);
    snap.pnl.forEach(function (l) { pl.push([C.lineLabel(plLine[l.id], LANG), l.ifrs]); });
    pl.push([T.profit, snap.totals.profit]);
    var map = [[T.account, T.nameCol, T.opening, T.movement, T.closing, T.category, T.statusCol]];
    r.accounts.forEach(function (a) { map.push([a.code, a.name || '', C.round2(a.opening), C.round2(a.movement), C.round2(a.closing), a.category ? C.catLabel(M, a.category, LANG) : '', a.status]); });
    var chk = r.checks.map(function (c) { var x = C.checkText(c, LANG); return [c.level, x.title, x.text]; });
    // aoa_to_sheet writes strings as text cells, never formulas: no spreadsheet injection from account names.
    [[T.sheetBs, bs], [T.sheetPl, pl], [T.sheetMap, map], [T.sheetChecks, chk]].forEach(function (s) {
      var ws = X.utils.aoa_to_sheet(s[1]); ws['!cols'] = [{ wch: 48 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 40 }];
      X.utils.book_append_sheet(wb, ws, s[0].slice(0, 31));
    });
    var out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    download(T.xlsxName + '-' + slug(state.tb.company) + '.xlsx', new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  });
  $('fthpPrint').addEventListener('click', function () { window.print(); });

  /* ---------- 6. secure hand-over ---------- */
  if (KEYS) $('fthpKeyId').textContent = KEYS.keyId;
  $('fthpSeal').addEventListener('click', function () {
    var company = $('fthpSendCompany').value.trim(), contact = $('fthpSendContact').value.trim();
    if (!KEYS || !V) { say('fthpSendStatus', T.noKeys, 'error'); return; }
    if (!company || !contact) { say('fthpSendStatus', T.needName, 'error'); (company ? $('fthpSendContact') : $('fthpSendCompany')).focus(); return; }
    if (!$('fthpConsent').checked) { say('fthpSendStatus', T.needConsent, 'error'); $('fthpConsent').focus(); return; }
    say('fthpSendStatus', T.sealing, '');
    var r = state.res, createdAt = new Date().toISOString();
    var payload = {
      kind: 'client-package', createdAt: createdAt, lang: LANG, tool: { core: C.version, model: M.version },
      client: { company: company.slice(0, 200), contact: contact.slice(0, 200), email: $('fthpSendEmail').value.trim().slice(0, 200), message: $('fthpSendMessage').value.trim().slice(0, 4000) },
      source: state.source, tb: { company: state.tb.company, period: state.tb.period, rows: state.tb.rows },
      overrides: state.overrides, answers: state.answers,
      summary: { balanced: r.balanced, revenue: C.round2(r.revenue), profit: C.round2(r.profit), assets: r.assets.map(C.round2), unknown: r.unknownCount, checks: r.checks.map(function (c) { return [c.id, c.level]; }) }
    };
    V.sealForFTH(payload, KEYS, 'client-package', { createdAt: createdAt }).then(function (env) {
      download('FTH-' + slug(company) + '-' + createdAt.slice(0, 10) + '.fthpkg', JSON.stringify(env), 'application/json');
      say('fthpSendStatus', T.sent(KEYS.keyId), 'ok');
    }).catch(function (e) { say('fthpSendStatus', String(e && e.message || e), 'error'); });
  });

  /* ---------- results released by FTH ---------- */
  $('fthpResOpen').addEventListener('click', function () {
    var file = $('fthpResFile').files && $('fthpResFile').files[0], pass = $('fthpResPass').value;
    $('fthpResView').hidden = true;
    if (!file || !pass) { say('fthpResStatus', T.resBad, 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { say('fthpResStatus', T.resNot, 'error'); return; }
    say('fthpResStatus', T.resOpening, '');
    file.text().then(function (txt) {
      var env; try { env = JSON.parse(txt); } catch (e) { throw new Error('notRelease'); }
      return V.openRelease(env, pass, KEYS);
    }).then(function (out) {
      $('fthpResPass').value = '';
      var p = out.payload;
      say('fthpResStatus', out.verified ? T.resVerified : T.resUnverified, out.verified ? 'ok' : 'error');
      if (!out.verified) return;
      var meta = $('fthpResMeta'); meta.textContent = '';
      [[T.engagement, (p.engagement.company || '') + ' · ' + (p.engagement.period || '')], [T.releasedBy, p.releasedBy || '—'], [T.releasedAt, (p.releasedAt || '').slice(0, 10)], [T.statusL, T.status[p.status] || p.status]].forEach(function (x) {
        var d = el('div'); d.appendChild(el('dt', '', x[0])); d.appendChild(el('dd', '', x[1])); meta.appendChild(d);
      });
      $('fthpResNote').hidden = !p.note;
      $('fthpResNote').textContent = p.note ? T.notesFTH + ': ' + p.note : '';
      $('fthpResDisclaimer').textContent = (UK ? p.disclaimerUk : p.disclaimerEn) || '';
      kpis($('fthpResKpis'), p.snapshot);
      renderBalance($('fthpResBalance'), p.snapshot, { split: p.split });
      renderPnl($('fthpResPnl'), p.snapshot, { split: p.split });
      $('fthpResView').hidden = false;
    }).catch(function (e) {
      say('fthpResStatus', e && e.message === 'notRelease' ? T.resNot : T.resBad, 'error');
    });
  });

  unlock(false);
})();
