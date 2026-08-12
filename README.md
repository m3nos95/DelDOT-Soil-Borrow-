# DelDOT AI Grant Matching Agent (Phase 1 Pilot)

Pilot application for the Delaware Department of Transportation AI Committee use case: match unfunded Unifier projects to USDOT Notices of Funding Opportunity (NOFOs), with the Grant Manager remaining the final decision maker.

USDOT publishes roughly 50–60 competitive NOFOs a year. Each 25–30 page notice is currently compared by hand against 100+ unfunded projects — about 3,500–4,800 evaluations annually. This agent automates extraction, comparison, ranking, and explanations so staff time goes to review, not triage.

## What it does

1. Loads Unifier unfunded-project data (Phase 1: Excel/CSV export; 248 sample Delaware projects included).
2. Accepts an uploaded NOFO (PDF or text) or a sample SS4A / RAISE / BIP / PROTECT notice.
3. Extracts eligibility, evaluation criteria, program priorities, and funding objectives.
4. Scores every project (eligibility, evaluation fit, priorities, funding objectives, historic award intelligence).
5. Recommends the best matches with plain-language rationale.
6. Collects Grant Manager feedback (reject, add, correct, comment) and applies it to later runs.
7. Exports an HTML report (print to PDF) and CSV.

The final decision remains with the Grant Manager.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On the dashboard, click **Analyze Projects** to run the SS4A sample against the Unifier-style inventory.

## Pilot workflow

| Step | Screen | Action |
| --- | --- | --- |
| 1 Upload | Dashboard / Upload | NOFO + Unifier export |
| 2 Analyze | API matching engine | Extract + score |
| 3 Review | Analysis Results | Human-in-the-loop select / feedback |
| 4 Download | Reports | HTML or CSV |

## Safeguards

- Scores are decision support, not a USDOT submittal.
- Extracted criteria should be checked against the source NOFO.
- Phase 1 does not write back to Unifier.
- Do not upload PII beyond project fields needed for matching.

## Stack

Next.js 15 (App Router), TypeScript, Tailwind CSS. Matching is deterministic and runs without an LLM API key so the pilot works offline in a controlled environment.
