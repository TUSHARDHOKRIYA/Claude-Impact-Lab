# Rasta Hisaab 2.0 — Engineering Baseline & Reconnaissance Report

**Version:** 2.0.0-recon  
**Date:** November 22, 2026  
**Repository:** `Claude-Impact-Lab` (`https://github.com/di0206-innovator/claude-impact-labs---my-version`)  
**Branch:** `rasta-hisaab`  
**Node.js Engine:** >=20  
**Stack:** Next.js 15.5.29, React 19.1.1, TypeScript 5.9.2, Tailwind CSS 4.1.12, UX4G 3.3.3, MapLibre GL 6.11.2, Vitest 4.1.12

---

## 1. Environment & Capability Audit

### 1.1 Installed IDE Skills & Capabilities
- **Hallmark:** Visual & typography design rules (floor constraints, `:root` design tokens, `overflow-x: clip`, 44px+ touch targets, responsive constraints).
- **Google Antigravity SDK:** AI agent and multi-agent workflow orchestration architecture.
- **Reverse Engineer Anything (REA):** Deep forensic inspection of data structures, CSV schemas, and UI layout patterns.
- **A11y Debugging & Modern Web Guidance:** Semantic HTML5, ARIA landmark roles, WCAG 2.2 AA keyboard navigation.

### 1.2 Git State & Remotes
- **Current Branch:** `rasta-hisaab` (clean working tree).
- **Target Push Remote:** `my-version` -> `https://github.com/di0206-innovator/claude-impact-labs---my-version.git`.
- **Target Push Branches:** `rasta-hisaab`, `main`.

---

## 2. Dataset Verification & Semantics

All datasets in `data/rupee/` were loaded and inspected directly:

| Dataset File | Format | Row Count | Primary Key | Critical Notes |
|:---|:---:|:---:|:---|:---|
| `complaints.csv` | CSV | 6,501 | `complaint_id` | 41.9% non-GPS complaints (Helpline 1916 / Walk-ins). Multi-lingual text. |
| `work_orders.csv` | CSV | 2,499 | `work_order_id` | `cost_inr` represents billed amount, NOT confirmed payment. |
| `contractors.csv` | CSV | 8 | `contractor_id` | 8 empanelled contractors with active ward assignments. |
| `roads.csv` | CSV | 291 | `road_id` | Road segments across 24 wards. `under_dlp` is a screening hint. |
| `roads.geojson` | GeoJSON | 291 feats | `road_id` | LineString road geometries for spatial queries. |
| `wards.csv` | CSV | 24 | `ward_code` | 24 Mumbai administrative wards (A through T). |
| `wards.geojson` | GeoJSON | 24 feats | `ward_code` | Approximate Voronoi polygons for boundary visualisation. |
| `rate_card.csv` | CSV | 10 | `repair_method`| BMC standard schedule of rates (per sqm or per job). |
| `social_posts.csv` | CSV | 650 | `post_id` | Synthetic citizen social posts. Clearly labelled as synthetic. |
| `flood_hotspots.csv` | CSV | 28 | `hotspot_id` | Chronic waterlogging spots, tide sensitivity, recession times. |
| `traffic.csv` | CSV | 291 | `road_id` | Peak hour volumes, speed, congestion index, bus routes. |
| `accidents.csv` | CSV | 420 | `accident_id` | Accident counts, severity, vehicle types, probable causes. |
| `facilities.csv` | CSV | 160 | `facility_id` | Hospitals & schools with designated ambulance entry roads. |
| `rainfall_daily.csv` | CSV | 244 | (date, stn) | Santacruz & Colaba daily monsoon rainfall (Jun-Sep 2025). |
| `tides.csv` | CSV | 244 | (date, time)| High tide heights and big tide flags. |
| `localities.csv` | CSV | 118 | `locality` | Mumbai neighbourhood gazetteer for text resolution. |

### Data Integrity Axioms
1. **Billed vs Paid:** `work_orders.cost_inr` is billed; payment is unconfirmed.
2. **Completion vs Quality:** Recorded completion does not independently prove quality; 30-day reopening is tracked.
3. **DLP Indicator:** `under_dlp` is a screening indicator; missing contract clauses prevent legal determination.
4. **Synthetic Nature:** Datasets are simulated Mumbai civic records and must never be portrayed as real government records.
5. **Missing Values:** Missing data (e.g. Helpline coordinates) is preserved as missing, not fabricated.

---

## 3. Engineering Baseline Checks

| Verification Check | Command | Baseline Status | Notes |
|:---|:---|:---:|:---|
| **Line-Limit Enforcement** | `npm run test:lines` | **PASSED** | All 180+ ts/tsx/css/mjs files <= 300 lines. |
| **Strict TypeScript** | `npm run typecheck` | **PASSED** | Zero type errors on `tsc --noEmit`. |
| **ESLint Validation** | `npm run lint` | **PASSED** | Zero lint errors or warnings. |
| **Vitest Test Suite** | `npm test` | **PASSED** | 93 test files, 471 tests passing (100%). |
| **Production Build** | `npm run build` | **PASSED** | Next.js 15 static/dynamic routes compile cleanly. |

---

## 4. Architectural Baseline & Identified Enhancements

1. **Road Reliability Passport:** Currently roads have summary cards on places/reports; Rasta Hisaab 2.0 requires dedicated Passport profiles (`/roads/[id]`) connecting all evidence dimensions.
2. **City Intelligence Home:** Need a comprehensive civic overview (`/overview`) providing citywide pulse, data completeness indices, and comparative ward summaries.
3. **Action Queue:** Ward engineers need an operational action queue (`/queue`) with lifecycle tracking (`New` -> `Under Review` -> `Action Required` -> `Resolved/Dismissed`).
4. **Accountability & Procurement Intelligence:** Dedicated audit screening (`/accountability`) for cost anomalies, repeat repairs, DLP violations, and phantom completions.
5. **Citizen Transparency Hub:** Report tracking (`/track`), citizen repair verification (`/verify`), and public receipts (`/receipt/[id]`).
6. **Audit-Ready Evidence Pack:** Comprehensive export system (`/roads/[id]/evidence`) offering JSON, CSV, and print-ready dossier generation.
