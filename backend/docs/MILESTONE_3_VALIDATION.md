# Milestone 3 validation record

## Checks executed in the build workspace

| Check | Outcome | Meaning |
| --- | --- | --- |
| `npm run agent:train` | PASS | Rebuilt local-NB-v2 model with 160 synthetic labelled enquiries |
| `npm run test:agent` | PASS (17 checks) | Extraction, policy, complaint escalation, uncertainty and correction validation |
| `npm run test:unit` | PASS | Original safety/agent and inventory allotment checks |
| `npm run agent:evaluate` | PASS (8/8 curated phrases) | Small hand-selected intent sanity checks, not real-world accuracy |
| `npm run agent:cv` | 80.0% (128/160) | Five-fold *synthetic* evaluation, not calibrated production accuracy |
| TypeScript `transpileModule` check | PASS (23 files) | Basic TS syntax and decorator transpilation only |
| Offline type-check with substitute ambient type declarations | PASS (temporary QA harness) | Found no additional static types under minimal stand-in APIs; **not** an actual NestJS production build |

## Still required on Rishabh's Mac

1. `npm install` (dependencies unavailable in the build workspace).
2. `npm run build` (real NestJS and PostgreSQL typings).
3. `npm run db:migrate` (requires local PostgreSQL role `rishabh`).
4. `npm run db:verify` (requires local seeded DB).
5. `npm run test:e2e` against isolated `estateflow_test` (mutates test data).
6. Real guest/staff UX checks after Lovable's React frontend is available.

## Known limitations

- The narrow supervised AI classifier and deterministic extractor cannot parse arbitrary multilingual, multi-part messages; uncertain messages require human review.
- The seeded event resource model uses daily capacity slots, not minute-accurate venue setup or shift assignments.
- No real payments, OTA stock sync, WhatsApp or email transmissions are connected.
- Source is an implementation milestone, not production-approved software.
