# Rastabaaz

Rastabaaz follows the rupee across Mumbai's monsoon roads. For each of the 24 BMC wards it shows where the road repair money went, whether the work held up, who did it, and where the next rupee should go. Citizens add to the record by photographing a road problem and pinning it.

It is a demo built on the synthetic Claude Impact Lab dataset in `data/rupee/`. Ward codes and road names are real. Every amount, date, contractor and work order is made up. It is not the BMC complaint portal.

## What is in it

| Page | What it shows |
| --- | --- |
| `/` | The report form, built for one hand on a phone: photo, problem type, history, risk, place, check. |
| `/wards` | Citywide spend against budget, then all 24 wards. Sort by ward or by money that needs explaining. |
| `/wards/<code>` | One ward, such as `/wards/f-s`: a plain-language summary, spend by outcome, durability by problem and repair method, contractors against a fair re-open rate, flagged bills, and a ranked list of where the next rupee should go. |
| `/contractors` | A scorecard per contractor, furthest above their fair re-open rate first. |
| `/map` | Citizen reports on a map of Mumbai. |

Each ward's spend lands in exactly one of three outcomes: held up, failed within 30 days (re-opened), or needs an explanation (carries an audit flag). The three audit checks are a bill more than 35% above the rate card, a second bill for the same road and method within seven days with no complaint behind it, and BMC paying for a road still under its Defect Liability Period. A flag is a question for the ward office, not proof of wrongdoing.

The ward summary is written by Claude from figures the app has already computed; Claude explains, it does not count. Without an API key the page uses a template summary built from the same figures.

## Run locally

Node.js 20 or newer.

```bash
npm ci
RASTABAAZ_REPO=memory npm run dev
```

Memory mode keeps citizen reports in the dev server and seeds them from the dataset's MyBMC complaints. They disappear when the server stops. No AWS account is needed. Memory mode is ignored in production.

For DynamoDB, set `RASTABAAZ_TABLE_NAME`, `AWS_REGION` and credentials (or `DYNAMODB_ENDPOINT` for a local DynamoDB), create the table from `infra/rastabaaz-table.yaml`, then run `npm run seed`.

To have Claude write the ward summaries, set `ANTHROPIC_API_KEY`.

## Environment variables

Copy `.env.example`.

| Name | Role |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API key for ward summaries. Optional. |
| `RUPEE_BRIEF_MODEL` | Model for ward summaries. Default `claude-opus-5-5`. |
| `RASTABAAZ_REPO` | `memory` for in-memory reports during `npm run dev`. |
| `RASTABAAZ_TABLE_NAME` | DynamoDB table name. |
| `AWS_REGION` | AWS region. The example is `ap-south-1`. |
| `DYNAMODB_ENDPOINT` | Optional local DynamoDB URL. |
| `AWS_PROFILE` | Optional local AWS profile. |
| `ADMIN_KEY` | Desk password. |
| `NEXT_PUBLIC_SITE_URL` | Absolute site origin for Open Graph URLs. Leave unset locally. |
| `NEXT_PUBLIC_VOICE_UI` | `1` shows the microphone on the report form. |
| `SARVAM_API_KEY` | Sarvam speech-to-text and text-to-speech, for voice reports. |
| `OPENAI_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY` | Optional voice chat providers. |
| `VOICE_LLM_BASE_URL`, `VOICE_LLM_MODEL`, `VOICE_LLM_KEY_NAME` | Voice chat endpoint, model, and the env var holding its key. |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack). |
| `npm run build` / `npm start` | Production build and server. |
| `npm run typecheck` | TypeScript check. |
| `npm run lint` | ESLint. |
| `npm test` | Test suite (Vitest). |
| `npm run seed` | Writes the seed reports into the current store. |
| `node scripts/build-geo.mjs` | Rebuilds the ward, road and locality geometry in `src/lib/geo-data/` from `data/rupee/`. |
| `npm run amplify:env` | Writes the server env file for the Amplify build. |
| `npm run iam:policy` | Renders a table-scoped IAM policy for the Amplify compute role. |

## Layout

- `data/rupee/` is the dataset, with `DATA_DICTIONARY.md`.
- `src/lib/rupee/` loads it and computes ledgers, audit flags, contractor scores, the next-rupee ranking and the Claude brief.
- `src/app/` holds the pages; `src/components/` the report form, map and ward components.
- `src/styles/` sits on UX4G 3.3.3 (`ux4g-web-components`). App CSS only adds the lane marking, the outcome bar and layout.
- `infra/` holds the DynamoDB table and IAM policy templates.

## Known gaps

- Many tests in `src/test` still describe the earlier street-reporting app and do not compile against the road-only types. They need rewriting.
- No dark mode yet.
- Voice reports cannot answer the accident question; the Check step asks it.

## Deploy

AWS Amplify Hosting serves the app as SSR using `amplify.yml`. It needs `RASTABAAZ_TABLE_NAME` and `ADMIN_KEY`; set `ANTHROPIC_API_KEY` for Claude summaries and `NEXT_PUBLIC_SITE_URL` in production. Table and IAM steps are in [infra/README.md](infra/README.md).
