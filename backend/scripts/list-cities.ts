import * as dotenv from 'dotenv';
dotenv.config();
import { query } from '../src/config/database';

const EXCLUDE_KEYWORDS =
  /college|inst(itute)?|tech(nolog|nical)|engg|engineer|univer|campus|school|manage|society|group|research|centre|center|iceem|vjti|coep|somaiya|gramin/i;
const EXCLUDE_TAL_DIST = /\btal\b|\btal\.|\bdist\b|\bdist\.|\bdistrict\b/i;

async function main() {
  const result = await query(
    `SELECT DISTINCT
       INITCAP(TRIM(TRAILING '.' FROM TRIM(REGEXP_REPLACE(college_name, '^.*,\\s*', '')))) AS city
     FROM cutoff_data
     WHERE college_name LIKE '%,%'
     ORDER BY city`,
  );
  const cleaned = result.rows
    .map((r: { city: string }) => r.city)
    .filter((c: string) => {
      if (!c || c.length < 3 || c.length > 25) return false;
      if (/\d/.test(c)) return false;
      if (EXCLUDE_KEYWORDS.test(c)) return false;
      if (EXCLUDE_TAL_DIST.test(c)) return false;
      if (/[()]/.test(c)) return false;
      if (/-/.test(c)) return false;
      if (c.split(/\s+/).length > 3) return false;
      return true;
    })
    .sort((a: string, b: string) => a.localeCompare(b));

  console.log(`Total: ${cleaned.length} cities`);
  cleaned.forEach((c: string) => console.log(c));
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
