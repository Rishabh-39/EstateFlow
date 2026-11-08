# EstateFlow AI — Local Agent V2 Design

## Why this design

The brief requires real AI or automation that fails safely and involves staff approval. The self-trained local model is an **intent-classification agent with deterministic extraction and tool orchestration**, not a from-scratch LLM. This is a deliberately small and understandable engineering choice for a solo seven-day build.

### Trust boundaries

| Layer | What it is permitted to do | What it must never do |
|---|---|---|
| Supervised local model | Score message intent | Reserve anything or send messages |
| Policy engine | Route to staff/GM, flag uncertainty | Claim prices or override staff corrections |
| Extraction engine | Extract explicit dates, guests, resource quantities | Infer exact dates, missing budget or vendor capacity |
| Read-only tool gateway | Read authorized availability/requirements | SQL execution, edits, reservations, payment |
| Staff API | Correct, approve, explicitly send simulated reply | Bypass NestJS auth/DB transactions |
| Resource transaction | Recheck and atomically allocate resources | Commit partial event bundles |

### Decision state flow

`RECEIVED → PREDICTED → VALIDATED → (UNSORTED / GM_ESCALATION / ASSIGNED) → DRAFT_READY → STAFF_REVIEW → SENT_SIMULATED`

- A complaint is *always* escalated. A manual classification override cannot remove complaint escalation automatically.
- A confidently classified wedding without dates may be routed to Events staff, but is marked as needing clarification. Category certainty ≠ feasibility.
- Reprocessing preserves staff category/extraction changes and edited drafts.
- Model confidence is a relative score, not calibrated certainty.
- No write-capable tool is in the agent's registry. The event-requirements reader additionally requires a trusted staff/GM context supplied by NestJS, not by the model.

### Training & evaluation

1. Edit only the synthetic or manually reviewed `data/agent-training*.jsonl` files.
2. Run `npm run agent:train` to rebuild `model/resort-intent-model.json`.
3. Run `npm run agent:evaluate` for 8 independent phrase checks.
4. Run `npm run agent:cv` for synthetic stratified five-fold evaluation.
5. Run `npm run test:agent` for 17 safety and extraction checks.
6. Collect a consented, de-identified real-world holdout set before claiming production accuracy.

**Never** automatically retrain from unverified incoming enquiries or include guest personal data in checked-in corpora.

### Limitations

- Lakh budget parsing and date-range extraction cover narrow textual formats, not arbitrary natural language.
- Invalid and yearless dates remain unresolved, requiring staff input.
- No language-model free-form drafting; a human-editable template avoids hallucinated pricing.
- The agent does not perform autonomous planning; it uses bounded, hand-coded operations. Any future LLM addition requires a second policy, cost, and evaluation review.
