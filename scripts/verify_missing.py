"""Deep-check: search for college codes as 5-digit START of lines or as standalone tokens."""
import pdfplumber
from pathlib import Path
import re

PDF_DIR = Path("cutoff_pdfs")

codes_to_check = ["03209", "04141", "05256", "16361", "05239"]

for cap in [1, 2, 3, 4]:
    pdf_path = PDF_DIR / f"2025_Cap{cap}.pdf"
    print(f"\n{'='*80}")
    print(f"  CAP{cap}: Deep search in {pdf_path.name}")
    print(f"{'='*80}")

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text:
                continue
            for code in codes_to_check:
                # Search for the code as a standalone 5-digit college code at start of line
                # or preceded by whitespace (typical PDF format: "03209 College Name...")
                pattern = rf'(^|\s){code}\s'
                matches = re.findall(pattern, text, re.MULTILINE)
                if matches:
                    # Find the actual lines
                    lines = [l.strip() for l in text.split("\n") if re.search(pattern, l)]
                    for line in lines:
                        print(f"  Page {page_num+1}, Code {code}: {line[:150]}")

                # Also check for the code in table data (pdfplumber tables)
            tables = page.extract_tables()
            if tables:
                for t_idx, table in enumerate(tables):
                    for r_idx, row in enumerate(table):
                        if row:
                            row_text = " ".join(str(c) for c in row if c)
                            for code in codes_to_check:
                                if re.search(rf'(^|\s){code}(\s|$)', row_text):
                                    print(f"  Page {page_num+1}, Table {t_idx}, Row {r_idx}, Code {code}: {row_text[:150]}")
