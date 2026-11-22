# Rasta Hisaab 2.0 — System Architecture

**Document Version:** 2.0.0  
**Status:** Approved Reference  
**Classification:** Civic Decision-Support & Infrastructure Intelligence  

---

## 1. Architectural Philosophy

Rasta Hisaab 2.0 operates as an **evidence-first, responsive civic intelligence platform**. It connects fragmented civic records into a traceable, road-level system without confusing derived findings with verified legal facts.

```
       +-----------------------------------------------------------+
       |                  RASTA HISAAB 2.0 PLATFORM                |
       +-----------------------------------------------------------+
                                     |
    +--------------------------------+--------------------------------+
    |                                                                 |
    v                                                                 v
[ PUBLIC CITIZEN EXPERIENCE ]                         [ DECISION-SUPPORT & AUDIT ]
- Citizen Intake (Report Form)                         - City Intelligence Overview (/overview)
- Issue Tracker (/track)                              - Ward Action Queue (/queue)
- Pothole-to-Rupee Receipt (/receipt/[id])             - Contractor Benchmarking (/contractors)
- Citizen Repair Verification (/verify)                - Procurement Screening (/accountability)
- Public Road Explorer (/roads)                        - Spend vs Need Scenarios (/spend-vs-need)
                                                                 |
    +------------------------------------------------------------+
    |
    v
[ CORE VERTICAL SLICE: ROAD RELIABILITY PASSPORT ] (/roads/[id])
- Road Identity (Geometry, surface, classification, DLP)
- Citizen Signal (Complaints, categories, channels, upvotes)
- Work Order Timeline (Contractor, method, SLA, reopening, remarks)
- Money Trail (Billed amounts, rate card benchmark, variance)
- Repair Outcome (30d reopening, repeat work, verification)
- Environmental Context (Flood hotspots, rainfall, traffic, accidents)
- Audit-Ready Evidence Pack Export (/roads/[id]/evidence)
```

---

## 2. Core Subsystems

### 2.1 Citizen Experience Subsystem
- **Intake Flow (`/` & `/report/new`):** Multi-step guided reporting with category pickers, GPS location / manual map pinning, image upload with local compression, and reference ID generation.
- **Report Tracker (`/track`):** Deterministic lookup across citizen submissions (`rpt_...`) and administrative complaints (`CMP-...`).
- **Pothole-to-Rupee Receipt (`/receipt/[id]`):** Transparent citizen receipt showing downstream work orders, contractor billing, SLA outcome, and data blindspots.
- **Repair Verification (`/verify`):** Post-repair observation recording without altering official administrative statuses.

### 2.2 Road Reliability Engine
- **Road Passport (`/roads/[id]`):** Complete profile for each of Mumbai's 291 road segments across all 24 wards.
- **Evidence Graph:** Connects complaints, canonical issues, work orders, contractors, rate card items, flood hotspots, accidents, and facilities.
- **Provenance Annotator:** Classifies relationships as `explicit_link`, `verified_record`, `inferred_candidate`, `citizen_observation`, or `model_suggestion`.

### 2.3 Civic Intelligence & Matching Engine
- **Normalisation:** Normalises dates, channels, categories, and multilinguality (English, Marathi, Hindi, Hinglish).
- **Spatial Snapping:** Snaps GPS coordinates to road segments within ward bounding boxes.
- **Text Geocoding:** Maps non-GPS helpline complaints to localities and wards via gazetteer lookup.

### 2.4 Procurement & Accountability Engine
- **Cost Screening:** Compares actual billed amounts with standard BMC rate cards (`rate_card.csv`). Flags orders exceeding 1.35x benchmark.
- **Repeat Repair Detection:** Flags work orders on identical road segments within 60 days.
- **DLP Screening:** Identifies work orders executed on roads under Defect Liability Period (`under_dlp === true`).
- **Phantom Completion Screening:** Flags work orders marked completed with zero elapsed time or missing engineer remarks.

### 2.5 Spend vs Need & Next Rupee Prioritisation
- **5 Multi-dimensional Criteria:**
  1. Infrastructure Vulnerability (25%)
  2. Public Safety (25%)
  3. Service Deficit (20%)
  4. Maintenance Burden (15%)
  5. Resource Equity (15%)
- **Scenario Simulator:** Deterministic allocation under hypothetical envelopes (Limited Maintenance, Balanced, High-Risk Critical Safety, Monsoon Emergency).

### 2.6 AI Accountability Assistant (`/assistant`)
- **Read-Only Model:** Grounded strictly in local CSV datasets.
- **Deterministic Tool Calling:** Arithmetical and statistical values are calculated deterministically in TypeScript, not guessed by LLM.
- **Multilingual:** Supports English, Hindi, and Marathi prompts.

---

## 3. Technology Stack & Constraints

- **Framework:** Next.js 15 (App Router, Server & Client Components)
- **Language:** TypeScript 5.9 (Strict mode enabled)
- **UI Components:** UX4G 3.3.3 Government Design System tokens + Tailwind CSS 4
- **Maps:** MapLibre GL 6.11
- **File Constraint:** Strict 300-line ceiling per file (`npm run test:lines`)
- **Testing:** Vitest 4.1 with `@testing-library/react` and `@testing-library/user-event`
