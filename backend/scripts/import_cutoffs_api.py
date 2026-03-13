#!/usr/bin/env python3
"""
Import cutoff CSV data into the backend admin API in batches.

This is useful when the deployed backend is already connected to Supabase
Postgres through DATABASE_URL. The script logs in via /api/admin/login,
optionally deletes existing rows for a year, and then posts the CSV rows to
/api/admin/cutoffs.

Example:
  python backend/scripts/import_cutoffs_api.py \
      --base-url https://your-backend.example.com \
      --email admin@example.com \
      --password 'your-password' \
      --csv cutoffs_2025_cap1.csv \
      --year 2025 \
      --clear-year
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


def post_json(url: str, payload: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    with urllib.request.urlopen(req) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else {}


def delete_request(url: str, headers: dict[str, str]) -> dict[str, Any]:
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    with urllib.request.urlopen(req) as response:
      body = response.read().decode("utf-8")
      return json.loads(body) if body else {}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import cutoff CSV via admin API")
    parser.add_argument("--base-url", required=True, help="Backend base URL, e.g. https://api.example.com")
    parser.add_argument("--email", required=True, help="Admin email")
    parser.add_argument("--password", required=True, help="Admin password")
    parser.add_argument(
        "--csv",
        default="cutoffs_2025_cap1.csv",
        help="Path to cutoff CSV file",
    )
    parser.add_argument("--year", type=int, required=True, help="Year being imported")
    parser.add_argument("--batch-size", type=int, default=500, help="Rows per request")
    parser.add_argument(
        "--clear-year",
        action="store_true",
        help="Delete existing cutoff rows for the given year before import",
    )
    parser.add_argument(
        "--pause-ms",
        type=int,
        default=150,
        help="Pause between batches in milliseconds",
    )
    return parser.parse_args()


def normalize_row(row: dict[str, str]) -> dict[str, Any]:
    def nullable(value: str) -> str | None:
        value = value.strip()
        return value or None

    percentile_raw = row.get("percentile", "").strip()
    if not percentile_raw:
        raise ValueError("Missing percentile")

    year_raw = row.get("year", "").strip()
    if not year_raw:
        raise ValueError("Missing year")

    cutoff_rank_raw = row.get("cutoff_rank", "").strip()

    return {
        "year": int(year_raw),
        "college_code": nullable(row.get("college_code", "")),
        "college_name": row.get("college_name", "").strip(),
        "branch_code": nullable(row.get("branch_code", "")),
        "branch": row.get("branch_name", "").strip(),
        "category": row.get("category", "").strip(),
        "gender": nullable(row.get("gender", "")),
        "home_university": "All",
        "college_status": nullable(row.get("college_status", "")),
        "stage": nullable(row.get("stage", "")),
        "level": nullable(row.get("level", "")),
        "percentile": float(percentile_raw),
        "cutoff_rank": int(cutoff_rank_raw) if cutoff_rank_raw else None,
    }


def load_rows(csv_path: Path, expected_year: int) -> list[dict[str, Any]]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {
            "year",
            "college_code",
            "college_name",
            "branch_code",
            "branch_name",
            "college_status",
            "stage",
            "level",
            "category",
            "gender",
            "cutoff_rank",
            "percentile",
        }
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV is missing required columns: {sorted(missing)}")

        rows: list[dict[str, Any]] = []
        for index, row in enumerate(reader, start=2):
            normalized = normalize_row(row)
            if normalized["year"] != expected_year:
                raise ValueError(
                    f"Row {index}: expected year {expected_year}, got {normalized['year']}"
                )
            if not normalized["college_name"]:
                raise ValueError(f"Row {index}: missing college_name")
            if not normalized["branch"]:
                raise ValueError(f"Row {index}: missing branch_name")
            if not normalized["category"]:
                raise ValueError(f"Row {index}: missing category")
            rows.append(normalized)
        return rows


def chunked(rows: list[dict[str, Any]], batch_size: int) -> list[list[dict[str, Any]]]:
    return [rows[i : i + batch_size] for i in range(0, len(rows), batch_size)]


def main() -> int:
    args = parse_args()
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}", file=sys.stderr)
        return 1

    base_url = args.base_url.rstrip("/")

    try:
        rows = load_rows(csv_path, args.year)
    except Exception as exc:
        print(f"Failed to load CSV: {exc}", file=sys.stderr)
        return 1

    print(f"Loaded {len(rows)} rows from {csv_path}")

    try:
        login_response = post_json(
            f"{base_url}/api/admin/login",
            {"email": args.email, "password": args.password},
            {},
        )
        token = login_response["data"]["token"]
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        print(f"Login failed ({exc.code}): {body}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Login failed: {exc}", file=sys.stderr)
        return 1

    headers = {"Authorization": f"Bearer {token}"}

    if args.clear_year:
        delete_url = f"{base_url}/api/admin/cutoffs?{urllib.parse.urlencode({'year': args.year})}"
        try:
            delete_response = delete_request(delete_url, headers)
            print(
                f"Cleared existing rows for {args.year}: {delete_response.get('deleted', 0)}"
            )
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            print(f"Year delete failed ({exc.code}): {body}", file=sys.stderr)
            return 1
        except Exception as exc:
            print(f"Year delete failed: {exc}", file=sys.stderr)
            return 1

    batches = chunked(rows, args.batch_size)
    total_inserted = 0

    for index, batch in enumerate(batches, start=1):
        try:
            response = post_json(f"{base_url}/api/admin/cutoffs", batch, headers)
            inserted = len(response.get("data", []))
            total_inserted += inserted
            print(f"Batch {index}/{len(batches)} inserted {inserted} rows")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            print(f"Batch {index} failed ({exc.code}): {body}", file=sys.stderr)
            return 1
        except Exception as exc:
            print(f"Batch {index} failed: {exc}", file=sys.stderr)
            return 1

        if args.pause_ms > 0 and index < len(batches):
            time.sleep(args.pause_ms / 1000)

    print(f"Import complete: inserted {total_inserted} rows for year {args.year}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())