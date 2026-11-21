# Rasta Hisaab / Rastabaaz — Implementation Backlog & Engineering Roadmap

**Evaluation Criteria Alignment:**
- **Audit Accuracy:** 25%
- **Fair Accountability:** 20%
- **Budget Smarts (Next Rupee):** 20%
- **Connects the Trail:** 15%
- **Usability + Demo:** 20% (Usable by a real person: 10% + Demo and clarity: 10%)

---

## 0. Prerequisite Milestone: Engineering Baseline Restoration (P0 Blocker)

**Objective:** Fix broken unit tests caused by recent schema refactoring (`IssueType` changes, removal of `affects`, and removal of Kala Ghoda `"jehangir"` fixture), ensuring `npm run typecheck`, `npm run test`, and AWS Amplify CI deployments pass cleanly.

### Tasks
- [ ] **M0.1:** Update all 19 test files expecting generic issue types (`"road" | "footpath" | "waste"`) to use road-repair issue types (`"pothole" | "waterlogging" | "open_manhole" | "choked_drain" | "road_cave_in" | "broken_paver_blocks" | "other"`).
- [ ] **M0.2:** Remove assertions and mock payloads referencing the deprecated `affects` field in `voice-in-flight.test.tsx`, `voice-fixtures.test.ts`, `voice-score.test.ts`, `voice-turn-action.test.ts`, `report-form-validation.test.tsx`, and `report-editor.test.tsx`.
- [ ] **M0.3:** Replace legacy Kala Ghoda `"jehangir"` landmark fixtures in tests (`location-step.test.tsx`, `report-form-guided.test.tsx`, `voice-chat-flow.test.tsx`, `voice-turn-action.test.ts`) with active Mumbai flood quick-picks (`"hindmata"` / `"dadar"` from `src/lib/city.ts`).
- [ ] **M0.4:** Update voice fixture tests (`voice-score.test.ts`, `voice-runner.test.ts`) to match active fixtures in `src/lib/voice/fixtures.ts`.
- [ ] **M0.5:** Verify `npm run typecheck` exits 0, `npm run test` passes 100%, and `npm run build` succeeds.

**Files to modify:** `src/test/*.ts`, `src/test/*.tsx`  
**Acceptance Criteria:** `npm run typecheck && npm run test && npm run build` all exit 0 with 0 errors.

---

## 1. Milestone 1: Audit Accuracy Engine (Weight: 25%)

**Objective:** Eliminate audit false-positives, tighten double-billing logic, and refine Defect Liability Period (DLP) checks to reflect true contractual responsibilities.

### Tasks
- [ ] **M1.1 Refine DLP Scope Discrimination:**
  - In `src/lib/rupee/audit.ts`, differentiate road surface repairs (pothole patching, asphalt resurfacing, paver blocks) which fall under road contractor DLP, from civic drainage/dewatering operations (pumping, nullah desilting) which are BMC municipal operations.
  - Flag only road surface works on DLP roads as `paid_under_dlp`.
- [ ] **M1.2 Tighten Double-Billing Detection:**
  - Prevent symmetric mutual flagging: when two work orders on the same road segment share the same date, ensure only the duplicate/excess order is flagged, not both.
  - Check whether earlier order also lacked complaints, and ensure road-segment specificity.
- [ ] **M1.3 Rate-Card Tolerance & Amount-at-Risk Computation:**
  - Verify unit scaling in `expectedCostInr()` for both `per sqm` and `per job` entries.
  - Distinguish `order.costInr` (total bill) from `flag.amountAtRiskInr` (unjustified portion) so ward ledger summaries do not artificially inflate questioned expenditures.
- [ ] **M1.4 Expand Unit Tests for Audit Rules:**
  - Add edge-case unit tests in `src/test/rupee-audit.test.ts` verifying zero false-positive flags on valid normal variation (within 35% of rate card).

**Files to modify:** `src/lib/rupee/audit.ts`, `src/lib/rupee/ledger.ts`, `src/test/rupee-audit.test.ts`  
**Acceptance Criteria:** Audit flags validated against ground truth; zero mutual-flagging anomalies; DLP flags accurately reflect road surface contracts.

---

## 2. Milestone 2: Fair Contractor Accountability (Weight: 20%)

**Objective:** Enhance contractor scorecards with environmental context adjustments (heavy rainfall windows, tidal sensitivity, high-water table wards) so durability scores are rigorously fair and avoid volume bias.

### Tasks
- [ ] **M2.1 Temporal Weather Context Integration:**
  - Cross-reference work order completion dates with `rainfall_daily.csv` (heavy rain days >= 64.5mm) and `tides.csv` (high tides >= 4.5m).
  - Adjust expected durability if asphalt patching occurred during active monsoon downpours or within 48 hours of extreme rain events.
- [ ] **M2.2 Sample-Size Regularisation:**
  - Implement Bayesian shrinkage / empirical Bayes smoothing on contractor reopen rates for low-volume repair types to prevent small-sample distortion.
- [ ] **M2.3 Citizen-Facing Scorecard Summary Generation:**
  - Enhance `contractorScores()` in `src/lib/rupee/contractors.ts` to output neutral, evidence-backed contextual narratives explaining speed, cost compliance, and durability.
- [ ] **M2.4 Contractor Page UI Polish:**
  - Polish `/contractors` page with sorting by variance from fair expected reopen rate and filter by ward.

**Files to modify:** `src/lib/rupee/contractors.ts`, `src/app/contractors/page.tsx`, `src/components/rupee/ContractorCard.tsx`, `src/test/rupee-contractors.test.ts` (new)  
**Acceptance Criteria:** Scorecards account for both geographical flood index and temporal rainfall conditions; contractors with high flood-zone volume are judged fairly against context.

---

## 3. Milestone 3: Budget Smarts & Next-Rupee Prioritisation (Weight: 20%)

**Objective:** Transform next-rupee planning into an actionable, multi-criteria recommendation engine that encompasses non-GPS complaints and suggests high-durability, cost-effective repair methods.

### Tasks
- [ ] **M3.1 Integrate Non-GPS Complaints into Road Prioritisation:**
  - Resolve the 41.9% non-GPS complaints (1916 Helpline and walk-in) by mapping their `locality_text` to roads using `localities.csv` and road segment coordinates.
  - Eliminate the blind spot that currently ignores telephone callers and walk-in citizens.
- [ ] **M3.2 Method Optimization & Durability Scoring:**
  - Ensure `methodSuggestion()` in `src/lib/rupee/next-rupee.ts` prefers proven high-durability methods (e.g. Mastic asphalt or Concrete patch) over short-lived cold patches on chronic failure segments.
- [ ] **M3.3 Ward Budget Constrained Allocation:**
  - Provide a greedy knapsack allocation showing exactly how many top-priority roads can be fixed within the ward's remaining unspent monsoon budget.
- [ ] **M3.4 Unit & Integration Tests:**
  - Add test coverage in `src/test/rupee-next.test.ts` validating that high-accident, flood-prone, hospital-corridor roads reliably rank #1.

**Files to modify:** `src/lib/rupee/next-rupee.ts`, `src/app/wards/[code]/page.tsx`, `src/components/rupee/NextRupeeTable.tsx`, `src/test/rupee-next.test.ts`  
**Acceptance Criteria:** 100% of complaints (including Helpline/Walk-in) contribute to road demand; recommendations stay within budget constraints.

---

## 4. Milestone 4: Connects the Trail — Data Normalisation & Deduplication (Weight: 15%)

**Objective:** Clean raw complaints, de-duplicate multi-channel submissions, map messy citizen text to canonical road issues, and link unassigned complaints to work orders.

### Tasks
- [ ] **M4.1 Complaint Category Normalisation:**
  - Create `src/lib/rupee/complaint-normalise.ts` to map fuzzy / informal complaint categories into canonical `IssueType`.
  - Handle multilingual descriptions (English, Hinglish, Marathi, Hindi).
- [ ] **M4.2 Multi-Channel Complaint Deduplication:**
  - Identify duplicate reports from the same complainant or adjacent coordinates submitted within 72 hours across App, 1916 Helpline, and Social Posts.
  - Group into `CanonicalIssue` records.
- [ ] **M4.3 Work-Order Linker Engine:**
  - Build spatial-temporal matching linking the 1,553 unlinked complaints to executed work orders where road segment, work type, and timing align.
  - Flag complaints that received zero work orders ("Never fixed").

**Files to modify:** `src/lib/rupee/load.ts`, `src/lib/rupee/complaints.ts` (new), `src/lib/rupee/canonical.ts` (new)  
**Acceptance Criteria:** Raw complaints cleanly cluster into canonical issues; unlinked complaints are accurately classified as unaddressed vs. resolved.

---

## 5. Milestone 5: Usability, Citizen Q&A & Demo Experience (Weight: 20%)

**Objective:** Deliver an intuitive, high-impact demonstration experience for citizens, corporators, and ward officers with multilingual accountability tools and interactive data trails.

### Tasks
- [ ] **M5.1 Citizen Accountability Q&A ("What Happened to My Complaint?"):**
  - Create a natural-language inquiry interface where a citizen enters a complaint ID (e.g., `BMC25-000123`) or describes their road in Hindi, Marathi, or English.
  - Claude queries the money trail tools and answers: work order status, contractor, cost, SLA adherence, and 30-day durability.
- [ ] **M5.2 Ward Summary & Claude Brief Enhancements:**
  - Ensure `/wards/[code]` renders concise, mobile-friendly briefs with direct drill-downs into flagged bills and contractor track records.
- [ ] **M5.3 Map Visualisation Polish:**
  - Connect citizen report pins on `/map` to nearby road segments, displaying the ward's repair spend directly in the map popup.
- [ ] **M5.4 End-to-End Walkthrough & Demo Script:**
  - Prepare reproducible demo scenarios showing:
    1. Reporting a pothole with voice/tap on mobile.
    2. Tracking the money trail on Ward F/S.
    3. Auditing flagged bills and contractor scorecards.
    4. Reviewing next-rupee priority recommendations.

**Files to modify:** `src/app/wards/[code]/page.tsx`, `src/components/rupee/WardBriefCard.tsx`, `src/components/map/CityMap.tsx`, `src/app/api/ask/route.ts` (new)  
**Acceptance Criteria:** Seamless, accessible mobile UI; working multilingual citizen Q&A; working live demo across all 24 wards.
