/*
 * Single source of truth for `colleges.city_normalized`, shared by every
 * cutoff loader and by the CI guard (scripts/check_city_normalization.ts).
 *
 * `city_normalized` is the DISTRICT a college sits in (the value the city
 * filter matches and the dropdown lists), while `colleges.city` stays the
 * display town. The loaders used to write `city.trim().toLowerCase()`, which
 * turns "Warora" into "warora" instead of "chandrapur", so the district values
 * in production were only reachable through a manual data pass. This module
 * makes that mapping reproducible:
 *
 *   1. the town is already a district            -> use it
 *   2. the town is a known sub-locality          -> TOWN_TO_DISTRICT
 *   3. the college name says "Dist. X"/"(Nashik)" -> that district
 *   4. exactly one district/known town is named   -> that district
 *   5. otherwise                                  -> null (caller warns)
 *
 * Returning null on purpose, rather than a best-guess town, means an unknown
 * location fails the CI guard loudly instead of silently splitting the filter.
 *
 * TOWN_TO_DISTRICT was derived from the corrected production data
 * (2026-09-27): every (display town / parsed name tail -> district) pair
 * observed across all 390 colleges, with no conflicting pairs, filtered to
 * genuine place names. Extend it whenever a load warns about a new town.
 */

/**
 * Maharashtra's 36 revenue districts (post the 2014 Thane/Palghar split),
 * lower-cased to match how `city_normalized` is stored, plus one deliberate
 * grouping exception.
 *
 * Do NOT "fix" these two things:
 * 1. Aurangabad and Osmanabad were officially renamed Chhatrapati
 *    Sambhajinagar and Dharashiv in 2023, but the data (city, city_normalized
 *    and the frontend dropdown) still uses the pre-rename names, so those are
 *    canonical HERE. The new names are handled as aliases below.
 * 2. "navi mumbai" is not an official district (it spans parts of Thane and
 *    Raigad). It is its own bucket in the city filter today; folding it into
 *    thane/raigad would be a product decision, not a data fix.
 */
const MAHARASHTRA_DISTRICTS = new Set([
  'ahmednagar', 'akola', 'amravati',
  'aurangabad', // official: Chhatrapati Sambhajinagar
  'beed', 'bhandara', 'buldhana', 'chandrapur', 'dhule', 'gadchiroli',
  'gondia', 'hingoli', 'jalgaon', 'jalna', 'kolhapur', 'latur', 'mumbai',
  'nagpur', 'nanded', 'nandurbar', 'nashik',
  'osmanabad', // official: Dharashiv
  'palghar', 'parbhani', 'pune', 'raigad', 'ratnagiri', 'sangli', 'satara',
  'sindhudurg', 'solapur', 'thane', 'wardha', 'washim', 'yavatmal',
  // Deliberate grouping exception, not an official district — see note above.
  'navi mumbai',
]);

/** Official renames and common spellings -> the canonical value stored here. */
const DISTRICT_ALIASES = {
  'chhatrapati sambhajinagar': 'aurangabad',
  'chhatrapati sambhaji nagar': 'aurangabad',
  sambhajinagar: 'aurangabad',
  dharashiv: 'osmanabad',
  ahilyanagar: 'ahmednagar',
  nasik: 'nashik',
  gondiya: 'gondia',
  bid: 'beed',
};

/** Sub-localities and taluka towns -> district. See the header for provenance. */
const TOWN_TO_DISTRICT = {
  'a.p phulepimpalgaon': 'ahmednagar',
  'adgaon nashik': 'nashik',
  'adpalli': 'gadchiroli',
  'agaskhind': 'nashik',
  'akluj': 'solapur',
  'ambejogai': 'beed',
  'ambernath': 'thane',
  'andheri': 'mumbai',
  'ashti': 'beed',
  'avasari khurd': 'pune',
  'babulgaon': 'nashik',
  'badlapur': 'thane',
  'badnera': 'amravati',
  'bapsai': 'thane',
  'baramati': 'pune',
  'barshi': 'solapur',
  'bhadrawati': 'chandrapur',
  'bhudargad': 'kolhapur',
  'bhusawal': 'jalgaon',
  'boisar': 'palghar',
  'bota sangamner': 'ahmednagar',
  'chakan': 'pune',
  'chas': 'ahmednagar',
  'chhatrapati sambhaji nagar': 'aurangabad',
  'chhatrapati sambhajinagar': 'aurangabad',
  'chincholi': 'nashik',
  'chopda': 'jalgaon',
  'dondaicha': 'dhule',
  'dumbarwadi': 'pune',
  'faizpur': 'jalgaon',
  'gadhinglaj': 'kolhapur',
  'haveli': 'pune',
  'ichalkaranji': 'kolhapur',
  'indapur': 'pune',
  'jaysingpur': 'kolhapur',
  'kankavli': 'sindhudurg',
  'karad': 'satara',
  'karjat': 'raigad',
  'kashti shrigondha': 'ahmednagar',
  'khalapur': 'raigad',
  'kharghar navi mumbai': 'navi mumbai',
  'kille macchindragad': 'sangli',
  'kopargaon': 'ahmednagar',
  'koregaon bhima': 'pune',
  'korti': 'solapur',
  'kuran': 'pune',
  'lakhewadi': 'pune',
  'lonavala': 'pune',
  'lonere': 'raigad',
  'malegaon': 'nashik',
  'malegaon-baramati': 'pune',
  'malwadi-bota': 'ahmednagar',
  'manori': 'nashik',
  'miraj': 'sangli',
  'mouza bamni': 'chandrapur',
  'nadurbar': 'nandurbar',
  'nandgaon': 'nashik',
  'narhe': 'pune',
  'nepti': 'ahmednagar',
  'new panvel': 'navi mumbai',
  'nile': 'nashik',
  'ohar': 'aurangabad',
  'pandharpur': 'solapur',
  'paniv': 'solapur',
  'panvel': 'navi mumbai',
  'paratwada': 'amravati',
  'pathri': 'aurangabad',
  'pauni': 'bhandara',
  'pimpri-chinchwad': 'pune',
  'pisoli': 'pune',
  'pusad': 'yavatmal',
  'ramtek': 'nagpur',
  'ravet': 'pune',
  'sakoli': 'bhandara',
  'sangamner': 'ahmednagar',
  'sangola': 'solapur',
  'sasewadi': 'pune',
  'sevagram': 'wardha',
  'shahapur': 'thane',
  'shegaon': 'buldhana',
  'shevgaon': 'ahmednagar',
  'shirpur': 'dhule',
  'sindhi': 'wardha',
  'someshwar nagar': 'pune',
  'sonai': 'ahmednagar',
  'talegaon': 'pune',
  'tuljapur': 'osmanabad',
  'ulhasnagar': 'thane',
  'vasai': 'palghar',
  'virar': 'palghar',
  'wada': 'palghar',
  'wagholi': 'pune',
  'warananagar': 'kolhapur',
  'warora': 'chandrapur',
  'yadrav': 'kolhapur',
  'yelgaon': 'buldhana',
};

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function canonicalDistrict(key) {
  if (MAHARASHTRA_DISTRICTS.has(key)) return key;
  return DISTRICT_ALIASES[key] || null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Longest names first so "navi mumbai" wins over "mumbai" and
// "chhatrapati sambhajinagar" over "sambhajinagar".
const PLACE_NAMES = [
  ...MAHARASHTRA_DISTRICTS,
  ...Object.keys(DISTRICT_ALIASES),
  ...Object.keys(TOWN_TO_DISTRICT),
].sort((a, b) => b.length - a.length);

const TOWN_NAMES = Object.keys(TOWN_TO_DISTRICT).sort((a, b) => b.length - a.length);

function placeToDistrict(place) {
  return canonicalDistrict(place) || TOWN_TO_DISTRICT[place] || null;
}

/**
 * Districts implied by place names in free text, e.g. a college name. With
 * `townsOnly`, only TOWN_TO_DISTRICT entries count (not district names).
 */
function districtsMentionedIn(text, townsOnly = false) {
  let remaining = ` ${normalizeKey(text).replace(/[^a-z0-9 .-]/g, ' ')} `;
  const found = new Set();
  const places = townsOnly ? TOWN_NAMES : PLACE_NAMES;
  for (const place of places) {
    const re = new RegExp(`(?<=[^a-z])${escapeRegExp(place)}(?=[^a-z])`, 'g');
    if (re.test(remaining)) {
      const district = placeToDistrict(place);
      if (district) found.add(district);
      // Blank the match so a shorter name inside it ("mumbai" inside
      // "navi mumbai") is not counted a second time.
      remaining = remaining.replace(re, ' ');
    }
  }
  return found;
}

function townDistrictsMentionedIn(text) {
  return districtsMentionedIn(text, true);
}

/**
 * Resolve the district for a college. `city` is the parsed display town,
 * `name` the full official college name. Returns null when the location is
 * not confidently known — never a guess.
 */
function resolveDistrict({ city, name } = {}) {
  const town = normalizeKey(city);
  if (town) {
    const direct = placeToDistrict(town);
    if (direct) return direct;
  }

  if (name) {
    // Two signals can come from the name: a known town it mentions, and an
    // explicit "Dist. Latur" / "District Nanded" label. Neither reliably wins
    // on its own, and both failure modes occur in the real data:
    //  - "Wada, Dist. Thane": the label predates the 2014 Thane/Palghar split;
    //    Wada is in Palghar, so the TOWN is right.
    //  - "Swami - Chincholi Tal. Daund Dist. Pune": village names repeat
    //    across districts, and "chincholi" maps to a different Chincholi in
    //    Nashik, so the LABEL is right.
    // So when they disagree the location is genuinely uncertain: return null
    // and let the caller flag it for a human, rather than pick one.
    const townDistricts = townDistrictsMentionedIn(name);
    const townDistrict = townDistricts.size === 1 ? [...townDistricts][0] : null;
    const labelDistrict = districtFromLabel(name);

    if (townDistrict && labelDistrict) {
      return townDistrict === labelDistrict ? townDistrict : null;
    }
    if (townDistrict || labelDistrict) return townDistrict || labelDistrict;

    const mentioned = districtsMentionedIn(name);
    if (mentioned.size === 1) return [...mentioned][0];
  }

  return null;
}

/** The district named by a "Dist. X" / "District X" label, if any. */
function districtFromLabel(name) {
  const match = normalizeKey(name).match(/\bdist(?:rict)?\b[\s.:-]*([a-z][a-z ]*)/);
  if (!match) return null;
  const words = match[1].trim().split(' ');
  for (const len of [3, 2, 1]) {
    const district = placeToDistrict(words.slice(0, len).join(' '));
    if (district) return district;
  }
  return null;
}

/**
 * Loader helper: `city_normalized` for a parsed college row, warning loudly
 * when a college the database does not already hold cannot be placed.
 *
 * Rows already in the database are never re-normalized by the additive and
 * incremental loaders (their upserts keep the stored value), so they are not
 * warned about; pass their codes in `existingCodes`.
 */
function cityNormalizedFor(college, existingCodes, unresolved) {
  const district = resolveDistrict({ city: college.city, name: college.name });
  if (!district && !existingCodes.has(college.college_code)) {
    unresolved.push(college);
  }
  return district;
}

function reportUnresolvedDistricts(unresolved) {
  if (unresolved.length === 0) return;
  console.warn(
    `\nWARN: ${unresolved.length} new college(s) could not be placed in a district; ` +
      'city_normalized was left NULL, so they will not match the city filter and ' +
      'check:city-normalization will fail until they are fixed:',
  );
  for (const c of unresolved) {
    console.warn(`  ${c.college_code}  city=${JSON.stringify(c.city || null)}  ${c.name}`);
  }
  console.warn(
    'Fix: add the town to TOWN_TO_DISTRICT in scripts/lib/cityNormalization.js ' +
      'and reload, or set colleges.city_normalized to the district directly.\n',
  );
}

module.exports = {
  MAHARASHTRA_DISTRICTS,
  DISTRICT_ALIASES,
  TOWN_TO_DISTRICT,
  resolveDistrict,
  cityNormalizedFor,
  reportUnresolvedDistricts,
};
