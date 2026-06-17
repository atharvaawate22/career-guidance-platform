#!/usr/bin/env python3
"""
Parse an MHT-CET CAP "Cut Off List" PDF into normalized CSVs (v2).

Supersedes the legacy scripts/parse_cutoffs.py. This version does NOT use
pdfplumber table detection. Words are clustered into lines by their y (top)
coordinate, and within each Stage block the rank/percentile values are aligned
to their column headers by x-coordinate (greedy nearest-distance matching) so
that BLANK cells do not shift columns. A continuation state machine carries
college/course/section context forward; the course only resets on a real
course-heading line.

Usage:
    python scripts/parse_cutoffs_v2.py "cutoff_pdfs/Round 1.pdf" --round 1 \
        --year 2025 --out scripts/parsed/round1
"""
import argparse
import csv
import json
import os
import re
from collections import Counter

import pdfplumber

COLLEGE_RE = re.compile(r'^(\d{5}) - (.+)$')
COURSE_RE = re.compile(r'^(\d{10}[A-Z]?) - (.+)$')
STATUS_RE = re.compile(r'^Status:\s*(.*?)\s*Home University\s*:\s*(.*)$')
ROMAN = {'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'}
BOILER = ('D Government', 'i State Common', 'r Cut Off', 'Degree Courses',
          'Legends:', 'Maharashtra State Seats')
SECTION_TO_POOL = [
    ('Home University Seats Allotted to Home University', 'HU_HU'),
    ('Home University Seats Allotted to Other Than Home University', 'HU_OHU'),
    ('Other Than Home University Seats Allotted to Other Than Home University', 'OHU_OHU'),
    ('Other Than Home University Seats Allotted to Home University', 'OHU_HU'),
    ('State Level', 'STATE'),
    ('All India', 'AI'),
]
CATEGORIES = {'OPEN', 'SC', 'ST', 'VJ', 'NT1', 'NT2', 'NT3', 'OBC', 'SEBC'}


def canonical_subject(name):
    """Canonical subject name: keep every distinct subject individual; only merge
    pure formatting/spacing duplicates so the branch filter is clean. Per owner:
    do NOT collapse the CSE family (or any family) into one coarse bucket."""
    s = re.sub(r'\s+', ' ', name.strip())
    s = re.sub(r'\s*\(\s*', ' (', s)   # "X(Y)" -> "X (Y)"
    s = re.sub(r'\s*\)\s*', ')', s)
    s = re.sub(r'\bEngg\.?\b', 'Engineering', s, flags=re.I)
    return s.strip(' .')


def parse_city(college_name):
    parts = [p.strip(' .') for p in college_name.split(',') if p.strip(' .')]
    if not parts:
        return ''
    tail = parts[-1]
    tail = re.sub(r'\b(Tal|Dist|District)\.?\b.*', '', tail, flags=re.I).strip(' .')
    tail = re.sub(r'\(.*?\)', '', tail).strip(' .')
    return tail


def decode_category_code(code):
    """Return (gender, category, subquota). Raw code stays the source of truth."""
    c = code.strip().upper()
    if c in ('TFWS', 'EWS', 'ORPHAN'):
        return (None, None, c)
    body = c
    if body.endswith('AI'):
        body = body[:-2]
    elif body and body[-1] in ('S', 'H', 'O'):
        body = body[:-1]
    gender = None
    if body.startswith('G'):
        gender, body = 'G', body[1:]
    elif body.startswith('L'):
        gender, body = 'L', body[1:]
    subquota = None
    if body.startswith('PWDR'):
        subquota, body = 'PWD', body[4:]
    elif body.startswith('PWD'):
        subquota, body = 'PWD', body[3:]
    elif body.startswith('DEFR'):
        subquota, body = 'DEF', body[4:]
    elif body.startswith('DEF'):
        subquota, body = 'DEF', body[3:]
    elif body.startswith('MI'):
        subquota, body = 'MINORITY', body[2:]
    category = body if body in CATEGORIES else (body or None)
    return (gender, category, subquota)


def parse_status(s):
    m = STATUS_RE.match(s)
    if not m:
        return (s.replace('Status:', '').strip(), None, None, None)
    status, hu = m.group(1).strip(), m.group(2).strip()
    mtype = mgroup = None
    mm = re.search(r'(Religious|Linguistic) Minority\s*-\s*(.+)', status)
    if mm:
        mtype, mgroup = mm.group(1), mm.group(2).strip()
    return (status, mtype, mgroup, hu)


def cluster_lines(words, tol=2.5):
    lines = []
    for w in sorted(words, key=lambda w: (w['top'], w['x0'])):
        for ln in lines:
            if abs(ln['top'] - w['top']) <= tol:
                ln['words'].append(w)
                break
        else:
            lines.append({'top': w['top'], 'words': [w]})
    lines.sort(key=lambda l: l['top'])
    for ln in lines:
        ln['words'].sort(key=lambda w: w['x0'])
        ln['text'] = ' '.join(w['text'] for w in ln['words'])
    return lines


def xc(w):
    return (w['x0'] + w['x1']) / 2.0


def align(values, headers):
    pairs = []
    for vi, v in enumerate(values):
        for hi, (code, hx) in enumerate(headers):
            pairs.append((abs(xc(v) - hx), vi, hi))
    pairs.sort()
    vused, hused, out = set(), set(), {}
    for d, vi, hi in pairs:
        if vi in vused or hi in hused:
            continue
        out[headers[hi][0]] = values[vi]
        vused.add(vi)
        hused.add(hi)
    return out, len(values) - len(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--round', type=int, required=True)
    ap.add_argument('--year', type=int, default=2025)
    ap.add_argument('--out', required=True)
    ap.add_argument('--sample', type=int, default=3)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    colleges, courses, cutoffs = {}, {}, []
    report = Counter()
    unknown_codes = Counter()
    anomalies = []
    samples = []

    college = course = pool = None
    headers = []
    pending = None  # (stage, {code: rank_word})

    def cur_choice():
        return course['choice_code'] if course else None

    def add_sample_line(s):
        if samples and samples[-1]['choice'] == cur_choice():
            samples[-1]['raw'].append(s)

    def flush(pcts=None):
        nonlocal pending
        if not pending or not course:
            pending = None
            return
        stage, rank_map = pending
        for code, rw in rank_map.items():
            digits = re.sub(r'[^0-9]', '', rw['text'])
            if not digits:
                continue
            pct = ''
            if pcts and code in pcts:
                try:
                    pct = float(re.sub(r'[()%]', '', pcts[code]['text']))
                except ValueError:
                    pct = ''
            g, cat, sub = decode_category_code(code)
            if cat is None and sub is None:
                unknown_codes[code] += 1
            cutoffs.append({
                'choice_code': course['choice_code'],
                'cap_round': args.round,
                'allotment_pool': pool or 'STATE',
                'stage': stage,
                'category_code': code,
                'gender': g or '',
                'category': cat or '',
                'subquota': sub or '',
                'closing_rank': int(digits),
                'closing_percentile': pct,
            })
            report['cutoff_rows'] += 1
        pending = None

    with pdfplumber.open(args.pdf) as pdf:
        for pi, page in enumerate(pdf.pages):
            for ln in cluster_lines(page.extract_words()):
                s = ln['text'].strip()
                if not s or any(s.startswith(b) for b in BOILER) or s == str(pi + 1):
                    continue
                mc, mco = COLLEGE_RE.match(s), COURSE_RE.match(s)

                if mc and not mco:
                    flush()
                    code, name = mc.group(1), mc.group(2).strip()
                    if code not in colleges:
                        colleges[code] = {'college_code': code, 'name': name,
                                          'status': '', 'minority_type': '',
                                          'minority_group': '', 'home_university': '',
                                          'city': parse_city(name)}
                        report['colleges'] += 1
                    college = colleges[code]
                    continue

                if mco:
                    flush()
                    cc, cname = mco.group(1), mco.group(2).strip()
                    if cc not in courses:
                        courses[cc] = {'choice_code': cc,
                                       'college_code': college['college_code'] if college else '',
                                       'course_name': cname,
                                       'branch_group': canonical_subject(cname)}
                        report['courses'] += 1
                        if len(samples) < args.sample:
                            samples.append({'choice': cc, 'name': cname,
                                            'college': college['name'] if college else '',
                                            'raw': []})
                    course = courses[cc]
                    headers, pool = [], None
                    continue

                if s.startswith('Status:') and college:
                    st, mt, mg, hu = parse_status(s)
                    college['status'] = college['status'] or st
                    college['minority_type'] = college['minority_type'] or (mt or '')
                    college['minority_group'] = college['minority_group'] or (mg or '')
                    college['home_university'] = college['home_university'] or (hu or '')
                    add_sample_line(s)
                    continue

                pool_hit = next((p for key, p in SECTION_TO_POOL if s.startswith(key)), None)
                if pool_hit:
                    flush()
                    pool = pool_hit
                    add_sample_line(s)
                    continue

                first = ln['words'][0]['text']
                if first == 'Stage':
                    flush()
                    headers = [(w['text'], xc(w)) for w in ln['words'][1:]]
                    add_sample_line(s)
                    continue

                if first in ROMAN and len(ln['words']) > 1 and headers:
                    flush()
                    rank_map, coll = align(ln['words'][1:], headers)
                    if coll:
                        anomalies.append(f"p{pi+1} {cur_choice()} st{first}: {coll} unaligned")
                    pending = (first, rank_map)
                    add_sample_line(s)
                    continue

                if first.startswith('(') and pending and headers:
                    pcts = [w for w in ln['words'] if w['text'].startswith('(')]
                    pct_map, _ = align(pcts, headers)
                    flush(pct_map)
                    add_sample_line(s)
                    continue
        flush()

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

    # JSON for the Node loader (avoids CSV quoting issues with commas in names).
    for name, data in [('colleges.json', list(colleges.values())),
                       ('courses.json', list(courses.values())),
                       ('cutoffs.json', cutoffs)]:
        with open(os.path.join(args.out, name), 'w', encoding='utf-8') as f:
            json.dump(data, f)

    print(f"=== Round {args.round} ===")
    print(f"colleges={report['colleges']} courses={report['courses']} "
          f"cutoff_rows={report['cutoff_rows']}")
    print(f"alignment anomalies: {len(anomalies)} (first 5): {anomalies[:5]}")
    print(f"unknown category codes: {dict(unknown_codes.most_common(12))}")
    bg = Counter(c['branch_group'] for c in courses.values())
    print(f"distinct branch subjects: {len(bg)} (top 8: {dict(bg.most_common(8))})\n")
    for smp in samples:
        print('#' * 72)
        print(f"{smp['college']} :: {smp['choice']} - {smp['name']} "
              f"(branch_group={courses[smp['choice']]['branch_group']})")
        print('--- RAW PDF ---')
        for r in smp['raw'][:10]:
            print('   ', r[:150])
        print('--- PARSED ---')
        for r in cutoffs:
            if r['choice_code'] == smp['choice']:
                print(f"   {r['allotment_pool']:7} st{r['stage']:<3} {r['category_code']:11} "
                      f"g={r['gender'] or '-':1} cat={r['category'] or '-':5} "
                      f"sub={r['subquota'] or '-':8} rank={r['closing_rank']:<7} "
                      f"pct={r['closing_percentile']}")
        print()


if __name__ == '__main__':
    main()
