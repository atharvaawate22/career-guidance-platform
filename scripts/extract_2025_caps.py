#!/usr/bin/env python3
"""
Extract 2025 MHT-CET Cutoff Data from Cap Round PDFs & Validate Against Seat Matrix
=====================================================================================
This script:
  1. Parses all 4 CAP round PDFs (2025_Cap1-4.pdf) using the existing parse_cutoffs parser
  2. Generates fresh CSV files for each round
  3. Reads the Seat Matrix Excel sheet
  4. Cross-validates college codes/names between CSVs and Seat Matrix
  5. Produces a detailed validation report

Usage:
  python scripts/extract_2025_caps.py
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Add parent dir so we can import parse_cutoffs
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
from parse_cutoffs import parse_pdf

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PDF_DIR      = PROJECT_ROOT / "cutoff_pdfs"
OUTPUT_DIR   = PROJECT_ROOT
SEAT_MATRIX  = PDF_DIR / "Seat Matrix.xlsx"

CAP_ROUNDS = [1, 2, 3, 4]
YEAR       = 2025

# PDF file naming
def pdf_path(cap_round: int) -> Path:
    return PDF_DIR / f"2025_Cap{cap_round}.pdf"

def csv_path(cap_round: int) -> Path:
    return OUTPUT_DIR / f"cutoffs_2025_cap{cap_round}.csv"


def normalize_code(code) -> str:
    """Normalize college code to 5-digit string."""
    if isinstance(code, float):
        code = str(int(code))
    return str(code).strip().zfill(5)


# ---------------------------------------------------------------------------
# Step 1: Extract data from PDFs
# ---------------------------------------------------------------------------
def extract_all_pdfs() -> dict[int, pd.DataFrame]:
    """Parse all 4 CAP round PDFs and return DataFrames."""
    results = {}
    for cap in CAP_ROUNDS:
        p = pdf_path(cap)
        if not p.exists():
            print(f"  [ERROR] PDF not found: {p}")
            continue

        print(f"\n  Parsing CAP{cap}: {p.name}...")
        df = parse_pdf(str(p), YEAR)

        if df.empty:
            print(f"  [WARNING] No data extracted from {p.name}")
            continue

        # Save CSV
        out = csv_path(cap)
        df.to_csv(out, index=False)
        print(f"    -> {len(df):,} rows extracted")
        print(f"    -> Unique colleges: {df['college_code'].nunique()}")
        print(f"    -> Unique branches: {df['branch_name'].nunique()}")
        print(f"    -> Saved to: {out.name}")

        results[cap] = df

    return results


# ---------------------------------------------------------------------------
# Step 2: Read Seat Matrix
# ---------------------------------------------------------------------------
def read_seat_matrix() -> pd.DataFrame | None:
    """Read the Seat Matrix Excel sheet."""
    if not SEAT_MATRIX.exists():
        print(f"  [ERROR] Seat Matrix not found: {SEAT_MATRIX}")
        return None

    try:
        df = pd.read_excel(SEAT_MATRIX, sheet_name=0)
        print(f"  Loaded Seat Matrix: {len(df)} rows, columns = {list(df.columns)}")
        return df
    except Exception as e:
        print(f"  [ERROR] Reading Seat Matrix: {e}")
        return None


# ---------------------------------------------------------------------------
# Step 3: Cross-validate
# ---------------------------------------------------------------------------
def cross_validate(
    cap_data: dict[int, pd.DataFrame],
    seat_matrix_df: pd.DataFrame,
) -> str:
    """Cross-validate PDF extraction against Seat Matrix. Returns report text."""
    report_lines: list[str] = []
    def rprint(msg: str = ""):
        report_lines.append(msg)
        print(msg)

    rprint("=" * 90)
    rprint("  2025 MHT-CET CUTOFF EXTRACTION — VALIDATION REPORT")
    rprint(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    rprint("=" * 90)

    # --- Seat Matrix colleges ---
    seat_code_col = None
    seat_name_col = None
    for col in seat_matrix_df.columns:
        cl = str(col).lower().strip()
        if 'institute code' in cl or 'college code' in cl or 'inst code' in cl:
            seat_code_col = col
        if 'institute name' in cl or 'college name' in cl or 'inst name' in cl:
            seat_name_col = col

    if seat_code_col is None:
        # Try first two columns as fallback
        seat_code_col = seat_matrix_df.columns[0]
        seat_name_col = seat_matrix_df.columns[1] if len(seat_matrix_df.columns) > 1 else None

    rprint(f"\n  Seat Matrix code column: '{seat_code_col}'")
    rprint(f"  Seat Matrix name column: '{seat_name_col}'")

    # Build seat matrix lookup: code -> name
    seat_lookup: dict[str, str] = {}
    for _, row in seat_matrix_df.iterrows():
        code_raw = row[seat_code_col]
        if pd.isna(code_raw):
            continue
        code = normalize_code(code_raw)
        name = str(row[seat_name_col]).strip() if seat_name_col and pd.notna(row[seat_name_col]) else ""
        seat_lookup[code] = name

    seat_codes = set(seat_lookup.keys())
    rprint(f"  Total unique colleges in Seat Matrix: {len(seat_codes)}")

    # --- Per-round analysis ---
    for cap in sorted(cap_data.keys()):
        df = cap_data[cap]
        rprint(f"\n{'─' * 90}")
        rprint(f"  CAP ROUND {cap}")
        rprint(f"{'─' * 90}")

        # Stats
        csv_codes_series = df['college_code'].astype(str).str.zfill(5)
        csv_codes = set(csv_codes_series.unique())
        csv_college_lookup: dict[str, str] = {}
        for _, row in df.drop_duplicates('college_code').iterrows():
            c = str(row['college_code']).zfill(5)
            csv_college_lookup[c] = str(row['college_name'])

        rprint(f"  Total rows extracted:     {len(df):,}")
        rprint(f"  Unique college codes:     {len(csv_codes)}")
        rprint(f"  Unique branches:          {df['branch_name'].nunique()}")
        rprint(f"  Unique categories:        {df['category'].nunique()}")

        # Coverage analysis
        in_both     = csv_codes & seat_codes
        only_csv    = csv_codes - seat_codes
        only_seat   = seat_codes - csv_codes

        rprint(f"\n  College Coverage vs Seat Matrix:")
        rprint(f"    Matching colleges:              {len(in_both)}")
        rprint(f"    In CSV but NOT in Seat Matrix:  {len(only_csv)}")
        rprint(f"    In Seat Matrix but NOT in CSV:  {len(only_seat)}")
        rprint(f"    Coverage rate:                  {len(in_both) / len(seat_codes) * 100:.1f}%")

        if only_csv:
            rprint(f"\n    Colleges in CSV but NOT in Seat Matrix:")
            for code in sorted(only_csv):
                name = csv_college_lookup.get(code, "?")
                rprint(f"      {code} — {name}")

        if only_seat:
            rprint(f"\n    Colleges in Seat Matrix but NOT in CSV (no cutoff data):")
            for code in sorted(only_seat):
                name = seat_lookup.get(code, "?")
                rprint(f"      {code} — {name}")

        # Name comparison for matched colleges
        name_mismatches = []
        for code in sorted(in_both):
            seat_name = seat_lookup.get(code, "").strip()
            csv_name  = csv_college_lookup.get(code, "").strip()
            # Normalize for comparison (case-insensitive, ignore punctuation differences)
            s_norm = seat_name.lower().replace(",", " ").replace(".", " ").split()
            c_norm = csv_name.lower().replace(",", " ").replace(".", " ").split()
            # Check if the first few words match (fuzzy match)
            if s_norm[:3] != c_norm[:3] and seat_name and csv_name:
                name_mismatches.append((code, seat_name, csv_name))

        if name_mismatches:
            rprint(f"\n    Potential name mismatches (first 20):")
            for code, sn, cn in name_mismatches[:20]:
                rprint(f"      {code}:")
                rprint(f"        Seat Matrix: {sn}")
                rprint(f"        PDF/CSV:     {cn}")

        # Data quality checks
        rprint(f"\n  Data Quality Checks:")
        empty_codes  = df['college_code'].isna().sum() + (df['college_code'].astype(str) == '').sum()
        empty_names  = df['college_name'].isna().sum() + (df['college_name'].astype(str) == '').sum()
        empty_branch = df['branch_code'].isna().sum() + (df['branch_code'].astype(str) == '').sum()
        null_rank    = df['cutoff_rank'].isna().sum()
        null_pct     = df['percentile'].isna().sum()

        rprint(f"    Rows missing college_code: {empty_codes}")
        rprint(f"    Rows missing college_name: {empty_names}")
        rprint(f"    Rows missing branch_code:  {empty_branch}")
        rprint(f"    Rows with null rank:       {null_rank}")
        rprint(f"    Rows with null percentile: {null_pct}")

    # --- Cross-round summary ---
    rprint(f"\n{'=' * 90}")
    rprint(f"  CROSS-ROUND SUMMARY")
    rprint(f"{'=' * 90}")

    caps = sorted(cap_data.keys())
    rprint(f"\n  {'Round':<10} {'Rows':>10} {'Colleges':>10} {'Branches':>10}")
    rprint(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
    for cap in caps:
        df = cap_data[cap]
        csv_codes = set(df['college_code'].astype(str).str.zfill(5).unique())
        rprint(f"  CAP{cap:<6} {len(df):>10,} {len(csv_codes):>10} {df['branch_name'].nunique():>10}")

    # Transition analysis
    rprint(f"\n  Round Transitions:")
    for i in range(len(caps) - 1):
        c1 = set(cap_data[caps[i]]['college_code'].astype(str).str.zfill(5).unique())
        c2 = set(cap_data[caps[i+1]]['college_code'].astype(str).str.zfill(5).unique())
        rprint(f"    CAP{caps[i]} → CAP{caps[i+1]}: "
               f"stable={len(c1 & c2)}, dropped={len(c1 - c2)}, new={len(c2 - c1)}")

    # Comparison with existing CSV files
    rprint(f"\n  Comparison with Existing CSVs:")
    for cap in caps:
        existing = csv_path(cap)
        if existing.exists():
            existing_df = pd.read_csv(existing)
            new_df = cap_data[cap]
            rprint(f"    CAP{cap}: {len(new_df):,} rows (was {len(existing_df):,} — delta {len(new_df) - len(existing_df):+,})")

    rprint(f"\n{'=' * 90}")
    rprint(f"  VALIDATION COMPLETE")
    rprint(f"{'=' * 90}")

    return "\n".join(report_lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("\n" + "=" * 90)
    print("  2025 MHT-CET CUTOFF DATA EXTRACTION")
    print("=" * 90)

    # Step 1: Extract from PDFs
    print("\n[STEP 1] Extracting data from PDFs...")
    cap_data = extract_all_pdfs()

    if not cap_data:
        print("\n[ERROR] No data extracted from any PDF. Aborting.")
        sys.exit(1)

    # Step 2: Read Seat Matrix
    print("\n[STEP 2] Reading Seat Matrix...")
    seat_matrix_df = read_seat_matrix()

    if seat_matrix_df is None:
        print("\n[ERROR] Could not read Seat Matrix. Aborting validation.")
        sys.exit(1)

    # Step 3: Cross-validate
    print("\n[STEP 3] Cross-validating...")
    report = cross_validate(cap_data, seat_matrix_df)

    # Save report
    report_path = OUTPUT_DIR / "validation_report_2025.txt"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\n  Report saved to: {report_path.name}")

    print("\n  Done! CSVs saved. Review the validation report for details.\n")


if __name__ == "__main__":
    main()
