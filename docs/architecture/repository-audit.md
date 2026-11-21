# Rasta Hisaab / Rastabaaz — Repository Technical Audit & Engineering Baseline

**Date:** November 21, 2026  
**Auditor:** Principal Software Architect & Senior Full-Stack Engineer  
**Repository:** `https://github.com/TUSHARDHOKRIYA/Claude-Impact-Lab`  
**Working Branch:** `rasta-hisaab` (HEAD commit: `e124cd9` / `fix/vulnerabilities-and-tests`)  
**Commit Context:** Recent transition from legacy Kala Ghoda street-issue reporter to Mumbai-wide road repair financial accountability platform (*Rastabaaz / Rasta Hisaab*).

---

## 1. Executive Summary

A comprehensive read-only reconnaissance of the repository was conducted. The application is a Next.js 15 (React 19, TypeScript) civic intelligence application designed to track Mumbai road repair finances across all 24 BMC wards. It features UX4G 3.3.3 government UI components, MapLibre GL 6 mapping, AWS DynamoDB single-table persistence (with dev-server in-memory mode), voice-assisted citizen road issue reporting (Sarvam AI STT/TTS + multi-provider LLM tool calling), an in-memory financial analytics engine (`src/lib/rupee/`), and Claude-generated ward summary briefs.

### Key Takeaways
1. **Application Runtime Works:** `npm run build` compiles cleanly with zero errors. All 10 static and dynamic routes build successfully. ESLint passes with zero warnings (`npm run lint`).
2. **Critical Test Suite Regressions:** `npm run typecheck` fails with **143 TypeScript errors across 40 files** (all in `src/test/`), and `npm run test` fails with **40 failed test files out of 86 (147 failed tests, 297 passed tests)**.
   - **Root Cause:** Commits `868d642` and `e124cd9` refactored `src/lib/types.ts` and component code from generic urban issues (`"road" | "footpath" | "waste"`) to road repair issues (`"pothole" | "waterlogging" | "open_manhole" | "choked_drain" | "road_cave_in" | "broken_paver_blocks" | "other"`), removed the legacy `affects` field, and replaced Kala Ghoda landmark fixtures (`"jehangir"`) with Mumbai-wide localities. The test suite was not synchronized with these changes.
3. **Deployment Blocker:** `amplify.yml` executes `npm run typecheck` and `npm run test` during build. Consequently, **production deployments to AWS Amplify Hosting are currently blocked** until tests are updated.
4. **Dataset Integrity is Strong:** The synthetic civic dataset in `data/rupee/` contains 15 CSV files and 2 GeoJSON files totaling 11,811 records. All primary keys are 100% unique, and relational foreign keys between work orders, roads, contractors, and rate cards are intact. However, 41.9% of complaints lack GPS coordinates, creating a blind spot in current spatial algorithms.
5. **No Existing Features Must Be Discarded:** The existing citizen reporting flow, voice conversation pipeline, DynamoDB single-table architecture, and financial analytics foundation are well-structured and must be preserved as non-negotiable baselines.

---

## 2. Engineering Baseline Execution Report

The five standard engineering checks were executed in the repository on Node.js v22.23.4 / macOS:

| Baseline Command | Exit Code | Status | Details |
| :--- | :---: | :---: | :--- |
| `npm ci` | 0 | **PASSED** | Clean install of dependencies (overrides applied for `@mapbox/jsonlint-lines-primitives` and `postcss`). |
| `npm run lint` | 0 | **PASSED** | ESLint 9.34 passed across all source and test files with zero errors and zero warnings. |
| `npm run typecheck` | 2 | **FAILED** | `tsc --noEmit` detected **143 errors in 40 files** (100% confined to `src/test/`). Application source (`src/app/`, `src/components/`, `src/lib/`) typechecks cleanly. |
| `npm run test` | 1 | **FAILED** | Vitest 4.1.12 executed 86 test files: **46 passed, 40 failed** (297 tests passed, 147 tests failed out of 444 total). |
| `npm run build` | 0 | **PASSED** | Next.js 15.5.29 production build succeeded. 10 routes generated (`/`, `/admin`, `/admin/login`, `/contractors`, `/map`, `/opengraph-image`, `/places/[slug]`, `/report/new`, `/reports/[id]`, `/reports/[id]/photo`, `/wards`, `/wards/[code]`). |

### Exact Error Categorization in `src/test/`

All 143 TypeScript errors and 147 test failures fall into four distinct categories:

#### A. IssueType Schema Refactoring (58 TS errors)
- **Error:** `Type '"road"' is not assignable to type '"pothole" | "waterlogging" | "open_manhole" | "choked_drain" | "road_cave_in" | "broken_paver_blocks" | "other"'`
- **Failing Files:** `admin-issue-type-move.test.ts`, `chip-labels.test.ts`, `desk-photo-transact.test.ts`, `emptied-place.test.ts`, `home-report-first.test.tsx`, `insight-strip.test.tsx`, `map-always-on.test.tsx`, `map-highlight.test.tsx`, `map-time-filter.test.ts`, `place-list.test.tsx`, `place-lock.test.ts`, `place-page-fresh.test.ts`, `place-per-issue.test.ts`, `queries.test.ts`, `repo-dynamo.test.ts`, `repo-memory.test.ts`, `report-story.test.tsx`, `seed.test.ts`, `transact-cancellation.test.ts`.

#### B. Deprecated `affects` Field Removal (32 TS errors, 18 runtime test failures)
- **Context:** Commit `e124cd9` removed the question "Who does it get in the way of?" (`affects: ("walking" | "driving" | "cycling" | "business")[]`) from forms, voice prompts, and types.
- **Error:** `Property 'affects' does not exist on type 'ReportVoiceValues' / 'CreateReportInput'`, `Argument of type '"save_affects"' is not assignable to parameter of type '"save_issue_type" | ...'`
- **Failing Files:** `voice-in-flight.test.tsx`, `voice-fixtures.test.ts`, `voice-score.test.ts`, `voice-turn-action.test.ts`, `report-form-validation.test.tsx`, `report-editor.test.tsx`.

#### C. Legacy Kala Ghoda Landmark References (28 runtime test failures)
- **Context:** Commit `868d642` removed the Kala Ghoda precinct special-case. `LANDMARKS` in `src/lib/city.ts` was replaced with citywide flood quick-picks (`Hindmata`, `Kings Circle`, `Andheri`, `Sion`, `Kurla`, `Dadar`).
- **Error:** `Cannot read properties of undefined (reading 'name')` where tests assume `LANDMARKS.find(l => l.id === "jehangir")` returns an object.
- **Failing Files:** `location-step.test.tsx`, `report-form-guided.test.tsx`, `report-form-validation.test.tsx`, `voice-chat-flow.test.tsx`, `voice-extract.test.ts`, `voice-turn-action.test.ts`.

#### D. Voice Fixture Mismatches (24 runtime test failures)
- **Context:** Fixture IDs like `duration-not-recurrence`, `drain-garbage-overlap`, and `multi-affects-one-sentence` were dropped or renamed in `src/lib/voice/fixtures.ts`.
- **Error:** `Error: no fixture duration-not-recurrence`
- **Failing Files:** `voice-score.test.ts`, `voice-runner.test.ts`.

---

## 3. Architectural Boundaries & Dependencies

### Module Topology

```
                       ┌───────────────────────────────┐
                       │        Next.js App Router     │
                       │    (src/app/wards, /reports)   │
                       └──────────────┬────────────────┘
                                      │
              ┌───────────────────────┼──────────────────────┐
              ▼                       ▼                      ▼
    ┌───────────────────┐   ┌───────────────────┐  ┌───────────────────┐
    │  Citizen Report   │   │  Rupee Financial  │  │   Map & Spatial   │
    │  Form & Voice UI  │   │  Analytics Engine │  │   Visualisation   │
    │  (src/components) │   │ (src/lib/rupee/)  │  │(MapLibre GL / UX4G│
    └─────────┬─────────┘   └─────────┬─────────┘  └─────────┬─────────┘
              │                       │                      │
              ▼                       ▼                      ▼
    ┌───────────────────┐   ┌───────────────────┐  ┌───────────────────┐
    │ Repository Layer  │   │ Synthetic Dataset │  │  Geo Data Tables  │
    │  DynamoDB/Memory  │   │   `data/rupee/`   │  │src/lib/geo-data/  │
    │  (src/lib/repo/)  │   │    (15 CSVs)      │  │ (wards, roads,    │
    └───────────────────┘   └───────────────────┘  │   localities)     │
                                                   └───────────────────┘
```

### Dependency Audit
- **Core Framework:** Next.js 15.5.29, React 19.1.1, React DOM 19.1.1, TypeScript 5.9.2.
- **UI & Styling:** `ux4g-web-components` 3.3.3, Tailwind CSS 4.1.12, PostCSS 8.5.28.
- **GIS & Mapping:** `maplibre-gl` 6.11.2 (custom worker copy script `scripts/copy-maplibre-worker.mjs`).
- **Cloud & Persistence:** AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`).
- **AI & Voice:** `@anthropic-ai/sdk` 1.12.0 (Claude ward briefs), Sarvam AI integration (voice STT/TTS).
- **Testing:** Vitest 4.1.12, `@testing-library/react` 16.3.3, `aws-sdk-client-mock` 4.1.0, JSDOM 26.1.0.

### Environment & Configuration Contract
- `RASTABAAZ_REPO`: `memory` for zero-dependency local dev; unset for AWS DynamoDB.
- `RASTABAAZ_TABLE_NAME`: Target DynamoDB table name (e.g., `rastabaaz`).
- `ADMIN_KEY`: Desk authentication secret (defaults to `dev-admin-key` in development).
- `ANTHROPIC_API_KEY`: Enables Claude-generated ward summary briefs via `claude-opus-5-5`.
- `NEXT_PUBLIC_VOICE_UI`: `1` enables the microphone input on citizen reporting forms.
- `SARVAM_API_KEY` / `VOICE_LLM_*`: Voice STT, TTS, and conversational extraction configuration.

---

## 4. Protected Assets & Constraints Inventory

The following existing assets and behaviors must be strictly protected under Non-Negotiable Rules:

1. **DynamoDB Single-Table Design (`infra/rastabaaz-table.yaml`):**
   - Single-table partition scheme: `pk`, `sk`, `gsi1pk`/`gsi1sk`, `gsi2pk`/`gsi2sk`, `byType`.
   - Concurrency-safe place locking via transactional slots (`src/lib/repo/place-lock.ts`).
   - Base64 photo storage in `PHOTO` items within DynamoDB's 400KB item limit.
2. **Citizen-Controlled Reporting Flow (`src/components/report/`):**
   - One-handed mobile experience with progress indicator (`GovProgress`).
   - Step sequence: Photo (1) -> Problem (2) -> History (3) -> Risk/Accident (4) -> Place/Pin (5) -> Check/Review (6).
   - Citizen review step guarantees human validation before form submission.
   - Voice assistant is assistive and never bypasses citizen confirmation.
3. **In-Memory Development Mode (`src/lib/repo/memory.ts`):**
   - High-fidelity memory implementation of `RastabaazRepository` allowing instant zero-cloud onboarding.
4. **Original Source Data (`data/rupee/`):**
   - All 15 CSV and 2 GeoJSON files are canonical benchmark data and must remain unaltered.
5. **Rate Limiting & Security Defenses:**
   - Client-IP rate limiting on public submissions (5/hour) in `src/lib/rate-limit.ts`.
   - Timing-safe HMAC cookie authentication for desk administration in `src/lib/admin-auth.ts`.

---

## 5. Critical Blockers & Action Plan

| Priority | Issue | Impact | Required Remediation |
| :---: | :--- | :--- | :--- |
| **P0** | 143 TypeScript errors in `src/test/` | Amplify CI fails; `npm run typecheck` fails | Update test fixtures and mock calls to use `IssueType` ("pothole", etc.) and remove `affects`. |
| **P0** | 40 failed Vitest test suites | `npm test` fails; regression barrier broken | Update test expectations to Mumbai localities, current voice tools, and current issue types. |
| **P1** | 41.9% complaints ignored in Next-Rupee | Citizen complaints without GPS (Helpline/Walk-in) omitted from budgeting | Implement text-based gazetteer matching via `localities.csv` to map complaints to roads. |
| **P1** | Broad DLP audit flags | 493 work orders flagged under DLP regardless of repair method | Differentiate surface repairs from drainage/pumping under DLP contractual scope. |
| **P2** | Contractor scorecard context | Scorecard only adjusts for ward flood index, not rainfall timing | Incorporate daily rainfall and tide data during the execution window of the work orders. |
