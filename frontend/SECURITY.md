# Security Advisory - Frontend Dev Dependencies

## Status: Non-Critical

### Issue

The frontend has 10 moderate-severity vulnerabilities in development dependencies, all related to `ajv` package used by ESLint tooling.

### Details

- **Vulnerability**: ajv ReDoS when using `$data` option
- **Severity**: Moderate
- **Scope**: Development dependencies only (ESLint, TypeScript-ESLint)
- **Impact**: Does not affect production builds or runtime

### Why Not Fixed

Running `npm audit fix --force` would:

1. Downgrade ESLint to version 4.1.1 (breaking change)
2. Potentially break existing ESLint configuration
3. Remove TypeScript support from ESLint

### Risk Assessment

- ✅ Not exploitable in production (dev-only dependencies)
- ✅ ReDoS vulnerability requires specific `$data` usage patterns not present in project
- ✅ Does not affect application runtime or user security
- ⚠️ Could affect developer machines if malicious code is linted

### Recommendation

Monitor for non-breaking updates to ESLint and TypeScript-ESLint packages that resolve the ajv dependency issue. The Next.js team typically addresses these in framework updates.

### Action Items

1. Check for Next.js updates periodically: `npm outdated`
2. Upgrade to newer ESLint flat config when available
3. Re-audit after major dependency updates

### Last Checked

February 18, 2026

---

## How to Verify

```bash
cd frontend
npm audit --audit-level=high
```

This will show zero high-severity vulnerabilities, confirming production safety.

---

## Admin login page obfuscation (`NEXT_PUBLIC_ADMIN_LOGIN_SECRET`)

### What it is

When `NEXT_PUBLIC_ADMIN_LOGIN_SECRET` is set, the admin login page at
`/admin/login` renders a fake **404** unless the URL carries a matching
`?key=<secret>`. This keeps the login form from being discovered by casual
crawlers and vulnerability scanners.

### What it is NOT

This is **obfuscation, not access control**. `NEXT_PUBLIC_*` environment
variables are inlined into the client JavaScript bundle at build time, so the
"secret" is trivially recoverable by anyone who inspects the shipped JS. It does
**not** protect the API: `POST /api/v1/admin/login` remains directly reachable
regardless of this key.

### The actual security boundary

Authentication is enforced entirely on the backend:

- Rate limiting on `POST /api/v1/admin/login` (`authLimiter`, 10 / 15 min)
- bcrypt password verification + a constant-time dummy compare to prevent
  user-enumeration timing attacks
- A strong, secret admin password (`ADMIN_PASSWORD`)
- HttpOnly session cookie + CSRF double-submit token on all mutating routes

### If you need real page hiding

Move the gate server-side — e.g. an IP allowlist or a backend-checked header at
the reverse proxy / middleware layer — rather than a client-readable env var.
