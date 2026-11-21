import { describe, expect, it } from "vitest";
import { executeAssistantTool } from "../lib/assistant/tools/executor";
import { createComplaintIntelligenceEngine } from "../lib/matching/engine";
import { loadDataset } from "../lib/rupee/load";

describe("assistant read-only retrieval tools", () => {
  const ds = loadDataset();
  const engine = createComplaintIntelligenceEngine(ds);
  const ctx = { engine, dataset: ds };

  it("get_complaint returns public-safe complaint record without PII", () => {
    const firstComplaint = ds.complaints[0];
    const res = executeAssistantTool("get_complaint", { complaint_id: firstComplaint.id }, ctx);

    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.id).toBe(firstComplaint.id);
    expect(data.categoryReported).toBe(firstComplaint.category);
    expect(data).not.toHaveProperty("complainant_id");
    expect(data).not.toHaveProperty("phone");
  });

  it("get_complaint rejects missing or invalid complaint_id", () => {
    const resEmpty = executeAssistantTool("get_complaint", { complaint_id: "" }, ctx);
    expect(resEmpty.success).toBe(false);

    const resNonExistent = executeAssistantTool("get_complaint", { complaint_id: "BMC99-NONEXISTENT" }, ctx);
    expect(resNonExistent.success).toBe(false);
  });

  it("get_canonical_issue returns clustered issue details", () => {
    const firstIssue = engine.issues[0];
    const res = executeAssistantTool("get_canonical_issue", { issue_id: firstIssue.id }, ctx);

    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.id).toBe(firstIssue.id);
    expect(data.ward).toBe(firstIssue.ward);
    expect(data.complaintCount).toBe(firstIssue.complaintCount);
  });

  it("get_road_details returns road specifications and DLP status", () => {
    const firstRoad = ds.roads[0];
    const res = executeAssistantTool("get_road_details", { road_id: firstRoad.id }, ctx);

    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.id).toBe(firstRoad.id);
    expect(data.name).toBe(firstRoad.name);
    expect(data.surface).toBe(firstRoad.surface);
    expect(typeof data.underDlp).toBe("boolean");
  });

  it("get_work_orders filters accurately by work order, road, or issue", () => {
    const firstWo = ds.workOrders[0];
    const res = executeAssistantTool("get_work_orders", { work_order_id: firstWo.id }, ctx);

    expect(res.success).toBe(true);
    const list = res.data as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(firstWo.id);
    expect(list[0].contractorName).toBe(firstWo.contractorName);
  });

  it("get_contractor_details returns historical performance rates", () => {
    const firstContractor = ds.contractors[0];
    const res = executeAssistantTool("get_contractor_details", { contractor_id: firstContractor.id }, ctx);

    expect(res.success).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(data.id).toBe(firstContractor.id);
    expect(data.name).toBe(firstContractor.name);
    expect(typeof data.totalWorkOrders).toBe("number");
  });

  it("get_issue_timeline returns sorted chronological events", () => {
    const firstIssue = engine.issues[0];
    const res = executeAssistantTool("get_issue_timeline", { issue_id: firstIssue.id }, ctx);

    expect(res.success).toBe(true);
    const timeline = res.data as Array<{ timestamp: string; event: string }>;
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].event).toContain("Initial complaint logged");
  });

  it("get_source_evidence returns traceable records", () => {
    const firstComplaint = ds.complaints[0];
    const res = executeAssistantTool("get_source_evidence", { complaint_id: firstComplaint.id }, ctx);

    expect(res.success).toBe(true);
    const evidence = res.data as Array<{ type: string; recordId: string }>;
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence[0].recordId).toBe(firstComplaint.id);
  });

  it("get_next_steps returns actionable escalation advice", () => {
    const resOpen = executeAssistantTool("get_next_steps", { issue_status: "open", is_reopened: false }, ctx);
    expect(resOpen.success).toBe(true);
    const stepsOpen = resOpen.data as string[];
    expect(stepsOpen.some((s) => s.includes("Assistant Commissioner"))).toBe(true);

    const resReopened = executeAssistantTool("get_next_steps", { issue_status: "reopened_within_30d", is_reopened: true }, ctx);
    expect(resReopened.success).toBe(true);
    const stepsReopened = resReopened.data as string[];
    expect(stepsReopened.some((s) => s.includes("Defect Liability"))).toBe(true);
  });

  it("rejects unknown tool invocations safely", () => {
    const res = executeAssistantTool("drop_database_table", {}, ctx);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unknown tool");
  });
});
