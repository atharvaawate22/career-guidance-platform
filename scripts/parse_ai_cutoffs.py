#!/usr/bin/env python3
"""
Parse an MHT-CET CAP "Cut Off List for All India Seats" PDF (a flat, one-row-
per-choice-code merit list with actual PDF table rulings) into the same
colleges/courses/cutoffs JSON+CSV shape produced by parse_cutoffs_v2.py, so it
can be loaded by the same additive loader.

This is a *different* PDF layout from the MH-quota "Cut Off List" (which has
no rulings and uses Stage I/II/III category blocks) -- pdfplumber's own
find_tables() detects this one's grid cleanly. The one wrinkle: on the last
data row of most pages, the PDF is missing the vertical ruling between
Institute Name/Course Name and between Exam Type-category/Seat Type, so
pdfplumber merges those cells. We work around it by re-cropping every row at
fixed column x-boundaries (taken from a clean row on the same page) combined
with the row's own y-bounds, instead of trusting the auto-detected cell text.

Usage:
    python scripts/parse_ai_cutoffs.py "scripts/cutoff_pdfs/2026ENGG_CAP1_AI_CutOff.pdf" \
        --round 1 --year 2026 --out scripts/parsed/round1_2026_ai
"""
import argparse
import csv
import json
import os
import re
import sys

import pdfplumber

sys.path.insert(0, os.path.dirname(__file__))
from parse_cutoffs_v2 import canonical_subject, parse_city  # noqa: E402

CHOICE_CODE_RE = re.compile(r'^(\d{10}[A-Z]?)$')
COLLEGE_RE = re.compile(r'^(\d{5}) - (.+)$')

EXAM_CODE = {
    'MHT-CET': 'CET',
    'MHT-CET-PCB 2026': 'CETPCB',
    'JEE': 'JEE',
    'JEE(Main)-2026': 'JEE',
}

# Fallback column x-boundaries, observed constant across the document.
DEFAULT_BOUNDARIES = [35.8, 85.3, 160.3, 228.55, 505.3, 619.3, 695.4, 754.8, 822.6]


def col_boundaries_for_page(table):
    """Return the 9 x-edges (8 columns) from the first row with all 8 cells present."""
    for row in table.rows:
        cells = row.cells
        if len(cells) == 8 and all(c is not None for c in cells):
            edges = [cells[0][0]] + [c[2] for c in cells]
            return edges
    return DEFAULT_BOUNDARIES


def extract_row(page, top, bottom, edges):
    vals = []
    for i in range(8):
        bbox = (edges[i], top, edges[i + 1], bottom)
        # clamp to page bounds to avoid pdfplumber errors on rounding
        bbox = (max(bbox[0], 0), max(bbox[1], 0),
                min(bbox[2], page.width), min(bbox[3], page.height))
        txt = page.within_bbox(bbox).extract_text()
        vals.append(txt.replace('\n', ' ').strip() if txt else '')
    return vals


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--round', type=int, required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    colleges, courses, cutoffs = {}, {}, []
    skipped_rows = []
    exam_codes_seen = set()

    with pdfplumber.open(args.pdf) as pdf:
        for pi, page in enumerate(pdf.pages):
            tabs = page.find_tables()
            if not tabs:
                continue
            table = tabs[0]
            edges = col_boundaries_for_page(table)
            for row in table.rows[1:]:  # skip header row
                top, bottom = row.bbox[1], row.bbox[3]
                sr_no, merit, choice_code, institute, course_name, exam_type, cat_type, seat_type = \
                    extract_row(page, top, bottom, edges)

                choice_code = choice_code.strip()
                if not CHOICE_CODE_RE.match(choice_code):
                    skipped_rows.append((pi + 1, sr_no, choice_code))
                    continue

                mc = COLLEGE_RE.match(institute)
                if not mc:
                    skipped_rows.append((pi + 1, sr_no, choice_code))
                    continue
                college_code, college_name = mc.group(1), mc.group(2).strip()
                if college_code not in colleges:
                    colleges[college_code] = {
                        'college_code': college_code, 'name': college_name,
                        'status': '', 'minority_type': '', 'minority_group': '',
                        'home_university': '', 'city': parse_city(college_name),
                    }

                if choice_code not in courses:
                    courses[choice_code] = {
                        'choice_code': choice_code, 'college_code': college_code,
                        'course_name': course_name, 'branch_group': canonical_subject(course_name),
                    }

                m = re.match(r'^(\d+)\s*\(([\d.]+)\)$', merit.replace(',', ''))
                if not m:
                    skipped_rows.append((pi + 1, sr_no, choice_code))
                    continue
                closing_rank, closing_percentile = int(m.group(1)), float(m.group(2))

                exam_code = EXAM_CODE.get(exam_type.strip())
                if not exam_code:
                    exam_codes_seen.add(exam_type)
                    exam_code = 'OTHER'
                exam_codes_seen.add(exam_type)

                cutoffs.append({
                    'choice_code': choice_code,
                    'cap_round': args.round,
                    'allotment_pool': 'AI',
                    'stage': 'I',
                    'category_code': f'AI-{exam_code}',
                    'gender': '',
                    'category': '',
                    'subquota': '',
                    'closing_rank': closing_rank,
                    'closing_percentile': closing_percentile,
                })

    def write_csv(name, rows, fields):
        with open(os.path.join(args.out, name), 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            w.writerows(rows)

    write_csv('colleges.csv', colleges.values(),
              ['college_code', 'name', 'status', 'minority_type', 'minority_group',
               'home_university', 'city'])
    write_csv('courses.csv', courses.values(),
              ['choice_code', 'college_code', 'course_name', 'branch_group'])
    write_csv('cutoffs.csv', cutoffs,
              ['choice_code', 'cap_round', 'allotment_pool', 'stage', 'category_code',
               'gender', 'category', 'subquota', 'closing_rank', 'closing_percentile'])

    for name, data in [('colleges.json', list(colleges.values())),
                       ('courses.json', list(courses.values())),
                       ('cutoffs.json', cutoffs)]:
        with open(os.path.join(args.out, name), 'w', encoding='utf-8') as f:
            json.dump(data, f)

    print(f"=== AI-quota Round {args.round} ({args.year}) ===")
    print(f"colleges={len(colleges)} courses={len(courses)} cutoff_rows={len(cutoffs)}")
    print(f"exam types seen (raw): {exam_codes_seen}")
    print(f"skipped rows: {len(skipped_rows)}")
    if skipped_rows:
        print("first 20 skipped:", skipped_rows[:20])


if __name__ == '__main__':
    main()
