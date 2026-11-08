# EstateFlow Custom Local Agent — Training & Policy

The first version is **a locally trained machine-learning workflow**, not a large language model. It does not need an API subscription, GPUs, or cloud inference. It uses a TypeScript multinomial Naive Bayes classifier for intent, deterministic entity extraction for dates/counts, a read-only tool registry for verified availability, and safe reply templates. Those are deliberately separated so the model cannot change bookings or invent prices.

## Retrain your own project-specific model

1. Open `data/agent-training.jsonl`. Each line is JSON: `{"text":"...","label":"WEDDING"}`.
2. Valid labels: `ROOM_BOOKING`, `WEDDING`, `CORPORATE_OFFSITE`, `COMPLAINT`, `UNKNOWN`.
3. Add **synthetic** examples for your resort's wording, including spelling variations, Kannada/Hindi phrases (a future tokenizer change is needed for good non-Latin performance), incomplete dates, mixed intents, complaint wording, and polite general questions.
4. Run `npm run agent:train` and `npm run agent:evaluate`.
5. Restart the NestJS API so `AgentService` loads the newly generated `model/resort-intent-model.json`.
6. Review examples misrouted to `UNKNOWN` and add labelled examples only after human review. Keep a separate held-out evaluation set that is never trained on.

Model file is JSON with the vocabulary, class document counts and per-class token frequencies. Scoring uses smoothed log-probabilities, unigrams and bigrams. Max posterior and top-two margin are used as conservative review heuristics, **not calibrated probabilities**. The default threshold is 0.75 plus margin 0.25, and all `UNKNOWN` go to manual review. Complaint keywords have a deterministic GM-priority override.

## Executable agent stages

```
Enquiry persisted
  -> local predict() on untrusted message
  -> extractRequirements() with nullable fields
  -> optional bounded read-only tool call for exact dated room enquiries
  -> deterministic category-to-staff/GM routing
  -> safeDraft() with NO guaranteed availability claim
  -> reply_drafts row (DRAFT status)
  -> staff may edit and send through simulation only
```

## Tool rules

The sole registered tools are `room_availability` and `event_requirements`; `AgentToolRegistry` rejects all other tool names. The model NEVER receives SQL execution tools, API keys, file-system capabilities, write access, payment tools or an external send method. Staff actions use separate JWT-protected NestJS controllers.

## Known limitations

- The current Milestone 7 dataset has 210 synthetic examples (historically 100 in Milestone 1). Eight curated classification checks passing is **not** proof of real-world accuracy; gather and label broader held-out tests before deployment.
- Only English/Latin-token words are adequately modeled. There is no transformer, embedding search or generative language model.
- Basic regex extraction intentionally leaves ambiguous dates unknown. Staff must fill missing exact dates and confirm resource quantities before a feasibility evaluation.
- The model currently reloads on restart, not hot-swapped while live.
- The model doesn't yet use staff correction logs for automatic learning: staff edits are audited; exporting a reviewed dataset is a later task.
- A later LLM augmentation may improve draft fluency, but must preserve exact read-only tool boundaries, human approval and server-computed price/availability.


## Milestone 7 training and validation

Read [`MILESTONE_7_AGENT_EVALUATION.md`](MILESTONE_7_AGENT_EVALUATION.md). Do not train on held-out cases. New staff-reviewed examples are imported through an explicit local-only, privacy-screened workflow and the model is retrained manually.
