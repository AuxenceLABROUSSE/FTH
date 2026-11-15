/* Home page survey: "Is your financial reporting ready for an investor?"
   Six questions, one at a time, then a readiness score with the next steps and two ways forward
   (the IFRS tool, or a conversation with FTH). Runs in the page only: nothing is sent or stored.
   The answers can be handed over: to the tool through the link (?a=group, ?n=group) and to the contact
   form as a summary typed into the message field (the visitor reads and sends it, or not). */
(function () {
  'use strict';
  var root = document.getElementById('heroCalc');
  if (!root) return;
  var uk = /^uk/i.test(document.documentElement.lang || '');
  var body = root.querySelector('.hc-body');
  var TOOL = root.getAttribute('data-tool') || (uk ? '/ifrs-tool-ua' : '/ifrs-tool');

  var L = uk ? {
    lead: 'Шість коротких запитань, приблизно хвилина. Дізнайтеся, наскільки ваша звітність готова до інвестора, і що зробити далі.',
    step: function (i, n) { return 'Крок ' + i + ' з ' + n; }, back: 'Назад', again: 'Пройти ще раз',
    score: 'Готовність', of: 'зі 100', next: 'Наступні кроки',
    levels: ['Початковий рівень', 'Базовий рівень', 'Добрий рівень', 'Високий рівень'],
    for: { investor: 'інвестора', lender: 'банку або кредитора', group: 'міжнародної групи', other: 'ваших цілей' },
    head: function (f, lvl) { return 'Готовність звітності для ' + f + ': ' + lvl.toLowerCase(); },
    sum: [
      'Звітності, придатної для інвестора, поки що немає: потрібна системна підготовка. Це нормально на старті, і починати варто з даних.',
      'Основа є, але до звітності, яку зможе прийняти інвестор, ще потрібна робота над стандартами, порівняльними даними та перевіркою.',
      'Звітність близька до готової. Залишилось закрити кілька пунктів, щоб показувати її інвестору без застережень.',
      'Звітність виглядає готовою до розмови з інвестором. Залишається перевірити облікову політику, розкриття та узгодженість із аудитом.'
    ],
    ctaTool: 'Перевірити ОСВ в інструменті МСФЗ', ctaTalk: 'Обговорити проєкт',
    privacy: 'Відповіді не надсилаються нікуди й не зберігаються. Це орієнтовна оцінка, а не висновок про відповідність МСФЗ.',
    ready: 'Критичних прогалин за вашими відповідями не видно. Для впевненості перевірте облікову політику й розкриття.',
    msg: function (s, ans) { return 'Оцінка готовності звітності: ' + s.score + ' зі 100 (' + s.level.toLowerCase() + ').\n' + ans.join('\n') + '\n\nХочу обговорити проєкт.'; }
  } : {
    lead: 'Six short questions, about a minute. See how ready your reporting is for an investor, and what to do next.',
    step: function (i, n) { return 'Step ' + i + ' of ' + n; }, back: 'Back', again: 'Start again',
    score: 'Readiness', of: 'out of 100', next: 'Next steps',
    levels: ['Early stage', 'Basic level', 'Good level', 'High level'],
    for: { investor: 'an investor', lender: 'a bank or lender', group: 'an international group', other: 'your purpose' },
    head: function (f, lvl) { return 'Reporting readiness for ' + f + ': ' + lvl.toLowerCase(); },
    sum: [
      'There is no investor-grade reporting yet: it needs structured preparation. That is normal at the start, and the data is the place to begin.',
      'The foundation is there, but standards, comparatives and assurance still need work before an investor can rely on the reporting.',
      'Your reporting is close. A few points remain to close before you can show it to an investor without caveats.',
      'Your reporting looks ready for an investor conversation. What remains is checking the accounting policies, disclosures and consistency with the audit.'
    ],
    ctaTool: 'Check your trial balance in the IFRS tool', ctaTalk: 'Discuss a project',
    privacy: 'Your answers are not sent or stored anywhere. This is an indicative assessment, not a conclusion of IFRS compliance.',
    ready: 'No critical gaps show in your answers. To be sure, check the accounting policies and disclosures.',
    msg: function (s, ans) { return 'Reporting readiness: ' + s.score + ' out of 100 (' + s.level.toLowerCase() + ').\n' + ans.join('\n') + '\n\nI would like to discuss a project.'; }
  };

  /* [value, label, points]; the first question is not scored, it tailors the wording. Points add up to 100. */
  var Q = uk ? [
    { id: 'purpose', q: 'Для чого вам потрібна фінансова звітність?', o: [['investor', 'Для інвестора', 0], ['lender', 'Для банку або кредитора', 0], ['group', 'Для міжнародної групи', 0], ['other', 'Інша мета', 0]] },
    { id: 'std', q: 'За якими стандартами компанія звітує зараз?', o: [['ifrs', 'МСФЗ', 25], ['both', 'П(С)БО та МСФЗ', 22], ['ua', 'П(С)БО', 8]] },
    { id: 'sub', q: 'Чи є у компанії дочірні підприємства?', o: [['no', 'Ні', 15], ['yes', 'Так', 6], ['unsure', 'Потрібно уточнити', 4]] },
    { id: 'hist', q: 'Чи є у вас фінансова звітність за попередні роки?', o: [['years', 'Так, за кілька років', 25], ['one', 'Лише за останній рік', 13], ['none', 'Ще потрібно підготувати', 3]] },
    { id: 'audit', q: 'Чи перевіряв вашу звітність незалежний аудитор?', o: [['yes', 'Так, є аудиторський висновок', 20], ['no', 'Ні, аудиту не було', 8], ['unsure', 'Не впевнений(а)', 4]] },
    { id: 'tb', q: 'Чи можете ви сформувати оборотно-сальдову відомість (ОСВ) за рік?', o: [['yes', 'Так, одразу з облікової системи', 15], ['work', 'Так, але потрібне доопрацювання', 9], ['no', 'Ні, облік не налаштований', 3]] }
  ] : [
    { id: 'purpose', q: 'What do you need financial statements for?', o: [['investor', 'For an investor', 0], ['lender', 'For a bank or lender', 0], ['group', 'For an international group', 0], ['other', 'Another purpose', 0]] },
    { id: 'std', q: 'Which standards does the company report under today?', o: [['ifrs', 'IFRS', 25], ['both', 'Ukrainian GAAP and IFRS', 22], ['ua', 'Ukrainian GAAP', 8]] },
    { id: 'sub', q: 'Does the company have subsidiaries?', o: [['no', 'No', 15], ['yes', 'Yes', 6], ['unsure', 'Need to check', 4]] },
    { id: 'hist', q: 'Do you have financial statements for previous years?', o: [['years', 'Yes, for several years', 25], ['one', 'Only for the last year', 13], ['none', 'Still to be prepared', 3]] },
    { id: 'audit', q: 'Has an independent auditor reviewed your statements?', o: [['yes', 'Yes, there is an audit opinion', 20], ['no', 'No, never audited', 8], ['unsure', 'Not sure', 4]] },
    { id: 'tb', q: 'Can you produce a trial balance (ОСВ) for the year?', o: [['yes', 'Yes, straight from the accounting system', 15], ['work', 'Yes, but it needs rework', 9], ['no', 'No, the books are not set up', 3]] }
  ];

  /* One tip per weak answer, in order of importance. */
  var TIPS = uk ? {
    std_ua: 'Звітність за П(С)БО треба трансформувати до МСФЗ: міжнародні інвестори та кредитори зазвичай очікують саме її. Це ядро проєкту трансформації.',
    std_both: 'Ви вже звітуєте і за П(С)БО, і за МСФЗ: перевірте, що обидва набори узгоджені між собою та мають зрозумілі звірки.',
    sub_yes: 'Є дочірні підприємства: потрібна консолідована звітність (МСФЗ 10). Заздалегідь уніфікуйте облікову політику та звіряйте внутрішньогрупові розрахунки.',
    sub_unsure: 'З’ясуйте, чи контролює компанія інші підприємства: від цього залежить, чи потрібна консолідація (МСФЗ 10).',
    hist_one: 'Інвестори зазвичай хочуть порівняльні дані. Підготуйте щонайменше ще один попередній рік; перший перехід на МСФЗ регулює МСФЗ 1.',
    hist_none: 'Звітності за попередні роки немає. Почніть із відновлення даних і порівняльного року: без цього інвестору складно оцінити динаміку.',
    audit_no: 'Незалежний аудит підвищує довіру інвестора. Звітність краще одразу готувати з розрахунком на аудит.',
    audit_unsure: 'Уточніть, чи був аудит і за якими стандартами: це визначає, що саме треба переглянути.',
    tb_work: 'ОСВ потребує доопрацювання. Почніть із перевірки даних: баланс, обороти та залишки мають збігатися.',
    tb_no: 'Без ОСВ неможлива трансформація. Спершу налаштуйте облік так, щоб формувати відомість за рік.'
  } : {
    std_ua: 'Ukrainian GAAP statements need to be transformed to IFRS: international investors and lenders usually expect IFRS. This is the core of a transformation project.',
    std_both: 'You already report under both Ukrainian GAAP and IFRS: check that the two sets agree and come with clear reconciliations.',
    sub_yes: 'You have subsidiaries: consolidated statements are needed (IFRS 10). Align accounting policies early and reconcile intragroup balances.',
    sub_unsure: 'Find out whether the company controls other entities: it decides whether consolidation (IFRS 10) is needed.',
    hist_one: 'Investors usually want comparative data. Prepare at least one more prior year; the first move to IFRS is governed by IFRS 1.',
    hist_none: 'There are no statements for earlier years. Start by rebuilding the data and a comparative year: without it an investor cannot judge the trend.',
    audit_no: 'An independent audit raises an investor’s confidence. It is better to prepare the statements with an audit in mind from the start.',
    audit_unsure: 'Check whether an audit took place and under which standards: it decides what has to be revisited.',
    tb_work: 'The trial balance needs rework. Start with data checks: balances, turnovers and closing balances must agree.',
    tb_no: 'A transformation is impossible without a trial balance. First set up the books so that a year’s trial balance can be produced.'
  };
  var ORDER = ['std_ua', 'hist_none', 'tb_no', 'sub_yes', 'audit_no', 'hist_one', 'tb_work', 'sub_unsure', 'audit_unsure', 'std_both'];

  var state = { i: 0, a: {} };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function label(qid, val) { var q = Q.filter(function (x) { return x.id === qid; })[0]; var o = q.o.filter(function (x) { return x[0] === val; })[0]; return o ? o[1] : ''; }

  function render() { body.textContent = ''; if (state.i >= Q.length) result(); else question(); }

  function question() {
    var q = Q[state.i], n = Q.length;
    var bar = el('div', 'hc-progress'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '1'); bar.setAttribute('aria-valuemax', String(n)); bar.setAttribute('aria-valuenow', String(state.i + 1));
    var fill = el('span'); fill.style.width = ((state.i + 1) / n * 100) + '%'; bar.appendChild(fill);
    body.appendChild(el('p', 'hc-step', L.step(state.i + 1, n)));
    body.appendChild(bar);
    var fs = el('fieldset', 'hc-fields'), lg = el('legend', 'hc-q', q.q); lg.setAttribute('tabindex', '-1');
    fs.appendChild(lg);
    var list = el('div', 'hc-opts');
    q.o.forEach(function (o) {
      var lab = el('label', 'hc-opt'), inp = el('input'); inp.type = 'radio'; inp.name = 'hc-' + q.id; inp.value = o[0];
      if (state.a[q.id] === o[0]) inp.checked = true;
      inp.addEventListener('change', function () { state.a[q.id] = o[0]; setTimeout(function () { state.i++; render(); }, reduced() ? 0 : 260); });
      lab.appendChild(inp); lab.appendChild(el('span', 'hc-opt-text', o[1]));
      list.appendChild(lab);
    });
    fs.appendChild(list); body.appendChild(fs);
    if (state.i > 0) { var b = el('button', 'hc-back', '← ' + L.back); b.type = 'button'; b.addEventListener('click', function () { state.i--; render(); }); body.appendChild(b); }
    if (state.i > 0 || state.started) lg.focus({ preventScroll: true });
    state.started = true;
  }

  function scoreOf() {
    var s = 0;
    Q.forEach(function (q) { var o = q.o.filter(function (x) { return x[0] === state.a[q.id]; })[0]; if (o) s += o[2]; });
    var idx = s >= 80 ? 3 : s >= 60 ? 2 : s >= 35 ? 1 : 0;
    return { score: s, idx: idx, level: L.levels[idx] };
  }

  function result() {
    var sc = scoreOf(), f = L.for[state.a.purpose] || L.for.other;
    var tips = ORDER.filter(function (k) { var p = k.split('_'); return state.a[p[0]] === p[1]; }).slice(0, 4);
    var box = el('div', 'hc-result');
    var meter = el('div', 'hc-meter'), num = el('div', 'hc-num'), big = el('strong', '', String(sc.score)); num.appendChild(big); num.appendChild(el('span', '', L.of));
    var track = el('div', 'hc-track'), fill = el('span'); fill.setAttribute('data-level', String(sc.idx)); track.appendChild(fill);
    track.setAttribute('role', 'img'); track.setAttribute('aria-label', L.score + ': ' + sc.score + ' ' + L.of);
    meter.appendChild(num); meter.appendChild(track); box.appendChild(meter);
    var h = el('h2', 'hc-head', L.head(f, sc.level)); h.setAttribute('tabindex', '-1'); box.appendChild(h);
    box.appendChild(el('p', 'hc-sum', L.sum[sc.idx]));
    box.appendChild(el('p', 'hc-title', L.next));
    var ul = el('ul', 'hc-tips');
    if (tips.length) tips.forEach(function (k) { ul.appendChild(el('li', '', TIPS[k])); }); else ul.appendChild(el('li', '', L.ready));
    box.appendChild(ul);

    var yes = state.a.sub === 'yes' ? 'group' : '', no = state.a.sub === 'no' ? 'group' : '';
    var href = TOOL + (yes || no ? '?' + (yes ? 'a=' + yes : 'n=' + no) : '');
    var acts = el('div', 'hc-actions');
    var tool = el('a', 'btn btn-green hc-cta', L.ctaTool + ' '); tool.href = href; acts.appendChild(tool);
    var talk = el('a', 'btn btn-outline hc-talk', L.ctaTalk); talk.href = '#contact';
    talk.addEventListener('click', function () {
      var m = document.getElementById('message');
      if (m && !m.value.trim()) m.value = L.msg({ score: sc.score, level: sc.level }, Q.map(function (q) { return q.q + ' ' + label(q.id, state.a[q.id]); }));
    });
    acts.appendChild(talk); box.appendChild(acts);
    var again = el('button', 'hc-back', '↺ ' + L.again); again.type = 'button';
    again.addEventListener('click', function () { state.i = 0; state.a = {}; render(); }); box.appendChild(again);
    box.appendChild(el('p', 'hc-note', L.privacy));
    body.appendChild(box);
    requestAnimationFrame(function () { fill.style.width = sc.score + '%'; });
    h.focus({ preventScroll: true });
  }

  body.textContent = '';
  body.appendChild(el('h2', 'hc-intro', uk ? 'Чи готова ваша звітність до розмови з інвестором?' : 'Is your reporting ready for a conversation with an investor?'));
  body.appendChild(el('p', 'hc-lead', L.lead));
  var facts = el('ul', 'hc-facts');
  (uk ? ['6 запитань', 'без реєстрації', 'результат одразу'] : ['6 questions', 'no sign-up', 'instant result']).forEach(function (t) { facts.appendChild(el('li', '', t)); });
  body.appendChild(facts);
  var start = el('button', 'btn btn-green hc-start', uk ? 'Почати опитування' : 'Start the survey'); start.type = 'button';
  start.addEventListener('click', function () { state.started = true; render(); });
  body.appendChild(start);
})();
