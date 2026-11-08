# EstateFlow Backend — Milestone 7: locally trained agent evaluation and reviewed learning

**Owner:** Rishabh Tomar  
**Version:** `0.7.0`  
**Stack:** NestJS / TypeScript / local PostgreSQL (role `rishabh`) / TypeScript Naive Bayes  
**Lovable UI:** not required to complete this milestone.

## What is actually built

- The current **project-specific local model** is `local-nb-v3`, trained on **210 synthetic, labelled resort enquiries** (160 prior examples + 50 new examples). It does not call Gemini or an external LLM.
- The agent continues to classify ROOM_BOOKING, WEDDING, CORPORATE_OFFSITE, COMPLAINT, and UNKNOWN, extract fields using validated rules, use approved read-only tool results, and draft messages for staff review. It cannot book, charge, modify rates or send automatically.
- `data/agent-holdout-v1.jsonl` provides **50 synthetic diagnostic cases**, separately authored from the training files. It was examined during Milestone 7 and **used to guide the update**, so do NOT present its post-update score as an untouched blind evaluation.
- `data/agent-final-check-v1.jsonl` provides **30 distinct synthetic cases** not used in training. These were fixed before the final v3 model was scored. Like the diagnostic set, they are synthetic and do not measure production accuracy.
- `npm run agent:holdout` and `npm run agent:final-check` compute a confusion matrix, precision/recall/F1 per label, accuracy, manual-review rate, proportion automatically routed, precision among auto-routes, erroneous confident routes, UNKNOWN misroutes, missed complaints, and extraction assertions where specified. JSON reports are saved locally under Git-ignored `reports/`.
- `npm run agent:import-reviewed -- /path/to/input.jsonl` only imports explicit, human-reviewed, consent-confirmed, de-identified examples into Git-ignored `data/local/reviewed-training.jsonl`. It does **not** retrain automatically. The importer checks duplicate/reused evaluation phrases and catches common phone/email/document identifiers, but this is **not a complete PII detector**; use only records that were manually anonymized with appropriate legal permission.

## Scores obtained in the source-package environment

| Measure | Before specialization (160 examples) | After specialization (210 examples) |
|---|---:|---:|
| Diagnostic 50-case synthetic accuracy | 78.0% | **90.0%** |
| Diagnostic macro-F1 | 78.5% | **90.2%** |
| Diagnostic auto-route coverage | 62.0% | **70.0%** |
| Diagnostic incorrect auto-routes | 2 | **0** |
| Diagnostic missed complaints | 1 | **0** |
| Diagnostic extraction fields checked | 14/14 | **14/14** |

Separate fixed **30-case synthetic final check (post-update):**
- Accuracy: **90.0%** (27/30)
- Macro-F1: **90.2%**
- Automatically routed: **70.0%** (21/30)
- Correct among automatically routed: **21/21**
- Missed complaint escalations: **0/6**
- Unknown incorrectly auto-routed: **0/6**
- Three in-scope requests went to manual review rather than being misclassified.

**Important:** Small synthetic sets can be optimistic and the v1 diagnostic was consulted when improving the model. Do not extrapolate scores to real hotel enquiries. The raw posterior confidence is **not calibrated**, and UNKNOWN/manual review is a deliberate safety choice. The separate earlier five-fold synthetic-corpus CV also remains available (`npm run agent:cv`, approximately 81% on the 210-example expanded dataset) and is not an independent real-world test.

## Commands — Mac / zsh

From the extracted **complete** `EstateFlow_Backend` folder:

```bash
npm install
cp .env.example .env    # only on first setup; otherwise keep your existing working .env
npm run db:migrate
npm run agent:train
npm run preflight
npm run build
npm run test:m7
npm run agent:holdout
npm run agent:final-check
npm run test:unit
npm run test:agent
npm run test:m6
npm run db:verify
```

**E2E database warning:** `npm run test:e2e` resets `estateflow_test` and its `public` schema. Do not run against real data or your main `estateflow` database. No new SQL migrations are introduced in v0.7.0. No frontend is required.

### Format for locally reviewed training examples

Create a file **outside the repository**, e.g. `~/Desktop/reviewed-resort-examples.jsonl`. Each line must be one JSON object:

```json
{"text":"We need a venue and lawn for a family wedding celebration.","label":"WEDDING","humanReviewed":true,"consentConfirmed":true}
{"text":"Can you offer a corporate offsite with a strategy workshop?","label":"CORPORATE_OFFSITE","humanReviewed":true,"consentConfirmed":true}
```

The two booleans are human attestations; entering `true` does not create consent or satisfy legal requirements by itself. Ensure each text has already been anonymized, lawfully usable, accurately labelled by a staff reviewer and free of personal identifiers, before import. Never place email addresses, phone numbers, Aadhaar, passport numbers, booking IDs or customer names in training files. Avoid using any real enquiries while prototyping unless permission and retention controls are settled.

```bash
npm run agent:import-reviewed -- ~/Desktop/reviewed-resort-examples.jsonl
npm run agent:train
npm run agent:holdout
npm run agent:final-check
```

When new training examples are introduced, treat previous evaluation results as historical and collect a **new** untouched hold-out set before making quality claims. Restart the NestJS server after retraining, as the model is loaded during startup. Do not copy `data/local` to GitHub, frontend code or deployment artifacts.

## Fail-safe policies

1. All externally submitted messages are untrusted. The model has no operational write tools.
2. Complaints with explicit complaint or harm language are forced into GM escalation; an expanded deterministic rule now captures **rudely** and **hostile**.
3. Uncertain or low-coverage classification goes to `UNKNOWN`/staff review; model scores are not calibrated confidence probabilities.
4. Missing exact dates or quantities must not be invented. Staff corrections survive reruns.
5. Any quote or resource feasibility must come from deterministic services; AI draft text is explicitly non-binding.
6. The reviewed import script runs locally; it does not pull from the enquiry database or automatically train.
7. Existing JWT, rate limiting, and capacity checks are unchanged from verified Milestone 6.

## Real limitations / remaining engineering work

- The agent is **not a newly trained LLM**; it is a locally trained statistical classifier and deterministic extractor/drafter.
- It lacks dependable multilingual coverage beyond the supported Latin-token vocabulary, robust date expressions, explicit semantic resolution of mixed-intent enquiries, calibrated confidence, and realistic production-labelled evaluation data.
- The import path rejects obvious IDs but is not a guarantee of anonymity; human review and consent/retention controls are essential.
- Model files are JSON, loaded at application startup. The local model must be retrained and the server restarted to use new examples.
- The two previously reported **high-severity npm audit findings** have not been resolved by this milestone. Run `npm audit` to see the affected packages; fix safely without blind force upgrades.
- This environment ran isolated agent/contract tests, but **did not execute the complete NestJS build against installed project dependencies or PostgreSQL E2E** for Milestone 7. Rerun those on the Mac.
