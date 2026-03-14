export const BASE_CITY_ALIAS_BY_COLLEGE_CODE: Record<string, string> = {
  '3209': 'Mumbai',
  '6006': 'Pune',
  '6307': 'Pune',
  '6311': 'Pune',
  '6822': 'Pune',
  '01119': 'Akola',
  '01276': 'Akola',
  '02189': 'Latur',
  '02508': 'Nanded',
  '02516': 'Chhatrapati Sambhajinagar',
  '02637': 'Nanded',
  '02641': 'Jalgaon',
  '02666': 'Nanded',
  '02758': 'Aurangabad',
  '02771': 'Beed',
  '02772': 'Chhatrapati Sambhajinagar',
  '02777': 'Aurangabad',
  '02779': 'Beed',
  '03025': 'Mumbai',
  '03202': 'Deorukh',
  '03217': 'Thane',
  '03219': 'Shahapur',
  '03220': 'Karjat',
  '03223': 'Raigad',
  '03277': 'Boisar',
  '03436': 'Ambernath',
  '03445': 'Kokamthan',
  '03465': 'Thane',
  '03467': 'Raigad',
  '03470': 'Sawantwadi',
  '03503': 'Kalyan',
  '03546': 'Palghar',
  '03723': 'Nashik',
  '03724': 'Nashik',
  '03726': 'Nashik',
  '04163': 'Chandrapur',
  '04304': 'Nagpur',
  '04648': 'Wardha',
  '05125': 'Nashik',
  '05164': 'Nandurbar',
  '05169': 'Dhule',
  '05184': 'Sinnar',
  '05239': 'Jalgaon',
  '05303': 'Shrigonda',
  '05380': 'Ahmednagar',
  '05395': 'Nashik',
  '05409': 'Ahmednagar',
  '05597': 'Ahmednagar',
  '06149': 'Pune',
  '06185': 'Pune',
  '06217': 'Kolhapur',
  '06271': 'Pune',
  '06274': 'Pune',
  '06284': 'Pune',
  '06307': 'Pune',
  '06313': 'Sangli',
  '06315': 'Kolhapur',
  '06319': 'Indapur',
  '06324': 'Pune',
  '06326': 'Solapur',
  '06622': 'Pune',
  '06628': 'Pune',
  '06632': 'Pune',
  '06635': 'Pune',
  '06643': 'Solapur',
  '06714': 'Kolhapur',
  '06715': 'Pune',
  '06766': 'Satara',
  '06811': 'Kolhapur',
  '06938': 'Solapur',
  '16006': 'Pune',
  '16354': 'Pune',
  '16355': 'Pune',
  '16357': 'Pune',
};

const expandedEntries = Object.entries(BASE_CITY_ALIAS_BY_COLLEGE_CODE).flatMap(
  ([code, city]) => {
    const withoutLeadingZeros = code.replace(/^0+/, '');
    if (withoutLeadingZeros && withoutLeadingZeros !== code) {
      return [
        [code, city],
        [withoutLeadingZeros, city],
      ] as const;
    }
    return [[code, city]] as const;
  },
);

export const CITY_ALIAS_BY_COLLEGE_CODE: Record<string, string> =
  Object.fromEntries(expandedEntries);

const CITY_ALIAS_CASE_SQL = Object.entries(CITY_ALIAS_BY_COLLEGE_CODE)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, city]) => `WHEN college_code = '${code}' THEN '${city}'`)
  .join('\n        ');

export const CITY_ALIAS_BY_LOCALITY: Record<string, string> = {
  // Aurangabad → canonical new name
  aurangabad: 'Chhatrapati Sambhajinagar',
  // Pune localities
  bibwewadi: 'Pune',
  'narhe (ambegaon)': 'Pune',
  narhe: 'Pune',
  pimpri: 'Pune',
  'pimpri chinchwad college of engineering': 'Pune',
  pisoli: 'Pune',
  'vadgaon (bk)': 'Pune',
  'vadgaon,pune': 'Pune',
  karvenagar: 'Pune',
  'karvenagar,pune': 'Pune',
  alandi: 'Pune',
  lohegaon: 'Pune',
  lohgaon: 'Pune',
  wagholi: 'Pune',
  ravet: 'Pune',
  'avasari khurd': 'Pune',
  haveli: 'Pune',       // Haveli taluka → Pune
  sasewadi: 'Pune',     // near Pune (Haveli)
  kuran: 'Pune',        // Khed taluka, Pune
  bhima: 'Pune',        // Koregaon Bhima, near Pune
  'someshwar nagar': 'Pune',  // near Indapur/Baramati, Pune
  'baner-balewadi': 'Pune',
  dhankavdi: 'Pune',
  'katraj, dhankawadi': 'Pune',
  lavale: 'Pune',
  lonikand: 'Pune',
  'kondhwa (bk.)': 'Pune',
  talegaon: 'Pune',     // Talegaon Dabhade, Maval taluka, Pune
  yewalewadi: 'Pune',
  // Navi Mumbai localities
  airoli: 'Navi Mumbai',
  kamothe: 'Navi Mumbai',
  nerul: 'Navi Mumbai',
  kharghar: 'Navi Mumbai',
  'kharghar navi mumbai': 'Navi Mumbai',
  'new panvel': 'Navi Mumbai',
  'kopar khairane': 'Navi Mumbai',
  // Mumbai localities
  matunga: 'Mumbai',
  andheri: 'Mumbai',
  bandra: 'Mumbai',
  'bandra,mumbai': 'Mumbai',
  byculla: 'Mumbai',
  chembur: 'Mumbai',
  'malad(west)': 'Mumbai',
  'malad(west),mumbai': 'Mumbai',
  'vile parle': 'Mumbai',
  'vile parle,mumbai': 'Mumbai',
  'mira road': 'Mumbai',
  sion: 'Mumbai',
  borivali: 'Mumbai',
  wadala: 'Mumbai',
  mahim: 'Mumbai',
  // Nashik localities
  adgaon: 'Nashik',
  'adgaon nashik': 'Nashik',
  ohar: 'Nashik',
  dumbarwadi: 'Nashik',  // near Deolali/Nashik
  kokamthan: 'Nashik',   // Sinnar area, Nashik
  trimbakeshwar: 'Nashik',
  eklahare: 'Nashik',
  '(nashik)': 'Nashik',
  'nashik.': 'Nashik',
  shirgaon: 'Palghar',   // near Vasai-Virar, Palghar
  // Nagpur localities
  wanadongri: 'Nagpur',
  kalmeshwar: 'Nagpur',
  dongargaon: 'Nagpur',  // near Gondia/Nagpur
  // Nandurbar
  nadurbar: 'Nandurbar',
  // Thane
  'thane (e)': 'Thane',
  'kopri, thane (e)': 'Thane',
  // Solapur
  'solapur(north)': 'Solapur',
  'kegaon, solapur': 'Solapur',
  // Sangli
  ashta: 'Sangli',
  // Amravati
  badnera: 'Amravati',   // Badnera is a suburb of Amravati city
  // Chandrapur
  'mouza bamni': 'Chandrapur',  // Ballarpur Institute, Chandrapur dist
  // Kolhapur
  jaysingpur: 'Kolhapur',  // city in Kolhapur dist
  // Ichalkaranji
  'yadrav(ichalkaranji)': 'Ichalkaranji',
  'ichalkaranji.': 'Ichalkaranji',
};

const CITY_RAW_SQL = `
  LOWER(
    COALESCE(
      CASE
        ${CITY_ALIAS_CASE_SQL}
        ELSE NULL
      END,
      NULLIF(
        INITCAP(
          TRIM(
            TRAILING '.' FROM TRIM(
              CASE
                WHEN college_name LIKE '%,%' THEN REGEXP_REPLACE(college_name, '^.*,\\s*', '')
                ELSE ''
              END
            )
          )
        ),
        ''
      )
    )
  )
`;

const CITY_LOCALITY_ALIAS_CASE_SQL = Object.entries(CITY_ALIAS_BY_LOCALITY)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([locality, city]) =>
      `WHEN ${CITY_RAW_SQL} = '${locality}' THEN '${city.toLowerCase()}'`,
  )
  .join('\n      ');

export const CITY_NORMALIZED_SQL = `
  CASE
      ${CITY_LOCALITY_ALIAS_CASE_SQL}
      ELSE ${CITY_RAW_SQL}
    END
`;
