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
