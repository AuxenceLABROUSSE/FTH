#!/usr/bin/env python3
"""Reference totals for the preliminary IFRS tool, computed in Python straight from the raw
files (not from data/ifrs-data.js), to check the figures the browser shows.

Usage: python3 tools/reference-ifrs.py <Звіти.xlsx> <ОСВ demo .xls>   -> prints JSON

Rules (same as js/ifrs-tool.js, written independently):
- net = debit - credit (opening B+C-D, period E-F, closing G-H); class 0 (off-balance) ignored;
- a parent account (10) counts only if none of its sub-accounts in the file (103...) has an amount;
- category: exact account, else the longest prefix of at least 2 digits;
- balance sheet from classes 1-6; equity and liabilities shown as -net;
- result not yet closed to retained earnings = -(sum of class 7-9 balances), added to
  retained earnings (0 when the TB is closed through 79, so nothing is counted twice);
- P&L from class 7-9 period movements (79x excluded), shown as -net.
"""
import importlib.util
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in the site folder (it is served as is)
spec = importlib.util.spec_from_file_location("build", Path(__file__).with_name("build-ifrs-data.py"))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)  # line tables + file readers (the statement definition, not the arithmetic)


def category(code, mapping):
    if code in mapping:
        return mapping[code]["category"]
    for i in range(len(code) - 1, 1, -1):
        if code[:i] in mapping:
            return mapping[code[:i]]["category"]
    return ""


def main():
    mapping = build.read_mapping(sys.argv[1])
    rows = build.read_osv(sys.argv[2])["rows"]
    acc = {}
    for code, od, oc, td, tc, cd, cc in rows:
        if code.startswith("0"):
            continue
        acc[code] = (od - oc, td - tc, cd - cc)
    nonzero = {c for c, v in acc.items() if any(abs(x) > 1e-9 for x in v)}
    leaves = [c for c in nonzero if not any(o != c and o.startswith(c) for o in nonzero)]

    line_of = {}
    for lid, section, _en, _uk, cats in build.BALANCE_LINES:
        for c in cats:
            line_of[c] = ("bs", lid, section)
    for lid, _en, _uk, cats in build.PNL_LINES:
        for c in cats:
            line_of[c] = ("pl", lid, None)

    sections = {s: [0.0, 0.0] for s in ("nca", "ca", "eq", "ncl", "cl")}
    unplaced = [0.0, 0.0]
    pl_close = [0.0, 0.0]
    revenue = profit = 0.0
    for c in leaves:
        o, t, cl = acc[c]
        cat = category(c, mapping)
        where = line_of.get(cat)
        if c[0] in "789":
            pl_close[0] += o
            pl_close[1] += cl
            if not c.startswith("79"):
                profit -= t
                if where and where[1] == "revenue":
                    revenue -= t
        elif where and where[0] == "bs":
            sections[where[2]][0] += o
            sections[where[2]][1] += cl
        else:
            unplaced[0] += o
            unplaced[1] += cl

    result_added = [-pl_close[0], -pl_close[1]]
    out = {}
    for i, col in enumerate(("opening", "closing")):
        assets = sections["nca"][i] + sections["ca"][i]
        equity = -sections["eq"][i] + result_added[i]
        liabilities = -(sections["ncl"][i] + sections["cl"][i])
        out[col] = {
            "total_assets": round(assets, 2),
            "total_equity": round(equity, 2),
            "total_liabilities": round(liabilities, 2),
            "result_added_to_retained_earnings": round(result_added[i], 2),
            "unplaced_balance": round(unplaced[i], 2),
            "difference": round(assets - equity - liabilities, 2),
        }
    out["revenue"] = round(revenue, 2)
    out["profit_for_the_year"] = round(profit, 2)
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
