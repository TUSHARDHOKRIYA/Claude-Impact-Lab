import { describe, expect, it } from "vitest";
import { buildIssueService } from "../lib/matching/issues/service";
import { resolveExplicitWorkOrderLinks } from "../lib/matching/linking/explicit";
import { generateInferredWorkOrderCandidates } from "../lib/matching/linking/inferred";
import { linkWorkOrdersToIssues } from "../lib/matching/linking/linker";
import type { NormalizedComplaintRecord } from "../lib/matching/types";
import type { WorkOrder } from "../lib/rupee/types";

function mockWorkOrder(overrides: Partial<WorkOrder>): WorkOrder {
  return {
    id: "WO-01",
    complaintIds: [],
    ward: "F/S",
    roadId: "RD001",
    workType: "Pothole",
    method: "Cold mix patch",
    contractorId: "CT01",
    contractorName: "Safe Roads Ltd",
    assignedAt: "2025-06-02 08:00",
    startedAt: "2025-06-02 12:00",
    completedAt: "2025-06-03 18:00",
    areaSqm: 12,
    costInr: 21600,
    slaHours: 24,
    slaMet: true,
    reopened: false,
    remark: "Patched",
    ...overrides,
  };
}

function mockComplaint(overrides: Partial<NormalizedComplaintRecord>): NormalizedComplaintRecord {
  return {
    id: "COMP-01",
    receivedAt: "2025-06-01 10:00",
    normalizedTimestamp: "2025-06-01T10:00:00.000Z",
    channel: "app",
    channelRaw: "MyBMC App",
    rawCategory: "Pothole",
    canonicalCategory: "pothole",
    inferredCategory: null,
    rawDescription: "Pothole on main road",
    cleanText: "pothole on main road",
    tokens: ["pothole", "main", "road"],
    language: "en",
    rawLocality: "Hindmata",
    gps: { lat: 19.003, lng: 72.84, accuracyM: 10 },
    status: "Open",
    upvotes: 0,
    resolution: {
      roadId: "RD001",
      roadName: "Dr Ambedkar Road",
      ward: "F/S",
      locality: "Hindmata",
      distanceToRoadM: 10,
      method: "gps_road_snap",
      confidence: 0.95,
      warnings: [],
    },
    ...overrides,
  };
}

describe("matching work-order linking and outcome tracking", () => {
  it("resolves explicit links and detects broken complaint references", () => {
    const c1 = mockComplaint({ id: "BMC25-001" });
    const cMap = new Map([[c1.id, c1]]);
    const issueService = buildIssueService([c1], []);

    const woValid = mockWorkOrder({ id: "WO-01", complaintIds: ["BMC25-001"] });
    const woBroken = mockWorkOrder({ id: "WO-02", complaintIds: ["BMC25-NONEXISTENT"] });

    const result = resolveExplicitWorkOrderLinks([woValid, woBroken], cMap, issueService);
    expect(result.links).toHaveLength(1);
    expect(result.links[0].linkType).toBe("explicit_complaint_link");
    expect(result.links[0].confidence).toBe("exact");
    expect(result.links[0].decisionStatus).toBe("accepted");

    expect(result.brokenReferences).toHaveLength(1);
    expect(result.brokenReferences[0]).toEqual({
      workOrderId: "WO-02",
      complaintId: "BMC25-NONEXISTENT",
    });
  });

  it("generates inferred candidate links for unlinked issues on the same road", () => {
    const cUnlinked = mockComplaint({ id: "BMC25-UNLINKED", resolution: { ...mockComplaint({}).resolution, roadId: "RD001" } });
    const issueService = buildIssueService([cUnlinked], []);

    const wo = mockWorkOrder({ id: "WO-PROB", complaintIds: [], roadId: "RD001", workType: "Pothole" });
    const candidates = generateInferredWorkOrderCandidates(issueService.issues, [wo]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].linkType).toBe("geo_temporal_candidate");
    expect(candidates[0].decisionStatus).toBe("candidate");
    expect(typeof candidates[0].confidence).toBe("number");
  });

  it("classifies issue outcome status accurately across lifecycle stages", () => {
    const c1 = mockComplaint({ id: "C1", normalizedTimestamp: "2025-06-01T10:00:00.000Z" });
    const issueService = buildIssueService([c1], []);

    // 1. Unlinked issue
    const linkResUnlinked = linkWorkOrdersToIssues([], [c1], issueService);
    const outcome1 = linkResUnlinked.outcomesByIssueId.get(issueService.issues[0].id);
    expect(outcome1?.outcomeStatus).toBe("unlinked");

    // 2. Completed work order
    const woCompleted = mockWorkOrder({ id: "WO-C", complaintIds: ["C1"], completedAt: "2025-06-03 18:00" });
    const linkResComp = linkWorkOrdersToIssues([woCompleted], [c1], issueService);
    const outcome2 = linkResComp.outcomesByIssueId.get(issueService.issues[0].id);
    expect(outcome2?.outcomeStatus).toBe("work_order_completed");

    // 3. Reopened within 30 days
    const woReopened = mockWorkOrder({ id: "WO-R", complaintIds: ["C1"], reopened: true });
    const linkResReopen = linkWorkOrdersToIssues([woReopened], [c1], issueService);
    const outcome3 = linkResReopen.outcomesByIssueId.get(issueService.issues[0].id);
    expect(outcome3?.outcomeStatus).toBe("reopened_within_30d");

    // 4. Reported again after repair
    const cLate = mockComplaint({ id: "C_LATE", normalizedTimestamp: "2025-06-10T10:00:00.000Z" });
    const issueServiceMulti = buildIssueService([c1, cLate], [
      {
        complaintAId: "C1",
        complaintBId: "C_LATE",
        score: 0.9,
        features: { sameRoad: true, distanceM: 0, categoryMatch: true, timeDeltaHours: 216, semanticSimilarity: 1, localityMatch: true },
        confidenceTier: "high",
        policy: "auto_merge",
        explanation: "Same pothole recurring",
      },
    ]);
    const linkResLate = linkWorkOrdersToIssues([woCompleted], [c1, cLate], issueServiceMulti);
    const outcome4 = linkResLate.outcomesByIssueId.get(issueServiceMulti.issues[0].id);
    expect(outcome4?.outcomeStatus).toBe("reported_again_after_repair");
  });
});
