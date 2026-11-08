# EstateFlow Milestone 9 — API discovery and browser handoff

Release: `0.9.0` | Stack: NestJS, TypeScript, local PostgreSQL user `rishabh`, locally trained enquiry classifier. This is the complete backend source folder.

## The 404 at `http://localhost:4000/` in Milestone 8

That 404 was expected: the backend had no `GET /` handler, and the guest website is being generated separately by Lovable. Milestone 9 adds a small **JSON** service landing response at `/` (not a fake frontend), a live `/openapi.json` contract and a generated server-side `X-Request-ID` on every response.

| URL | Expected response |
|---|---|
| `http://localhost:4000/` | JSON API identity, version, and useful route links |
| `http://localhost:4000/health` | Liveness response and current version |
| `http://localhost:4000/health/ready` | PostgreSQL readiness check (requires DB) |
| `http://localhost:4000/openapi.json` | OpenAPI 3.0 JSON, all 47 current operations |
| `http://localhost:4000/room-types` | Public room-category data |

OpenAPI is generated directly from the **actual NestJS controller route decorators** using `npm run contract:m9`. Summaries, permissions and input shapes are maintained alongside the generator. `npm run test:m9` independently compares the manifest to controller source to detect route drift. The standalone `docs/openapi-m9.json` can be imported into Postman or an OpenAPI-compatible tool.

### Install and check on your Mac

1. Extract the COMPLETE `EstateFlow_Milestone9_COMPLETE_Backend_Rishabh_Tomar.zip` archive.
2. Open the inner `EstateFlow_Backend` directory, not its parent.
3. Copy your working Milestone 8 `.env` here. Keep `DB_USER=rishabh`; never commit or share the password or JWT secret.
4. In that directory:

```sh
npm install
npm run agent:train
npm run db:migrate
npm run preflight
npm run contract:m9
npm run test:m9
npm run build
npm run test:m8
npm run test:m7
npm run test:m6
npm run db:verify
npm run dev
```

Open the URLs above. From another terminal while `npm run dev` is running:

```sh
npm run smoke:m9   # Read-only; checks root, OpenAPI, trace IDs, readiness and seeded rooms
npm run smoke:m8   # Existing read-only room and availability smoke tests
```

For database-backed regression testing, stop `npm run dev` only if it uses the same port; the E2E runner uses `4100` by default:

```sh
npm run test:e2e
```

**Destructive test warning:** `test:e2e` drops and recreates the `public` schema of the disposable `estateflow_test` database. It must NEVER be used for real business data. The script verifies the DB identity before reset.

### What changed from M8

- New `GET /`: explanatory service root for browser navigation.
- New `GET /openapi.json`: live, versioned OpenAPI contract (47 operations including itself and root).
- `X-Request-ID`: random UUID per API request. Caller-supplied `X-Request-ID` is ignored; do not use raw URL queries, enquiry text or contact details as request IDs.
- Health version now matches release `0.9.0` (older releases advertised a stale `0.6.0`).
- New `scripts/generate-openapi-m9.mjs`, `scripts/verify-contract-m9.mjs`, `scripts/smoke-m9.mjs` and M9 E2E assertions.
- Frontend handoff guidance: `integrations/LOVABLE_M9_CONNECT_PROMPT.md`.

### Known boundaries

- **No guest/staff UI is bundled in the backend.** Opening the API URL does not show the Lovable website. Do not host a mock design over the real API.
- Hosted Lovable cannot reach your Mac's `localhost:4000` directly. Either run the exported Lovable/Vite frontend locally with the backend or deploy NestJS behind a secure HTTPS URL with the correct CORS origin.
- `JWT_SECRET` must remain only in the NestJS `.env`; frontend uses a short-lived `accessToken` returned by `/auth/login`. Do not hardcode staff credentials or JWTs in screenshots or source.
- Only staff can evaluate or approve an event. The local AI model is a classification/extraction/draft assistant, **not a custom-trained generative LLM**, and cannot make reservations or send external messages autonomously.
- Payments and outbound email/WhatsApp remain simulated. The platform does not integrate an OTA channel manager.
- A two-high-severity `npm audit` warning was previously observed on your Mac. No advisory IDs or affected package paths were provided; this milestone does **not** claim that it fixed those vulnerabilities. Run `npm audit` and `npm audit --omit=dev` to determine affected dependency paths. Avoid `npm audit fix --force` without reviewing major upgrades and re-running all tests.
- Current in-memory rate limiting is single-process. Production multi-instance deployments need a shared store and proxy/IP trust configuration.
- OpenAPI includes useful concrete schemas for important flows. For endpoints with dynamic DB-backed JSON responses it deliberately uses a permissive object schema rather than inventing a rigid unsupported contract.

### Evidence checklist

Capture these for the TDD after they run on your Mac: terminal output from `npm run build`, `npm run test:m9`, `npm run smoke:m9`, `npm run test:e2e`, and a screenshot of `http://localhost:4000/openapi.json` (no secrets). These demonstrate API reachability, manifest sync, and existing booking/feasibility regression safety; they do not prove real-payment or production security readiness.
