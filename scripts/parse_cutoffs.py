"""
MHT-CET Cutoff PDF Parser (v4 — inter-table gap context detection)
===================================================================
Fix over v3: when finding the branch heading above a table, restrict search
to the SPACE BETWEEN the previous table's bottom and the current table's top.
This prevents a subsequent table from being attributed to the wrong branch when
the page layout puts branch headings non-contiguously with their data tables.

Usage:
  pip install pdfplumber pandas
  python scripts/parse_cutoffs.py --pdf "2022ENGG_CAP1_CutOff.pdf" --year 2022 --out out.csv
"""

import pdfplumber  # type: ignore[import-untyped]
import pandas as pd  # type: ignore[import-untyped]
import re
import argparse
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Category column → (category, gender) mapping
# ---------------------------------------------------------------------------
COLUMN_MAP: dict[str, tuple[str, str]] = {
    "GOPENS":   ("OPEN",     "All"),
    "GSCS":     ("SC",       "All"),
    "GSTS":     ("ST",       "All"),
    "GVJS":     ("VJ",       "All"),
    "GNT1S":    ("NT1",      "All"),
    "GNT2S":    ("NT2",      "All"),
    "GNT3S":    ("NT3",      "All"),
    "GOBCS":    ("OBC",      "All"),
    "LOPENS":   ("OPEN",    "Female"),
    "LSCS":     ("SC",      "Female"),
    "LSTS":     ("ST",      "Female"),
    "LVJS":     ("VJ",      "Female"),
    "LNT1S":    ("NT1",     "Female"),
    "LNT2S":    ("NT2",     "Female"),
    "LNT3S":    ("NT3",     "Female"),
    "LOBCS":    ("OBC",     "Female"),
    "DEFOPENS": ("DEF_OPEN","All"),
    "DEFROBCS": ("DEF_OBC", "All"),
    "PWDOPENS": ("PWD_OPEN","All"),
    "TFWS":     ("TFWS",    "All"),
    "EWS":      ("EWS",     "All"),
    # Home-University variants
    "GOPENH":   ("OPEN",   "All"),
    "GSCH":     ("SC",     "All"),
    "GSTH":     ("ST",     "All"),
    "GVJH":     ("VJ",     "All"),
    "GNT1H":    ("NT1",    "All"),
    "GNT2H":    ("NT2",    "All"),
    "GNT3H":    ("NT3",    "All"),
    "GOBCH":    ("OBC",    "All"),
    "LOPENH":   ("OPEN",   "Female"),
    "LSCH":     ("SC",     "Female"),
    "LSTH":     ("ST",     "Female"),
    "LVJH":     ("VJ",     "Female"),
    "LNT1H":    ("NT1",    "Female"),
    "LNT2H":    ("NT2",    "Female"),
    "LNT3H":    ("NT3",    "Female"),
    "LOBCH":    ("OBC",    "Female"),
    "DEFOPENH": ("DEF_OPEN","All"),
    "EWSH":     ("EWS",    "All"),
}

RE_COMBINED = re.compile(r'^(\d{4})(\d{5})\s*[-\u2013]\s*(.+)$')
RE_COLLEGE  = re.compile(r'^(\d{4})\s*[-\u2013]\s*(.+)$')
RE_CELL     = re.compile(r'(\d+)\s*\(([0-9.]+)\)')


def parse_cell(raw: str) -> tuple[int | None, float | None]:
    raw = str(raw).replace('\n', ' ').strip()
    if not raw or raw in ('-', '--', 'NA', ''):
        return None, None
    matches = RE_CELL.findall(raw)
    if not matches:
        return None, None
    rank, pct = int(matches[0][0]), float(matches[0][1])
    if pct > 100:
        rank, pct = int(pct), float(rank)
    return rank, pct


def normalize_col(h: object) -> str:
    return str(h).strip().upper().replace(' ', '').replace('\n', '')


def context_from_gap(
    all_page_lines: list[tuple[float, str]],
    window_top: float,
    window_bottom: float,
    fallback: dict,
) -> dict:
    """
    Find the branch heading, college heading, level, and status that appear
    in the y-range [window_top, window_bottom) on the page.
    Falls back to `fallback` for anything not found in the window.
    """
    ctx = dict(fallback)

    # Lines strictly WITHIN the window
    window_lines = [
        (y, txt) for y, txt in all_page_lines
        if window_top <= y < window_bottom
    ]

    # Scan from BOTTOM (nearest to table) upward
    branch_found = college_found = level_found = status_found = False

    for _y, line in reversed(window_lines):
        line = line.strip()
        if not line:
            continue

        if not branch_found:
            m = RE_COMBINED.match(line)
            if m:
                ctx['college_code'] = m.group(1)
                ctx['branch_code']  = m.group(2)
                ctx['branch_name']  = m.group(3).strip()
                branch_found = True

        if not college_found:
            m2 = RE_COLLEGE.match(line)
            if m2 and not RE_COMBINED.match(line):
                ctx['college_code'] = m2.group(1)
                ctx['college_name'] = m2.group(2).strip()
                college_found = True

        if not level_found:
            low = line.lower()
            if 'other than home university' in low:
                ctx['level'] = 'Other Than Home University Level'
                level_found = True
            elif 'home university' in low:
                ctx['level'] = 'Home University Level'
                level_found = True
            elif 'state level' in low:
                ctx['level'] = 'State Level'
                level_found = True

        if not status_found and line.lower().startswith('status:'):
            ctx['college_status'] = line.split(':', 1)[1].strip()
            status_found = True

        if branch_found and college_found and level_found and status_found:
            break

    return ctx


def get_page_lines(page: object) -> list[tuple[float, str]]:
    """
    Reconstruct text lines from page words, returning list of (y_top, text).
    Groups words that share the same (rounded) y coordinate into one line.
    """
    from collections import defaultdict
    words = page.extract_words() or []  # type: ignore[attr-defined]
    bucket: dict[int, list[tuple[float, str]]] = defaultdict(list)
    for w in words:
        key = round(w['top'] / 3) * 3   # 3-pt tolerance
        bucket[key].append((w['x0'], w['text']))
    lines: list[tuple[float, str]] = []
    for y_key in sorted(bucket.keys()):
        line_words = sorted(bucket[y_key], key=lambda x: x[0])
        text = ' '.join(t for _, t in line_words).strip()
        if text:
            lines.append((float(y_key), text))
    return lines


def parse_pdf(pdf_path: str, year: int) -> pd.DataFrame:
    rows: list[dict] = []

    # Persistent context — carries branch/college values across pages
    ctx: dict = {
        'college_code':   '',
        'college_name':   '',
        'branch_code':    '',
        'branch_name':    '',
        'college_status': 'Unknown',
        'level':          'State Level',
    }

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):

            # ── Step 1: reconstruct all text lines with y-coords ───────────
            page_lines = get_page_lines(page)

            # ── Step 2: update running ctx from ALL text on page ──────────
            # This handles heading carry-forward across pages.
            for _y, line in page_lines:
                line_s = line.strip()
                m = RE_COMBINED.match(line_s)
                if m:
                    ctx['college_code'] = m.group(1)
                    ctx['branch_code']  = m.group(2)
                    ctx['branch_name']  = m.group(3).strip()
                    continue
                m2 = RE_COLLEGE.match(line_s)
                if m2 and not RE_COMBINED.match(line_s):
                    ctx['college_code'] = m2.group(1)
                    ctx['college_name'] = m2.group(2).strip()
                    continue
                low = line_s.lower()
                if 'other than home university' in low:
                    ctx['level'] = 'Other Than Home University Level'
                elif 'home university' in low:
                    ctx['level'] = 'Home University Level'
                elif 'state level' in low:
                    ctx['level'] = 'State Level'
                if line_s.lower().startswith('status:'):
                    ctx['college_status'] = line_s.split(':', 1)[1].strip()

            # ── Step 3: find all tables on page, sorted top→bottom ────────
            tables = page.find_tables()  # type: ignore[attr-defined]
            if not tables:
                continue

            # Sort tables by their top y-coordinate (ascending = top of page first)
            sorted_tables = sorted(tables, key=lambda t: t.bbox[1])

            # ── Step 4: for each table, determine context from the gap
            #            between the PREVIOUS TABLE's bottom and this table's top
            prev_table_bottom: float = 0.0  # Start from top of page

            for tbl_obj in sorted_tables:
                table_top    = tbl_obj.bbox[1]  # y of this table's top
                table_bottom = tbl_obj.bbox[3]  # y of this table's bottom

                # Window = [prev_table_bottom, table_top)
                # This is the vertical gap between the previous table and this one
                window_top    = prev_table_bottom
                window_bottom = table_top

                tbl_ctx = context_from_gap(
                    page_lines, window_top, window_bottom, ctx
                )
                prev_table_bottom = table_bottom

                # ── Step 5: parse table rows ───────────────────────────────
                table_data = tbl_obj.extract()
                if not table_data or len(table_data) < 2:
                    continue

                header_row = list(table_data[0]) if table_data[0] else []
                if not header_row:
                    continue

                headers = [normalize_col(h) if h else '' for h in header_row]
                col_indices: dict[int, str] = {
                    i: h for i, h in enumerate(headers) if h in COLUMN_MAP
                }
                if not col_indices:
                    continue  # not a cutoff table

                for data_row in table_data[1:]:  # type: ignore[misc]
                    if not data_row:
                        continue
                    row_list = list(data_row)

                    stage_val = str(row_list[0] or '').strip()
                    if not stage_val or stage_val.upper() in ('STAGE', ''):
                        continue

                    for col_idx, col_code in col_indices.items():
                        if col_idx >= len(row_list):
                            continue
                        cell = row_list[col_idx]
                        rank, percentile = parse_cell(str(cell) if cell else '')
                        if percentile is None:
                            continue

                        category, gender = COLUMN_MAP[col_code]
                        rows.append({
                            'year':           year,
                            'college_code':   tbl_ctx.get('college_code', ''),
                            'college_name':   tbl_ctx.get('college_name', ''),
                            'branch_code':    tbl_ctx.get('branch_code', ''),
                            'branch_name':    tbl_ctx.get('branch_name', ''),
                            'college_status': tbl_ctx.get('college_status', ''),
                            'stage':          stage_val,
                            'level':          tbl_ctx.get('level', 'State Level'),
                            'category':       category,
                            'gender':         gender,
                            'cutoff_rank':    rank,
                            'percentile':     percentile,
                        })

    return pd.DataFrame(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description='Parse MHT-CET cutoff PDF to CSV')
    parser.add_argument('--pdf',  required=True)
    parser.add_argument('--year', required=True, type=int)
    parser.add_argument('--out',  required=True)
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f'ERROR: PDF not found: {pdf_path}')
        sys.exit(1)

    print(f'Parsing: {pdf_path} (year={args.year})...')
    df = parse_pdf(str(pdf_path), args.year)

    if df.empty:
        print('WARNING: No data extracted.')
        sys.exit(1)

    df.to_csv(args.out, index=False)
    print(f'Done. Extracted {len(df):,} rows -> {args.out}')
    print(f'Unique colleges : {df["college_code"].nunique()}')
    print(f'Unique branches : {df["branch_name"].nunique()}')
    print(f'\nSample (college 2111 IT check):')
    subset = df[df['college_code'].astype(str) == '2111']
    if len(subset):
        print(subset[['college_name', 'branch_name', 'category', 'cutoff_rank', 'percentile']].drop_duplicates('branch_name').to_string(index=False))
    else:
        print('  (no rows for 2111)')


if __name__ == '__main__':
    main()
