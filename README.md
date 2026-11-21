# Kala Ghoda Khabar

Kala Ghoda Khabar is a demo street-reporting site for the Kala Ghoda precinct in Mumbai (A Ward). A person records a street condition they can see: a photo, a few answers, and a place pin. Reports of the same issue type within 40 m share one place. Seeded reports are real issues in the precinct.

The landing page at `/` is the report form. Reporting comes first. The map is at `/map`, opened from the Map button in the header. This site is not a BMC complaint portal.

## Run locally

Node.js 20 or newer. Install with `npm ci`.

Memory mode keeps records in the dev server. They disappear when the server stops. No AWS account is required. This mode is ignored in production.

```bash
KHABAR_REPO=memory npm run dev
```

DynamoDB mode uses the table in `KHABAR_TABLE_NAME`. Set `AWS_REGION` (the example is `ap-south-1`) and credentials, or set `DYNAMODB_ENDPOINT` for a local DynamoDB. Create the table from `infra/khabar-table.yaml`, then seed it.

```bash
npm run seed
npm run dev
```

## Environment variables

Copy `.env.example`. Names match that file.

| Name | Role |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Absolute site origin for Open Graph URLs. Leave unset locally. |
| `ADMIN_KEY` | Desk password. |
| `KHABAR_TABLE_NAME` | DynamoDB table name. |
| `AWS_REGION` | AWS region. The example is `ap-south-1`. |
| `DYNAMODB_ENDPOINT` | Optional local DynamoDB URL. |
| `KHABAR_REPO` | Set to `memory` for in-memory records during `npm run dev`. Ignored in production. |
| `AWS_PROFILE` | Optional local AWS profile. |
| `NEXT_PUBLIC_VOICE_UI` | Set to `1` to show the microphone on the report form. |
| `SARVAM_API_KEY` | Key for Sarvam speech-to-text and text-to-speech. |
| `OPENAI_API_KEY` | Optional chat provider key. |
| `GEMINI_API_KEY` | Optional chat provider key. |
| `CEREBRAS_API_KEY` | Optional chat provider key. |
| `VOICE_LLM_BASE_URL` | OpenAI-compatible chat base URL. Default `https://api.sarvam.ai/v1`. |
| `VOICE_LLM_MODEL` | Chat model. Default `sarvam-105b-conversations`. |
| `VOICE_LLM_KEY_NAME` | Env var that holds the chat key. Default `SARVAM_API_KEY`. |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm start` | Production server. |
| `npm run typecheck` | TypeScript check. |
| `npm run lint` | ESLint. |
| `npm test` | Test suite. |
| `npm run test:watch` | Tests in watch mode. |
| `npm run test:lines` | Checks that each source file stays at or under 300 lines. |
| `npm run bakeoff` | Runs the voice model comparison against the fixtures. |
| `npm run seed` | Writes the seed reports into the current store. |
| `npm run amplify:env` | Writes the server env file used by the Amplify build. |
| `npm run iam:policy` | Renders a table-scoped IAM policy for the Amplify compute role. |

## Project layout

- `src/app` holds the pages: the report form, `/map`, public reports, places, and the desk.
- `src/components` holds the form, the map, and the desk editor.
- `src/lib` holds storage, voice, place naming, and seed data.
- `src/styles` holds the CSS.
- `infra` holds the DynamoDB table template and the IAM policy template.
- `scripts` holds seed, the Amplify env writer, and the policy renderer.
- `docs` holds the current product notes. Older plans are in `docs/archive`.
- `research` holds historical evidence notes. The app does not use them.

## Deploy

AWS Amplify Hosting serves the app as SSR from the `dev` branch. The build is `amplify.yml`. It requires `KHABAR_TABLE_NAME` and `ADMIN_KEY`. Production should set `NEXT_PUBLIC_SITE_URL`.

Create the table from `infra/khabar-table.yaml`. Billing is on demand (`PAY_PER_REQUEST`) and point-in-time recovery is on. The table keys are `pk` and `sk`. Indexes are `gsi1` (slug and reports by location), `gsi2` (geo cells), and `byType` (`type` plus `pk`, INCLUDE projection, no photos). The map catalog reads `byType`. That index must exist. Until it does, the app falls back to a scan.

Photos are a separate item (`sk = PHOTO`) and are served by `GET /reports/<id>/photo` with revalidating cache headers. Legacy photos stored on the report itself still work.

After deploying this version to an existing table, run `npm run seed` with the operator's AWS credentials. The v5 seed repairs the old tender wording only if the description still matches the previous seed, preserves desk edits and existing photos, restores missing seed photo items, and clears illustration captions on real replacement photos. Existing landmark-as-street values are corrected when read; curated road names remain unchanged.

Render the compute role policy with `npm run iam:policy`, then attach it. Steps are in [infra/README.md](infra/README.md).

## Docs

- [Build brief](docs/build-brief.md) describes the product as it runs now.
- [Voice report journey](docs/voice-report-journey.md) walks through photo, answers, Check, and the Submitted screen.
- [Archive](docs/archive/README.md) holds old plans. Those notes may be wrong about the current app.
