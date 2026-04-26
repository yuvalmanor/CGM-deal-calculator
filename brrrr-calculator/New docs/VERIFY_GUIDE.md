# Excel Verification Guide

This file explains how to create and use `scripts/verify_excel.py` — the script that compares app calculation outputs against column C of the reference Excel file after every code change.

---

## Why This Exists

`lib/calculations.ts` was reverse-engineered from `Deal Calc CGM V2.xlsx`. The Excel file is the source of truth. Every formula in the app was verified against column C (the Anna TX deal) before Phase 1 was declared complete.

This script automates that verification so that any future code change that accidentally breaks a formula is caught immediately — not when you're analyzing a live deal.

---

## Setup

### Install dependency
```bash
pip install openpyxl
```

### Excel file location
```
C:\YuvalManorPrivate\prod\brrrr-calculator\New docs\Deal Calc CGM V2.xlsx
```

The script reads this file directly. Do not move or rename it.

---

## How to Run

```bash
cd C:\YuvalManorPrivate\prod\brrrr-calculator
python scripts/verify_excel.py
```

Expected output when everything is correct:
```
Reading Excel file...
Running calculateDeal() with Anna TX seed inputs...
Comparing outputs...

RESULT             EXCEL (col C)    APP OUTPUT       STATUS
holding_costs      945.33           945.33           ✓ PASS
all_in_cost        247995.33        247995.33        ✓ PASS
hml_loan           160000.00        160000.00        ✓ PASS
hml_total_debt     167793.67        167793.67        ✓ PASS
refi_loan          195000.00        195000.00        ✓ PASS
cash_from_lender   183771.00        183771.00        ✓ PASS
net_cash_closing   15977.33         15977.33         ✓ PASS
money_in_deal_hml  60208.00         60208.00         ✓ PASS
money_in_deal_cash 52414.33         52414.33         ✓ PASS
mortgage_pi        1297.34          1297.34          ✓ PASS
dscr               1.2739           1.2739           ✓ PASS
prop_equity        80500.00         80500.00         ✓ PASS

ALL 12 CHECKS PASSED ✓
```

If any check fails:
```
net_cash_closing   15977.33         14650.00         ✗ FAIL  (delta: 1327.33)

1 CHECK(S) FAILED — fix before continuing
```

---

## Script Template

Claude Code should create this file as the first task in Phase A.
This is the reference implementation — adapt as needed for the actual TypeScript/Node environment.

Since `calculateDeal` is TypeScript, the script calls it via a small Node.js runner rather than directly from Python. The Python script:
1. Reads expected values from the Excel file
2. Calls a Node.js script that imports `calculateDeal` and prints JSON output
3. Compares the two sets of values and prints the table

### `scripts/verify_excel.py`

```python
import subprocess
import json
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("Installing openpyxl...")
    subprocess.run([sys.executable, "-m", "pip", "install", "openpyxl"], check=True)
    import openpyxl

EXCEL_PATH = Path(r"C:\YuvalManorPrivate\prod\brrrr-calculator\New docs\Deal Calc CGM V2.xlsx")
NODE_RUNNER = Path("scripts/run_calc.mjs")

# Column C row values from the Excel sheet (0-indexed from row 1)
# Update row numbers if the Excel layout changes
EXCEL_ROWS = {
    "holding_costs":      13,   # row 13
    "all_in_cost":        15,
    "hml_loan":           24,
    "hml_total_debt":     27,
    "refi_loan":          33,
    "cash_from_lender":   37,
    "net_cash_closing":   38,
    "money_in_deal_hml":  39,
    "mortgage_pi":        50,
    "dscr":               51,
    "prop_equity":        56,
    "money_in_deal_cash": 55,
}

TOLERANCES = {
    "dscr": 0.01,
    "default": 1.0,
}

def read_excel_values():
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb["CALC - BRRRR"]
    values = {}
    for key, row_num in EXCEL_ROWS.items():
        # Column C = column index 3
        cell = ws.cell(row=row_num, column=3)
        values[key] = float(cell.value or 0)
    return values

def run_app_calc():
    result = subprocess.run(
        ["node", str(NODE_RUNNER)],
        capture_output=True, text=True, cwd=Path.cwd()
    )
    if result.returncode != 0:
        print("Node runner failed:")
        print(result.stderr)
        sys.exit(1)
    return json.loads(result.stdout)

def compare(excel_vals, app_vals):
    passed = 0
    failed = 0
    print(f"\n{'RESULT':<25} {'EXCEL (col C)':>15} {'APP OUTPUT':>15} {'STATUS':>10}")
    print("-" * 70)
    for key in EXCEL_ROWS:
        expected = excel_vals[key]
        actual = app_vals.get(key, None)
        if actual is None:
            print(f"{key:<25} {expected:>15.2f} {'MISSING':>15} {'✗ FAIL':>10}")
            failed += 1
            continue
        tol = TOLERANCES.get(key, TOLERANCES["default"])
        delta = abs(expected - actual)
        status = "✓ PASS" if delta <= tol else f"✗ FAIL"
        delta_str = f"  (delta: {delta:.2f})" if delta > tol else ""
        print(f"{key:<25} {expected:>15.2f} {actual:>15.2f} {status:>10}{delta_str}")
        if delta <= tol:
            passed += 1
        else:
            failed += 1
    print()
    if failed == 0:
        print(f"ALL {passed} CHECKS PASSED ✓")
    else:
        print(f"{failed} CHECK(S) FAILED — fix before continuing")
        sys.exit(1)

if __name__ == "__main__":
    print("Reading Excel file...")
    excel_vals = read_excel_values()
    print("Running calculateDeal()...")
    app_vals = run_app_calc()
    compare(excel_vals, app_vals)
```

### `scripts/run_calc.mjs`

This Node.js runner imports `calculateDeal` with the Anna TX seed inputs and prints JSON:

```javascript
// scripts/run_calc.mjs
// Run with: node scripts/run_calc.mjs
// Prints JSON of key DealResults fields for comparison against Excel

import { calculateDeal } from '../lib/calculations.js'

const inputs = {
  address: '1805 Cedar Wood Trl, Anna TX 75409',
  source: 'BSJ',
  propertyType: 'SFR',
  bedBath: '4/2',
  sqft: 1621,
  yearBuilt: 2013,
  purchasePrice: 230000,
  closingCostsBuyOverride: -1,   // auto: 2% of PP
  rehabEstimate: 14080,
  changeOrders: 2970,
  rehabMonthsManual: 1,
  arv: 300000,
  marketRent: 2434,
  propertyTaxMonthly: 470,
  insuranceMonthly: 143,
  hoaMonthly: 32,
  stateIncomeTaxMonthly: 0,
  mortgageIOMonthly: 0,
  pmMode: 'percent',
  pmRate: 0,
  pmFixed: 0,
  hmlLoanPP: 160000,
  hmlLoanRehab: 0,
  refiLTVOverride: 0.65,
  refiTitleCostsOverride: 5455,
  otherAdjustmentsAtClose: 11810,
  exitStrategy: 'rental',
  customExpenses: [],
}

const settings = {
  hmlLeveragePP: 0.696,
  hmlLeverageRehab: 0,
  hmlMonthlyRate: 0.008292,
  hmlPointsPct: 0.02,
  hmlAppraisalCost: 0,
  hmlUnderwritingFees: 1295,
  hmlOtherFees: 495,
  hmlExtraFees: 0,
  refiAnnualRate: 0.07,
  refiPointsPct: 0.015,
  refiAppraisalCost: 750,
  refiUnderwritingFees: 1599,
  refiOtherFees: 500,
  maxMoneyInDeal: 65000,
  minEquityPct: 0.20,
  locationScore: 9,
}

const r = calculateDeal(inputs, settings)

console.log(JSON.stringify({
  holding_costs:      r.holdingCosts,
  all_in_cost:        r.allInCost,
  hml_loan:           r.hmlLoan,
  hml_total_debt:     r.hmlTotalDebt,
  refi_loan:          r.refiLoanAmount,
  cash_from_lender:   r.cashFromLender,
  net_cash_closing:   r.netCashAtClosing,
  money_in_deal_hml:  r.hmlMoneyInDeal,
  money_in_deal_cash: r.cashMoneyInDeal,
  mortgage_pi:        r.mortgagePI,
  dscr:               r.dscr,
  prop_equity:        r.propertyEquityPostRefi,
}))
```

---

## Important Notes

### The seed inputs for the script
The Anna TX deal (column C) uses specific overrides that are NOT the same as the DEFAULT_DEAL_INPUTS. In particular:
- `refiTitleCostsOverride: 5455` — hardcoded in column C, not auto-calculated
- `otherAdjustmentsAtClose: 11810` — deal-specific closing adjustments ($8,200 + $1,720 + $1,890)
- `hmlLoanPP: 160000` — entered as exact dollar amount, not leverage %
- `pmRate: 0` — the YB deal has 0% PM

These values were discovered during Phase 1 validation (see `docs/architecture.md` — "What the Excel sheet taught us").

### When Excel row numbers change
If the Excel file layout changes, update `EXCEL_ROWS` in `verify_excel.py` with the new row numbers. Row numbers are 1-indexed (matching Excel's row numbering).

### When to run
- After every file change during phases A, B, C, and D
- Before checking off any acceptance criterion
- As the first and last step of the final verification checklist
