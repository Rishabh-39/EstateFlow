# M9 security/dependency follow-up — unresolved audit findings

The v0.8.0 `npm install` log from the user's Mac reported **two high-severity vulnerabilities**. These were not the same as the 57 successful E2E checks; unit and functional tests do not establish dependency security.

Milestone 9 **does not assert remediation** because the actual `npm audit` advisory IDs and affected dependency paths have not been supplied. Obtain the reports without exposing `.env`:

```sh
npm audit
npm audit --omit=dev
npm ls --depth=3
```

If remediation is suggested:
- Record the affected package name/version, advisory URL/ID, direct or transitive path, suggested nonbreaking version, and whether it is production or dev-only.
- Upgrade compatible dependencies with a reversible commit; do not run `npm audit fix --force` blindly.
- Re-run `npm run build`, `npm run test:m9`, `npm run test:m8`, and the PostgreSQL-backed `npm run test:e2e` against `estateflow_test`.
- Keep the `JWT_SECRET` and `DB_PASSWORD` in the backend `.env` only. For production deployment, replace in-memory IP throttling with a shared store, configure proxy trust carefully, use HTTPS, and restrict CORS to actual frontend origins.

Until this is resolved, report security audit as an outstanding deployment risk.
