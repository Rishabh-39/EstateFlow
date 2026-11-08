# EstateFlow v0.13.3 — Local Ollama integration (not an AWS deployment)

This release is based on the complete **v0.13.2 EstateFlow source**, not a replacement UI. All original Lovable guest/staff/GM visual layouts and staffing-plan endpoints are retained. Only the live API's behind-the-scenes extraction and optional reply generation were changed, plus a small existing-panel note for uncertain values.

## What is implemented

- `AI_PROVIDER=ollama` opts into Ollama's local `/api/chat` endpoint. No Hugging Face billing or API token is needed.
- `qwen3:4b`, `think:false`, `stream:false`, and an extraction JSON schema.
- Backend verification of numeric types, literal source evidence, ambiguous dates, approximate quantities and missing fields. Missing dinner-cover counts remain unknown, even with the phrase "dinner for everyone".
- Naive Bayes continues to own routing and mandatory complaint escalation. Ollama does **not** classify operational permissions or book resources.
- Human edits to extraction persist when reprocessing. Existing staff-edited drafts are never overwritten. Newly generated drafts remain **drafts**, not sent messages.
- Guest concierge offers optional local Qwen advice; if the model is unavailable or the output is unsafe, the existing guided response is used.
- Original UI stays intact; an extra line in the existing Staff Inbox indicates approximate values needing confirmation.
- No schema migration required; metadata is embedded in the existing `enquiries.extracted` JSON field. No live DB was available during packaging.

## Important: use your own real `.env`, not the sample

Copy the `.env` from your working local backend. Do not publish it. Add:

```dotenv
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_TIMEOUT_MS=45000
```

Never set a public Ollama URL. Local Ollama normally has **no API authentication**, so keep it bound to loopback. The backend rejects nonlocal Ollama URLs. Do not use `host.docker.internal` unless a Dockerized backend genuinely needs it and Ollama is securely restricted.

In Terminal 1, keep the macOS Ollama application running:

```bash
ollama list            # qwen3:4b should be present
curl http://127.0.0.1:11434/api/tags
```

In Terminal 2, from `EstateFlow_FullStack/backend`:

```bash
npm install            # only if dependencies are not already installed
npm run test:m16       # offline mocked unit/regression test
npm run test:m15       # earlier AI + staff/GM checks
npm run test:m13       # source-level frontend/API tests
npm run test:design    # original staff/GM UI preservation checks
npm run test:m9        # OpenAPI and version consistency
npm run build          # actual TypeScript build on your Mac
npm run smoke:ollama   # REAL request to local model, no database needed
npm run preflight
npm run dev
```

Keep the frontend running as before (`npm run dev -- --host 127.0.0.1 --port 5173` from the `frontend` folder with Node >= 22.12).

### Browser acceptance test

1. On `/events` open the original Estate Concierge and submit: **We need roughly three dozen rooms for around two hundred wedding guests next December; dinner for everyone.** Use a synthetic test name.
2. Confirm the enquiry is stored and visible in the original Staff Inbox, with a category prediction, **36 rooms**, **200 guests**, **approximate** warning and **missing exact dates / dining covers**.
3. Choose **Regenerate AI draft** to update an existing *unedited* draft; verify its wording is tailored. A human-edited draft is not overwritten.
4. Check staff correction: change the room count, refresh, and confirm the correction survives and the original AI extraction does not silently override it.
5. Check the original **Staff Allocation** and **GM Dashboard** design is unchanged, and that staff must explicitly save/submit staffing plans.
6. Check approved event reservations still require authenticated human approval and real PostgreSQL capacity checks; the AI cannot allocate rooms or staff shifts.

### Troubleshooting

- `OLLAMA SMOKE FAILED ...` + fallback source `regex-fallback`: ensure the macOS Ollama app is open, `ollama list` contains `qwen3:4b`, and `OLLAMA_URL` is correct. A small model may fail to quote precise evidence; use a stronger locally supported model or refine prompts, **not** undocumented guesses.
- Slow requests: Qwen 4B can take tens of seconds on a small laptop. `OLLAMA_TIMEOUT_MS` defaults to 45000 and is capped at 120000. Consider 60000 if your Mac is slow. Expect the public concierge to wait for both guidance and staff draft processing; no background queue exists in this version.
- No AI calls: ensure `AI_PROVIDER=ollama` and restart NestJS after modifying `.env`.
- `npm run build` requires backend node dependencies installed. This archive was checked offline and **was not** built against a live installed NestJS environment here.
- No public app deployment is included. For later Docker/AWS work, model serving needs a dedicated deployment strategy (the model on your Mac won't be reachable from EC2).
- The LLM does not "train" on your enquiry text. It performs inference from downloaded model weights. Your local Naive Bayes classifier remains trained independently.

## Data handling and limits

Ollama runs on your Mac; enquiries are sent only to the configured loopback model server, not Hugging Face or Gemini. Do not publish demo passwords or the `.env` file. An LLM can still make mistakes: validated JSON and exact quoted evidence do not prove quantities are correct. Staff must confirm approximate and ambiguous fields. Do not mistake a draft, simulated WhatsApp/email or mock payment for real delivery or collection.
