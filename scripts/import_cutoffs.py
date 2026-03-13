"""
MHT-CET Cutoff CSV Importer
============================
Reads a CSV produced by parse_cutoffs.py and bulk-inserts into the
backend database via the admin API.

Usage:
    python scripts/import_cutoffs.py \
        --csv  cutoffs_2022_cap1.csv \
        --url  http://localhost:5000 \
        --token <admin_jwt_token>

Get your admin token by logging in at /api/admin/login, or run:
    python scripts/import_cutoffs.py --login --email admin@x.com --password Y ...
"""

import argparse
import json
import math
import sys
import urllib.request
import urllib.error
from pathlib import Path

try:
    import pandas as pd  # type: ignore[import-untyped]
except ImportError:
    print("ERROR: pandas not installed. Run: pip install pandas")
    sys.exit(1)

BATCH_SIZE = 100   # rows per POST — ~30 kb per batch, safely under the 50 kb limit


def get_token(base_url: str, email: str, password: str) -> str:
    """Log in and return the JWT."""
    payload = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        f"{base_url}/api/admin/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    if not data.get("success"):
        print(f"Login failed: {data}")
        sys.exit(1)
    return data["data"]["token"]


def build_rows(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame rows to BulkCutoffInsert dicts."""
    records = []
    for _, row in df.iterrows():
        records.append({
            "year":           int(row["year"]),
            "college_code":   str(row["college_code"]) if pd.notna(row.get("college_code")) else None,
            "college_name":   str(row["college_name"]),
            "branch_code":    str(row["branch_code"])  if pd.notna(row.get("branch_code"))  else None,
            "branch":         str(row["branch_name"]),   # CSV col is branch_name, API field is branch
            "category":       str(row["category"]),
            "gender":         str(row["gender"]) if pd.notna(row.get("gender")) else None,
            "home_university": "All",                    # level column carries this info now
            "college_status": str(row["college_status"]) if pd.notna(row.get("college_status")) else None,
            "stage":          str(row["stage"])          if pd.notna(row.get("stage"))          else None,
            "level":          str(row["level"])          if pd.notna(row.get("level"))           else None,
            "percentile":     float(row["percentile"]),
            "cutoff_rank":    int(row["cutoff_rank"])    if pd.notna(row.get("cutoff_rank"))    else None,
        })
    return records


def post_batch(base_url: str, token: str, batch: list[dict]) -> int:
    """POST one batch to /api/admin/cutoffs. Returns inserted count."""
    payload = json.dumps(batch).encode()
    req = urllib.request.Request(
        f"{base_url}/api/admin/cutoffs",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        if data.get("success"):
            return len(data.get("data", []))
        print(f"  API error: {data}")
        return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code}: {body[:300]}")
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Import cutoff CSV into the backend DB")
    parser.add_argument("--csv",      required=True,  help="Path to CSV from parse_cutoffs.py")
    parser.add_argument("--url",      default="http://localhost:5000", help="Backend base URL")
    parser.add_argument("--token",    help="Admin JWT token (skip if using --login)")
    parser.add_argument("--login",    action="store_true", help="Log in to get a token")
    parser.add_argument("--email",    help="Admin email (for --login)")
    parser.add_argument("--password", help="Admin password (for --login)")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"ERROR: CSV not found: {csv_path}")
        sys.exit(1)

    token = args.token
    if not token:
        if not (args.login and args.email and args.password):
            print("ERROR: Provide --token OR use --login --email X --password Y")
            sys.exit(1)
        print("Logging in...")
        token = get_token(args.url, args.email, args.password)
        print(f"Token acquired.")

    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path, dtype={"college_code": str, "branch_code": str})
    print(f"Loaded {len(df):,} rows.")

    records = build_rows(df)
    total_batches = math.ceil(len(records) / BATCH_SIZE)
    inserted = 0

    for i in range(total_batches):
        batch = records[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
        n = post_batch(args.url, str(token), batch)
        inserted += n
        print(f"  Batch {i+1}/{total_batches}: inserted {n} rows  (total so far: {inserted:,})")

    print(f"\nDone. Total inserted: {inserted:,} / {len(records):,}")
    if inserted < len(records):
        print("WARNING: Some rows were not inserted — check errors above.")


if __name__ == "__main__":
    main()
