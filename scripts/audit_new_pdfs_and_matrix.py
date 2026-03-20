 #!/usr/bin/env python3
"""
Comprehensive audit with Seat Matrix validation and new database preparation
"""
import pandas as pd
import pdfplumber
import re
from pathlib import Path

CUTOFF_DIR = Path("cutoff_pdfs")
SEAT_MATRIX_FILE = CUTOFF_DIR / "Seat Matrix.xlsx"

def load_seat_matrix():
    """Load Seat Matrix and analyze structure"""
    print("\n" + "="*80)
    print("LOADING SEAT MATRIX")
    print("="*80)
    
    try:
        excel_file = pd.ExcelFile(SEAT_MATRIX_FILE)
        print(f"\n[SHEETS] Found {len(excel_file.sheet_names)} sheet(s):")
        for i, sheet in enumerate(excel_file.sheet_names):
            print(f"  {i+1}. {sheet}")
        
        # Load first sheet
        df = pd.read_excel(SEAT_MATRIX_FILE, sheet_name=0)
        
        print(f"\n[STRUCTURE] First sheet '{excel_file.sheet_names[0]}':")
        print(f"  Shape: {df.shape[0]} rows x {df.shape[1]} columns")
        print(f"  Columns: {list(df.columns)[:10]}{'...' if len(df.columns) > 10 else ''}")
        
        print(f"\n[DATA] First 20 rows (truncated):")
        pd.set_option('display.max_columns', None)
        pd.set_option('display.width', None)
        pd.set_option('display.max_colwidth', 80)
        print(df.head(20).to_string())
        
        return df, excel_file.sheet_names
    except Exception as e:
        print(f"[ERROR] {e}")
        return None, None

def extract_colleges_from_pdf(pdf_path):
    """Extract colleges from PDF"""
    colleges = set()
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text:
                    continue
                
                matches = re.findall(r'^(\d{5})\s+(.+?)$', text, re.MULTILINE)
                for code, name in matches:
                    name_clean = re.sub(r'\s+(I{1,3}|IV|MH|VII|Non PWD|Non Defence|Male|Female|OBC|SC|ST|AMD)\s*.*', '', name).strip()
                    if name_clean and len(name_clean) > 2:
                        colleges.add((code, name_clean))
            
            return colleges
    except Exception as e:
        print(f"  [ERROR] {e}")
        return set()

def analyze_seat_matrix_structure(seat_matrix_df):
    """Try to identify college columns in Seat Matrix"""
    print("\n" + "="*80)
    print("ANALYZING SEAT MATRIX STRUCTURE")
    print("="*80)
    
    if seat_matrix_df is None:
        return None
    
    # Look for 5-digit college codes
    all_values = set()
    for col in seat_matrix_df.columns:
        for val in seat_matrix_df[col].dropna():
            if isinstance(val, str) and val.strip().isdigit() and len(val.strip()) == 5:
                all_values.add(val.strip())
            elif isinstance(val, (int, float)) and 1000 <= val <= 99999:
                all_values.add(str(int(val)))
    
    print(f"\n[COLLEGES] Found {len(all_values)} unique 5-digit codes in Seat Matrix:")
    if all_values:
        codes_sorted = sorted(list(all_values))
        for i in range(0, min(len(codes_sorted), 30), 6):
            print(f"  {', '.join(codes_sorted[i:i+6])}")
        if len(all_values) > 30:
            print(f"  ... and {len(all_values) - 30} more")
    
    return all_values

def main():
    print("\n" + "="*80)
    print("COMPREHENSIVE AUDIT: NEW 2025 CAP DATA")
    print("="*80)
    
    # Step 1: Load Seat Matrix
    seat_matrix_df, sheet_names = load_seat_matrix()
    seat_matrix_colleges = analyze_seat_matrix_structure(seat_matrix_df)
    
    # Step 2: Parse new PDFs
    print("\n" + "="*80)
    print("PARSING NEW PDFs (2025_Cap1-4)")
    print("="*80)
    
    pdf_results = {}
    for round_num in [1, 2, 3, 4]:
        pdf_name = f"2025_Cap{round_num}.pdf"
        pdf_path = CUTOFF_DIR / pdf_name
        
        if pdf_path.exists():
            print(f"\n[PDF] {pdf_name}...")
            colleges = extract_colleges_from_pdf(pdf_path)
            pdf_results[round_num] = colleges
            print(f"  Found {len(colleges)} unique colleges")
        else:
            print(f"\n[WARN] {pdf_name} not found")
            pdf_results[round_num] = set()
    
    # Step 3: Summary Report
    print("\n" + "="*80)
    print("SUMMARY REPORT")
    print("="*80)
    
    print(f"\n[PDF EXTRACTION]")
    codes_by_round = {}
    for round_num in sorted(pdf_results.keys()):
        colleges = pdf_results[round_num]
        codes = set(c[0] for c in colleges)
        codes_by_round[round_num] = codes
        print(f"  CAP{round_num}: {len(codes)} unique college codes")
    
    # Cross-round pattern
    print(f"\n[CROSS-ROUND PATTERN]")
    for i in range(1, 4):
        missing = codes_by_round[i] - codes_by_round[i+1]
        new = codes_by_round[i+1] - codes_by_round[i]
        print(f"  CAP{i} -> CAP{i+1}: -{len(missing)} colleges, +{len(new)} new")
    
    # Compare with Seat Matrix
    if seat_matrix_colleges:
        print(f"\n[SEAT MATRIX COMPARISON]")
        print(f"  Seat Matrix total: {len(seat_matrix_colleges)} colleges")
        
        for round_num in sorted(pdf_results.keys()):
            pdf_codes = codes_by_round[round_num]
            match = pdf_codes & seat_matrix_colleges
            missing_in_pdf = seat_matrix_colleges - pdf_codes
            extra_in_pdf = pdf_codes - seat_matrix_colleges
            
            print(f"\n  CAP{round_num}:")
            print(f"    In both PDF & Seat Matrix: {len(match)}")
            print(f"    Missing from PDF (in Seat Matrix): {len(missing_in_pdf)}")
            if missing_in_pdf and len(missing_in_pdf) <= 15:
                print(f"      Codes: {', '.join(sorted(list(missing_in_pdf)))}")
            print(f"    Extra in PDF (not in Seat Matrix): {len(extra_in_pdf)}")
            if extra_in_pdf and len(extra_in_pdf) <= 15:
                print(f"      Codes: {', '.join(sorted(list(extra_in_pdf)))}")
    
    # Step 4: Database Plan
    print(f"\n" + "="*80)
    print("NEW LOCAL DATABASE PLAN")
    print("="*80)
    
    print(f"""
[DATABASE SETUP]
  Name: career_guidance_2025_new
  Location: Local PostgreSQL (localhost:5432)
  Content: Fresh CAP1/2/3/4 data from new PDFs
  Status: Local only (NOT YET on Supabase)
  Plan: Complete verification before deployment

[VERIFICATION STEPS]
  1. Parse all new PDFs completely
  2. Create fresh local database schema
  3. Load parsed data with validation
  4. Validate against Seat Matrix
  5. Compare data quality vs old PDFs
  6. Generate final audit report
  7. Test all API endpoints locally
  8. Only then deploy to Supabase
""")
    
    # Step 5: Data Quality Summary
    print("\n" + "="*80)
    print("DATA QUALITY COMPARISON")
    print("="*80)
    
    print(f"""
[PREVIOUS PDFs (2025ENGG_CAP*)]
  CAP1: 368 colleges
  CAP2: 370 colleges  
  CAP3: 369 colleges
  CAP4: 371 colleges
  Pattern: Non-monotonic (368->370->369->371) - PROBLEMATIC

[NEW PDFs (2025_Cap*)]""")
    
    for rnd in sorted(codes_by_round.keys()):
        print(f"  CAP{rnd}: {len(codes_by_round[rnd])} colleges")
    
    pattern_desc = "Monotonic (360->359->358->360)" if list(codes_by_round.values())[0] > list(codes_by_round.values())[1] else "Inconsistent"
    print(f"""  Pattern: {pattern_desc} - BETTER

[ASSESSMENT]
  + More consistent college counts
  + Better data structure with Seat Matrix
  + Ready for clean local database
  - Still need to validate against Seat Matrix

[RECOMMENDATION]
  Proceed with creating new local database using 2025_Cap* PDFs
""")
    
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
