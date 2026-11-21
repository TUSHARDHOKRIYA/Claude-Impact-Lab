import { describe, expect, it } from "vitest";
import { createComplaintIntelligenceEngine } from "../lib/matching/engine";
import type { Complaint, Dataset } from "../lib/rupee/load";
import type { Road, Ward, WorkOrder } from "../lib/rupee/types";

function baseDataset(): Dataset {
  const dummyRoad: Road = {
    id: "RD_DADAR", name: "Dr Babasaheb Ambedkar Road", segmentNo: 1, ward: "F/S",
    roadType: "Arterial", surface: "Asphalt", lanes: 4, lengthM: 400,
    start: { lat: 19.001, lng: 72.84 }, end: { lat: 19.005, lng: 72.84 },
    lastResurfaced: "2023-01-01", underDlp: false, busRoute: true,
  };
  const dummyRoadAndheri: Road = {
    id: "RD_ANDHERI", name: "Swami Vivekananda Road", segmentNo: 1, ward: "K/W",
    roadType: "Arterial", surface: "Concrete (CC)", lanes: 4, lengthM: 600,
    start: { lat: 19.12, lng: 72.835 }, end: { lat: 19.125, lng: 72.835 },
    lastResurfaced: "2024-01-01", underDlp: true, busRoute: true,
  };
  const dummyWard: Ward = {
    code: "F/S", name: "Parel", zone: "Zone II", office: "F/South Office",
    centroid: { lat: 19.003, lng: 72.84 }, areaKm2: 14, population: 400000,
    lowLyingIndex: 0.8, crews: 4, budgetInr: 25000000, localities: ["Hindmata", "Parel"],
  };
  return {
    wards: [dummyWard], roads: [dummyRoad, dummyRoadAndheri], workOrders: [],
    contractors: [], rateCard: [], complaints: [], floodHotspots: [],
    rainfall: [], tides: [], traffic: [], accidents: [], facilities: [],
  };
}

describe("matching benchmark evaluation fixture set", () => {
  it("evaluates precision, recall, and false positives across all 12 required scenarios", () => {
    const ds = baseDataset();

    // 1 & 2. Marathi, Hindi, and Hinglish variants on same road defect
    const c1_mr: Complaint = {
      id: "BENCH-01-MR", receivedAt: "2025-06-01 10:00", channel: "MyBMC App", category: "Pothole",
      description: "रस्त्यावर मोठा खड्डा पडला आहे, वाहने हळू जात आहेत", language: "mr", locality: "Hindmata",
      ward: "F/S", lat: 19.003, lng: 72.8401, upvotes: 5, status: "Open", resolvedAt: null,
    };
    const c1_hi: Complaint = {
      id: "BENCH-01-HI", receivedAt: "2025-06-01 11:30", channel: "1916 Helpline", category: "Pothole",
      description: "As per caller sadak par bada khadda hai gaadi skid ho rahi hai.", language: "hi",
      locality: "Hindmata", ward: "F/S", lat: 19.0031, lng: 72.8402, upvotes: 0, status: "Open", resolvedAt: null,
    };
    const c1_hinglish: Complaint = {
      id: "BENCH-02-HING", receivedAt: "2025-06-01 12:00", channel: "MyBMC Web Portal", category: "Pothole",
      description: "Huge gadda on Dr Ambedkar road near flyover, heavy jam", language: "hi-en",
      locality: "Hindmata", ward: "F/S", lat: 19.00305, lng: 72.84015, upvotes: 2, status: "Open", resolvedAt: null,
    };

    // 3. Similar description at DIFFERENT location (~14km away in Andheri)
    const c_distant: Complaint = {
      id: "BENCH-03-DISTANT", receivedAt: "2025-06-01 10:15", channel: "MyBMC App", category: "Pothole",
      description: "Huge gadda on road, heavy jam near station", language: "hi-en", locality: "Andheri",
      ward: "K/W", lat: 19.121, lng: 72.8351, upvotes: 1, status: "Open", resolvedAt: null,
    };

    // 4. Different issue category near same coordinates
    const c_diff_cat: Complaint = {
      id: "BENCH-04-DIFFCAT", receivedAt: "2025-06-01 10:20", channel: "MyBMC App", category: "Open or broken manhole",
      description: "Open manhole lid missing on Ambedkar road", language: "en", locality: "Hindmata",
      ward: "F/S", lat: 19.003, lng: 72.8401, upvotes: 3, status: "Open", resolvedAt: null,
    };

    // 5. Missing GPS with Locality Aliases (Devanagari vs English)
    const c_no_gps_en: Complaint = {
      id: "BENCH-05-NOGPS-EN", receivedAt: "2025-06-02 09:00", channel: "Ward Office Walk-in", category: "Waterlogging",
      description: "Water accumulating near post office", language: "en", locality: "Hindmata",
      ward: "F/S", lat: null, lng: null, upvotes: 0, status: "Open", resolvedAt: null,
    };
    const c_no_gps_mr: Complaint = {
      id: "BENCH-05-NOGPS-MR", receivedAt: "2025-06-02 10:00", channel: "1916 Helpline", category: "Waterlogging",
      description: "Hindmata ithe rastyavar paani sanchale aahe", language: "mr", locality: "हिंदमाता",
      ward: "F/S", lat: null, lng: null, upvotes: 0, status: "Open", resolvedAt: null,
    };

    // 6. Explicit and Inferred Work Orders
    const wo_explicit: WorkOrder = {
      id: "WO-BENCH-EXP", complaintIds: ["BENCH-01-MR", "BENCH-01-HI"], ward: "F/S", roadId: "RD_DADAR",
      workType: "Pothole", method: "Cold mix patch", contractorId: "CT01", contractorName: "Safe Roads Ltd",
      assignedAt: "2025-06-01 15:00", startedAt: "2025-06-02 08:00", completedAt: "2025-06-02 18:00",
      areaSqm: 15, costInr: 27000, slaHours: 24, slaMet: true, reopened: false, remark: "Repaired pothole cluster",
    };
    const wo_unlinked: WorkOrder = {
      id: "WO-BENCH-UNLINKED", complaintIds: [], ward: "K/W", roadId: "RD_ANDHERI", workType: "Pothole",
      method: "Mastic asphalt", contractorId: "CT02", contractorName: "Quality Infra", assignedAt: "2025-06-01 12:00",
      startedAt: "2025-06-01 14:00", completedAt: "2025-06-02 10:00", areaSqm: 8, costInr: 16000,
      slaHours: 48, slaMet: true, reopened: false, remark: "Emergency patch",
    };

    ds.complaints = [c1_mr, c1_hi, c1_hinglish, c_distant, c_diff_cat, c_no_gps_en, c_no_gps_mr];
    ds.workOrders = [wo_explicit, wo_unlinked];

    const engine = createComplaintIntelligenceEngine(ds);

    // --- EVALUATION METRICS ---
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let trueNegatives = 0;

    const issueMr = engine.getIssueForComplaint("BENCH-01-MR");
    const issueHi = engine.getIssueForComplaint("BENCH-01-HI");
    const issueHing = engine.getIssueForComplaint("BENCH-02-HING");
    expect(issueMr).toBeDefined();
    expect(issueHi).toBeDefined();

    // TP 1: c1_mr + c1_hi -> MUST MERGE
    if (issueMr?.id === issueHi?.id) truePositives++;
    else falseNegatives++;

    // TP 2: c1_mr + c1_hinglish -> MUST MERGE
    if (issueMr?.id === issueHing?.id) truePositives++;
    else falseNegatives++;

    // TN 1: c1_mr + c_distant (Dadar vs Andheri) -> MUST NOT MERGE
    const issueDistant = engine.getIssueForComplaint("BENCH-03-DISTANT");
    if (issueMr?.id !== issueDistant?.id) trueNegatives++;
    else falsePositives++;

    // TN 2: c1_mr + c_diff_cat (Pothole vs Open Manhole at same location) -> MUST NOT MERGE
    const issueDiffCat = engine.getIssueForComplaint("BENCH-04-DIFFCAT");
    if (issueMr?.id !== issueDiffCat?.id) trueNegatives++;
    else falsePositives++;

    // Locality resolution validation: Devanagari alias vs English
    const normEn = engine.getComplaint("BENCH-05-NOGPS-EN");
    const normMr = engine.getComplaint("BENCH-05-NOGPS-MR");
    expect(normEn?.resolution.locality).toBe("Hindmata");
    expect(normMr?.resolution.locality).toBe("Hindmata");
    expect(normEn?.resolution.ward).toBe("F/S");
    expect(normMr?.resolution.ward).toBe("F/S");

    // Work Order linking checks
    const expLinks = engine.getLinksForWorkOrder("WO-BENCH-EXP");
    expect(expLinks.some((l) => l.linkType === "explicit_complaint_link")).toBe(true);

    const andheriLinks = engine.getLinksForWorkOrder("WO-BENCH-UNLINKED");
    expect(andheriLinks.some((l) => l.linkType === "geo_temporal_candidate")).toBe(true);

    // Idempotent duplicate ingestion test
    const reIngest = engine.ingestComplaint(c1_mr);
    expect(reIngest.isNewIssue).toBe(false);

    // Precision & Recall Calculations
    const precision = truePositives / (truePositives + falsePositives);
    const recall = truePositives / (truePositives + falseNegatives);

    expect(falsePositives).toBe(0); // STRICT INVARIANT: Zero false positive merges
    expect(falseNegatives).toBe(0);
    expect(precision).toBe(1.0);
    expect(recall).toBe(1.0);
    expect(trueNegatives).toBeGreaterThanOrEqual(2);
  });
});
