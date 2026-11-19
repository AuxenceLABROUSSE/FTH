/* FTH specialist workspace (/workspace, /workspace-ua). Not linked from the site, noindex.

   Access: nothing can be opened without the FTH key file and its passphrase (js/fth/vault.js).
   Client packages (.fthpkg) and working files (.fthwork) are sealed to the FTH key; results go
   to the client as a signed, passphrase-encrypted release (.fthres) that holds statement
   figures only. Like the portal, this page makes no network call and stores nothing in the
   browser: the engagement lives in memory and in the encrypted working file the specialist saves.

   Engagement (the working file payload, schema v1):
   { v, id, createdAt, updatedAt, tool, client, source, tb, answers, clientOverrides, overrides,
     accountNotes, settings {materiality, periodStart, periodEnd, taxRate}, journals[],
     review {status, notes[]}, releases[], audit[] } */
(function () {
  'use strict';
  var C = window.FTHCore, V = window.FTHVault;
  var $ = function (id) { return document.getElementById(id); };
  if (!C || !V || !$('fthwLock')) return;
  var M = C.buildModel(window.FTH_IFRS_DATA, window.FTH_IFRS_MODEL);
  var LANG = document.documentElement.lang === 'uk' ? 'uk' : 'en', UK = LANG === 'uk';
  var STANDARDS = ['IFRS 15', 'IFRS 16', 'IFRS 9', 'IAS 21', 'IAS 12', 'IAS 19', 'IAS 38', 'IAS 16', 'IAS 2', 'IAS 37', 'IAS 20', 'IFRS 2', 'IAS 8', 'IAS 1', 'IFRS 1', 'Other'];

  var T = UK ? {
    unlockFail: { badPassphrase: 'Неправильна фраза-пароль.', notKeyFile: 'Це не файл ключа FTH (.fthkey).' },
    unlocked: function (id) { return 'Ключ ' + id + ' відкрито.'; }, wrongKey: 'Цей ключ не збігається з ключем, опублікованим на сайті: клієнтські пакети, запечатані ключем сайту, не відкриються.',
    keygenMismatch: 'Фрази-паролі не збігаються.', keygenWeak: 'Щонайменше 12 символів.', keygenDone: function (id) { return 'Новий набір ключів ' + id + ' створено. Збережіть файл .fthkey у надійному місці й опублікуйте data/fth-keys.js на сайті.'; },
    needName: 'Вкажіть своє ім’я: воно записується в журнал дій.',
    open: { notSealed: 'Файл не є пакетом FTH.', wrongKind: 'Невідповідний тип файлу.', otherKey: 'Файл запечатано іншим ключем FTH.', tampered: 'Файл пошкоджено або змінено: розшифрування неможливе.' },
    opened: 'Відкрито', newFrom: 'Нова справа з ОСВ', sample: 'Приклад',
    tabs: { overview: 'Огляд', tb: 'ОСВ і перевірки', mapping: 'Мапінг', journals: 'Коригування', calc: 'Калькулятори', statements: 'Звітність', review: 'Перевірка та випуск', audit: 'Журнал дій', model: 'Модель FTH' },
    status: { draft: 'Чернетка', in_review: 'На перевірці', reviewed: 'Перевірено', released: 'Випущено' },
    jstatus: { draft: 'чернетка', approved: 'затверджено', void: 'анульовано' },
    jtype: { reclass: 'Перекласифікація', adjust: 'Коригування МСФЗ' },
    jscope: { current: 'Поточний період', opening: 'Вступне сальдо (і кінець періоду)', extraction: 'Коригування вибірки P&L' },
    client: 'Клієнт', contact: 'Контакт', email: 'E-mail', message: 'Запит клієнта', file: 'Файл', sha: 'SHA-256', period: 'Період', company: 'Компанія',
    materiality: 'Суттєвість, грн', periodStart: 'Початок періоду', periodEnd: 'Кінець періоду', taxRate: 'Ставка податку, %',
    kLocal: 'П(С)БО', kIfrs: 'МСФЗ', revenue: 'Дохід', profit: 'Прибуток', assets: 'Активи', equity: 'Капітал',
    account: 'Рахунок', name: 'Назва', opening: 'На початок', closing: 'На кінець', debit: 'Дебет', credit: 'Кредит', movement: 'Обороти нетто', category: 'Категорія МСФЗ', note: 'Примітка',
    st: { exact: 'мапінг FTH', via: 'група ', fixed: 'виправлено в моделі 2.0', manual: 'змінено', unknown: 'потрібна категорія', unplaced: 'категорія без статті', closingAcc: 'рахунок закриття' },
    clientChose: 'клієнт обрав: ', none: '— категорія —', all: 'Усі', attention: 'Потребують уваги', changed: 'Змінені', search: 'Пошук',
    jNew: 'Новий журнал', jNo: '№', jType: 'Тип', jScope: 'Вплив', jStd: 'Стандарт', jDesc: 'Опис', jTotal: 'Сума', jStatus: 'Статус', jLines: 'Рядки',
    jAddLine: '+ рядок', jSave: 'Зберегти чернетку', jApprove: 'Затвердити', jVoid: 'Анулювати', jEdit: 'Змінити', jCancel: 'Скасувати', jMemo: 'Коментар',
    jBalanced: 'Збалансовано', jUnbalanced: function (d) { return 'Не збалансовано: ' + d; }, jNeedBalance: 'Журнал має бути збалансований і мати опис.', jSelf: 'Затверджує та сама особа, що й склала: бажано друге затвердження (принцип чотирьох очей).',
    jEmpty: 'Коригувань ще немає. Створіть журнал або скористайтеся калькулятором.',
    calc: {
      lease: 'МСФЗ 16 — оренда', ecl: 'МСФЗ 9 — очікувані кредитні збитки', fx: 'МСБО 21 — перерахунок валютної статті', dt: 'МСБО 12 — відстрочений податок на коригування',
      start: 'Дата початку оренди', term: 'Строк, місяців', payment: 'Щомісячний платіж, грн', timing: 'Платіж', advance: 'на початку місяця', arrears: 'в кінці місяця', rate: 'Ставка залучення, % річних', expense: 'Стаття витрат оренди',
      buckets: ['Не прострочено', '1–30 днів', '31–90 днів', '91–180 днів', '181–365 днів', 'понад 365 днів'], amount: 'Сума', lossRate: 'Ставка збитку, %', existing: 'Наявний резерв (рах. 38)',
      fxCat: 'Категорія статті', fcAmount: 'Сума у валюті', closingRate: 'Курс на кінець', carrying: 'Балансова вартість, грн (актив +, зобов’язання −)',
      compute: 'Розрахувати', toJournal: 'Створити журнал', nothing: 'Коригування не потрібне.', inputs: 'Перевірте вхідні дані.', notStarted: 'Оренда починається після кінця періоду.',
      pv: 'Приведена вартість (зобов’язання на дату початку)', rouClose: 'Актив з права користування на кінець', liabClose: 'Зобов’язання на кінець', current: 'з них поточна частина', dep: 'Амортизація за період', interest: 'Відсотки за період', paid: 'Платежі за період (сторно витрат оренди)',
      required: 'Необхідний резерв', delta: 'Коригування резерву', diff: 'Курсова різниця', plImpact: 'Вплив коригувань на P&L', openImpact: 'Вплив на вступний капітал', taxPl: 'Відстрочений податок у P&L', taxOpen: 'Відстрочений податок у капіталі',
      dtNote: 'Спрощено: усі різниці вважаються тимчасовими, одна ставка. Перевірте постійні різниці й визнання ВПА (МСБО 12.24).',
      ias38: 'МСБО 38 — витрати на розробку', ifrs15: 'МСФЗ 15 — виручка, виставлена наперед', tax: 'МСБО 12 — поточний податок на прибуток',
      costBefore: 'Витрати минулих періодів, списані в ОСВ на витрати, грн', costPeriod: 'Витрати періоду, списані в ОСВ на витрати, грн', ready: 'Дата готовності до використання (порожньо — ще не готовий)', life: 'Строк корисного використання, місяців',
      criteria: 'Усі шість критеріїв МСБО 38.57 виконано (технічна здійсненність, намір завершити, здатність використовувати чи продати, майбутні вигоди, ресурси, надійна оцінка витрат)',
      noCriteria: 'Критерії не виконано: капіталізація неможлива, витрати залишаються у витратах.', nbv: 'Балансова вартість на кінець', amortPeriod: 'Амортизація за період', amortBefore: 'Накопичена амортизація на початок',
      ia38Note: 'Амортизація починається з місяця готовності й не нараховується, поки актив не готовий. Відстрочений податок на цю різницю рахує калькулятор МСБО 12 (один раз, не тут).',
      invAmount: 'Сума договору без ПДВ, грн', invDate: 'Дата рахунку', svcStart: 'Початок надання послуги', svcMonths: 'Строк послуги, місяців', defOpen: 'Відстрочено на початок', defClose: 'Відстрочено на кінець (зобов’язання за договором)', recognised: 'Виручка, що належить періоду',
      notInvoiced: 'Рахунок виставлено після кінця періоду: у цьому періоді коригування немає.',
      ifrs15Note: 'Припущення: сума відображена у виручці в ОСВ у момент виставлення рахунку, послуга надається рівномірно. Складні договори (кілька зобов’язань, змінна винагорода) розраховуйте окремо.',
      pbtLocal: 'Прибуток до оподаткування за П(С)БО', permanent: 'Постійні різниці (+ неоподатковувані витрати, − звільнені доходи)', lossBF: 'Податковий збиток минулих періодів', booked: 'Уже відображено у витратах з податку в ОСВ',
      taxable: 'Об’єкт оподаткування', taxBase: 'База після збитків', taxCurrent: 'Поточний податок', taxToBook: 'До відображення', lossCarry: 'Збиток до перенесення далі',
      taxNote: 'Поточний податок рахується з податкової бази (прибуток за П(С)БО + постійні різниці), а не з прибутку за МСФЗ: коригування МСФЗ не змінюють декларацію. Правила перенесення збитків перевірте за чинним законодавством.'
    },
    cf: {
      title: 'Рух грошових коштів (непрямий метод)',
      note: 'Орієнтовний звіт, виведений зі змін статей балансу МСФЗ; кожна стаття балансу віднесена до однієї діяльності, тому підсумок збігається зі зміною грошей, а невраховане показано окремим рядком. Відсотки й податки віднесено до операційної діяльності, надходження активів з права користування — негрошові. Не є остаточною звітністю за МСФЗ: потрібні розкриття й перевірка спеціаліста.',
      op: 'Операційна діяльність', inv: 'Інвестиційна діяльність', fin: 'Фінансова діяльність', cfo: 'Чисті гроші від операційної діяльності', cfi: 'Чисті гроші від інвестиційної діяльності', cff: 'Чисті гроші від фінансової діяльності',
      net: 'Чистий рух грошових коштів', open: 'Гроші на початок', close: 'Гроші на кінець (баланс)', gap: 'Непояснена різниця'
    },
    view: { worksheet: 'Робоча таблиця', ifrs: 'Звітність МСФЗ', soce: 'Зміни в капіталі', cf: 'Рух коштів' },
    reclass: 'Перекласиф.', adjust: 'Коригування', ifrsCol: 'МСФЗ', ifrsOpen: 'МСФЗ на початок', line: 'Стаття',
    nca: 'Необоротні активи', ca: 'Оборотні активи', eq: 'Власний капітал', ncl: 'Довгострокові зобов’язання', cl: 'Поточні зобов’язання',
    totalAssets: 'Усього активів', totalEquity: 'Усього капіталу', totalLiab: 'Усього зобов’язань', totalEqLiab: 'Усього капіталу та зобов’язань',
    gross: 'Валовий прибуток', operating: 'Операційний прибуток', pbt: 'Прибуток до оподаткування', profitL: 'Прибуток за період', unplacedPl: 'Не класифіковано (7–9)',
    soceProfit: 'Прибуток за період', soceOther: 'Інші рухи', soceTotal: 'Усього',
    xlsx: 'Робочі документи Excel', save: 'Зберегти (.fthwork)', close: 'Закрити справу', lock: 'Заблокувати', saved: function (n) { return 'Збережено: ' + n; },
    dirtyLeave: 'Є незбережені зміни.', closeConfirm: 'Незбережені зміни буде втрачено. Натисніть ще раз, щоб закрити.',
    toStatus: { in_review: 'Передати на перевірку', reviewed: 'Позначити як перевірене', draft: 'Повернути в чернетку' },
    notes: 'Зауваження рецензента', addNote: 'Додати зауваження', noteRef: 'Посилання (рахунок, журнал, стаття)', resolve: 'Закрити', resolved: 'закрито', noNotes: 'Зауважень немає.',
    checklist: 'Умови випуску', ck: { balanced: 'Баланс сходиться (з коригуваннями)', mapped: 'Усі рахунки класифіковано', drafts: 'Немає чернеток журналів', notes: 'Усі зауваження закрито', reviewed: 'Статус «Перевірено»', recon: 'P&L звірено з нерозподіленим прибутком' },
    relSplit: 'Показати клієнту колонки П(С)БО / коригування / МСФЗ', relNote: 'Коментар для клієнта', relPass: 'Фраза-пароль для клієнта', relNew: 'Нова фраза', relMake: 'Створити підписаний випуск (.fthres)',
    relDone: function (s) { return 'Випуск створено (SHA-256 ' + s + '…). Передайте фразу-пароль клієнту іншим каналом.'; }, relBlocked: 'Випуск неможливий, поки не виконано всі умови.', relPrelim: 'Випустити як попередній (без перевірки)',
    disclaimerEn: 'Prepared by FTH from the client’s trial balance with the IFRS reclassifications and adjustments recorded in this engagement. Not a complete set of IFRS financial statements (no notes, statement of cash flows or full comparative information) and not audited.',
    disclaimerUk: 'Підготовлено FTH на основі ОСВ клієнта з перекласифікаціями та коригуваннями МСФЗ, зафіксованими в цій справі. Це не повний комплект фінансової звітності за МСФЗ (без приміток, звіту про рух грошових коштів і повної порівняльної інформації) і не аудиторський висновок.',
    prelimEn: 'Preliminary: not yet reviewed by FTH.', prelimUk: 'Попередньо: ще не перевірено FTH.',
    auditCols: ['Час', 'Користувач', 'Дія', 'Деталі'], fixesTitle: 'Виправлення мапінгу в моделі 2.0', findingsTitle: 'Висновки перевірки Excel-моделі та скриптів', was: 'Було', now: 'Стало', why: 'Причина',
    clientAnswers: 'Відповіді клієнта', indicators: 'Напрями коригувань МСФЗ', checks: 'Перевірки', engagementSettings: 'Параметри справи', noClient: 'Без клієнтського пакета',
    answers: { yes: 'так', no: 'ні', unsure: 'не знає' }, q: { leases: 'Оренда > 12 міс.', fx: 'Валюта', development: 'Власна розробка ПЗ', esop: 'Опціони', contracts: 'Багатоперіодні договори', related: 'Позики пов’язаних сторін', group: 'Група' },
    levels: { high: 'ймовірно суттєво', medium: 'перевірити', info: 'до уваги' },
    act: { open: 'Відкрито справу', map: 'Мапінг', jcreate: 'Журнал створено', jedit: 'Журнал змінено', japprove: 'Журнал затверджено', jvoid: 'Журнал анульовано', status: 'Статус', note: 'Зауваження', noteResolve: 'Зауваження закрито', release: 'Випуск для клієнта', save: 'Збережено', settings: 'Параметри', accNote: 'Примітка до рахунку' }
  } : {
    unlockFail: { badPassphrase: 'Wrong passphrase.', notKeyFile: 'This is not an FTH key file (.fthkey).' },
    unlocked: function (id) { return 'Key ' + id + ' unlocked.'; }, wrongKey: 'This key differs from the key published on the site: client packages sealed with the site key will not open.',
    keygenMismatch: 'The passphrases differ.', keygenWeak: 'At least 12 characters.', keygenDone: function (id) { return 'New key set ' + id + ' created. Keep the .fthkey file somewhere safe and publish data/fth-keys.js on the site.'; },
    needName: 'Enter your name: it is written to the audit trail.',
    open: { notSealed: 'Not an FTH package.', wrongKind: 'Wrong kind of file.', otherKey: 'The file is sealed to another FTH key.', tampered: 'The file is damaged or was altered: it cannot be decrypted.' },
    opened: 'Opened', newFrom: 'New engagement from an ОСВ', sample: 'Sample',
    tabs: { overview: 'Overview', tb: 'Trial balance & checks', mapping: 'Mapping', journals: 'Adjustments', calc: 'Calculators', statements: 'Statements', review: 'Review & release', audit: 'Audit trail', model: 'FTH model' },
    status: { draft: 'Draft', in_review: 'In review', reviewed: 'Reviewed', released: 'Released' },
    jstatus: { draft: 'draft', approved: 'approved', void: 'void' },
    jtype: { reclass: 'Reclassification', adjust: 'IFRS adjustment' },
    jscope: { current: 'Current period', opening: 'Opening balance (and closing)', extraction: 'P&L extraction correction' },
    client: 'Client', contact: 'Contact', email: 'E-mail', message: 'Client request', file: 'File', sha: 'SHA-256', period: 'Period', company: 'Company',
    materiality: 'Materiality, UAH', periodStart: 'Period start', periodEnd: 'Period end', taxRate: 'Tax rate, %',
    kLocal: 'Local GAAP', kIfrs: 'IFRS', revenue: 'Revenue', profit: 'Profit', assets: 'Assets', equity: 'Equity',
    account: 'Account', name: 'Name', opening: 'Opening', closing: 'Closing', debit: 'Debit', credit: 'Credit', movement: 'Net movement', category: 'IFRS category', note: 'Note',
    st: { exact: 'FTH mapping', via: 'group ', fixed: 'corrected in model 2.0', manual: 'changed', unknown: 'needs a category', unplaced: 'category with no line', closingAcc: 'closing account' },
    clientChose: 'client chose: ', none: '— category —', all: 'All', attention: 'Needs attention', changed: 'Changed', search: 'Search',
    jNew: 'New journal', jNo: 'No.', jType: 'Type', jScope: 'Effect', jStd: 'Standard', jDesc: 'Description', jTotal: 'Amount', jStatus: 'Status', jLines: 'Lines',
    jAddLine: '+ line', jSave: 'Save draft', jApprove: 'Approve', jVoid: 'Void', jEdit: 'Edit', jCancel: 'Cancel', jMemo: 'Memo',
    jBalanced: 'Balanced', jUnbalanced: function (d) { return 'Not balanced: ' + d; }, jNeedBalance: 'A journal must balance and have a description.', jSelf: 'Approved by its preparer: a second approval is advisable (four-eyes principle).',
    jEmpty: 'No adjustments yet. Create a journal or use a calculator.',
    calc: {
      lease: 'IFRS 16 — lease', ecl: 'IFRS 9 — expected credit losses', fx: 'IAS 21 — retranslation of a monetary item', dt: 'IAS 12 — deferred tax on the adjustments',
      start: 'Commencement date', term: 'Term, months', payment: 'Monthly payment, UAH', timing: 'Payment', advance: 'in advance', arrears: 'in arrears', rate: 'Incremental borrowing rate, % a year', expense: 'Rent expense line',
      buckets: ['Not overdue', '1–30 days', '31–90 days', '91–180 days', '181–365 days', 'over 365 days'], amount: 'Amount', lossRate: 'Loss rate, %', existing: 'Existing allowance (acc. 38)',
      fxCat: 'Category of the item', fcAmount: 'Amount in currency', closingRate: 'Closing rate', carrying: 'Carrying amount, UAH (asset +, liability −)',
      compute: 'Calculate', toJournal: 'Create the journal', nothing: 'No adjustment needed.', inputs: 'Check the inputs.', notStarted: 'The lease starts after the period end.',
      pv: 'Present value (liability at commencement)', rouClose: 'Right-of-use asset, closing', liabClose: 'Lease liability, closing', current: 'of which current', dep: 'Depreciation for the period', interest: 'Interest for the period', paid: 'Payments in the period (rent reversed)',
      required: 'Required allowance', delta: 'Change in allowance', diff: 'Exchange difference', plImpact: 'P&L impact of the adjustments', openImpact: 'Opening equity impact', taxPl: 'Deferred tax in P&L', taxOpen: 'Deferred tax in equity',
      dtNote: 'Simplified: every difference treated as temporary, one rate. Check permanent differences and DTA recognition (IAS 12.24).',
      ias38: 'IAS 38 — development costs', ifrs15: 'IFRS 15 — revenue billed in advance', tax: 'IAS 12 — current income tax',
      costBefore: 'Costs of earlier periods expensed in the TB, UAH', costPeriod: 'Costs of the period expensed in the TB, UAH', ready: 'Date ready for use (empty — not ready yet)', life: 'Useful life, months',
      criteria: 'All six IAS 38.57 criteria are met (technical feasibility, intention to complete, ability to use or sell, future benefits, resources, reliable cost measurement)',
      noCriteria: 'Criteria not met: nothing can be capitalised, the costs stay expensed.', nbv: 'Carrying amount, closing', amortPeriod: 'Amortisation for the period', amortBefore: 'Accumulated amortisation, opening',
      ia38Note: 'Amortisation starts in the month the asset is ready and is zero until then. Deferred tax on this difference is computed by the IAS 12 calculator (once, not here).',
      invAmount: 'Contract amount excluding VAT, UAH', invDate: 'Invoice date', svcStart: 'Service start', svcMonths: 'Service period, months', defOpen: 'Deferred, opening', defClose: 'Deferred, closing (contract liability)', recognised: 'Revenue belonging to the period',
      notInvoiced: 'The invoice is dated after the period end: no adjustment in this period.',
      ifrs15Note: 'Assumptions: the amount was booked to revenue in the TB when invoiced, the service is delivered evenly. Complex contracts (several obligations, variable consideration) need a separate analysis.',
      pbtLocal: 'Profit before tax under local GAAP', permanent: 'Permanent differences (+ non-deductible expenses, − exempt income)', lossBF: 'Tax losses brought forward', booked: 'Income tax already expensed in the TB',
      taxable: 'Taxable amount', taxBase: 'Base after losses', taxCurrent: 'Current tax', taxToBook: 'To book', lossCarry: 'Loss carried forward',
      taxNote: 'Current tax is computed from the tax base (local profit + permanent differences), not from IFRS profit: IFRS adjustments do not change the tax return. Check the loss carry-forward rules against current law.'
    },
    cf: {
      title: 'Statement of cash flows (indirect method)',
      note: 'Indicative statement derived from the movements of the IFRS balance sheet; every balance sheet line is classified once, so the total equals the movement of cash and anything unexplained shows on its own line. Interest and taxes are in operating activities; additions to right-of-use assets are non-cash. Not a final IFRS statement: disclosures and specialist review are required.',
      op: 'Operating activities', inv: 'Investing activities', fin: 'Financing activities', cfo: 'Net cash from operating activities', cfi: 'Net cash from investing activities', cff: 'Net cash from financing activities',
      net: 'Net change in cash', open: 'Cash at the beginning', close: 'Cash at the end (balance sheet)', gap: 'Unexplained difference'
    },
    view: { worksheet: 'Worksheet', ifrs: 'IFRS statements', soce: 'Changes in equity', cf: 'Cash flows' },
    reclass: 'Reclass', adjust: 'Adjustments', ifrsCol: 'IFRS', ifrsOpen: 'IFRS opening', line: 'Line item',
    nca: 'Non-current assets', ca: 'Current assets', eq: 'Equity', ncl: 'Non-current liabilities', cl: 'Current liabilities',
    totalAssets: 'Total assets', totalEquity: 'Total equity', totalLiab: 'Total liabilities', totalEqLiab: 'Total equity and liabilities',
    gross: 'Gross profit', operating: 'Operating profit', pbt: 'Profit before tax', profitL: 'Profit for the period', unplacedPl: 'Not classified (7–9)',
    soceProfit: 'Profit for the period', soceOther: 'Other movements', soceTotal: 'Total',
    xlsx: 'Excel working papers', save: 'Save (.fthwork)', close: 'Close engagement', lock: 'Lock', saved: function (n) { return 'Saved: ' + n; },
    dirtyLeave: 'There are unsaved changes.', closeConfirm: 'Unsaved changes will be lost. Click again to close.',
    toStatus: { in_review: 'Send for review', reviewed: 'Mark as reviewed', draft: 'Back to draft' },
    notes: 'Review notes', addNote: 'Add a note', noteRef: 'Reference (account, journal, line)', resolve: 'Resolve', resolved: 'resolved', noNotes: 'No review notes.',
    checklist: 'Release conditions', ck: { balanced: 'Balance sheet balances (with adjustments)', mapped: 'Every account classified', drafts: 'No draft journal', notes: 'Every review note resolved', reviewed: 'Status “Reviewed”', recon: 'P&L reconciled to retained earnings' },
    relSplit: 'Show the client the Local GAAP / adjustments / IFRS columns', relNote: 'Note to the client', relPass: 'Passphrase for the client', relNew: 'New passphrase', relMake: 'Create the signed release (.fthres)',
    relDone: function (s) { return 'Release created (SHA-256 ' + s + '…). Give the passphrase to the client by another channel.'; }, relBlocked: 'Release blocked until every condition is met.', relPrelim: 'Release as preliminary (not reviewed)',
    disclaimerEn: 'Prepared by FTH from the client’s trial balance with the IFRS reclassifications and adjustments recorded in this engagement. Not a complete set of IFRS financial statements (no notes, statement of cash flows or full comparative information) and not audited.',
    disclaimerUk: 'Підготовлено FTH на основі ОСВ клієнта з перекласифікаціями та коригуваннями МСФЗ, зафіксованими в цій справі. Це не повний комплект фінансової звітності за МСФЗ (без приміток, звіту про рух грошових коштів і повної порівняльної інформації) і не аудиторський висновок.',
    prelimEn: 'Preliminary: not yet reviewed by FTH.', prelimUk: 'Попередньо: ще не перевірено FTH.',
    auditCols: ['Time', 'User', 'Action', 'Detail'], fixesTitle: 'Mapping corrections in model 2.0', findingsTitle: 'Review of the Excel model and scripts', was: 'Was', now: 'Now', why: 'Reason',
    clientAnswers: 'Client answers', indicators: 'Areas of IFRS adjustment', checks: 'Checks', engagementSettings: 'Engagement settings', noClient: 'No client package',
    answers: { yes: 'yes', no: 'no', unsure: 'not sure' }, q: { leases: 'Leases > 12 months', fx: 'Foreign currency', development: 'Own software development', esop: 'Share options', contracts: 'Multi-period contracts', related: 'Related-party loans', group: 'Group' },
    levels: { high: 'likely material', medium: 'to check', info: 'for information' },
    act: { open: 'Engagement opened', map: 'Mapping', jcreate: 'Journal created', jedit: 'Journal edited', japprove: 'Journal approved', jvoid: 'Journal voided', status: 'Status', note: 'Review note', noteResolve: 'Note resolved', release: 'Client release', save: 'Saved', settings: 'Settings', accNote: 'Account note' }
  };

  var fmt = new Intl.NumberFormat(UK ? 'uk-UA' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var money = function (v) { return fmt.format(Math.abs(v) < C.EPS ? 0 : v); };
  var bsLine = {}, plLine = {};
  M.balanceLines.forEach(function (l) { bsLine[l.id] = l; });
  M.pnlLines.forEach(function (l) { plLine[l.id] = l; });

  /* ---------- tiny DOM builder: h('tag.class', {attrs}, children...) ---------- */
  function h(sel, attrs) {
    var p = sel.split('.'), e = document.createElement(p[0] || 'div');
    if (p.length > 1) e.className = p.slice(1).join(' ');
    var kids = Array.prototype.slice.call(arguments, 2);
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'text') e.textContent = v;
      else if (k === 'value') e.value = v;
      else if (k === 'checked') e.checked = !!v;
      else e.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) { list.forEach(function (c) { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) add(c); else e.appendChild(c instanceof Node ? c : document.createTextNode(String(c))); }); })(kids);
    return e;
  }
  function num(v, key) { return h('td.ifrs-num' + (v < -C.EPS ? '.is-negative' : ''), key ? { 'data-total': key } : null, money(v)); }
  function rth(t) { return h('th', { scope: 'row' }, t); }
  function thead(cols) { return h('thead', h('tr', cols.map(function (c, i) { return c === '' ? h('td') : h('th' + (i ? '.ifrs-num' : ''), { scope: 'col' }, c); }))); }   // colonne sans titre : cellule simple, pas un en-tête vide
  function say(id, msg, kind) { var s = $(id); if (!s) return; s.textContent = msg || ''; s.className = 'fthp-status' + (kind ? ' is-' + kind : ''); }
  function download(name, data, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    var url = URL.createObjectURL(blob), a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function slug(s) { return String(s || 'engagement').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'engagement'; }
  function now() { return new Date().toISOString(); }
  function readJsonFile(file, max) {
    if (!file) return Promise.reject(new Error('notSealed'));
    if (file.size > (max || 20 * 1024 * 1024)) return Promise.reject(new Error('notSealed'));
    return file.text().then(function (t) { try { return JSON.parse(t); } catch (e) { throw new Error('notSealed'); } });
  }
  function categorySelect(value, onChange, statement, label) {
    var s = h('select', { 'aria-label': label || T.category });
    s.appendChild(new Option(T.none, ''));
    var lines = statement === 'bs' ? M.balanceLines : statement === 'pl' ? M.pnlLines : M.balanceLines.concat(M.pnlLines);
    var all = [].concat.apply([], lines.map(function (l) { return l.categories; }));
    if (value && all.indexOf(value) < 0) s.appendChild(new Option(C.catLabel(M, value, LANG), value));
    lines.forEach(function (l) {
      var g = h('optgroup', { label: (l.st === 'bs' ? '' : 'P&L · ') + C.lineLabel(l, LANG) });
      l.categories.forEach(function (c) { g.appendChild(new Option(C.catLabel(M, c, LANG), c)); });
      s.appendChild(g);
    });
    s.value = value || '';
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }

  /* ---------- session ---------- */
  var S = { keys: null, user: '', eng: null, res: null, dirty: false, tab: 'overview', mapFilter: 'all', mapQuery: '', editing: null, stView: 'worksheet', lastActivity: Date.now(), closeArmed: false };

  function log(action, detail) {
    S.eng.audit.push({ at: now(), user: S.user, action: action, detail: String(detail || '').slice(0, 500) });
    S.eng.updatedAt = now();
    S.dirty = true;
    updateDirty();
  }
  function updateDirty() { var d = $('fthwDirty'); if (d) d.hidden = !S.dirty; }
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = T.dirtyLeave; } });

  // Idle lock after 30 minutes: immediate when nothing is unsaved, otherwise a warning banner.
  ['click', 'keydown', 'pointermove'].forEach(function (ev) { document.addEventListener(ev, function () { S.lastActivity = Date.now(); }, { passive: true }); });
  setInterval(function () {
    if (!S.keys || Date.now() - S.lastActivity < 30 * 60 * 1000) return;
    if (!S.dirty) lock(); else $('fthwIdle').hidden = false;
  }, 30000);

  function show(id) { ['fthwLock', 'fthwStart', 'fthwApp'].forEach(function (x) { $(x).hidden = x !== id; }); }
  function lock() {
    S.keys = null; S.eng = null; S.res = null; S.dirty = false;
    $('fthwKeyFile').value = ''; $('fthwPass').value = '';
    $('fthwIdle').hidden = true; $('fthwLockBtn').hidden = true;
    $('fthwKeyBadge').textContent = '';
    show('fthwLock'); say('fthwLockStatus', '', '');
  }
  $('fthwLockBtn').addEventListener('click', function () {
    if (S.dirty && !S.closeArmed) { S.closeArmed = true; $('fthwIdle').hidden = false; $('fthwIdle').textContent = T.closeConfirm; setTimeout(function () { S.closeArmed = false; }, 6000); return; }
    S.closeArmed = false; lock();
  });

  /* ---------- unlock and key generation ---------- */
  $('fthwUnlock').addEventListener('click', function () {
    var f = $('fthwKeyFile').files && $('fthwKeyFile').files[0], pass = $('fthwPass').value;
    say('fthwLockStatus', '…', '');
    readJsonFile(f, 100000).then(function (kf) { return V.unlockKeyFile(kf, pass); }).then(function (keys) {
      S.keys = keys; $('fthwPass').value = '';
      var site = window.FTH_KEYS;
      say('fthwStartStatus', T.unlocked(keys.keyId) + (site && site.keyId !== keys.keyId ? ' ' + T.wrongKey : ''), site && site.keyId !== keys.keyId ? 'error' : 'ok');
      $('fthwKeyBadge').textContent = keys.keyId; $('fthwLockBtn').hidden = false;
      show('fthwStart');
      $('fthwUser').focus();
    }).catch(function (e) { say('fthwLockStatus', T.unlockFail[e.message] || T.unlockFail.notKeyFile, 'error'); });
  });
  $('fthwKeygen').addEventListener('click', function () {
    var a = $('fthwKgPass').value, b = $('fthwKgPass2').value;
    if (a !== b) { say('fthwKgStatus', T.keygenMismatch, 'error'); return; }
    if (a.length < 12) { say('fthwKgStatus', T.keygenWeak, 'error'); return; }
    say('fthwKgStatus', '…', '');
    V.generateKeySet(a).then(function (out) {
      $('fthwKgPass').value = ''; $('fthwKgPass2').value = '';
      download('fth-' + out.publicKeys.keyId + '.fthkey', JSON.stringify(out.keyFile, null, 1), 'application/json');
      var js = '/* FTH public keys (encryption ECDH P-384, signature ECDSA P-256). Generated by the workspace. */\nwindow.FTH_KEYS = ' + JSON.stringify(out.publicKeys) + ';\n';
      download('fth-keys.js', js, 'text/javascript');
      say('fthwKgStatus', T.keygenDone(out.publicKeys.keyId), 'ok');
    }).catch(function (e) { say('fthwKgStatus', String(e.message || e), 'error'); });
  });

  /* ---------- opening an engagement ---------- */
  function needUser() {
    S.user = $('fthwUser').value.trim().slice(0, 80);
    if (!S.user) { say('fthwStartStatus', T.needName, 'error'); $('fthwUser').focus(); return false; }
    return true;
  }
  function defaultsFromPeriod(period) {
    var y = (String(period || '').match(/(19|20)\d{2}/) || [String(new Date().getFullYear() - 1)])[0];
    return { periodStart: y + '-01-01', periodEnd: y + '-12-31' };
  }
  function newEngagement(tb, source, client, answers, clientOverrides) {
    var d = defaultsFromPeriod(tb.period);
    return {
      v: 1, id: C.uid(), createdAt: now(), updatedAt: now(), tool: { core: C.version, model: M.version },
      client: client || { company: tb.company || '', contact: '', email: '', message: '' }, source: source, tb: tb, answers: answers || {},
      clientOverrides: clientOverrides || {}, overrides: JSON.parse(JSON.stringify(clientOverrides || {})), accountNotes: {},
      settings: { materiality: '', periodStart: d.periodStart, periodEnd: d.periodEnd, taxRate: 18 },
      journals: [], review: { status: 'draft', notes: [] }, releases: [], audit: []
    };
  }
  function start(eng, how) {
    S.eng = eng; S.dirty = false; S.tab = 'overview'; S.editing = null;
    log('open', how);
    S.dirty = how.indexOf('.fthwork') < 0;
    updateDirty();
    show('fthwApp'); recompute(); render();
  }
  $('fthwOpenPkg').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!needUser()) return;
    readJsonFile(f).then(function (env) { return V.openForFTH(env, S.keys, 'client-package'); }).then(function (p) {
      var eng = newEngagement(p.tb, p.source, p.client, p.answers, p.overrides);
      eng.received = { createdAt: p.createdAt, lang: p.lang, tool: p.tool, summary: p.summary };
      start(eng, T.opened + ' .fthpkg ' + (f.name || ''));
    }).catch(function (e) { say('fthwStartStatus', T.open[e.message] || T.open.tampered, 'error'); });
  });
  $('fthwOpenWork').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!needUser()) return;
    readJsonFile(f).then(function (env) { return V.openForFTH(env, S.keys, 'working-file'); }).then(function (eng) {
      if (!eng || eng.v !== 1) throw new Error('wrongKind');
      start(eng, T.opened + ' .fthwork ' + (f.name || ''));
    }).catch(function (e) { say('fthwStartStatus', T.open[e.message] || T.open.tampered, 'error'); });
  });
  $('fthwOpenTb').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!needUser() || !f) return;
    f.arrayBuffer().then(function (buf) {
      var out = C.readWorkbook(buf, window.XLSX);
      if (out.error) throw new Error(out.error);
      return V.sha256(buf).then(function (sha) { start(newEngagement(out.tb, { name: f.name, size: f.size, sha256: sha, kind: out.tb.kind, sheet: out.tb.sheet }), T.newFrom + ' ' + f.name); });
    }).catch(function (e) { say('fthwStartStatus', String(e.message || e), 'error'); });
  });
  $('fthwSample').addEventListener('click', function () {
    if (!needUser()) return;
    var d = window.FTH_IFRS_DEMO_IT;
    var eng = newEngagement({ company: d.company, period: d.period, rows: d.rows }, { name: 'sample-pivnich-soft-2025', size: 0, sha256: '', kind: 'sample' },
      { company: d.company, contact: '—', email: '', message: 'Series A due diligence: IFRS figures for 2025.' }, { leases: 'yes', fx: 'yes', development: 'yes', esop: 'no', contracts: 'yes', related: 'no', group: 'no' }, {});
    start(eng, T.sample);
  });

  /* ---------- save / close ---------- */
  $('fthwSave').addEventListener('click', function () {
    var e = S.eng; if (!e) return;
    e.updatedAt = now();
    e.audit.push({ at: now(), user: S.user, action: 'save', detail: '' });
    V.sealForFTH(e, S.keys.publicKeys, 'working-file', { createdAt: e.updatedAt }).then(function (env) {
      var name = 'FTH-' + slug(e.client.company) + '-' + e.updatedAt.slice(0, 16).replace(/[:T]/g, '') + '.fthwork';
      download(name, JSON.stringify(env), 'application/json');
      S.dirty = false; updateDirty(); $('fthwIdle').hidden = true;
      say('fthwAppStatus', T.saved(name), 'ok');
      if (S.tab === 'audit') render();
    });
  });
  $('fthwClose').addEventListener('click', function () {
    if (S.dirty && !S.closeArmed) { S.closeArmed = true; say('fthwAppStatus', T.closeConfirm, 'error'); setTimeout(function () { S.closeArmed = false; }, 6000); return; }
    S.closeArmed = false; S.eng = null; S.res = null; S.dirty = false; show('fthwStart');
  });

  /* ---------- compute ---------- */
  function recompute() {
    var e = S.eng;
    S.res = C.compute(M, e.tb, { overrides: e.overrides, journals: e.journals });
    S.local = C.compute(M, e.tb, { overrides: e.overrides });
    var head = $('fthwHead');
    head.textContent = '';
    head.appendChild(h('strong', e.client.company || e.tb.company || '—'));
    head.appendChild(h('span', ' · ' + (e.tb.period || '')));
    var st = $('fthwStatusPill'); st.textContent = T.status[e.review.status]; st.className = 'fthw-pill is-' + e.review.status;
  }

  /* ---------- tabs ---------- */
  var TABS = ['overview', 'tb', 'mapping', 'journals', 'calc', 'statements', 'review', 'audit', 'model'];
  function renderNav() {
    var nav = $('fthwNav'); nav.textContent = '';
    TABS.forEach(function (t) {
      var badge = '';
      if (t === 'mapping' && S.res.unknownCount) badge = S.res.unknownCount;
      if (t === 'journals') badge = S.eng.journals.filter(function (j) { return j.status !== 'void'; }).length || '';
      if (t === 'review') badge = S.eng.review.notes.filter(function (n) { return !n.resolved; }).length || '';
      nav.appendChild(h('button', { type: 'button', 'aria-current': S.tab === t ? 'page' : null, onclick: function () { S.tab = t; render(); $('fthwMain').focus(); } }, T.tabs[t], badge !== '' ? h('span.fthw-badge', String(badge)) : null));
    });
  }
  function render() {
    renderNav();
    var main = $('fthwMain'); main.textContent = '';
    main.appendChild(h('h2.fthw-title', T.tabs[S.tab]));
    ({ overview: vOverview, tb: vTb, mapping: vMapping, journals: vJournals, calc: vCalc, statements: vStatements, review: vReview, audit: vAudit, model: vModel })[S.tab](main);
    // tableau qui défile : atteignable au clavier, nommé par le titre le plus proche
    Array.prototype.forEach.call(main.querySelectorAll('.ifrs-scroll:not([tabindex])'), function (sc) {
      var t = sc.closest('.ifrs-card, .fthw-card'), ti = t && t.querySelector('h3');
      sc.tabIndex = 0; sc.setAttribute('role', 'group'); sc.setAttribute('aria-label', ti ? ti.firstChild.textContent.trim() : T.tabs[S.tab]);
    });
  }
  function change() { recompute(); render(); }

  /* ---------- overview ---------- */
  function kv(pairs) { return h('dl.ifrs-params', pairs.map(function (p) { return h('div', h('dt', p[0]), h('dd', p[1] || '—')); })); }
  function vOverview(m) {
    var e = S.eng, r = S.res, l = S.local;
    m.appendChild(kv([[T.client, e.client.company], [T.contact, e.client.contact], [T.email, e.client.email], [T.period, e.tb.period], [T.file, e.source.name], [T.sha, (e.source.sha256 || '').slice(0, 16)]]));
    if (e.client.message) m.appendChild(h('p.ifrs-banner', h('strong', T.message + ': '), e.client.message));
    var k = function (lab, a, b) { return h('div.fthp-kpi', h('span', lab), h('strong', money(b)), h('small', T.kLocal + ' ' + money(a))); };
    m.appendChild(h('div.fthp-kpis', k(T.revenue, l.revenue, r.revenue), k(T.profit, l.profit, r.profit), k(T.assets, l.assets[1], r.assets[1]), k(T.equity, l.equity[1], r.equity[1])));
    // settings
    var set = function (key, label, type) {
      return h('label', label, h('input', { type: type || 'text', value: e.settings[key], onchange: function () { e.settings[key] = this.value; log('settings', key + ' = ' + this.value); } }));
    };
    m.appendChild(h('h3.fthw-sub', T.engagementSettings));
    m.appendChild(h('div.fthp-form.fthw-form4', set('materiality', T.materiality, 'number'), set('periodStart', T.periodStart, 'date'), set('periodEnd', T.periodEnd, 'date'), set('taxRate', T.taxRate, 'number')));
    m.appendChild(h('h3.fthw-sub', T.checks));
    m.appendChild(checkList(r));
    m.appendChild(h('h3.fthw-sub', T.indicators));
    var ans = Object.keys(e.answers || {});
    if (ans.length) m.appendChild(h('p.ifrs-hint', T.clientAnswers + ': ' + ans.map(function (q) { return (T.q[q] || q) + ' — ' + (T.answers[e.answers[q]] || e.answers[q]); }).join('; ')));
    m.appendChild(h('ul.fthp-indicators.fthw-cols', C.diagnose(l, e.answers).map(function (d) {
      var x = C.indicatorText(d, LANG);
      return h('li.fthp-ind.is-' + d.level, h('div.fthp-ind-top', h('span.fthp-std', d.standard), h('span.fthp-level', T.levels[d.level])), h('strong', x.title), h('p', x.text));
    })));
  }
  function checkList(r) {
    return h('ul.fthp-checks', r.checks.map(function (c) {
      var x = C.checkText(c, LANG);
      return h('li.fthp-check.is-' + c.level, h('span.fthp-check-icon', { 'aria-hidden': 'true' }, { ok: '✓', warn: '!', error: '×', info: 'i' }[c.level]), h('div', h('strong', x.title), h('p', x.text)));
    }));
  }

  /* ---------- trial balance ---------- */
  function vTb(m) {
    var r = S.local, raw = r.raw, breaks = {};
    r.rollBreaks.forEach(function (c) { breaks[c] = true; });
    m.appendChild(checkList(r));
    var body = h('tbody');
    var tot = [0, 0, 0, 0, 0, 0];
    r.accounts.forEach(function (a) {
      var x = raw[a.code], v = [x.od, x.oc, x.td, x.tc, x.cd, x.cc];
      v.forEach(function (n, i) { tot[i] += n; });
      body.appendChild(h('tr' + (breaks[a.code] ? '.is-flagged' : ''), rth(a.code), h('td.fthw-name', a.name || ''), v.map(function (n) { return num(n); })));
    });
    body.appendChild(h('tr.ifrs-total', rth('Σ'), h('td'), tot.map(function (n) { return num(n); })));
    m.appendChild(h('div.ifrs-scroll.fthw-table', { tabindex: '0', role: 'region', 'aria-label': T.tabs.tb },
      h('table.ifrs-table', thead([T.account, T.name, T.opening + ' Dr', T.opening + ' Cr', T.debit, T.credit, T.closing + ' Dr', T.closing + ' Cr']), body)));
  }

  /* ---------- mapping ---------- */
  function vMapping(m) {
    var e = S.eng, r = S.res;
    var bar = h('div.fthp-toolbar',
      h('div.fthp-chips', { role: 'group' }, [['all', T.all], ['attention', T.attention], ['changed', T.changed]].map(function (f) {
        return h('button', { type: 'button', 'aria-pressed': String(S.mapFilter === f[0]), onclick: function () { S.mapFilter = f[0]; render(); } }, f[1]);
      })),
      h('label.fthp-search', h('span.sr-only', T.search), h('input', { type: 'search', placeholder: T.search, value: S.mapQuery, oninput: function () { S.mapQuery = this.value; var pos = this.selectionStart; render(); var i = $('fthwMain').querySelector('.fthp-search input'); i.focus(); i.setSelectionRange(pos, pos); } })));
    m.appendChild(bar);
    var q = S.mapQuery.trim().toLowerCase();
    var body = h('tbody');
    r.accounts.forEach(function (a) {
      var flagged = a.status === 'unknown' || a.status === 'unplaced';
      if (S.mapFilter === 'attention' && !flagged) return;
      if (S.mapFilter === 'changed' && a.status !== 'manual') return;
      if (q && a.code.indexOf(q) !== 0 && (a.name || '').toLowerCase().indexOf(q) < 0) return;
      var cat;
      if (a.status === 'closingAcc') cat = h('td', h('span.ifrs-status', T.st.closingAcc));
      else {
        var info = [h('span.ifrs-status' + (flagged ? '.is-flagged' : ''), a.status === 'via' ? T.st.via + a.via : T.st[a.status])];
        if (a.fix) info.push(h('span.ifrs-status', (UK ? a.fix.reasonUk : a.fix.reasonEn) || ''));
        if (Object.prototype.hasOwnProperty.call(e.clientOverrides, a.code)) info.push(h('span.ifrs-status.fthw-client', T.clientChose + (C.catLabel(M, e.clientOverrides[a.code], LANG) || '—')));
        cat = h('td.ifrs-cat', categorySelect(a.category, function (v) {
          var was = a.category; e.overrides[a.code] = v; log('map', a.code + ': ' + (was || '—') + ' → ' + (v || '—')); change();
          var s = $('fthwMain').querySelector('select[data-code="' + a.code + '"]'); if (s) s.focus();
        }, a.statement, T.category + ' — ' + a.code), info);
        cat.querySelector('select').setAttribute('data-code', a.code);
      }
      var noteIn = h('input.fthw-note', { type: 'text', value: e.accountNotes[a.code] || '', 'aria-label': T.note + ' — ' + a.code, onchange: function () { e.accountNotes[a.code] = this.value; log('accNote', a.code + ': ' + this.value); } });
      body.appendChild(h('tr' + (flagged ? '.is-flagged' : ''), h('th', { scope: 'row' }, a.code, a.name ? h('span.ifrs-acc-name', a.name) : null), num(a.opening), num(a.movement), num(a.closing), cat, h('td', noteIn)));
    });
    m.appendChild(h('div.ifrs-scroll.fthp-accounts.fthw-table', { tabindex: '0', role: 'region', 'aria-label': T.tabs.mapping }, h('table.ifrs-table.ifrs-accounts', thead([T.account, T.opening, T.movement, T.closing, T.category, T.note]), body)));
  }

  /* ---------- journals ---------- */
  function nextNo() { return S.eng.journals.reduce(function (n, j) { return Math.max(n, j.no); }, 0) + 1; }
  function blankJournal(seed) {
    seed = seed || {};
    return { id: C.uid(), no: nextNo(), type: seed.type || 'adjust', scope: seed.scope || 'current', standard: seed.standard || 'IFRS 15', description: seed.description || '',
      lines: (seed.lines || [{ category: '', dr: '', cr: '', memo: '' }, { category: '', dr: '', cr: '', memo: '' }]).map(function (l) { return { category: l.category, dr: l.dr || '', cr: l.cr || '', memo: l.memo || '' }; }),
      status: 'draft', createdBy: S.user, createdAt: now(), isNew: true };
  }
  function openEditor(seed) { S.editing = blankJournal(seed); S.tab = 'journals'; render(); }
  function vJournals(m) {
    var e = S.eng;
    m.appendChild(h('div.fthp-actions.fthw-top', h('button.btn.btn-green', { type: 'button', onclick: function () { openEditor(); } }, T.jNew)));
    if (S.editing) m.appendChild(editor(S.editing));
    if (!e.journals.length) { m.appendChild(h('p.ifrs-hint', T.jEmpty)); return; }
    var body = h('tbody');
    e.journals.forEach(function (j) {
      var total = j.lines.reduce(function (s, l) { return s + C.num(l.dr); }, 0);
      var acts = h('td.fthw-acts');
      if (j.status !== 'void') {
        acts.appendChild(h('button.fthw-link', { type: 'button', onclick: function () { S.editing = JSON.parse(JSON.stringify(j)); render(); } }, T.jEdit));
        if (j.status === 'draft') acts.appendChild(h('button.fthw-link', { type: 'button', onclick: function () { approve(j); } }, T.jApprove));
        acts.appendChild(h('button.fthw-link.is-danger', { type: 'button', onclick: function () { j.status = 'void'; log('jvoid', '#' + j.no); change(); } }, T.jVoid));
      }
      body.appendChild(h('tr' + (j.status === 'void' ? '.is-void' : ''), rth('#' + j.no), h('td', T.jtype[j.type]), h('td', T.jscope[j.scope]), h('td', j.standard), h('td.fthw-desc', j.description,
        h('span.ifrs-acc-name', j.lines.map(function (l) { return (C.num(l.dr) ? 'Dr ' : 'Cr ') + C.catLabel(M, l.category, LANG) + ' ' + money(C.num(l.dr) || C.num(l.cr)); }).join(' · '))),
        num(total), h('td', h('span.fthw-pill.is-' + j.status, T.jstatus[j.status]), j.approvedBy ? h('span.ifrs-acc-name', j.approvedBy) : null), acts));
    });
    m.appendChild(h('div.ifrs-scroll.fthw-table', h('table.ifrs-table', thead([T.jNo, T.jType, T.jScope, T.jStd, T.jDesc, T.jTotal, T.jStatus, '']), body)));
  }
  function approve(j) {
    var bal = C.journalBalance(j);
    if ((j.scope !== 'extraction' && Math.abs(bal) > C.EPS) || !j.description) { say('fthwAppStatus', T.jNeedBalance, 'error'); return; }
    j.status = 'approved'; j.approvedBy = S.user; j.approvedAt = now();
    log('japprove', '#' + j.no + (j.createdBy === S.user ? ' (' + T.jSelf + ')' : ''));
    if (j.createdBy === S.user) say('fthwAppStatus', T.jSelf, 'error');
    change();
  }
  function editor(j) {
    var balEl = h('p.fthw-bal');
    function refreshBal() {
      var b = C.journalBalance(j);
      balEl.textContent = j.scope === 'extraction' ? 'Σ P&L ' + money(-b) : Math.abs(b) < C.EPS ? T.jBalanced : T.jUnbalanced(money(b));
      balEl.className = 'fthw-bal ' + (j.scope === 'extraction' || Math.abs(b) < C.EPS ? 'is-ok' : 'is-ko');
    }
    var sel = function (value, opts, onc, label) { var s = h('select', { 'aria-label': label }); opts.forEach(function (o) { s.appendChild(new Option(o[1], o[0])); }); s.value = value; s.addEventListener('change', function () { onc(s.value); }); return s; };
    var lines = h('tbody');
    function drawLines() {
      lines.textContent = '';
      j.lines.forEach(function (l, i) {
        var amt = function (k) { return h('input.fthw-amt', { type: 'number', step: '0.01', min: '0', value: l[k], 'aria-label': (k === 'dr' ? T.debit : T.credit) + ' ' + (i + 1), oninput: function () { l[k] = this.value; refreshBal(); } }); };
        lines.appendChild(h('tr', h('td', categorySelect(l.category, function (v) { l.category = v; }, j.scope === 'extraction' ? 'pl' : j.scope === 'opening' ? 'bs' : null, T.category + ' ' + (i + 1))),
          h('td', amt('dr')), h('td', amt('cr')), h('td', h('input', { type: 'text', value: l.memo, 'aria-label': T.jMemo + ' ' + (i + 1), oninput: function () { l.memo = this.value; } })),
          h('td', h('button.fthw-link.is-danger', { type: 'button', 'aria-label': '× ' + (i + 1), onclick: function () { j.lines.splice(i, 1); drawLines(); refreshBal(); } }, '×'))));
      });
    }
    drawLines(); refreshBal();
    function commit(andApprove) {
      j.lines = j.lines.filter(function (l) { return l.category && (C.num(l.dr) || C.num(l.cr)); });
      if (!j.description.trim() || !j.lines.length) { say('fthwAppStatus', T.jNeedBalance, 'error'); return; }
      var list = S.eng.journals, idx = list.map(function (x) { return x.id; }).indexOf(j.id), isNew = idx < 0;
      delete j.isNew;
      if (isNew) list.push(j); else { j.status = 'draft'; j.approvedBy = null; list[idx] = j; }
      log(isNew ? 'jcreate' : 'jedit', '#' + j.no + ' ' + j.standard + ' ' + j.description);
      S.editing = null;
      if (andApprove) approve(j); else change();
    }
    return h('div.fthw-editor', { role: 'group', 'aria-label': T.jNew },
      h('div.fthp-form.fthw-form4',
        h('label', T.jType, sel(j.type, [['adjust', T.jtype.adjust], ['reclass', T.jtype.reclass]], function (v) { j.type = v; }, T.jType)),
        h('label', T.jScope, sel(j.scope, [['current', T.jscope.current], ['opening', T.jscope.opening], ['extraction', T.jscope.extraction]], function (v) { j.scope = v; drawLines(); refreshBal(); }, T.jScope)),
        h('label', T.jStd, sel(j.standard, STANDARDS.map(function (s) { return [s, s]; }), function (v) { j.standard = v; }, T.jStd)),
        h('label', T.jDesc, h('input', { type: 'text', value: j.description, maxlength: '300', oninput: function () { j.description = this.value; } }))),
      h('div.ifrs-scroll', h('table.ifrs-table.fthw-lines', thead([T.category, T.debit, T.credit, T.jMemo, '']), lines)),
      h('div.fthp-actions',
        h('button.fthw-link', { type: 'button', onclick: function () { j.lines.push({ category: '', dr: '', cr: '', memo: '' }); drawLines(); } }, T.jAddLine), balEl,
        h('button.btn.btn-outline', { type: 'button', onclick: function () { commit(false); } }, T.jSave),
        h('button.btn.btn-green', { type: 'button', onclick: function () { commit(true); } }, T.jApprove),
        h('button.fthw-link', { type: 'button', onclick: function () { S.editing = null; render(); } }, T.jCancel)));
  }

  /* ---------- calculators ---------- */
  function vCalc(m) {
    var e = S.eng, L = T.calc;
    var field = function (label, input) { return h('label', label, input); };
    var inp = function (type, value, extra) { var a = { type: type, value: value }; Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; }); return h('input', a); };
    var out = function () { return h('div.fthw-out', { 'aria-live': 'polite' }); };
    var rows = function (pairs) { return h('dl.fthw-res', pairs.map(function (p) { return h('div', h('dt', p[0]), h('dd', money(p[1]))); })); };
    // description d'un journal : en ukrainien, le titre du calculateur déjà affiché (aucun terme nouveau) ; les libellés de ligne restent ceux du moteur, qui les lit
    var jd = function (en, title, part) { return UK ? title + (part ? ', ' + part : '') : en; };
    var toJ = function (j, desc) { return h('button.btn.btn-green', { type: 'button', onclick: function () { j.description = desc; openEditor(j); } }, L.toJournal); };

    // IFRS 16
    var ls = { start: inp('date', e.settings.periodStart), term: inp('number', '36', { min: '1' }), pay: inp('number', '', { min: '0', step: '0.01' }), timing: h('select', new Option(L.advance, 'advance'), new Option(L.arrears, 'arrears')), rate: inp('number', '18', { step: '0.1' }), exp: categorySelect('Administrative expenses', function () {}, 'pl', L.expense) };
    var lo = out();
    m.appendChild(h('section.fthw-card', h('h3', L.lease), h('div.fthp-form.fthw-form4', field(L.start, ls.start), field(L.term, ls.term), field(L.payment, ls.pay), field(L.timing, ls.timing), field(L.rate, ls.rate), field(L.expense, ls.exp)),
      h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', onclick: function () {
        var r = C.leaseCalc({ start: ls.start.value, termMonths: ls.term.value, payment: ls.pay.value, timing: ls.timing.value, rate: ls.rate.value, periodStart: e.settings.periodStart, periodEnd: e.settings.periodEnd, expenseCategory: ls.exp.value });
        lo.textContent = '';
        if (r.error) { lo.appendChild(h('p.fthp-status.is-error', r.error === 'notStarted' ? L.notStarted : L.inputs)); return; }
        lo.appendChild(rows([[L.pv, r.pv], [L.rouClose, r.rouClose], [L.liabClose, r.liabClose], [L.current, r.currentClose], [L.dep, r.depreciation], [L.interest, r.interest], [L.paid, r.payments]]));
        if (r.opening) lo.appendChild(h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', onclick: function () { r.opening.description = jd('IFRS 16 lease — opening balances', L.lease, 'вхідні залишки'); openEditor(r.opening); } }, L.toJournal + ' (' + T.jscope.opening + ')')));
        lo.appendChild(h('div.fthp-actions', toJ(r.current, jd('IFRS 16 lease — current period', L.lease, 'поточний період'))));
      } }, L.compute)), lo));

    // IFRS 9
    var allowance = S.local.accounts.filter(function (a) { return a.code.indexOf('38') === 0; }).reduce(function (s, a) { return s - a.closing; }, 0);
    var recv = S.local.accounts.filter(function (a) { return a.code.indexOf('36') === 0 || a.code.indexOf('34') === 0; }).reduce(function (s, a) { return s + Math.max(0, a.closing); }, 0);
    var rates = [0.5, 2, 5, 15, 40, 100];
    var bk = L.buckets.map(function (b, i) { return { a: inp('number', i === 0 ? String(C.round2(recv)) : '0', { step: '0.01', 'aria-label': L.amount + ' ' + b }), r: inp('number', String(rates[i]), { step: '0.1', 'aria-label': L.lossRate + ' ' + b }) }; });
    var ex = inp('number', String(C.round2(allowance)), { step: '0.01' }), eo = out();
    m.appendChild(h('section.fthw-card', h('h3', L.ecl),
      h('div.ifrs-scroll', h('table.ifrs-table.fthw-lines', thead(['', L.amount, L.lossRate]), h('tbody', L.buckets.map(function (b, i) { return h('tr', rth(b), h('td', bk[i].a), h('td', bk[i].r)); })))),
      h('div.fthp-form.fthw-form4', field(L.existing, ex)),
      h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', onclick: function () {
        var r = C.eclCalc({ buckets: bk.map(function (b) { return { amount: b.a.value, rate: b.r.value }; }), existing: ex.value });
        eo.textContent = ''; eo.appendChild(rows([[L.required, r.required], [L.delta, r.delta]]));
        eo.appendChild(r.journal ? h('div.fthp-actions', toJ(r.journal, jd('IFRS 9 expected credit losses (provision matrix)', L.ecl))) : h('p', L.nothing));
      } }, L.compute)), eo));

    // IAS 21
    var fx = { cat: categorySelect('Trade receivables', function () {}, 'bs', L.fxCat), fc: inp('number', '', { step: '0.01' }), rate: inp('number', '', { step: '0.0001' }), car: inp('number', '', { step: '0.01' }) }, fo = out();
    m.appendChild(h('section.fthw-card', h('h3', L.fx), h('div.fthp-form.fthw-form4', field(L.fxCat, fx.cat), field(L.fcAmount, fx.fc), field(L.closingRate, fx.rate), field(L.carrying, fx.car)),
      h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', onclick: function () {
        var cat = fx.cat.value, liab = M.lineOf[cat] && /^(eq|ncl|cl)$/.test(M.lineOf[cat].section);
        var sign = liab ? -1 : 1;
        var r = C.fxCalc({ category: cat, fcAmount: sign * C.num(fx.fc.value), rate: fx.rate.value, carrying: fx.car.value });
        fo.textContent = ''; fo.appendChild(rows([[L.diff, r.diff]]));
        fo.appendChild(r.journal ? h('div.fthp-actions', toJ(r.journal, jd('IAS 21 retranslation at closing rate', L.fx))) : h('p', L.nothing));
      } }, L.compute)), fo));

    // IAS 12
    var dtr = inp('number', String(e.settings.taxRate || 18), { step: '0.1' }), dto = out();
    m.appendChild(h('section.fthw-card', h('h3', L.dt), h('p.ifrs-hint', L.dtNote), h('div.fthp-form.fthw-form4', field(T.taxRate, dtr)),
      h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', onclick: function () {
        var r = C.deferredTaxCalc(M, e.journals, dtr.value);
        dto.textContent = ''; dto.appendChild(rows([[L.plImpact, r.plImpact], [L.openImpact, r.openImpact], [L.taxPl, r.taxPl], [L.taxOpen, r.taxOpen]]));
        dto.appendChild(r.journal ? h('div.fthp-actions', toJ(r.journal, jd('IAS 12 deferred tax on IFRS adjustments', L.dt))) : h('p', L.nothing));
      } }, L.compute)), dto));

    var openBtn = function (j, desc) { return h('button.btn.btn-outline', { type: 'button', onclick: function () { j.description = desc; openEditor(j); } }, L.toJournal + ' (' + (UK ? 'вхідні залишки' : 'opening balances') + ')'); };
    var pl = function (id) { return (S.local.pnl.filter(function (x) { return x.id === id; })[0] || { local: 0 }).local; };

    // IAS 38
    var ia = { before: inp('number', '0', { min: '0', step: '0.01' }), per: inp('number', '0', { min: '0', step: '0.01' }), ready: inp('date', ''), life: inp('number', '60', { min: '1' }), crit: h('input', { type: 'checkbox', id: 'fthwIaCrit' }) }, io = out();
    m.appendChild(h('section.fthw-card', h('h3', L.ias38), h('p.ifrs-hint', L.ia38Note),
      h('div.fthp-form.fthw-form4', field(L.costBefore, ia.before), field(L.costPeriod, ia.per), field(L.ready, ia.ready), field(L.life, ia.life), h('label.fthp-wide', ia.crit, ' ' + L.criteria)),
      h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', onclick: function () {
        var r = C.intangibleCalc({ costBefore: ia.before.value, costPeriod: ia.per.value, readyDate: ia.ready.value, lifeMonths: ia.life.value, periodStart: e.settings.periodStart, periodEnd: e.settings.periodEnd, criteriaMet: ia.crit.checked });
        io.textContent = '';
        if (r.error) { io.appendChild(h('p.fthp-status.is-error', r.error === 'criteria' ? L.noCriteria : L.inputs)); return; }
        io.appendChild(rows([[L.amortBefore, r.amortBefore], [L.amortPeriod, r.amortPeriod], [L.nbv, r.nbvClose]]));
        var acts = h('div.fthp-actions');
        if (r.opening) acts.appendChild(openBtn(r.opening, jd('IAS 38 development costs — opening balances', L.ias38, 'вхідні залишки')));
        if (r.current) acts.appendChild(toJ(r.current, jd('IAS 38 development costs — current period', L.ias38, 'поточний період')));
        io.appendChild(acts);
      } }, L.compute)), io));

    // IFRS 15
    var rv = { amount: inp('number', '', { min: '0', step: '0.01' }), inv: inp('date', ''), start: inp('date', ''), months: inp('number', '12', { min: '1' }) }, ro = out();
    m.appendChild(h('section.fthw-card', h('h3', L.ifrs15), h('p.ifrs-hint', L.ifrs15Note),
      h('div.fthp-form.fthw-form4', field(L.invAmount, rv.amount), field(L.invDate, rv.inv), field(L.svcStart, rv.start), field(L.svcMonths, rv.months)),
      h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', onclick: function () {
        var r = C.revenueCalc({ amount: rv.amount.value, invoiceDate: rv.inv.value, serviceStart: rv.start.value, serviceMonths: rv.months.value, periodStart: e.settings.periodStart, periodEnd: e.settings.periodEnd });
        ro.textContent = '';
        if (r.error) { ro.appendChild(h('p.fthp-status.is-error', r.error === 'notInvoiced' ? L.notInvoiced : L.inputs)); return; }
        ro.appendChild(rows([[L.defOpen, r.deferredOpen], [L.recognised, r.recognisedPeriod], [L.defClose, r.deferredClose]]));
        var acts = h('div.fthp-actions');
        if (r.opening) acts.appendChild(openBtn(r.opening, jd('IFRS 15 deferred revenue — opening balances', L.ifrs15, 'вхідні залишки')));
        if (r.current) acts.appendChild(toJ(r.current, jd('IFRS 15 deferred revenue — current period', L.ifrs15, 'поточний період')));
        else ro.appendChild(h('p', L.nothing));
        ro.appendChild(acts);
      } }, L.compute)), ro));

    // IAS 12 current tax
    var tx = { pbt: inp('number', String(C.round2(S.local.totals.local.pbt)), { step: '0.01' }), perm: inp('number', '0', { step: '0.01' }), loss: inp('number', '0', { min: '0', step: '0.01' }), rate: inp('number', String(e.settings.taxRate || 18), { step: '0.1' }), booked: inp('number', String(C.round2(Math.max(0, -pl('tax')))), { min: '0', step: '0.01' }) }, xo = out();
    m.appendChild(h('section.fthw-card', h('h3', L.tax), h('p.ifrs-hint', L.taxNote),
      h('div.fthp-form.fthw-form4', field(L.pbtLocal, tx.pbt), field(L.permanent, tx.perm), field(L.lossBF, tx.loss), field(T.taxRate, tx.rate), field(L.booked, tx.booked)),
      h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', onclick: function () {
        var r = C.incomeTaxCalc({ pbt: tx.pbt.value, permanent: tx.perm.value, lossBF: tx.loss.value, ratePct: tx.rate.value, booked: tx.booked.value });
        xo.textContent = ''; xo.appendChild(rows([[L.taxable, r.taxable], [L.taxBase, r.base], [L.taxCurrent, r.current], [L.taxToBook, r.delta], [L.lossCarry, r.lossCarry]]));
        xo.appendChild(r.journal ? h('div.fthp-actions', toJ(r.journal, jd('IAS 12 current income tax', L.tax))) : h('p', L.nothing));
      } }, L.compute)), xo));
  }

  /* ---------- statements ---------- */
  var SEC = function () { return { nca: T.nca, ca: T.ca, eq: T.eq, ncl: T.ncl, cl: T.cl }; };
  function vStatements(m) {
    var r = S.res;
    m.appendChild(h('div.fthp-chips.fthw-top', { role: 'group' }, ['worksheet', 'ifrs', 'soce', 'cf'].map(function (v) {
      return h('button', { type: 'button', 'aria-pressed': String(S.stView === v), onclick: function () { S.stView = v; render(); } }, T.view[v]);
    }), h('button.btn.btn-outline.fthw-xlsx', { type: 'button', onclick: exportXlsx }, T.xlsx)));
    var sofp = r.checks.filter(function (c) { return c.id === 'sofp'; })[0], x = C.checkText(sofp, LANG);
    m.appendChild(h('p.ifrs-check.' + (r.balanced ? 'is-ok' : 'is-ko'), x.title + ': ' + x.text));
    if (S.stView === 'soce') { m.appendChild(soce(r)); return; }
    if (S.stView === 'cf') { m.appendChild(cashflowCard(r)); return; }
    var ws = S.stView === 'worksheet';
    // balance sheet
    var body = h('tbody'), sec = SEC();
    var cols = ws ? function (l) { return [num(l.local[1]), num(l.reclass[1]), num(l.adjust[1]), num(l.ifrs[1]), num(l.ifrs[0])]; } : function (l) { return [num(l.ifrs[0]), num(l.ifrs[1])]; };
    var sum = function (secs) { var o = { local: [0, 0], reclass: [0, 0], adjust: [0, 0], ifrs: [0, 0] }; r.balance.forEach(function (l) { if (secs.indexOf(l.section) >= 0) ['local', 'reclass', 'adjust', 'ifrs'].forEach(function (k) { o[k][0] += l[k][0]; o[k][1] += l[k][1]; }); }); return o; };
    [[['nca', 'ca'], T.totalAssets], [['eq'], T.totalEquity], [['ncl', 'cl'], T.totalLiab]].forEach(function (g) {
      g[0].forEach(function (s) {
        var ls = r.balance.filter(function (l) { return l.section === s && ['local', 'reclass', 'adjust', 'ifrs'].some(function (k) { return Math.abs(l[k][0]) > C.EPS || Math.abs(l[k][1]) > C.EPS; }); });
        if (ls.length) body.appendChild(h('tr.ifrs-sub', h('th', { scope: 'colgroup', colspan: ws ? '6' : '3' }, sec[s])));
        ls.forEach(function (l) { body.appendChild(h('tr', rth(C.lineLabel(bsLine[l.id], LANG)), cols(l))); });
      });
      body.appendChild(h('tr.ifrs-total', rth(g[1]), cols(sum(g[0]))));
    });
    body.appendChild(h('tr.ifrs-total.ifrs-grand', rth(T.totalEqLiab), cols(sum(['eq', 'ncl', 'cl']))));
    var bsHead = ws ? [T.line, T.kLocal, T.reclass, T.adjust, T.ifrsCol, T.ifrsOpen] : [T.line, T.opening, T.closing];
    // P&L
    var pb = h('tbody');
    var pcols = ws ? function (l) { return [num(l.local), num(l.reclass), num(l.adjust), num(l.ifrs)]; } : function (l) { return [num(l.ifrs)]; };
    var psum = function (groups) { var o = { local: 0, reclass: 0, adjust: 0, ifrs: 0 }; r.pnl.forEach(function (l) { if (groups.indexOf(l.group) >= 0) ['local', 'reclass', 'adjust', 'ifrs'].forEach(function (k) { o[k] += l[k]; }); }); return o; };
    var gl = function (g) { r.pnl.filter(function (l) { return l.group === g && ['local', 'reclass', 'adjust', 'ifrs'].some(function (k) { return Math.abs(l[k]) > C.EPS; }); }).forEach(function (l) { pb.appendChild(h('tr', rth(C.lineLabel(plLine[l.id], LANG)), pcols(l))); }); };
    var up = { local: r.unplacedPl, reclass: 0, adjust: 0, ifrs: r.unplacedPl };
    gl('gross'); pb.appendChild(h('tr.ifrs-total', rth(T.gross), pcols(psum(['gross']))));
    gl('operating'); pb.appendChild(h('tr.ifrs-total', rth(T.operating), pcols(psum(['gross', 'operating']))));
    gl('finance'); pb.appendChild(h('tr.ifrs-total', rth(T.pbt), pcols(psum(['gross', 'operating', 'finance']))));
    gl('tax');
    if (Math.abs(r.unplacedPl) > C.EPS) pb.appendChild(h('tr.ifrs-unplaced', rth(T.unplacedPl), pcols(up)));
    var pr = psum(['gross', 'operating', 'finance', 'tax']); ['local', 'ifrs'].forEach(function (k) { pr[k] += r.unplacedPl; });
    pb.appendChild(h('tr.ifrs-total.ifrs-grand', rth(T.profitL), pcols(pr)));
    m.appendChild(h('div.fthw-statements' + (ws ? '.is-ws' : ''),
      h('div.ifrs-card', h('h3', (UK ? 'Звіт про фінансовий стан' : 'Statement of financial position'), h('span', UK ? 'грн' : 'UAH')), h('div.ifrs-scroll', h('table.ifrs-table', thead(bsHead), body))),
      h('div.ifrs-card', h('h3', (UK ? 'Прибутки та збитки' : 'Profit or loss'), h('span', UK ? 'грн' : 'UAH')), h('div.ifrs-scroll', h('table.ifrs-table', thead(ws ? [T.line, T.kLocal, T.reclass, T.adjust, T.ifrsCol] : [T.line, T.period]), pb)))));
  }
  function cashflowCard(r) {
    var cf = r.cashflow, K = T.cf, body = h('tbody'), un = UK ? 'uk' : 'en';
    [['op', 'cfo'], ['inv', 'cfi'], ['fin', 'cff']].forEach(function (g) {
      body.appendChild(h('tr.ifrs-sub', h('th', { scope: 'colgroup', colspan: '2' }, K[g[0]])));
      cf.lines.filter(function (l) { return l.group === g[0] && Math.abs(l.v) > C.EPS; }).forEach(function (l) { body.appendChild(h('tr', rth(l[un]), num(l.v))); });
      body.appendChild(h('tr.ifrs-total', rth(K[g[1]]), num(cf[g[1]])));
    });
    body.appendChild(h('tr.ifrs-total.ifrs-grand', rth(K.net), num(cf.net)));
    body.appendChild(h('tr', rth(K.open), num(cf.cashOpen)));
    body.appendChild(h('tr.ifrs-total', rth(K.close), num(cf.cashClose)));
    body.appendChild(h('tr' + (Math.abs(cf.gap) < 1 ? '' : '.ifrs-total'), rth(K.gap), num(cf.gap)));
    return h('div.ifrs-card', h('h3', K.title, h('span', UK ? 'грн' : 'UAH')), h('p.ifrs-hint', K.note), h('div.ifrs-scroll', h('table.ifrs-table', thead([T.line, T.closing]), body)));
  }
  function soce(r) {
    var body = h('tbody'), profit = r.totals.ifrs.profit, tot = [0, 0, 0, 0];
    r.balance.filter(function (l) { return l.section === 'eq' && (Math.abs(l.ifrs[0]) > C.EPS || Math.abs(l.ifrs[1]) > C.EPS); }).forEach(function (l) {
      var p = l.id === 'retained_earnings' ? profit : 0, other = l.ifrs[1] - l.ifrs[0] - p;
      [l.ifrs[0], p, other, l.ifrs[1]].forEach(function (v, i) { tot[i] += v; });
      body.appendChild(h('tr', rth(C.lineLabel(bsLine[l.id], LANG)), num(l.ifrs[0]), num(p), num(other), num(l.ifrs[1])));
    });
    body.appendChild(h('tr.ifrs-total.ifrs-grand', rth(T.soceTotal), tot.map(function (v) { return num(v); })));
    return h('div.ifrs-card', h('div.ifrs-scroll', h('table.ifrs-table', thead([T.line, T.opening, T.soceProfit, T.soceOther, T.closing]), body)));
  }

  function exportXlsx() {
    var X = window.XLSX, e = S.eng, r = S.res, wb = X.utils.book_new();
    var add = function (name, aoa) { var ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 14 }, { wch: 44 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 30 }]; X.utils.book_append_sheet(wb, ws, name.slice(0, 31)); };
    add('Summary', [['FTH working papers', e.client.company, e.tb.period], ['Status', T.status[e.review.status]], ['Model', M.version, 'Core', C.version], ['Source', e.source.name, e.source.sha256 || ''], [],
      ['', T.kLocal, T.kIfrs], [T.revenue, S.local.revenue, r.revenue], [T.profit, S.local.profit, r.profit], [T.assets, S.local.assets[1], r.assets[1]], [T.equity, S.local.equity[1], r.equity[1]], [],
      [T.checks]].concat(r.checks.map(function (c) { var x = C.checkText(c, LANG); return [c.level, x.title, x.text]; })));
    add('TB', [[T.account, T.name, T.opening + ' Dr', T.opening + ' Cr', T.debit, T.credit, T.closing + ' Dr', T.closing + ' Cr']].concat(S.local.accounts.map(function (a) { var x = S.local.raw[a.code]; return [a.code, a.name || '', x.od, x.oc, x.td, x.tc, x.cd, x.cc]; })));
    add('Mapping', [[T.account, T.name, T.opening, T.movement, T.closing, T.category, 'Status', T.note]].concat(r.accounts.map(function (a) { return [a.code, a.name || '', C.round2(a.opening), C.round2(a.movement), C.round2(a.closing), C.catLabel(M, a.category, LANG), a.status, e.accountNotes[a.code] || '']; })));
    var jl = [[T.jNo, T.jType, T.jScope, T.jStd, T.jDesc, T.category, T.debit, T.credit, T.jMemo, T.jStatus, 'Prepared', 'Approved']];
    e.journals.forEach(function (j) { j.lines.forEach(function (l) { jl.push(['#' + j.no, T.jtype[j.type], T.jscope[j.scope], j.standard, j.description, C.catLabel(M, l.category, LANG), C.num(l.dr), C.num(l.cr), l.memo, T.jstatus[j.status], j.createdBy, j.approvedBy || '']); }); });
    add('Journals', jl);
    add('Worksheet SoFP', [[T.line, T.kLocal + ' ' + T.closing, T.reclass, T.adjust, T.ifrsCol + ' ' + T.closing, T.ifrsOpen]].concat(r.balance.map(function (l) { return [C.lineLabel(bsLine[l.id], LANG), C.round2(l.local[1]), C.round2(l.reclass[1]), C.round2(l.adjust[1]), C.round2(l.ifrs[1]), C.round2(l.ifrs[0])]; })));
    add('Worksheet P&L', [[T.line, T.kLocal, T.reclass, T.adjust, T.ifrsCol]].concat(r.pnl.map(function (l) { return [C.lineLabel(plLine[l.id], LANG), C.round2(l.local), C.round2(l.reclass), C.round2(l.adjust), C.round2(l.ifrs)]; })).concat([[T.profitL, C.round2(r.totals.local.profit), '', '', C.round2(r.totals.ifrs.profit)]]));
    add('Cash flow', [[T.line, T.closing]].concat(r.cashflow.lines.map(function (l) { return [l[UK ? 'uk' : 'en'], l.v]; })).concat([[T.cf.cfo, r.cashflow.cfo], [T.cf.cfi, r.cashflow.cfi], [T.cf.cff, r.cashflow.cff], [T.cf.net, r.cashflow.net], [T.cf.open, r.cashflow.cashOpen], [T.cf.close, r.cashflow.cashClose], [T.cf.gap, r.cashflow.gap], [], [T.cf.note]]));
    add('Review notes', [['#', 'Ref', 'Note', 'Author', 'Date', 'Resolved']].concat(e.review.notes.map(function (n, i) { return [i + 1, n.ref, n.text, n.author, n.at, n.resolved ? n.resolvedBy + ' ' + n.resolvedAt : '']; })));
    add('Audit trail', [T.auditCols].concat(e.audit.map(function (a) { return [a.at, a.user, T.act[a.action] || a.action, a.detail]; })));
    var out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    download('FTH-WP-' + slug(e.client.company) + '.xlsx', new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }

  /* ---------- review & release ---------- */
  function conditions() {
    var e = S.eng, r = S.res;
    return [
      ['balanced', r.balanced], ['mapped', r.unknownCount === 0],
      ['drafts', !e.journals.some(function (j) { return j.status === 'draft'; })],
      ['notes', !e.review.notes.some(function (n) { return !n.resolved; })],
      ['recon', !r.recon || Math.abs(r.recon.gap) < 0.5],
      ['reviewed', e.review.status === 'reviewed' || e.review.status === 'released']
    ];
  }
  function setStatus(s) { var was = S.eng.review.status; S.eng.review.status = s; log('status', was + ' → ' + s); change(); }
  function vReview(m) {
    var e = S.eng;
    var st = e.review.status;
    var flow = h('div.fthp-actions.fthw-top', h('span.fthw-pill.is-' + st, T.status[st]));
    if (st === 'draft') flow.appendChild(h('button.btn.btn-outline', { type: 'button', 'data-status': 'in_review', onclick: function () { setStatus('in_review'); } }, T.toStatus.in_review));
    if (st === 'in_review') { flow.appendChild(h('button.btn.btn-green', { type: 'button', 'data-status': 'reviewed', onclick: function () { setStatus('reviewed'); } }, T.toStatus.reviewed)); flow.appendChild(h('button.fthw-link', { type: 'button', onclick: function () { setStatus('draft'); } }, T.toStatus.draft)); }
    if (st === 'reviewed' || st === 'released') flow.appendChild(h('button.fthw-link', { type: 'button', onclick: function () { setStatus('draft'); } }, T.toStatus.draft));
    m.appendChild(flow);

    // notes
    m.appendChild(h('h3.fthw-sub', T.notes));
    var ref = h('input', { type: 'text', placeholder: T.noteRef, 'aria-label': T.noteRef }), txt = h('textarea', { id: 'fthwNoteText', rows: '2', 'aria-label': T.addNote });
    m.appendChild(h('div.fthp-form', h('label', T.noteRef, ref), h('label.fthp-wide', T.addNote, txt)));
    m.appendChild(h('div.fthp-actions', h('button.btn.btn-outline', { type: 'button', id: 'fthwAddNote', onclick: function () {
      if (!txt.value.trim()) return;
      e.review.notes.push({ id: C.uid(), ref: ref.value.trim(), text: txt.value.trim(), author: S.user, at: now(), resolved: false });
      log('note', (ref.value.trim() ? '[' + ref.value.trim() + '] ' : '') + txt.value.trim()); change();
    } }, T.addNote)));
    if (!e.review.notes.length) m.appendChild(h('p.ifrs-hint', T.noNotes));
    else m.appendChild(h('ul.fthw-notes', e.review.notes.map(function (n) {
      return h('li' + (n.resolved ? '.is-resolved' : ''), h('div', n.ref ? h('strong', '[' + n.ref + '] ') : null, n.text, h('span.ifrs-acc-name', n.author + ' · ' + n.at.slice(0, 16).replace('T', ' ') + (n.resolved ? ' · ' + T.resolved + ' ' + n.resolvedBy : ''))),
        n.resolved ? null : h('button.fthw-link', { type: 'button', onclick: function () { n.resolved = true; n.resolvedBy = S.user; n.resolvedAt = now(); log('noteResolve', n.text.slice(0, 80)); change(); } }, T.resolve));
    })));

    // release
    m.appendChild(h('h3.fthw-sub', T.checklist));
    var conds = conditions(), allOk = conds.every(function (c) { return c[1]; });
    m.appendChild(h('ul.fthp-checks', conds.map(function (c) { return h('li.fthp-check.is-' + (c[1] ? 'ok' : 'error'), h('span.fthp-check-icon', { 'aria-hidden': 'true' }, c[1] ? '✓' : '×'), h('div', h('strong', T.ck[c[0]]))); })));
    var split = h('input', { type: 'checkbox', checked: true }), note = h('textarea', { rows: '2', maxlength: '2000' }), pass = h('input.fthp-mono', { type: 'text', id: 'fthwRelPass', value: V.passphrase(), spellcheck: 'false' });
    m.appendChild(h('div.fthp-form',
      h('label.fthp-consent.fthp-wide', split, T.relSplit),
      h('label.fthp-wide', T.relNote, note),
      h('label', T.relPass, pass), h('div.fthw-passgen', h('button.fthw-link', { type: 'button', onclick: function () { pass.value = V.passphrase(); } }, T.relNew))));
    var release = function (prelim) {
      var r = S.res, at = now();
      var payload = {
        kind: 'release', engagement: { id: e.id, company: e.client.company || e.tb.company, period: e.tb.period }, releasedAt: at, releasedBy: S.user,
        status: prelim ? 'draft' : 'reviewed', note: note.value.trim(), split: split.checked, model: M.version, core: C.version,
        disclaimerEn: (prelim ? T.prelimEn + ' ' : '') + T.disclaimerEn, disclaimerUk: (prelim ? T.prelimUk + ' ' : '') + T.disclaimerUk,
        snapshot: C.snapshot(r, { split: split.checked })
      };
      V.sealRelease(payload, S.keys, pass.value).then(function (env) {
        var txt = JSON.stringify(env);
        return V.sha256(txt).then(function (sha) {
          download('FTH-results-' + slug(payload.engagement.company) + '-' + at.slice(0, 10) + '.fthres', txt, 'application/json');
          e.releases.push({ at: at, by: S.user, sha256: sha, status: payload.status, split: payload.split });
          if (!prelim) e.review.status = 'released';
          log('release', (prelim ? 'preliminary ' : '') + 'sha256 ' + sha.slice(0, 16));
          change();
          say('fthwAppStatus', T.relDone(sha.slice(0, 16)), 'ok');
        });
      }).catch(function (err) { say('fthwAppStatus', String(err.message || err), 'error'); });
    };
    m.appendChild(h('div.fthp-actions',
      h('button.btn.btn-green', { type: 'button', id: 'fthwRelease', disabled: allOk ? null : true, onclick: function () { if (allOk) release(false); else say('fthwAppStatus', T.relBlocked, 'error'); } }, T.relMake),
      h('button.btn.btn-outline', { type: 'button', disabled: S.res.balanced ? null : true, onclick: function () { release(true); } }, T.relPrelim)));
    if (!allOk) m.appendChild(h('p.ifrs-hint', T.relBlocked));
    if (e.releases.length) m.appendChild(h('ul.fthw-notes', e.releases.map(function (x) { return h('li', h('div', x.at.slice(0, 16).replace('T', ' ') + ' · ' + x.by + ' · ' + x.status + ' · SHA-256 ' + x.sha256.slice(0, 16))); })));
  }

  /* ---------- audit & model ---------- */
  function vAudit(m) {
    var body = h('tbody');
    S.eng.audit.slice().reverse().forEach(function (a) { body.appendChild(h('tr', rth(a.at.slice(0, 19).replace('T', ' ')), h('td', a.user), h('td', T.act[a.action] || a.action), h('td.fthw-desc', a.detail))); });
    m.appendChild(h('div.ifrs-scroll.fthw-table', h('table.ifrs-table', thead(T.auditCols), body)));
  }
  function vModel(m) {
    m.appendChild(h('p.ifrs-hint', 'Model ' + M.version + ' · core ' + C.version));
    m.appendChild(h('h3.fthw-sub', T.findingsTitle));
    m.appendChild(h('ul.fthp-indicators', M.findings.map(function (f) {
      return h('li.fthp-ind.is-' + f[0], h('strong', UK ? f[2] : f[1]), h('p', UK ? f[4] : f[3]));
    })));
    m.appendChild(h('h3.fthw-sub', T.fixesTitle));
    var body = h('tbody');
    Object.keys(M.fixes).sort().forEach(function (code) {
      var f = M.fixes[code];
      body.appendChild(h('tr', rth(code), h('td', f.was ? C.catLabel(M, f.was, LANG) : '—'), h('td', M.mapping[code].category ? C.catLabel(M, M.mapping[code].category, LANG) : '—'), h('td.fthw-desc', UK ? f.reasonUk : f.reasonEn)));
    });
    m.appendChild(h('div.ifrs-scroll.fthw-table', h('table.ifrs-table', thead([T.account, T.was, T.now, T.why]), body)));
  }

  show('fthwLock');
})();
