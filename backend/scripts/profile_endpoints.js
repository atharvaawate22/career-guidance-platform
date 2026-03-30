const BASE_URL = process.env.PROFILE_BASE_URL || 'http://localhost:5000';
const RUNS = Number(process.env.PROFILE_RUNS || '12');
const WARMUP_RUNS = Number(process.env.PROFILE_WARMUP_RUNS || '2');

const endpoints = [
  {
    name: 'GET /api/cutoffs (filtered)',
    method: 'GET',
    path: '/api/cutoffs?category=OPEN&gender=FEMALE&branch=Computer&city=Pune&stage=I',
  },
  {
    name: 'POST /api/predict',
    method: 'POST',
    path: '/api/predict',
    body: {
      percentile: 92.5,
      category: 'OPEN',
      gender: 'FEMALE',
      preferred_branches: ['Computer', 'Information Technology'],
      cities: ['Pune', 'Mumbai'],
      include_tfws: true,
    },
  },
  {
    name: 'GET /api/cutoffs/meta',
    method: 'GET',
    path: '/api/cutoffs/meta?branch=Computer&city=Pune',
  },
];

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function stats(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
  };
}

async function warmup() {
  await fetch(`${BASE_URL}/api/health`);
}

async function runEndpoint(endpoint) {
  const durations = [];
  let status = null;

  for (let i = 0; i < WARMUP_RUNS; i++) {
    const res = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `${endpoint.name} warmup failed on run ${i + 1} with status ${res.status}: ${text.slice(0, 300)}`,
      );
    }
  }

  for (let i = 0; i < RUNS; i++) {
    const start = process.hrtime.bigint();
    const res = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    });
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    durations.push(elapsedMs);
    status = res.status;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `${endpoint.name} failed on run ${i + 1} with status ${res.status}: ${text.slice(0, 300)}`,
      );
    }
  }

  return { endpoint, status, durations, stats: stats(durations) };
}

async function main() {
  console.log(`Profiling base URL: ${BASE_URL}`);
  console.log(`Warmup runs per endpoint: ${WARMUP_RUNS}`);
  console.log(`Runs per endpoint: ${RUNS}`);

  await warmup();

  const results = [];
  for (const endpoint of endpoints) {
    const result = await runEndpoint(endpoint);
    results.push(result);
  }

  results.sort((a, b) => b.stats.p95 - a.stats.p95);

  console.log('\n=== Latency Summary (sorted by p95 desc) ===');
  for (const r of results) {
    console.log(`\n${r.endpoint.name}`);
    console.log(`  status: ${r.status}`);
    console.log(`  avg: ${r.stats.avg.toFixed(2)} ms`);
    console.log(`  p50: ${r.stats.p50.toFixed(2)} ms`);
    console.log(`  p95: ${r.stats.p95.toFixed(2)} ms`);
    console.log(
      `  min/max: ${r.stats.min.toFixed(2)} / ${r.stats.max.toFixed(2)} ms`,
    );
  }
}

main().catch((err) => {
  console.error('Profiling failed:', err.message);
  process.exit(1);
});
