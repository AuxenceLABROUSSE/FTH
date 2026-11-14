/* FTH reporting model, version 2 (hand-maintained, 14/11/2026).

   Applied on top of data/ifrs-data.js (generated from the FTH Excel workbook by
   tools/build-ifrs-data.py): the generated file keeps the FTH Mapping sheet as it is, and this
   file holds everything FTH decided after reviewing that workbook and its Python scripts:
   - the statement lines (they replace the generated ones);
   - corrections of the Mapping sheet (each with its reason);
   - accounts of the Ukrainian chart the Mapping sheet does not cover;
   - the review findings shown in the specialist workspace.
   Bump `version` on any change: it is written into client packages and working files. */
window.FTH_IFRS_MODEL = {
  version: '2.0.0',

  // Statement of financial position. Value = signed sum of the categories (net = debit - credit);
  // equity and liabilities shown as -net.
  balanceLines: [
    ['ppe', 'nca', 'Property, plant and equipment', 'Основні засоби', ['Property, plant and equipment', 'Property, plant and equipment – under development', 'Depreciation and amortization']],
    ['rou', 'nca', 'Right-of-use assets', 'Активи з права користування', ['Right-of-use assets', 'Depreciation and amortization (Right-of-use assets)']],
    ['intangibles', 'nca', 'Intangible assets', 'Нематеріальні активи', ['Intangible assets', 'Intangible assets – under development', 'Depreciation and amortization (Intangible assets)']],
    ['associates', 'nca', 'Investments in associates and joint ventures', 'Інвестиції в асоційовані та спільні підприємства', ['Investments in equity-accounted associates', 'Investments in equity-accounted joint ventures']],
    ['fvoci', 'nca', 'Other non-current financial assets', 'Інші довгострокові фінансові активи', ['Fair value through other comprehensive income investments', 'Derivative financial assets']],
    ['lt_receivables', 'nca', 'Long-term receivables', 'Довгострокова дебіторська заборгованість', ['Long-term receivables']],
    ['deferred_tax_asset', 'nca', 'Deferred tax asset', 'Відстрочений податковий актив', ['Deferred tax asset']],
    ['inventories', 'ca', 'Inventories', 'Запаси', ['Inventories and work in progress', 'Inventories and biological assets']],
    ['receivables', 'ca', 'Trade and other receivables', 'Торговельна та інша дебіторська заборгованість', ['Trade receivables', 'Other receivables', 'Prepayments']],
    ['current_tax_assets', 'ca', 'Current tax assets', 'Поточні податкові активи', ['Current tax assets']],
    ['contract_assets', 'ca', 'Contract assets', 'Активи за договорами', ['Contract assets']],
    ['other_financial_assets', 'ca', 'Other current financial assets', 'Інші поточні фінансові активи', ['Other current financial assets', 'Derivative financial assets (current)']],
    ['cash', 'ca', 'Cash and cash equivalents', 'Гроші та їх еквіваленти', ['Cash and cash equivalents']],
    ['held_for_sale', 'ca', 'Non-current assets held for sale', 'Необоротні активи, утримувані для продажу', ['Non-current assets held for sale']],
    ['share_capital', 'eq', 'Share capital', 'Статутний капітал', ['Share capital', 'Unpaid share capital']],
    ['share_premium', 'eq', 'Share premium', 'Емісійний дохід', ['Share premium reserve']],
    ['treasury', 'eq', 'Treasury shares', 'Вилучений капітал', ['Treasury and ESOP share reserve']],
    ['revaluation', 'eq', 'Revaluation reserve', 'Резерв переоцінки', ['Revaluation reserve']],
    ['other_reserves', 'eq', 'Other reserves', 'Інші резерви', ['Other capital reserves', 'Shares to be issued', 'Capital redemption reserve', 'Convertible debt option reserve', 'Equity investment reserve', 'Cash flow hedging reserve', 'Foreign exchange reserve', 'Share-based payment reserve']],
    ['retained_earnings', 'eq', 'Retained earnings', 'Нерозподілений прибуток', ['Retained earnings']],
    ['loans', 'ncl', 'Loans and borrowings', 'Кредити та позики', ['Loans and borrowings']],
    ['leases', 'ncl', 'Lease liabilities', 'Зобов’язання з оренди', ['Lease liabilities']],
    ['employee_benefits', 'ncl', 'Employee benefit liabilities', 'Зобов’язання з виплат працівникам', ['Employee benefit liabilities']],
    ['provisions', 'ncl', 'Provisions', 'Забезпечення', ['Provisions']],
    ['deferred_tax_liability', 'ncl', 'Deferred tax liability', 'Відстрочене податкове зобов’язання', ['Deferred tax liability']],
    ['other_ncl', 'ncl', 'Other non-current liabilities', 'Інші довгострокові зобов’язання', ['Other non-current liabilities', 'Derivative financial liabilities']],
    ['payables', 'cl', 'Trade and other payables', 'Торговельна та інша кредиторська заборгованість', ['Trade payables', 'Other payables', 'Other current liabilities and provisions']],
    ['contract_liabilities', 'cl', 'Contract liabilities', 'Зобов’язання за договорами', ['Contract liabilities', 'Contract liabilities (current)']],
    ['deferred_income', 'cl', 'Deferred income', 'Доходи майбутніх періодів', ['Deferred income']],
    ['loans_current', 'cl', 'Loans and borrowings (current)', 'Кредити та позики (поточні)', ['Current portion of long-term liabilities']],
    ['leases_current', 'cl', 'Lease liabilities (current)', 'Зобов’язання з оренди (поточні)', ['Lease liabilities (current)']],
    ['current_tax_liabilities', 'cl', 'Income tax and other tax payables', 'Податкові зобов’язання', ['Income tax payable', 'Current tax liabilities']],
    ['employee_benefits_current', 'cl', 'Employee benefit liabilities (current)', 'Зобов’язання з виплат працівникам (поточні)', ['Employee benefit liabilities (current)']],
    ['provisions_current', 'cl', 'Provisions (current)', 'Забезпечення (поточні)', ['Provisions (current)', 'Derivative financial liabilities (current)']]
  ],

  // Profit or loss, shown as -net (income +, expenses -). `group` sets the subtotal it belongs to.
  // Expenses by function (class 9) and by nature (class 8, used when the company has no class 9)
  // sit side by side: a TB uses one or the other, both never carry amounts at once.
  pnlLines: [
    ['revenue', 'gross', 'Revenue', 'Дохід від реалізації', ['Revenue']],
    ['cost_of_sales', 'gross', 'Cost of sales', 'Собівартість реалізації', ['Cost of sales']],
    ['other_income', 'operating', 'Other operating income', 'Інші операційні доходи', ['Other operating income', 'Other income (non-operating)', 'Reversal of impairment']],
    ['distribution', 'operating', 'Distribution expenses', 'Витрати на збут', ['Distribution expenses', 'Selling and distribution expenses']],
    ['administrative', 'operating', 'Administrative expenses', 'Адміністративні витрати', ['Administrative expenses']],
    ['materials', 'operating', 'Raw materials and consumables used', 'Сировина та матеріали', ['Raw materials and consumables used']],
    ['employee_expense', 'operating', 'Employee benefits expense', 'Витрати на виплати працівникам', ['Employee benefits expense']],
    ['depreciation_expense', 'operating', 'Depreciation and amortisation', 'Амортизація', ['Depreciation and amortisation expense']],
    ['other_nature', 'operating', 'Other operating expenses (by nature)', 'Інші операційні витрати (за елементами)', ['Other expenses by nature']],
    ['impairment', 'operating', 'Impairment losses on financial assets', 'Збитки від знецінення фінансових активів', ['Impairment loss']],
    ['fx', 'operating', 'Net foreign exchange gain (loss)', 'Курсові різниці (нетто)', ['FX gain/loss']],
    ['other_expenses', 'operating', 'Other expenses', 'Інші витрати', ['Other operating expenses', 'Other expenses', 'Expenses by function / other expenses']],
    ['finance_income', 'finance', 'Finance income', 'Фінансові доходи', ['Finance income']],
    ['finance_costs', 'finance', 'Finance costs', 'Фінансові витрати', ['Finance costs', 'Finance expense', 'Interest expense']],
    ['tax', 'tax', 'Income tax expense', 'Витрати з податку на прибуток', ['Income tax expense']]
  ],

  // Ukrainian names of categories added by this version (the others come from ifrs-data.js).
  categoryUk: {
    'Long-term receivables': 'Довгострокова дебіторська заборгованість',
    'Other current financial assets': 'Інші поточні фінансові активи',
    'Other capital reserves': 'Інші резерви капіталу',
    'Share-based payment reserve': 'Резерв виплат на основі акцій',
    'Other non-current liabilities': 'Інші довгострокові зобов’язання',
    'Deferred income': 'Доходи майбутніх періодів',
    'Raw materials and consumables used': 'Сировина та матеріали',
    'Employee benefits expense': 'Витрати на виплати працівникам',
    'Depreciation and amortisation expense': 'Амортизація (витрати)',
    'Other expenses by nature': 'Інші операційні витрати (за елементами)',
    'FX gain/loss': 'Курсові різниці'
  },

  // Corrections of the FTH Mapping sheet: [account, category, reason EN, reason UK].
  mappingFixes: [
    ['3711', 'Prepayments', 'Mapped to “Dividend”, a category with no statement line: advances paid in UAH are prepayments.', 'Було «Dividend» (категорія без статті): видані аванси в гривні — це передоплати.'],
    ['377', 'Other receivables', 'Mapped to “Share-based payment”: account 377 holds receivables from other debtors.', 'Було «Share-based payment»: рахунок 377 — розрахунки з іншими дебіторами.'],
    ['352', 'Other current financial assets', 'Was in cash equivalents: other current investments rarely meet IAS 7.7 (3 months, insignificant risk).', 'Було в еквівалентах грошей: інші поточні інвестиції рідко відповідають МСБО 7.7.'],
    ['471', 'Employee benefit liabilities (current)', 'Accrued holiday pay is a short-term employee benefit (IAS 19.13): current, not non-current.', 'Забезпечення відпусток — короткострокові виплати (МСБО 19.13): поточні, а не довгострокові.'],
    ['235', 'Inventories and work in progress', 'Category “витрати періоду (P&L)” had no line: the balance of 23x is work in progress.', 'Категорія «витрати періоду (P&L)» без статті: сальдо 23х — незавершене виробництво.'],
    ['91', 'Cost of sales', 'Production overheads were in administrative expenses: under IAS 2.12 they belong to the cost of production.', 'Загальновиробничі витрати були в адміністративних: за МСБО 2.12 вони входять до собівартості.'],
    ['422', 'Other capital reserves', 'Other paid-in capital was in retained earnings: it is a contribution of owners, shown in other reserves.', 'Інший вкладений капітал був у нерозподіленому прибутку: це внесок власників, інші резерви.'],
    ['424', 'Other capital reserves', 'Donated non-current assets were in retained earnings: owner contribution (equity) or government grant (IAS 20), to be decided.', 'Безоплатно отримані активи були в нерозподіленому прибутку: внесок власника або грант (МСБО 20) — вирішує спеціаліст.'],
    ['425', 'Other capital reserves', 'Other additional capital was in retained earnings.', 'Інший додатковий капітал був у нерозподіленому прибутку.'],
    ['7', '', 'Class 7 itself was mapped to “Income”, a category with no line.', 'Клас 7 мав категорію «Income» без статті.'],
    ['79', '', 'Closing accounts are not part of the statements.', 'Рахунки закриття не входять до звітів.'],
    ['791', '', '“Cost of sales (closing account)”: 791 is a closing account, not cost of sales.', '«Cost of sales (closing account)»: 791 — рахунок закриття, не собівартість.'],
    ['80', 'Raw materials and consumables used', 'Class 8 (expenses by nature) had no category: nature lines added for companies without class 9.', 'Клас 8 не мав категорій: додано статті за елементами для компаній без класу 9.'],
    ['81', 'Employee benefits expense', '', ''],
    ['82', 'Employee benefits expense', '', ''],
    ['83', 'Depreciation and amortisation expense', 'Mapped to the balance-sheet category of accumulated depreciation: amortisation expense is a P&L category.', 'Була балансова категорія зносу: амортизація — категорія звіту про прибутки.'],
    ['831', 'Depreciation and amortisation expense', '', ''],
    ['832', 'Depreciation and amortisation expense', '', ''],
    ['833', 'Depreciation and amortisation expense', '', ''],
    ['84', 'Other expenses by nature', '', '']
  ],

  // Accounts of the Ukrainian chart (Наказ МФУ № 291) missing from the Mapping sheet:
  // [account, category, name]. Used when the account is not in the sheet, or is there with no category.
  chartAdditions: [
    ['14', 'Fair value through other comprehensive income investments', 'Довгострокові фінансові інвестиції'],
    ['16', '', 'Довгострокові біологічні активи'],
    ['18', 'Long-term receivables', 'Довгострокова дебіторська заборгованість та інші необоротні активи'],
    ['19', 'Intangible assets', 'Гудвіл'],
    ['21', 'Inventories and biological assets', 'Поточні біологічні активи'],
    ['27', 'Inventories and biological assets', 'Продукція сільськогосподарського виробництва'],
    ['34', 'Trade receivables', 'Короткострокові векселі одержані'],
    ['35', 'Other current financial assets', 'Поточні фінансові інвестиції'],
    ['38', 'Trade receivables', 'Резерв сумнівних боргів'],
    ['39', 'Prepayments', 'Витрати майбутніх періодів'],
    ['40', 'Share capital', 'Зареєстрований (пайовий) капітал'],
    ['41', 'Revaluation reserve', 'Капітал у дооцінках'],
    ['43', 'Other capital reserves', 'Резервний капітал'],
    ['47', 'Provisions', 'Забезпечення майбутніх витрат і платежів'],
    ['48', 'Deferred income', 'Цільове фінансування і цільові надходження'],
    ['51', 'Loans and borrowings', 'Довгострокові векселі видані'],
    ['52', 'Loans and borrowings', 'Довгострокові зобов’язання за облігаціями'],
    ['53', 'Lease liabilities', 'Довгострокові зобов’язання з оренди'],
    ['55', 'Other non-current liabilities', 'Інші довгострокові зобов’язання'],
    ['60', 'Current portion of long-term liabilities', 'Короткострокові позики'],
    ['62', 'Trade payables', 'Короткострокові векселі видані'],
    ['67', 'Other payables', 'Розрахунки з учасниками'],
    ['69', 'Deferred income', 'Доходи майбутніх періодів'],
    ['70', 'Revenue', 'Доходи від реалізації'],
    ['72', 'Finance income', 'Дохід від участі в капіталі'],
    ['73', 'Finance income', 'Інші фінансові доходи'],
    ['76', 'Other operating income', 'Страхові платежі'],
    ['85', 'Other expenses by nature', 'Інші затрати'],
    ['96', 'Finance costs', 'Втрати від участі в капіталі']
  ],

  // Accounts read as revenue deductions (debit side) when the P&L is rebuilt from turnovers.
  revenueDeductions: ['704', '7092'],

  // Review of the FTH workbook and scripts (shown in the workspace, “Model notes”).
  findings: [
    ['high', 'Script 8 counted “Other receivables” twice in the balance sheet.', 'Скрипт 8 рахував «Other receivables» у балансі двічі.', 'One line only (Trade and other receivables).', 'Лише одна стаття (торговельна та інша дебіторська заборгованість).'],
    ['high', 'Script 7 booked a notional current tax of 18% of profit before tax.', 'Скрипт 7 нараховував умовний податок 18% від прибутку до оподаткування.', 'Tax shows only what the TB holds; current and deferred tax are specialist adjustments.', 'Податок — лише з ОСВ; поточний і відстрочений податок — коригування спеціаліста.'],
    ['high', 'Script 8 dropped categories (PPE under development, prepayments, current tax assets, other current liabilities, contract liabilities): the balance sheet could not balance.', 'Скрипт 8 пропускав категорії (капінвестиції, аванси, податкові активи, інші поточні зобов’язання): баланс не сходився.', 'Every category is placed; whatever is not is shown as “not classified” and blocks the check.', 'Кожна категорія має статтю; некласифіковане показано окремо й блокує контроль.'],
    ['high', 'When income and expenses are closed through 79, turnovers double count: VAT debited to 70, reversals, 91 closed to 23.', 'При закритті через 79 обороти дублюються: ПДВ у дебеті 70, сторно, 91 закривається на 23.', 'P&L from turnovers is reconciled to the movement of retained earnings; the difference is shown and must be cleared by an extraction correction.', 'Звіт за оборотами звіряється з рухом нерозподіленого прибутку; різниця показується й усувається коригуванням вибірки.'],
    ['medium', 'Mapping errors: 3711 → Dividend, 377 → Share-based payment, 352 → cash equivalents, 471 → non-current, 83x → balance-sheet depreciation, 422/424/425 → retained earnings.', 'Помилки мапінгу: 3711 → Dividend, 377 → Share-based payment, 352 → еквіваленти, 471 → довгострокові, 83х → знос, 422/424/425 → нерозподілений прибуток.', 'Corrected in model 2.0 (list in data/ifrs-model.js).', 'Виправлено в моделі 2.0 (перелік у data/ifrs-model.js).'],
    ['medium', 'Chart accounts missing: 38 (bad-debt allowance), 39, 43, 48, 53, 55, 62, 67, 69, 72, 73…: a TB holding them could not balance.', 'Бракувало рахунків: 38 (резерв сумнівних боргів), 39, 43, 48, 53, 55, 62, 67, 69, 72, 73…', 'Added from the Ukrainian chart; the mapping of the Excel sheet keeps priority.', 'Додано з Плану рахунків; мапінг Excel має пріоритет.'],
    ['medium', 'Impairment losses were inside gross profit.', 'Збитки від знецінення були у валовому прибутку.', 'Shown in operating profit, on their own line (IAS 1.82(ba)).', 'Показано в операційному прибутку окремою статтею (МСБО 1.82(ba)).'],
    ['medium', 'FX gains and losses (7701/8701) had no statement line.', 'Курсові різниці (7701/8701) не мали статті.', 'Net FX line in operating profit.', 'Окрема стаття курсових різниць в операційному прибутку.'],
    ['info', 'The workbook used 48xx/49xx for FTH adjustment accounts, which in the Ukrainian chart are targeted financing and insurance reserves.', 'У книзі 48хх/49хх — рахунки коригувань FTH, а в Плані рахунків це цільове фінансування й страхові резерви.', 'Adjustments are journals on IFRS categories, never on chart accounts.', 'Коригування — журнали на категоріях МСФЗ, не на рахунках Плану.']
  ]
};
