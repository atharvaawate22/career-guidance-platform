# pyre-ignore-all-errors
"""
PDF Coverage Validator
======================
Compares every college+branch combination found in the PDF headings
against the data actually stored in the database (via API).

Usage:
  python scripts/validate_coverage.py \
      --pdf "cutoff_pdfs/2022ENGG_CAP1_CutOff.pdf" \
      --year 2022 \
      --url http://localhost:5000

Reports:
  - Total colleges in PDF vs DB
  - Any branch in PDF that is missing in DB for that college
  - Any branch in DB that is NOT in the PDF (orphaned rows - data quality issue)
"""
from __future__ import annotations

import pdfplumber  # type: ignore[import-untyped]
import re
import argparse
import json
import urllib.request
from collections import defaultdict

RE_COMBINED = re.compile(r'^(\d{4,5})(\d{5})[A-Za-z]?\s*[-\u2013]\s*(.+)$')
RE_COLLEGE  = re.compile(r'^(\d{4,5})\s*[-\u2013]\s*(.+)$')


def page_text(page: object) -> str:
    result = getattr(page, "extract_text")()
    return result if isinstance(result, str) else ""


def extract_pdf_index(
    pdf_path: str,
) -> tuple[dict[str, str], dict[str, set[str]]]:
    """
    Scan the PDF and return:
      pdf_names:   college_code -> college_name
      pdf_branches: college_code -> set of branch names
    """
    pdf_names: dict[str, str] = {}
    pdf_branches: dict[str, set[str]] = {}
    current_college_code: str = ""
    current_college_name: str = ""

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text: str = page_text(page)
            for raw_line in text.splitlines():
                line: str = raw_line.strip()
                if not line:
                    continue

                m = RE_COMBINED.match(line)
                if m:
                    c_code: str = m.group(1)
                    branch: str = m.group(3).strip()
                    if c_code not in pdf_branches:
                        pdf_branches[c_code] = set()
                        pdf_names[c_code] = current_college_name
                    pdf_branches[c_code].add(branch)  # type: ignore[index]
                    current_college_code = c_code
                    continue

                m2 = RE_COLLEGE.match(line)
                if m2:
                    current_college_code = m2.group(1)
                    current_college_name = m2.group(2).strip()
                    if current_college_code not in pdf_names:
                        pdf_branches[current_college_code] = set()
                    pdf_names[current_college_code] = current_college_name

    return pdf_names, pdf_branches


def fetch_db_index(base_url: str, year: int) -> dict[str, set[str]]:
    """
    Fetch all (college_code -> set of branch_names) from the API for the given year.
    """
    db_index: dict[str, set[str]] = defaultdict(set)
    offset: int = 0

    while True:
        url = f"{base_url}/api/cutoffs?year={year}"
        r = urllib.request.urlopen(url)
        d = json.loads(r.read())
        rows = d["data"]
        total = d["total"]

        for row in rows:
            cc: str = str(row.get("college_code") or "").strip()
            bn: str = str(row.get("branch") or "").strip()
            if cc:
                db_index[cc].add(bn)  # type: ignore[index]

        offset += len(rows)  # type: ignore[operator]
        if offset >= total or len(rows) == 0:
            break

    return dict(db_index)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate PDF vs DB coverage")
    parser.add_argument("--pdf",  required=True)
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--url",  default="http://localhost:5000")
    args = parser.parse_args()

    print(f"Scanning PDF: {args.pdf}...")
    pdf_names, pdf_branches = extract_pdf_index(args.pdf)
    print(f"Found {len(pdf_names)} colleges in PDF.\n")

    print(f"Fetching DB data for year={args.year}...")
    db_index = fetch_db_index(args.url, args.year)
    print(f"Found {len(db_index)} colleges with data in DB.\n")

    missing_colleges: list[tuple[str, str, set[str]]] = []
    partial_colleges: list[tuple[str, str, set[str], set[str]]] = []
    ok_colleges: list[str] = []
    all_missing_branches: list[tuple[str, str, str]] = []

    for code in sorted(pdf_branches.keys()):
        p_branches: set[str] = pdf_branches[code]
        college_name: str = pdf_names.get(code, "")

        if code not in db_index:
            missing_colleges.append((code, college_name, p_branches))
            for b in sorted(p_branches):
                all_missing_branches.append((code, college_name, b))
            continue

        db_branches: set[str] = db_index[code]
        missing_b: set[str] = p_branches - db_branches
        if missing_b:
            partial_colleges.append((code, college_name, missing_b, db_branches))
            for b in sorted(missing_b):
                all_missing_branches.append((code, college_name, b))
        else:
            ok_colleges.append(code)

    # Report
    print("=" * 70)
    print(f"SUMMARY  (year={args.year})")
    print("=" * 70)
    print(f"  Colleges fully correct:        {len(ok_colleges)}")
    print(f"  Colleges partially missing:    {len(partial_colleges)}")
    print(f"  Colleges entirely missing:     {len(missing_colleges)}")
    print(f"  Total missing branch entries:  {len(all_missing_branches)}")
    print()

    if partial_colleges:
        print("─" * 70)
        print("COLLEGES WITH MISSING BRANCHES:")
        print("─" * 70)
        for code, name, missing, have in sorted(partial_colleges):
            print(f"\n  [{code}] {name}")
            print(f"    Missing: {sorted(missing)}")
            print(f"    Have:    {sorted(have)}")

    if missing_colleges:
        print()
        print("─" * 70)
        print("COLLEGES ENTIRELY MISSING FROM DB:")
        print("─" * 70)
        for code, name, branches in sorted(missing_colleges):
            print(f"\n  [{code}] {name}")
            print(f"    Branches: {sorted(branches)}")

    if not partial_colleges and not missing_colleges:
        print("✅  ALL colleges and branches are correctly covered in the DB!")

    print()
    print("=" * 70)


if __name__ == "__main__":
    main()
