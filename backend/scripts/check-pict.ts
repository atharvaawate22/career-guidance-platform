import * as dotenv from 'dotenv';
dotenv.config();
import { query } from '../src/config/database';

async function main() {
  const r = await query(
    `SELECT college_name, branch, category, gender, level, stage, percentile
     FROM cutoff_data
     WHERE college_name ILIKE '%Pune Institute of Computer Technology%'
     ORDER BY percentile DESC
     LIMIT 20`,
  );
  if (r.rows.length === 0) {
    console.log('NO rows found for PICT');
  } else {
    r.rows.forEach((row: any) => console.log(JSON.stringify(row)));
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
