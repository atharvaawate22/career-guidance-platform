#!/usr/bin/env python3
"""
Fast PDF audit - samples pages to find missing colleges
"""
import pdfplumber
import pandas as pd
import re
from pathlib import Path

PDF_DIR = Path("cutoff_pdfs")
ROUNDS = {
    1: "2025ENGG_CAP1_CutOff.pdf",
    2: "2025ENGG_CAP2_CutOff.pdf",
    3: "2025ENGG_CAP3_CutOff.pdf",
    4: "2025ENGG_CAP4_CutOff.pdf",
}

def extract_colleges_from_pdf_sampled(pdf_path, sample_interval=50):
    """
    Extract colleges from PDF by sampling every Nth page.
    """
    colleges = set()
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"\n[SAMPLE] Scaning {pdf_path.name}: {total_pages} pages (sampling every {sample_interval})")
            
            # Sample pages: first 5, last 5, and every Nth page
            sample_pages = set(range(0, 5))  # first 5
            sample_pages.update(range(max(0, total_pages-5), total_pages))  # last 5
            sample_pages.update(range(0, total_pages, sample_interval))  # every Nth
            
            for page_num in sorted(list(sample_pages)):
                page = pdf.pages[page_num]
                text = page.extract_text()
                if not text:
                    continue
                
                # Find all 5-digit college codes
                matches = re.findall(r'^(\d{5})\s+(.+?)$', text, re.MULTILINE)
                for code, name in matches:
                    name_clean = re.sub(r'\s+(I{1,3}|IV|MH|VII|Non PWD|Non Defence|Male|Female|OBC|SC|ST|AMD)\s*.*', '', name).strip()
                    if name_clean and len(name_clean) > 2:
                        colleges.add((code, name_clean))
            
            print(f"  Sampled {len(sample_pages)} pages, found {len(colleges)} unique colleges")
            return colleges
    except Exception as e:
        print(f"  [ERROR] {e}")
        return set()

def load_csv_colleges(round_num):
    """Load colleges from CSV"""
    csv_path = Path(f"cutoffs_2025_cap{round_num}.csv")
    if not csv_path.exists():
        print(f"  [WARN] CSV not found")
        return set()
    
    try:
        df = pd.read_csv(csv_path, dtype={'college_code': 'str'})
        df['college_code'] = df['college_code'].str.strip()
        df['college_name'] = df['college_name'].str.strip()
        colleges = set(zip(df['college_code'].unique(), df['college_name'].unique()))
        return colleges
    except Exception as e:
        print(f"  [ERROR] {e}")
        return set()

def extract_colleges_full_scan(pdf_path):
    """Quick full scan of all pages"""
    colleges = set()
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"  Full scan of {total_pages} pages...")
            
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text:
                    continue
                
                matches = re.findall(r'^(\d{5})\s+(.+?)$', text, re.MULTILINE)
                for code, name in matches:
                    name_clean = re.sub(r'\s+(I{1,3}|IV|MH|VII|Non PWD|Non Defence|Male|Female|OBC|SC|ST|AMD)\s*.*', '', name).strip()
                    if name_clean and len(name_clean) > 2:
                        colleges.add((code, name_clean))
                
                if (page_num + 1) % 200 == 0:
                    print(f"    Processed {page_num+1}/{total_pages}...")
            
            print(f"  Total: {len(colleges)} unique colleges")
            return colleges
    except Exception as e:
        print(f"  [ERROR] {e}")
        return set()

print("=" * 80)
print("FAST PDF AUDIT - 2025 CAP ROUNDS")
print("=" * 80)

results = {}

for round_num in sorted(ROUNDS.keys()):
    pdf_path = PDF_DIR / ROUNDS[round_num]
    
    print(f"\n{'='*80}")
    print(f"CAP{round_num}")
    print(f"{'='*80}")
    
    # Extract from PDF
    pdf_colleges = extract_colleges_full_scan(pdf_path)
    
    # Load from CSV
    csv_colleges = load_csv_colleges(round_num)
    print(f"  CSV: {len(csv_colleges)} unique colleges")
    
    results[round_num] = {
        'pdf': pdf_colleges,
        'csv': csv_colleges,
    }
    
    # Compare
    missing_in_csv = pdf_colleges - csv_colleges
    extra_in_csv = csv_colleges - pdf_colleges
    
    print(f"\n  [RESULTS]")
    print(f"    PDF colleges: {len(pdf_colleges)}")
    print(f"    CSV colleges: {len(csv_colleges)}")
    print(f"    Match: {len(pdf_colleges & csv_colleges)}")
    print(f"    MISSING from CSV (in PDF): {len(missing_in_csv)}")
    print(f"    EXTRA in CSV (not in PDF): {len(extra_in_csv)}")
    
    if missing_in_csv:
        print(f"\n  [MISSING] - Should be in CSV but not found:")
        for code, name in sorted(list(missing_in_csv)[:10]):
            print(f"    {code} - {name}")
        if len(missing_in_csv) > 10:
            print(f"    ... and {len(missing_in_csv) - 10} more")
    
    if extra_in_csv:
        print(f"\n  [EXTRA] - In CSV but not found in PDF:")
        for code, name in sorted(list(extra_in_csv)[:10]):
            print(f"    {code} - {name}")
        if len(extra_in_csv) > 10:
            print(f"    ... and {len(extra_in_csv) - 10} more")

print(f"\n{'='*80}")
print("CROSS-ROUND ANALYSIS")
print(f"{'='*80}")

# Compare across rounds
cap1_pdf = results[1]['pdf']
print(f"\nCAP1 PDF colleges: {len(cap1_pdf)}")

for rnd in [2, 3, 4]:
    cap_pdf = results[rnd]['pdf']
    missing = cap1_pdf - cap_pdf
    new = cap_pdf - cap1_pdf
    
    print(f"\nCAP{rnd} (PDF extraction):")
    print(f"  Total: {len(cap_pdf)}")
    print(f"  Missing from CAP1: {len(missing)}")
    if missing:
        for code, name in sorted(list(missing)[:5]):
            print(f"    {code} - {name}")
        if len(missing) > 5:
            print(f"    ... and {len(missing) - 5} more")
    print(f"  New in CAP{rnd}: {len(new)}")
    if new:
        for code, name in sorted(list(new)):
            print(f"    {code} - {name}")

print(f"\n{'='*80}")
print("END AUDIT")
print(f"{'='*80}\n")
