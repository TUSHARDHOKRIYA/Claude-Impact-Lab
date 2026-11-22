# Rasta Hisaab 2.0 — Data Model & Provenance Specification

**Version:** 2.0.0  
**Domain:** Urban Civic Infrastructure Intelligence  

---

## 1. Domain Entities

```
+----------------+          +-----------------------+          +-----------------+
|   Road Segment |<-------->| RoadPassportAggregate |<-------->|   Work Order    |
|   (roads.csv)  |          +-----------------------+          | (work_orders)   |
+----------------+                      |                      +-----------------+
        ^                               |                               ^
        |                               v                               |
+----------------+          +-----------------------+                   |
|   Complaint    |<-------->|     EvidenceGraph     |<------------------+
| (complaints)   |          |  (Explicit / Inferred)|                   |
+----------------+          +-----------------------+                   v
                                        |                      +-----------------+
                                        v                      |   Contractor    |
                            +-----------------------+          | (contractors)   |
                            | Context: Flood/Traffic|          +-----------------+
                            |  Accidents/Facilities |
                            +-----------------------+
```

### 1.1 Road Segment
- `id`: Unique alphanumeric identifier (e.g. `ROAD-G-001`)
- `name`: Official road street name
- `ward`: BMC Ward Code (`A` through `T`)
- `roadType`: `Major Arterial` | `Arterial` | `Sub-Arterial` | `Collector` | `Local`
- `surface`: `Asphalt` | `Concrete` | `Paver Blocks` | `Mastic Asphalt`
- `lanes`: Number of lanes (1 to 8)
- `lengthM`: Segment length in metres
- `start`: `{ lat: number, lng: number }`
- `end`: `{ lat: number, lng: number }`
- `lastResurfaced`: ISO Date string (e.g. `2023-01-15`)
- `underDlp`: Boolean flag (screening hint only)
- `busRoute`: Boolean indicator

### 1.2 Work Order
- `id`: Work Order identifier (e.g. `WO-000001`)
- `complaintIds`: Explicitly linked complaint IDs (`CMP-...`)
- `ward`: Ward code
- `roadId`: Foreign key to `Road Segment`
- `workType`: Category of intervention
- `method`: Repair technique (10 methods from `rate_card.csv`)
- `contractorId`: Empanelled contractor ID (1 to 8)
- `contractorName`: Empanelled contractor corporate title
- `assignedAt`: Timestamp of assignment
- `startedAt`: Timestamp of work commencement
- `completedAt`: Timestamp of recorded completion
- `areaSqm`: Executed physical area in square metres
- `costInr`: Amount billed in INR (unconfirmed payment)
- `slaHours`: Prescribed turnaround window
- `slaMet`: Boolean outcome
- `reopened`: Boolean indicating complaint reopened within 30 days
- `remark`: Supervising junior engineer note

### 1.3 Complaint Record
- `id`: Complaint reference (e.g. `CMP-000001`)
- `receivedAt`: Logging timestamp
- `channel`: `MyBMC App` | `1916 Helpline` | `MyBMC Web Portal` | `Ward Office Walk-in` | `Social Media`
- `category`: Reported citizen category
- `description`: Untouched raw citizen problem narrative
- `language`: Detected or tagged language code
- `locality`: Neighbourhood text string
- `ward`: Ward code (or null if unassigned)
- `lat`: GPS latitude (or null if logged via 1916/walk-in)
- `lng`: GPS longitude (or null if logged via 1916/walk-in)
- `upvotes`: Citizen endorsement count
- `status`: Administrative workflow state

---

## 2. Evidence Relationship Classifications

Every edge in the Rasta Hisaab Evidence Graph carries an explicit epistemic status:

1. `EXPLICIT_SOURCE_LINK`: Direct foreign key present in source dataset (e.g., `work_order.road_id` or `work_order.linked_complaint_ids`).
2. `VERIFIED_RECORD`: Documented by independent civic inspection or eMB entry.
3. `INFERRED_MATCH`: Algorithmically matched via geographic proximity, temporal window, or NLP text resolution.
4. `CITIZEN_OBSERVATION`: Self-reported citizen field feedback (e.g., verification submission).
5. `MODEL_GENERATED`: AI suggestion produced by LLM or heuristic model requiring human validation.

---

## 3. Road Passport Aggregation Structure

The Road Passport (`RoadPassportData`) computes a deterministic, multi-dimensional profile:

- `identity`: Full road metadata.
- `citizen`: Total complaints, channel breakdown, recurring clusters, open issues count.
- `workOrders`: Chronological order history, SLA compliance %, reopening %, billed amount total.
- `moneyTrail`: Spend by repair method, rate-card expected cost comparison, cost variance %, flags count.
- `outcomes`: Held amount, Flagged amount, Reopened/Failed amount.
- `context`: Nearby flood hotspots, peak traffic volume, accident counts, critical facilities.
- `nextAction`: Deterministic recommended next intervention with plain-language explanation.
- `provenance`: Audit trail metadata, algorithm version, synthetic disclaimer.
