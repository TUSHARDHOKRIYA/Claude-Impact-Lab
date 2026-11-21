# Rastabaaz

Rastabaaz follows the rupee across Mumbai's monsoon roads. For each of the 24 BMC wards it shows where the road repair money went, whether the work held up, who did it, and where the next rupee should go. Citizens add to the record by photographing a road problem and pinning it, and anyone can ask the assistant about a complaint, a road, a ward or a contractor.

It is a demo built on the synthetic Claude Impact Lab dataset in `data/rupee/`. Ward codes and road names are real. Every amount, date, contractor and work order is made up. It is not the BMC complaint portal.

## What is in it

| Page | What it shows |
| --- | --- |
| `/` | The report form, built for one hand on a phone: photo, problem type, history, risk, place, check. |
| `/map` | Citizen reports on a map of Mumbai. |
| `/places/<slug>` | Every report at one place, newest first, with a link to that ward's money trail. |
| `/reports/<id>` | One report. When the report is on a known road, the road's trail: which work orders touched it, who did them, what was billed, and which bills are flagged. |
| `/wards` | Citywide spend against budget, then all 24 wards. Sort by ward or by money that needs explaining. |
| `/wards/<code>` | One ward, such as `/wards/f-s`: where the next rupee should go (with a budget simulator), spend by outcome, durability by problem and repair method, flagged bills, and what residents reported. Officers can download the flagged bills as CSV or copy a memo for the ward office. |
| `/contractors` | A scorecard per contractor, ranked by overall score. |
| `/contractors/<id>` | One contractor: a Claude-written summary, the score parts, repeat repairs, flagged bills, wards worked in, every contract, and results by repair method. `/contractors/<id>/scorecard.pdf` is the same scorecard as a PDF. |
| `/assistant` | Ask about road money in English, Hindi or Marathi. Add a complaint ID to trace it from complaint to work order. |
| `/admin` | The desk for reviewing citizen reports. Password is `ADMIN_KEY`. |

### Money trail and audit flags

Each ward's spend lands in exactly one of three outcomes: held up, failed within 30 days (re-opened), or needs an explanation (carries an audit flag). The audit checks are:

- a bill more than 35% above the rate card;
- a second bill for the same road and method within seven days with no complaint behind it;
- BMC paying for a road still under its Defect Liability Period.

A fourth check, a burst of complaints near a road right after its repair was marked complete, is off by default: on this dataset it flags 73% of jobs and buries the real flags. `RUPEE_PHANTOM_FLAG=1` turns it on. A flag is a question for the ward office, not proof of wrongdoing.

### Next rupee

Roads in a ward are ranked by a risk score from open complaints, repairs that re-opened, accidents, flooding, traffic, and nearby hospitals and schools. The budget simulator funds them strictly in rank order until the money runs out. Roads still under their Defect Liability Period cost nothing, because the original contractor must fix them.

### Contractor scores

Each part (durability, billing, speed) compares a contractor with the city-wide rate for the same repair method at the same stress level, so a contractor working on hard roads is not punished for it. 50 means as expected, 100 means perfect, 33 means twice as bad. Contractors with few jobs are pulled toward 50 and marked "Limited data", so a handful of jobs cannot swing a score.

### Complaint linking

The matching engine in `src/lib/matching/` normalises each MyBMC complaint, groups duplicates into one issue per road problem, and links issues to the work orders that fixed them. Each link records how it was made, so the assistant can say plainly when a link is confirmed and when it is a guess.

## How Claude is used

Claude explains; it does not count. Every figure comes from the app's own computation, and Claude only reads it back through tools.

- **Assistant** (`src/lib/assistant/`). Claude answers with tools that look up complaints, issues, roads, work orders, contractor rankings, ward summaries, audit flags and the next-rupee plan. The reply is checked against a schema before it is shown: the answer, the record it is about, the next step for the person, and the records it checked. Without an API key the assistant still answers from the same records with a plain template.
- **Contractor summary** (`src/lib/rupee/scorecard/ai-summary.ts`). Claude writes the "In plain words" paragraph on each contractor page from the scorecard figures. There is no template version; without a key the box says so.

## Run locally

Node.js 20 or newer.

```bash
npm ci
RASTABAAZ_REPO=memory npm run dev
```

Memory mode keeps citizen reports in the dev server and seeds them from the dataset's MyBMC complaints. They disappear when the server stops. No AWS account is needed. Memory mode is ignored in production.

For DynamoDB, set `RASTABAAZ_TABLE_NAME`, `AWS_REGION` and credentials (or `DYNAMODB_ENDPOINT` for a local DynamoDB), create the table from `infra/rastabaaz-table.yaml`, then run `npm run seed`.

To turn on Claude, set `ANTHROPIC_API_KEY`.

## Environment variables

Copy `.env.example`.

| Name | Role |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API key for the assistant and contractor summaries. Optional. `ANTHROPIC_AUTH_TOKEN` also works. |
| `ANTHROPIC_MODEL` | Assistant model. Default `claude-sonnet-4-5`, falling back to `claude-haiku-4-5`. |
| `RUPEE_CONTRACTOR_MODEL` | Contractor summary model. Default `claude-haiku-5-5`. |
| `RUPEE_PHANTOM_FLAG` | `1` turns on the post-completion complaint check. |
| `RASTABAAZ_REPO` | `memory` for in-memory reports during `npm run dev`. |
| `RASTABAAZ_TABLE_NAME` | DynamoDB table name. |
| `AWS_REGION` | AWS region. The example is `ap-south-1`. |
| `DYNAMODB_ENDPOINT` | Optional local DynamoDB URL. |
| `AWS_PROFILE` | Optional local AWS profile. |
| `ADMIN_KEY` | Desk password. |
| `NEXT_PUBLIC_SITE_URL` | Absolute site origin for Open Graph URLs. Leave unset locally. |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack). |
| `npm run build` / `npm start` | Production build and server. |
| `npm run typecheck` | TypeScript check. |
| `npm run lint` | ESLint. |
| `npm test` | Test suite (Vitest). |
| `npm run test:lines` | Fails if any source file is over 300 lines. |
| `npm run seed` | Writes the seed reports into the current store. |
| `node scripts/build-geo.mjs` | Rebuilds the ward, road and locality geometry in `src/lib/geo-data/` from `data/rupee/`. |
| `npm run amplify:env` | Writes the server env file for the Amplify build. |
| `npm run iam:policy` | Renders a table-scoped IAM policy for the Amplify compute role. |

## Layout

- `data/rupee/` is the dataset, with `DATA_DICTIONARY.md`.
- `src/lib/rupee/` loads it and computes ledgers, audit flags, road trails, contractor scorecards (and their PDF) and the next-rupee ranking.
- `src/lib/matching/` links complaints to issues and work orders.
- `src/lib/assistant/` is the Claude assistant: tools, evidence, response schema and request checks.
- `src/app/` holds the pages; `src/components/` the report form, map, place, ward, contractor and assistant components.
- `src/styles/` sits on UX4G 3.3.3 (`ux4g-web-components`). App CSS adds the lane marking, the outcome bar, stacked phone tables and layout.
- `docs/architecture/data-quality-report.md` checks the dataset: row counts, keys, and how well the tables link.
- `infra/` holds the DynamoDB table and IAM policy templates.

## Known gaps

- No dark mode yet.
- Seeded reports carry no road ID, so the road trail on `/reports/<id>` only shows for reports filed on a known road.

## Deploy

AWS Amplify Hosting serves the app as SSR using `amplify.yml`. It needs `RASTABAAZ_TABLE_NAME` and `ADMIN_KEY`; set `ANTHROPIC_API_KEY` for Claude and `NEXT_PUBLIC_SITE_URL` in production. Table and IAM steps are in [infra/README.md](infra/README.md).
