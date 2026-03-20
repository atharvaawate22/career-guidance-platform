#!/usr/bin/env python3
"""
Detailed PDF audit script to find missing colleges and extraction inconsistencies.
Compares parsed CSV output against raw PDF content.
"""
import pdfplumber
import pandas as pd
import re
from pathlib import Path
from collections import defaultdict

# Configuration
PDF_DIR = Path("cutoff_pdfs")
CSV_DIR = Path(".")
ROUNDS = {
    1: "2025ENGG_CAP1_CutOff.pdf",
    2: "2025ENGG_CAP2_CutOff.pdf",
    3: "2025ENGG_CAP3_CutOff.pdf",
    4: "2025ENGG_CAP4_CutOff.pdf",
}

def extract_colleges_from_pdf(pdf_path):
    """
    Extract all college codes and names from PDF by text scan.
    Returns set of (college_code, college_name) tuples.
    """
    colleges = set()
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"\n[PDF] Scanning {pdf_path.name}: {total_pages} pages")
            
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if not text:
                    continue
                
                # Find all lines with 5-digit college codes
                matches = re.findall(r'^(\d{5})\s+(.+?)$', text, re.MULTILINE)
                for code, name in matches:
                    # Clean up name (remove stage markers, ranks, etc.)
                    name_clean = re.sub(r'\s+(I{1,3}|IV|MH|VII|Non PWD|Non Defence|Male|Female|OBC|SC|ST)\s*.*', '', name).strip()
                    if name_clean and len(name_clean) > 2:
                        colleges.add((code, name_clean))
                
                if (page_num % 10) == 0:
                    print(f"  Processed {page_num}/{total_pages} pages...")
            
            print(f"  Found {len(colleges)} unique colleges (code, name) pairs")
            return colleges
    except Exception as e:
        print(f"  [ERROR] Error reading PDF: {e}")
        return set()

def load_csv_colleges(csv_path):
    """
    Load colleges from parsed CSV.
    Returns set of (college_code, college_name) tuples.
    """
    if not csv_path.exists():
        print(f"  [WARN] CSV not found: {csv_path.name}")
        return set()
    
    try:
        df = pd.read_csv(csv_path, dtype={'college_code': 'str'})
        df['college_code'] = df['college_code'].str.strip()
        df['college_name'] = df['college_name'].str.strip()
        colleges = set(zip(df['college_code'].unique(), df['college_name'].unique()))
        print(f"  Loaded {len(colleges)} unique colleges from CSV")
        return colleges
    except Exception as e:
        print(f"  [ERROR] Error reading CSV: {e}")
        return set()

def compare_pdf_vs_csv(round_num, pdf_colleges, csv_colleges):
    """
    Compare PDF extraction vs CSV output.
    Returns missing colleges and duplicate handling info.
    """
    missing_in_csv = pdf_colleges - csv_colleges
    extra_in_csv = csv_colleges - pdf_colleges
    
    return {
        'missing_in_csv': missing_in_csv,
        'extra_in_csv': extra_in_csv,
        'pdf_count': len(pdf_colleges),
        'csv_count': len(csv_colleges),
        'match_count': len(pdf_colleges & csv_colleges),
    }

def extract_csv_stats(csv_path):
    """
    Extract statistics from CSV for comparison.
    """
    if not csv_path.exists():
        return None
    
    try:
        df = pd.read_csv(csv_path, dtype={'college_code': 'str'})
        df['college_code'] = df['college_code'].str.strip()
        return {
            'total_rows': len(df),
            'unique_colleges': df['college_code'].nunique(),
            'unique_college_names': df['college_name'].nunique(),
            'unique_branches': df['branch'].nunique(),
            'stages': df['stage'].unique() if 'stage' in df.columns else [],
            'null_codes': df['college_code'].isnull().sum(),
            'null_names': df['college_name'].isnull().sum(),
        }
    except Exception as e:
        print(f"  [ERROR] Error analyzing CSV: {e}")
        return None

def main():
    print("=" * 80)
    print("COMPREHENSIVE PDF AUDIT REPORT - 2025 CAP ROUNDS")
    print("=" * 80)
    
    results = {}
    
    for round_num, pdf_name in ROUNDS.items():
        pdf_path = PDF_DIR / pdf_name
        csv_path = CSV_DIR / f"cutoffs_2025_cap{round_num}.csv"
        
        print(f"\n{'='*80}")
        print(f"ROUND {round_num} AUDIT")
        print(f"{'='*80}")
        print(f"PDF: {pdf_path.name}")
        print(f"CSV: {csv_path.name}")
        
        # Extract from PDF
        pdf_colleges = extract_colleges_from_pdf(pdf_path)
        
        # Load from CSV
        csv_colleges = load_csv_colleges(csv_path)
        
        # Compare
        comparison = compare_pdf_vs_csv(round_num, pdf_colleges, csv_colleges)
        
        # Extract CSV stats
        csv_stats = extract_csv_stats(csv_path)
        
        results[round_num] = {
            'comparison': comparison,
            'csv_stats': csv_stats,
            'pdf_colleges': pdf_colleges,
            'csv_colleges': csv_colleges,
        }
        
        # Report
        print(f"\n[STATS] Comparison Results:")
        print(f"  PDF extracted colleges: {comparison['pdf_count']}")
        print(f"  CSV parsed colleges: {comparison['csv_count']}")
        print(f"  Matching colleges: {comparison['match_count']}")
        print(f"  MISSING in CSV (found in PDF): {len(comparison['missing_in_csv'])}")
        print(f"  EXTRA in CSV (not in PDF): {len(comparison['extra_in_csv'])}")
        
        if csv_stats:
            print(f"\n[CSV] Statistics:")
            print(f"  Total rows: {csv_stats['total_rows']}")
            print(f"  Unique college codes: {csv_stats['unique_colleges']}")
            print(f"  Unique branches: {csv_stats['unique_branches']}")
            print(f"  Stage values: {list(csv_stats['stages'])}")
            print(f"  Null college codes: {csv_stats['null_codes']}")
            print(f"  Null college names: {csv_stats['null_names']}")
        
        if comparison['missing_in_csv']:
            print(f"\n[MISSING] Colleges in PDF but NOT in CSV (extraction failures):")
            for code, name in sorted(comparison['missing_in_csv'])[:20]:
                print(f"    {code} - {name}")
            if len(comparison['missing_in_csv']) > 20:
                print(f"    ... and {len(comparison['missing_in_csv']) - 20} more")
        
        if comparison['extra_in_csv']:
            print(f"\n[EXTRA] Colleges in CSV but NOT in PDF (may be parsing errors):")
            for code, name in sorted(comparison['extra_in_csv'])[:20]:
                print(f"    {code} - {name}")
            if len(comparison['extra_in_csv']) > 20:
                print(f"    ... and {len(comparison['extra_in_csv']) - 20} more")
    
    # Cross-round analysis
    print(f"\n{'='*80}")
    print("CROSS-ROUND ANALYSIS")
    print(f"{'='*80}")
    
    all_cap1_colleges = results[1]['pdf_colleges']
    
    for round_num in [2, 3, 4]:
        all_cap_colleges = results[round_num]['pdf_colleges']
        missing_from_cap1 = all_cap_colleges - all_cap1_colleges
        missing_in_later = all_cap1_colleges - all_cap_colleges
        
        print(f"\nCAP{round_num} vs CAP1 (PDF extraction):")
        print(f"  Colleges in CAP{round_num}: {len(all_cap_colleges)}")
        print(f"  Colleges in CAP1: {len(all_cap1_colleges)}")
        print(f"  NEW in CAP{round_num} (not in CAP1): {len(missing_from_cap1)}")
        if missing_from_cap1:
            for code, name in sorted(missing_from_cap1):
                print(f"    {code} - {name}")
        print(f"  MISSING in CAP{round_num} (was in CAP1): {len(missing_in_later)}")
        if missing_in_later:
            for code, name in sorted(missing_in_later):
                print(f"    {code} - {name}")
    
    print(f"\n{'='*80}")
    print("AUDIT REPORT COMPLETE")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    main()
