const fs = require("fs");
const path = require("path");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function parseCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function toTitleCase(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferCity(collegeName) {
  if (!collegeName || !collegeName.includes(",")) return "";
  const parts = collegeName.split(",");
  return (parts[parts.length - 1] || "").trim();
}

function isValidCity(city) {
  if (!city) return false;
  const lc = city.toLowerCase();
  if (city.length < 3 || city.length > 32) return false;
  if (/\d/.test(city)) return false;
  if (/[()\-]/.test(city)) return false;
  if (city.trim().split(/\s+/).length > 4) return false;
  if (/^(a\.?\s*p\.?|at\/?post|at post|post|near)\b/.test(lc)) return false;
  if (/\btal\b|\btal\.\b|\bdist\b|\bdist\.\b|\bdistrict\b/.test(lc))
    return false;
  if (
    /college|inst(itute)?|tech(nolog|nical)|engg|engineer|univer|campus|school|manage|society|group|research|centre|center/.test(
      lc
    )
  ) {
    return false;
  }
  return true;
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name);
}

function sortByRelation(a, b) {
  return (
    a.collegeName.localeCompare(b.collegeName) ||
    a.branch.localeCompare(b.branch) ||
    a.city.localeCompare(b.city)
  );
}

function generate() {
  const root = path.resolve(__dirname, "..");
  const cutoffsCsvPath = path.join(root, "cutoffs_2025_cap1_final_verified.csv");
  const aliasesCsvPath = path.join(root, "city_aliases_2025.csv");
  const outPath = path.join(
    root,
    "frontend",
    "src",
    "lib",
    "cutoffStaticMeta.ts"
  );

  const cutoffRows = parseCsv(fs.readFileSync(cutoffsCsvPath, "utf8"));
  const aliasRows = parseCsv(fs.readFileSync(aliasesCsvPath, "utf8"));

  const aliasByCode = new Map();
  for (const row of aliasRows) {
    const code = (row.college_code || "").trim();
    const city = (row.city_normalized || "").trim();
    if (code && city && !aliasByCode.has(code)) {
      aliasByCode.set(code, city);
    }
  }

  const collegeByKey = new Map();
  const branchSet = new Set();
  const citySet = new Set();
  const relationSet = new Set();
  const relations = [];

  for (const row of cutoffRows) {
    const code = (row.college_code || "").trim();
    const name = (row.college_name || "").trim();
    const key = code || name;

    if (name && !collegeByKey.has(key)) {
      collegeByKey.set(key, {
        code: code || null,
        name,
      });
    }

    const branch = (row.branch_name || "").trim();
    if (branch) branchSet.add(branch);

    const aliasCity = code ? aliasByCode.get(code) : "";
    const inferred = inferCity(name);
    const city = (aliasCity || inferred || "").trim();
    if (isValidCity(city)) {
      citySet.add(toTitleCase(city));
    }

    const normalizedCity = isValidCity(city) ? toTitleCase(city) : "";
    if (name && branch && normalizedCity) {
      const relationKey = `${code || name}||${branch}||${normalizedCity}`;
      if (!relationSet.has(relationKey)) {
        relationSet.add(relationKey);
        relations.push({
          collegeCode: code || null,
          collegeName: name,
          branch,
          city: normalizedCity,
        });
      }
    }
  }

  const colleges = Array.from(collegeByKey.values()).sort(sortByName);
  const branches = Array.from(branchSet).sort((a, b) => a.localeCompare(b));
  const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b));
  relations.sort(sortByRelation);

  const output = `export interface StaticCollegeOption {\n  code: string | null;\n  name: string;\n}\n\nexport interface StaticCutoffRelation {\n  collegeCode: string | null;\n  collegeName: string;\n  branch: string;\n  city: string;\n}\n\n// Generated from cutoffs_2025_cap1_final_verified.csv and city_aliases_2025.csv\nexport const STATIC_CUTOFF_COLLEGES: StaticCollegeOption[] = ${JSON.stringify(colleges, null, 2)};\n\n// Generated from cutoffs_2025_cap1_final_verified.csv\nexport const STATIC_CUTOFF_BRANCHES: string[] = ${JSON.stringify(branches, null, 2)};\n\n// Generated from cutoffs_2025_cap1_final_verified.csv and city_aliases_2025.csv\nexport const STATIC_CUTOFF_CITIES: string[] = ${JSON.stringify(cities, null, 2)};\n\n// Generated from cutoffs_2025_cap1_final_verified.csv and city_aliases_2025.csv (distinct college-branch-city tuples)\nexport const STATIC_CUTOFF_RELATIONS: StaticCutoffRelation[] = ${JSON.stringify(relations, null, 2)};\n`;

  fs.writeFileSync(outPath, output, "utf8");
  console.log(
    `Generated ${path.relative(root, outPath)}: colleges=${colleges.length}, branches=${branches.length}, cities=${cities.length}, relations=${relations.length}`
  );
}

generate();
