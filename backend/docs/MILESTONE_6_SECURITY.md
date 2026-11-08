# EstateFlow — Milestone 6: Security and API Handoff

**Owner:** Rishabh Tomar | **Backend:** NestJS 11 + local PostgreSQL (DB_USER=rishabh) | **Version:** 0.6.0

The Milestone 5 user-supplied Mac logs showed `npm run build`, the tests for M4/M5, 17 agent policy checks, and all five DB invariants passing, followed by **48 visible E2E assertions passing**. The pasted log ends after the last E2E assertion without displaying the final runner exit line. Milestone 6 adds the controls below; the E2E additions must still be run on your Mac.

## Milestone 6 changes

1. **JWT role revocation.** `AuthGuard` now verifies the HS256 signature, token expiry, UUID subject, and current account data against PostgreSQL. A token is rejected (401) if its user record is gone or if email/role has changed. Re-login gets updated privileges. This intentionally adds a lightweight database read on every protected request. Password-reset/individual-token revocation are not yet implemented.
2. **Local request throttling.** For a single NestJS process, an in-memory fixed-window limiter protects `POST /auth/login` (12 requests/15 minutes), `POST /auth/register` (8/hour), and `POST /enquiries` (24/hour) per TCP remote address. Returns HTTP 429 with `Retry-After` and never echoes credentials. It does not trust user-supplied `X-Forwarded-For` headers. Keys are bounded to 10,000; fail closed if exhausted.
3. **HTTP response hardening.** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`; confidential path families also receive `Cache-Control: no-store`. Express's `X-Powered-By` header is disabled.
4. **Verification.** Added `npm run test:m6` for 20 dependency-free contract assertions and extended the destructive `estateflow_test` E2E suite with HTTP header, changed-role, and throttle checks.

**Important limits:** In-memory IP throttling is an MVP single-process defense, not a production distributed/bot-defense solution. Behind a reverse proxy, the TCP address may identify the proxy rather than the actual client. Do **not** enable `trust proxy` for untrusted traffic just to use forwarded IPs. For deployment use a trusted proxy configuration with shared Redis or PostgreSQL counters, HTTPS, WAF/bot protection, managed secrets, authentication/refresh-token lifecycle, audit/retention review, and a dedicated infrastructure review. No new schema migration is needed.

## Upgrade from v0.5.0

This is a **complete backend ZIP**, not a partial patch. Extract its `EstateFlow_Backend` folder and open that folder in your terminal. Back up the old v0.5.0 folder and copy **only your existing `.env`** into the new folder. Never upload or commit `.env`. The database schema is unchanged.

```bash
node -p "require('./package.json').version"  # 0.6.0
npm install
npm run agent:train
npm run db:migrate
npm run preflight
npm run build
npm run test:m6
npm run test:m5
npm run test:m4
npm run test:unit
npm run test:agent
npm run db:verify
```

**E2E: destroys `public` schema in database `estateflow_test` only.** Verify this DB is disposable; never put private or production data there.

```bash
npm run test:e2e
```

The E2E suite now has **54 assertions** if no earlier count changes: 48 Milestone 5 assertions plus six Milestone 6 checks. It also performs invalid authentication attempts for throttle verification. If an earlier E2E run failed because a port is still occupied, stop the old server on port 4100 before retrying. For day-to-day operation use `npm run dev` and visit `http://localhost:4000/health/ready`.

## Frontend readiness

The Lovable frontend should:

- Call `POST /auth/login`, store the returned bearer access token in memory (not localStorage), and send `Authorization: Bearer <token>` to staff/private routes.
- Redirect to sign-in on HTTP 401, show a permissions state on HTTP 403, and show a retry countdown on HTTP 429 using `Retry-After` (don't auto-retry aggressively).
- Never receive `JWT_SECRET`, database credentials, passwords, or the local AI model binary.
- Set the frontend origin in local `.env`, e.g. `CORS_ORIGIN=http://localhost:5173`; the API currently uses bearer tokens and `credentials:false`, not cross-origin cookies.
- Use `integrations/estateflow-api.ts` as a starting point; M6 does not modify the booking/event API payload shapes.

No website has been deployed and no live payment or messaging integration exists. Staff send actions remain simulated; the agent is a local Naive Bayes classifier and rules-based draft assistant, not a generative language model.

## Dependency audit

The user reported **two high-severity `npm audit` findings** in the M5 install, but the package paths were not included. No dependencies were changed in M6. To triage safely:

```bash
npm audit --omit=dev
npm audit
npm audit fix --dry-run
```

Review direct vs. transitive packages and breaking changes before applying updates. Avoid `npm audit fix --force` blindly. Do not publish publicly until security fixes and a real deployment review are complete.
