#!/usr/bin/env python3
"""Build data/ifrs-data.js for the preliminary IFRS tool (/ifrs-tool, /ifrs-tool-ua).

Usage: python3 tools/build-ifrs-data.py <Звіти.xlsx> <ОСВ demo .xls>

(Base layer of the reporting model: corrections and statement lines are in data/ifrs-model.js.)
Reads the FTH workbook (sheet Mapping: col A account, B description, C IFRS category)
and the demo trial balance (ОСВ "Добро", 2015), and writes them, with the category ->
statement-line table below, as one static script (window.FTH_IFRS_DATA). A script and not
JSON so the tool never needs fetch(): the page makes no request once it is loaded.
Needs openpyxl and xlrd.
"""
import json
import math
import re
import sys
from pathlib import Path

import openpyxl
import xlrd

OUT = Path(__file__).resolve().parent.parent / "data" / "ifrs-data.js"
# FTH's own IFRS adjustment accounts (48xx, 49xx: contracts, leases, FX, derivatives, reserves)
# are not part of the Ukrainian chart: they are left out of the published mapping.
INTERNAL_PREFIXES = ("48", "49")
# An account of the chart: 1-4 digits, optionally a short suffix (36Р, 4800.2). Longer numbers in
# column A of a TB (analytic codes, tax IDs, item numbers) are analytic lines, ignored.
ACCOUNT = re.compile(r"\d{1,4}(?:[.A-Za-z\u0400-\u04ff][0-9A-Za-z\u0400-\u04ff]{0,3})?")

# Accounts with no category in the Mapping sheet that script 7 nets into revenue
# (revenue deductions); they are debit-side accounts (used when the TB is closed through 79).
REVENUE_DEDUCTIONS = ["704", "7092"]

# Balance sheet lines (order of sheet IFRS_Balance, script 8). Value = signed sum of the
# categories, net = debit - credit; equity and liabilities are shown as -net.
# Departures from script 8, on purpose (each keeps assets = equity + liabilities):
# - "Other receivables" sits on one line only (script 8 counts it twice);
# - Unpaid share capital is added with its sign (debit balance reduces share capital);
# - depreciation is a signed sum (credit balance), i.e. gross - |depreciation| for normal data;
# - categories script 8 drops are placed: PPE under development, Prepayments, Current tax
#   assets, Other current liabilities and provisions, Contract liabilities (current).
BALANCE_LINES = [
    ("ppe", "nca", "Property, plant and equipment", "Основні засоби",
     ["Property, plant and equipment", "Property, plant and equipment – under development", "Depreciation and amortization"]),
    ("rou", "nca", "Right-of-use assets", "Активи з права користування",
     ["Right-of-use assets", "Depreciation and amortization (Right-of-use assets)"]),
    ("intangibles", "nca", "Intangible assets", "Нематеріальні активи",
     ["Intangible assets", "Intangible assets – under development", "Depreciation and amortization (Intangible assets)"]),
    ("associates", "nca", "Investments in equity-accounted associates", "Інвестиції в асоційовані підприємства",
     ["Investments in equity-accounted associates"]),
    ("joint_ventures", "nca", "Investments in equity-accounted joint ventures", "Інвестиції в спільні підприємства",
     ["Investments in equity-accounted joint ventures"]),
    ("fvoci", "nca", "Fair value through other comprehensive income investments", "Інвестиції за справедливою вартістю через інший сукупний дохід",
     ["Fair value through other comprehensive income investments"]),
    ("derivative_assets", "nca", "Derivative financial assets", "Похідні фінансові активи",
     ["Derivative financial assets"]),
    ("deferred_tax_asset", "nca", "Deferred tax asset", "Відстрочений податковий актив",
     ["Deferred tax asset"]),
    ("inventories", "ca", "Inventories", "Запаси",
     ["Inventories and work in progress", "Inventories and biological assets"]),
    ("receivables", "ca", "Trade and other receivables", "Торговельна та інша дебіторська заборгованість",
     ["Trade receivables", "Other receivables", "Prepayments"]),
    ("current_tax_assets", "ca", "Current tax assets", "Поточні податкові активи",
     ["Current tax assets"]),
    ("contract_assets", "ca", "Contract assets", "Активи за договорами",
     ["Contract assets"]),
    ("held_for_sale", "ca", "Non-current assets held for sale", "Необоротні активи, утримувані для продажу",
     ["Non-current assets held for sale"]),
    ("derivative_assets_current", "ca", "Derivative financial assets (current)", "Похідні фінансові активи (поточні)",
     ["Derivative financial assets (current)"]),
    ("cash", "ca", "Cash and cash equivalents", "Гроші та їх еквіваленти",
     ["Cash and cash equivalents"]),
    ("share_capital", "eq", "Share capital", "Статутний капітал",
     ["Share capital", "Unpaid share capital"]),
    ("share_premium", "eq", "Share premium reserve", "Емісійний дохід",
     ["Share premium reserve"]),
    ("shares_to_be_issued", "eq", "Shares to be issued", "Акції, що будуть випущені",
     ["Shares to be issued"]),
    ("capital_redemption", "eq", "Capital redemption reserve", "Резерв викупу капіталу",
     ["Capital redemption reserve"]),
    ("treasury", "eq", "Treasury and ESOP share reserve", "Вилучений капітал і резерв ESOP",
     ["Treasury and ESOP share reserve"]),
    ("convertible", "eq", "Convertible debt option reserve", "Резерв конвертованих боргових опціонів",
     ["Convertible debt option reserve"]),
    ("revaluation", "eq", "Revaluation reserve", "Резерв переоцінки",
     ["Revaluation reserve"]),
    ("equity_investment", "eq", "Equity investment reserve", "Резерв інвестицій у капітальні інструменти",
     ["Equity investment reserve"]),
    ("cash_flow_hedging", "eq", "Cash flow hedging reserve", "Резерв хеджування грошових потоків",
     ["Cash flow hedging reserve"]),
    ("fx_reserve", "eq", "Foreign exchange reserve", "Резерв курсових різниць",
     ["Foreign exchange reserve"]),
    ("retained_earnings", "eq", "Retained earnings", "Нерозподілений прибуток",
     ["Retained earnings"]),
    ("loans", "ncl", "Loans and borrowings", "Кредити та позики",
     ["Loans and borrowings"]),
    ("leases", "ncl", "Lease liabilities", "Зобов’язання з оренди",
     ["Lease liabilities"]),
    ("derivative_liabilities", "ncl", "Derivative financial liabilities", "Похідні фінансові зобов’язання",
     ["Derivative financial liabilities"]),
    ("employee_benefits", "ncl", "Employee benefit liabilities", "Зобов’язання з виплат працівникам",
     ["Employee benefit liabilities"]),
    ("provisions", "ncl", "Provisions", "Забезпечення",
     ["Provisions"]),
    ("deferred_tax_liability", "ncl", "Deferred tax liability", "Відстрочене податкове зобов’язання",
     ["Deferred tax liability"]),
    ("payables", "cl", "Trade and other payables", "Торговельна та інша кредиторська заборгованість",
     ["Trade payables", "Other payables", "Other current liabilities and provisions"]),
    ("contract_liabilities", "cl", "Contract liabilities", "Зобов’язання за договорами",
     ["Contract liabilities", "Contract liabilities (current)"]),
    ("loans_current", "cl", "Loans and borrowings (current)", "Кредити та позики (поточні)",
     ["Current portion of long-term liabilities"]),
    ("leases_current", "cl", "Lease liabilities (current)", "Зобов’язання з оренди (поточні)",
     ["Lease liabilities (current)"]),
    ("derivative_liabilities_current", "cl", "Derivative financial liabilities (current)", "Похідні фінансові зобов’язання (поточні)",
     ["Derivative financial liabilities (current)"]),
    ("current_tax_liabilities", "cl", "Income tax and other tax payables", "Розрахунки з податку на прибуток та інших податків",
     ["Income tax payable", "Current tax liabilities"]),
    ("employee_benefits_current", "cl", "Employee benefit liabilities (current)", "Зобов’язання з виплат працівникам (поточні)",
     ["Employee benefit liabilities (current)"]),
    ("provisions_current", "cl", "Provisions (current)", "Забезпечення (поточні)",
     ["Provisions (current)"]),
]

# P&L lines (sheet IFRS_PnL, script 7), shown as -net (income +, expenses -).
# Script 7's notional current tax (18% of profit before tax) is NOT computed: the tax line
# only shows what the trial balance holds (class 98).
PNL_LINES = [
    ("revenue", "Revenue", "Дохід від реалізації", ["Revenue"]),
    ("cost_of_sales", "Cost of sales", "Собівартість реалізації", ["Cost of sales"]),
    ("impairment", "Impairment loss", "Збиток від зменшення корисності", ["Impairment loss", "Reversal of impairment"]),
    ("other_income", "Other operating income", "Інші операційні доходи", ["Other operating income", "Other income (non-operating)"]),
    ("administrative", "Administrative expenses", "Адміністративні витрати", ["Administrative expenses"]),
    ("distribution", "Distribution expenses", "Витрати на збут", ["Distribution expenses", "Selling and distribution expenses"]),
    ("other_expenses", "Other expenses", "Інші витрати", ["Other operating expenses", "Other expenses", "Expenses by function / other expenses"]),
    ("finance_income", "Finance income", "Фінансові доходи", ["Finance income"]),
    ("finance_costs", "Finance expense", "Фінансові витрати", ["Finance costs", "Finance expense", "Interest expense"]),
    ("tax", "Tax expense", "Витрати з податку на прибуток", ["Income tax expense"]),
]

# Ukrainian names of the categories shown in the drop-down (English = the category itself).
CATEGORY_UK = {
    "Property, plant and equipment": "Основні засоби",
    "Property, plant and equipment – under development": "Основні засоби (капітальні інвестиції)",
    "Depreciation and amortization": "Знос основних засобів",
    "Right-of-use assets": "Активи з права користування",
    "Depreciation and amortization (Right-of-use assets)": "Амортизація активів з права користування",
    "Intangible assets": "Нематеріальні активи",
    "Intangible assets – under development": "Нематеріальні активи (у розробці)",
    "Depreciation and amortization (Intangible assets)": "Амортизація нематеріальних активів",
    "Investments in equity-accounted associates": "Інвестиції в асоційовані підприємства",
    "Investments in equity-accounted joint ventures": "Інвестиції в спільні підприємства",
    "Fair value through other comprehensive income investments": "Інвестиції за справедливою вартістю через ІСД",
    "Derivative financial assets": "Похідні фінансові активи",
    "Deferred tax asset": "Відстрочений податковий актив",
    "Inventories and work in progress": "Запаси та незавершене виробництво",
    "Inventories and biological assets": "Запаси та біологічні активи",
    "Trade receivables": "Торговельна дебіторська заборгованість",
    "Other receivables": "Інша дебіторська заборгованість",
    "Prepayments": "Видані аванси",
    "Current tax assets": "Поточні податкові активи",
    "Contract assets": "Активи за договорами",
    "Non-current assets held for sale": "Необоротні активи, утримувані для продажу",
    "Derivative financial assets (current)": "Похідні фінансові активи (поточні)",
    "Cash and cash equivalents": "Гроші та їх еквіваленти",
    "Share capital": "Статутний капітал",
    "Unpaid share capital": "Неоплачений капітал",
    "Share premium reserve": "Емісійний дохід",
    "Shares to be issued": "Акції, що будуть випущені",
    "Capital redemption reserve": "Резерв викупу капіталу",
    "Treasury and ESOP share reserve": "Вилучений капітал і резерв ESOP",
    "Convertible debt option reserve": "Резерв конвертованих боргових опціонів",
    "Revaluation reserve": "Резерв переоцінки",
    "Equity investment reserve": "Резерв інвестицій у капітальні інструменти",
    "Cash flow hedging reserve": "Резерв хеджування грошових потоків",
    "Foreign exchange reserve": "Резерв курсових різниць",
    "Retained earnings": "Нерозподілений прибуток",
    "Loans and borrowings": "Кредити та позики",
    "Lease liabilities": "Зобов’язання з оренди",
    "Derivative financial liabilities": "Похідні фінансові зобов’язання",
    "Employee benefit liabilities": "Зобов’язання з виплат працівникам",
    "Provisions": "Забезпечення",
    "Deferred tax liability": "Відстрочене податкове зобов’язання",
    "Trade payables": "Торговельна кредиторська заборгованість",
    "Other payables": "Інша кредиторська заборгованість",
    "Other current liabilities and provisions": "Інші поточні зобов’язання",
    "Contract liabilities": "Зобов’язання за договорами",
    "Contract liabilities (current)": "Зобов’язання за договорами (поточні)",
    "Current portion of long-term liabilities": "Поточна частина кредитів і позик",
    "Lease liabilities (current)": "Зобов’язання з оренди (поточні)",
    "Derivative financial liabilities (current)": "Похідні фінансові зобов’язання (поточні)",
    "Income tax payable": "Податок на прибуток до сплати",
    "Current tax liabilities": "Інші податкові зобов’язання",
    "Employee benefit liabilities (current)": "Зобов’язання з виплат працівникам (поточні)",
    "Provisions (current)": "Забезпечення (поточні)",
    "Revenue": "Дохід від реалізації",
    "Cost of sales": "Собівартість реалізації",
    "Impairment loss": "Збиток від зменшення корисності",
    "Reversal of impairment": "Відновлення корисності",
    "Other operating income": "Інші операційні доходи",
    "Other income (non-operating)": "Інші доходи",
    "Administrative expenses": "Адміністративні витрати",
    "Distribution expenses": "Витрати на збут",
    "Selling and distribution expenses": "Витрати на збут і дистрибуцію",
    "Other operating expenses": "Інші операційні витрати",
    "Other expenses": "Інші витрати",
    "Expenses by function / other expenses": "Витрати діяльності / інші витрати",
    "Finance income": "Фінансові доходи",
    "Finance costs": "Фінансові витрати",
    "Finance expense": "Фінансові витрати (інші)",
    "Interest expense": "Витрати на відсотки",
    "Income tax expense": "Витрати з податку на прибуток",
}


def norm_code(v):
    """Account code as text: 401.0 -> '401', ' 36Р ' -> '36Р', None/NaN/'' -> None."""
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v):
            return None
        return str(int(v)) if v.is_integer() else str(v)
    if isinstance(v, int):
        return str(v)
    s = str(v).strip()
    if s.endswith(".0") and s[:-2].isdigit():
        s = s[:-2]
    return s or None


def num(v):
    if v in (None, ""):
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    # same rule as num() in js/ifrs-tool.js: "1 234,56", "1,234.56", "1.234,56"
    s = re.sub(r"[\s\u00a0\u202f']", "", str(v))
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:
        s = s.replace(",", "") if s.count(",") > 1 else s.replace(",", ".")
    elif s.count(".") > 1:
        s = s.replace(".", "")
    try:
        return float(s)
    except ValueError:
        return 0.0


def read_mapping(xlsx):
    ws = openpyxl.load_workbook(xlsx, data_only=True)["Mapping"]
    out = {}
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
        code = norm_code(row[0])
        if not code or not code[0].isdigit() or code.startswith(INTERNAL_PREFIXES):
            continue
        cat = (row[2] or "").strip() if isinstance(row[2], str) else ""
        if code in REVENUE_DEDUCTIONS and not cat:
            cat = "Revenue"
        out[code] = {"name": (row[1] or "").strip() if isinstance(row[1], str) else "", "category": cat}
    return out


def read_osv(xls):
    """Demo ОСВ: account in A, from Excel row 8; B+C opening debit, D opening credit,
    E/F period debit/credit, G/H closing debit/credit. Returns meta + rows."""
    sh = xlrd.open_workbook(xls).sheet_by_index(0)
    company = str(sh.cell_value(0, 0)).strip()
    title = str(sh.cell_value(1, 0)).strip()
    period = title.split(" за ", 1)[1].strip() if " за " in title else ""
    rows = []
    for r in range(7, sh.nrows):
        v = sh.row_values(r)
        # off-balance 01-09 typed as numbers arrive as 1..9: keep them in class 0
        code = "0" + str(int(v[0])) if isinstance(v[0], float) and v[0].is_integer() and 1 <= v[0] <= 9 else norm_code(v[0])
        if not code or not ACCOUNT.fullmatch(code):
            continue
        rows.append([code, num(v[1]) + num(v[2]), num(v[3]), num(v[4]), num(v[5]), num(v[6]), num(v[7])])
    return {"company": company, "period": period, "rows": rows}


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    mapping = read_mapping(sys.argv[1])
    demo = read_osv(sys.argv[2])
    cats = {c for line in BALANCE_LINES for c in line[4]} | {c for line in PNL_LINES for c in line[3]}
    missing_uk = sorted(cats - CATEGORY_UK.keys())
    if missing_uk:
        sys.exit(f"CATEGORY_UK misses: {missing_uk}")
    data = {
        "balanceLines": [{"id": i, "section": s, "en": en, "uk": uk, "categories": c} for i, s, en, uk, c in BALANCE_LINES],
        "pnlLines": [{"id": i, "en": en, "uk": uk, "categories": c} for i, en, uk, c in PNL_LINES],
        "categoryUk": CATEGORY_UK,
        "revenueDeductions": REVENUE_DEDUCTIONS,
        "mapping": mapping,
        "demo": demo,
    }
    OUT.parent.mkdir(exist_ok=True)
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # The workbook still holds a Russian description; the site is Ukrainian/English only.
    body = body.replace("Отложенные налоговые расходы", "Відстрочені податкові витрати")
    OUT.write_text(
        "/* Generated by tools/build-ifrs-data.py from the FTH Mapping sheet and the demo ОСВ (Добро, 2015). Do not edit by hand. */\n"
        "window.FTH_IFRS_DATA = " + body + ";\n",
        encoding="utf-8",
    )
    unplaced = sorted({m["category"] for m in mapping.values() if m["category"] and m["category"] not in cats})
    print(f"{OUT}: {len(mapping)} mapped accounts, {len(demo['rows'])} demo rows")
    print("Mapping categories with no statement line (accounts shown as 'not placed'):", unplaced)


if __name__ == "__main__":
    main()
