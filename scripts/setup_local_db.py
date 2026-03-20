#!/usr/bin/env python3
"""
Set up a local PostgreSQL database with 2025 MHT-CET cutoff data.
=================================================================
This script:
  1. Connects to local PostgreSQL
  2. Creates/resets the career_guidance_2025 database
  3. Creates the cutoff_data table
  4. Bulk-loads all 4 CAP round CSVs
  5. Prints summary statistics

Prerequisites:
  pip install psycopg2-binary pandas

Usage:
  python scripts/setup_local_db.py [--host localhost] [--port 5432] [--user postgres] [--password yourpass]

NOTE: This script does NOT push anything to Supabase.
"""

import argparse
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas not installed. Run: pip install pandas")
    sys.exit(1)


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_NAME = "career_guidance_2025"

CAP_ROUNDS = [1, 2, 3, 4]


def csv_path(cap_round: int) -> Path:
    return PROJECT_ROOT / f"cutoffs_2025_cap{cap_round}.csv"


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS cutoff_data (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    cap_round INTEGER NOT NULL,
    college_code TEXT,
    college_name TEXT NOT NULL,
    branch_code TEXT,
    branch_name TEXT NOT NULL,
    college_status TEXT,
    stage TEXT,
    level TEXT,
    category TEXT NOT NULL,
    gender TEXT,
    cutoff_rank INTEGER,
    percentile DECIMAL(10,7) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cutoff_year ON cutoff_data(year);
CREATE INDEX IF NOT EXISTS idx_cutoff_cap_round ON cutoff_data(cap_round);
CREATE INDEX IF NOT EXISTS idx_cutoff_category ON cutoff_data(category);
CREATE INDEX IF NOT EXISTS idx_cutoff_branch ON cutoff_data(branch_name);
CREATE INDEX IF NOT EXISTS idx_cutoff_college ON cutoff_data(college_name);
CREATE INDEX IF NOT EXISTS idx_cutoff_percentile ON cutoff_data(percentile);
CREATE INDEX IF NOT EXISTS idx_cutoff_composite ON cutoff_data(year, cap_round, category, branch_name);
"""


def create_database(host: str, port: int, user: str, password: str) -> None:
    """Create the database if it doesn't exist."""
    conn = psycopg2.connect(
        host=host, port=port, user=user, password=password,
        dbname="postgres"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # Check if DB exists
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
    exists = cur.fetchone()

    if exists:
        print(f"  Database '{DB_NAME}' already exists. Dropping and recreating...")
        # Terminate existing connections
        cur.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{DB_NAME}'
            AND pid <> pg_backend_pid();
        """)
        cur.execute(f"DROP DATABASE {DB_NAME}")

    cur.execute(f"CREATE DATABASE {DB_NAME}")
    print(f"  Database '{DB_NAME}' created.")

    cur.close()
    conn.close()


def setup_schema(host: str, port: int, user: str, password: str) -> None:
    """Create tables and indexes."""
    conn = psycopg2.connect(
        host=host, port=port, user=user, password=password,
        dbname=DB_NAME
    )
    cur = conn.cursor()
    cur.execute(CREATE_TABLE_SQL)
    conn.commit()
    cur.close()
    conn.close()
    print("  Schema created (cutoff_data table + indexes).")


def load_csv(host: str, port: int, user: str, password: str, cap_round: int) -> int:
    """Load a single CAP round CSV into the database. Returns row count."""
    csv = csv_path(cap_round)
    if not csv.exists():
        print(f"  [SKIP] {csv.name} not found")
        return 0

    df = pd.read_csv(csv, dtype={"college_code": str, "branch_code": str})
    df["cap_round"] = cap_round

    conn = psycopg2.connect(
        host=host, port=port, user=user, password=password,
        dbname=DB_NAME
    )
    cur = conn.cursor()

    inserted = 0
    for _, row in df.iterrows():
        cur.execute(
            """INSERT INTO cutoff_data
               (year, cap_round, college_code, college_name, branch_code, branch_name,
                college_status, stage, level, category, gender, cutoff_rank, percentile)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                int(row["year"]),
                cap_round,
                str(row["college_code"]) if pd.notna(row.get("college_code")) else None,
                str(row["college_name"]),
                str(row["branch_code"]) if pd.notna(row.get("branch_code")) else None,
                str(row["branch_name"]),
                str(row["college_status"]) if pd.notna(row.get("college_status")) else None,
                str(row["stage"]) if pd.notna(row.get("stage")) else None,
                str(row["level"]) if pd.notna(row.get("level")) else None,
                str(row["category"]),
                str(row["gender"]) if pd.notna(row.get("gender")) else None,
                int(row["cutoff_rank"]) if pd.notna(row.get("cutoff_rank")) else None,
                float(row["percentile"]),
            )
        )
        inserted += 1

    conn.commit()
    cur.close()
    conn.close()
    return inserted


def print_summary(host: str, port: int, user: str, password: str) -> None:
    """Print database summary statistics."""
    conn = psycopg2.connect(
        host=host, port=port, user=user, password=password,
        dbname=DB_NAME
    )
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM cutoff_data")
    total = cur.fetchone()[0]

    cur.execute("""
        SELECT cap_round, COUNT(*), COUNT(DISTINCT college_code), COUNT(DISTINCT branch_name)
        FROM cutoff_data
        GROUP BY cap_round
        ORDER BY cap_round
    """)
    rounds = cur.fetchall()

    print(f"\n  {'Round':<10} {'Rows':>10} {'Colleges':>10} {'Branches':>10}")
    print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
    for cap_round, rows, colleges, branches in rounds:
        print(f"  CAP{cap_round:<6} {rows:>10,} {colleges:>10} {branches:>10}")
    print(f"  {'TOTAL':<10} {total:>10,}")

    cur.close()
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Set up local PostgreSQL DB with 2025 cutoff data")
    parser.add_argument("--host", default="localhost", help="PostgreSQL host")
    parser.add_argument("--port", default=5432, type=int, help="PostgreSQL port")
    parser.add_argument("--user", default="postgres", help="PostgreSQL user")
    parser.add_argument("--password", default="", help="PostgreSQL password")
    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("  LOCAL DATABASE SETUP — career_guidance_2025")
    print("=" * 70)

    # Step 1: Create database
    print("\n[1] Creating database...")
    try:
        create_database(args.host, args.port, args.user, args.password)
    except Exception as e:
        print(f"  [ERROR] Could not connect to PostgreSQL: {e}")
        print(f"  Make sure PostgreSQL is running on {args.host}:{args.port}")
        print(f"  Usage: python scripts/setup_local_db.py --user postgres --password yourpass")
        sys.exit(1)

    # Step 2: Create schema
    print("\n[2] Creating schema...")
    setup_schema(args.host, args.port, args.user, args.password)

    # Step 3: Load CSVs
    print("\n[3] Loading CSV data...")
    for cap in CAP_ROUNDS:
        count = load_csv(args.host, args.port, args.user, args.password, cap)
        print(f"  CAP{cap}: {count:,} rows loaded")

    # Step 4: Summary
    print("\n[4] Database Summary:")
    print_summary(args.host, args.port, args.user, args.password)

    print(f"\n  Database '{DB_NAME}' is ready on {args.host}:{args.port}")
    print("  NOTE: This is LOCAL ONLY — not pushed to Supabase.\n")


if __name__ == "__main__":
    main()
