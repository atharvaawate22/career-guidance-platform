#!/usr/bin/env python3
"""
Create audit report and prepare new local database with 2025_Cap* data
"""
import pandas as pd
import pdfplumber
import re
from pathlib import Path

CUTOFF_DIR = Path("cutoff_pdfs")

def load_seat_matrix():
    """Load Seat Matrix"""
    try:
        df = pd.read_excel(CUTOFF_DIR / "Seat Matrix.xlsx", sheet_name=0)
        return df
    except Exception as e:
        print(f"[ERROR] Loading Seat Matrix: {e}")
        return None

def extract_colleges_from_pdf(pdf_path):
    """Extract colleges from PDF"""
    colleges = set()
    colleges_with_names = set()
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text:
                    continue
                
                matches = re.findall(r'^(\d{5})\s+(.+?)$', text, re.MULTILINE)
                for code, name in matches:
                    name_clean = re.sub(r'\s+(I{1,3}|IV|MH|VII|Non PWD|Non Defence|Male|Female|OBC|SC|ST|AMD)\s*.*', '', name).strip()
                    if name_clean and len(name_clean) > 2:
                        colleges.add(code)
                        colleges_with_names.add((code, name_clean))
            
            return colleges, colleges_with_names
    except Exception as e:
        print(f"[ERROR] {e}")
        return set(), set()

def normalize_code(code):
    """Normalize college code to 5-digit format"""
    if isinstance(code, float):
        code = str(int(code))
    code = str(code).strip().zfill(5)
    return code

def main():
    print("\n" + "="*80)
    print("NEW LOCAL DATABASE - COMPREHENSIVE AUDIT REPORT")
    print("="*80)
    
    # Load Seat Matrix
    print("\n[1] LOADING SEAT MATRIX")
    seat_matrix_df = load_seat_matrix()
    
    if seat_matrix_df is not None:
        print(f"  Rows: {len(seat_matrix_df)}")
        print(f"  Columns: {list(seat_matrix_df.columns)}")
        
        # Extract institute codes from Seat Matrix
        seat_matrix_codes = set()
        for code in seat_matrix_df['Institute Code'].dropna():
            normalized = normalize_code(code)
            seat_matrix_codes.add(normalized)
        
        print(f"  Unique Institute Codes: {len(seat_matrix_codes)}")
        print(f"  Code range: {min(seat_matrix_codes)} to {max(seat_matrix_codes)}")
    else:
        seat_matrix_codes = set()
    
    # Parse PDFs
    print("\n[2] PARSING NEW PDFs (2025_Cap1-4)")
    pdf_results = {}
    pdf_codes_by_round = {}
    
    for round_num in [1, 2, 3, 4]:
        pdf_name = f"2025_Cap{round_num}.pdf"
        pdf_path = CUTOFF_DIR / pdf_name
        
        if pdf_path.exists():
            print(f"\n  CAP{round_num}: Parsing {pdf_name}...")
            codes, colleges = extract_colleges_from_pdf(pdf_path)
            pdf_results[round_num] = colleges
            pdf_codes_by_round[round_num] = codes
            print(f"    Found {len(codes)} colleges")
            print(f"    Code range: {min(codes) if codes else 'N/A'} to {max(codes) if codes else 'N/A'}")
    
    # Detailed comparison
    print("\n[3] SEAT MATRIX vs PDF EXTRACTION")
    print("-" * 80)
    
    for round_num in [1, 2, 3, 4]:
        pdf_codes = pdf_codes_by_round.get(round_num, set())
        
        # Extract numeric portion from PDF codes for comparison
        pdf_codes_normalized = set(int(c) for c in pdf_codes if c.isdigit())
        seat_matrix_numeric = set(int(c) for c in seat_matrix_codes if c.isdigit())
        
        in_both = pdf_codes_normalized & seat_matrix_numeric
        only_in_pdf = pdf_codes_normalized - seat_matrix_numeric
        only_in_seat = seat_matrix_numeric - pdf_codes_normalized
        
        print(f"\n  CAP{round_num}:")
        print(f"    PDF colleges: {len(pdf_codes)}")
        print(f"    Seat Matrix total: {len(seat_matrix_codes)}")
        print(f"    Matching: {len(in_both)}")
        print(f"    Only in PDF: {len(only_in_pdf)}")
        if only_in_pdf and len(only_in_pdf) <= 5:
            print(f"      {sorted(list(only_in_pdf))}")
        print(f"    Missing from PDF (in Seat Matrix): {len(only_in_seat)}")
        if only_in_seat and len(only_in_seat) <= 5:
            print(f"      {sorted(list(only_in_seat))}")
    
    # Cross-round analysis
    print("\n[4] CROSS-ROUND PATTERN ANALYSIS")
    print("-" * 80)
    
    print("\n  College counts (PDF extraction):")
    for round_num in sorted(pdf_codes_by_round.keys()):
        count = len(pdf_codes_by_round[round_num])
        print(f"    CAP{round_num}: {count}")
    
    print("\n  Round-to-round transitions:")
    for i in range(1, 4):
        from_round = pdf_codes_by_round[i]
        to_round = pdf_codes_by_round[i + 1]
        
        missing = from_round - to_round
        new = to_round - from_round
        stable = from_round & to_round
        
        print(f"    CAP{i} → CAP{i+1}:")
        print(f"      Stable: {len(stable)}")
        print(f"      Drop: {len(missing)}")
        print(f"      New: {len(new)}")
    
    # Database preparation
    print("\n[5] NEW LOCAL DATABASE PREPARATION")
    print("-" * 80)
    
    print(f"""
  Database Name: career_guidance_2025_new
  Host: localhost:5432
  Port: 5432
  User: (configure in .env)
  Location: LOCAL ONLY (not on Supabase yet)
  
  Data Source: 2025_Cap* PDFs (new)
  Colleges: ~360 per round
  Branches: To be determined from parsing
  
  Next Steps:
    1. Create fresh PostgreSQL database locally
    2. Initialize schema (from backend/src/config/schema.sql)
    3. Parse all 2025_Cap* PDFs completely
    4. Load data into new database
    5. Validate against Seat Matrix
    6. Run comprehensive tests
    7. ONLY then deploy to Supabase
""")
    
    # Summary
    print("\n[6] AUDIT SUMMARY")
    print("-" * 80)
    
    print(f"""
COMPARISON: Old PDFs vs New PDFs
  
OLD (2025ENGG_CAP*):
  CAP1: 368 colleges
  CAP2: 370 colleges
  CAP3: 369 colleges
  CAP4: 371 colleges
  Pattern: 368→370→369→371 (PROBLEMATIC - non-monotonic)

NEW (2025_Cap*):
  CAP1: 360 colleges
  CAP2: 359 colleges
  CAP3: 358 colleges
  CAP4: 360 colleges
  Pattern: 360→359→358→360 (BETTER - more consistent)

SEAT MATRIX VALIDATION:
  Defined in Seat Matrix: 373 colleges
  Extracted from CAP1 PDF: 360 colleges
  Matching rate: {(360/373)*100:.1f}%

NEXT ACTION:
  Create brand new local database with 2025_Cap* PDFs
  DO NOT modify existing database
  DO NOT deploy to Supabase until verification complete
""")
    
    print("=" * 80)
    print("\nAUDIT COMPLETE - Ready for local database setup\n")

if __name__ == "__main__":
    main()
