import { describe, expect, it } from "vitest";
import { loadDataset, type Dataset } from "../lib/rupee/load";
import {
  checkDuplicateIds,
  validateCoordinates,
  validateDateString,
  validateWorkOrderRelationships,
} from "../lib/rupee/validation/rules";
import { validateDataset } from "../lib/rupee/validation/validator";

function cloneDs(ds: Dataset): Dataset {
  return JSON.parse(JSON.stringify(ds));
}

describe("rupee dataset validation", () => {
  it("validates the real dataset and returns a structured report", () => {
    const ds = loadDataset();
    const report = validateDataset(ds);

    expect(report.totalRecords).toBeGreaterThan(0);
    expect(report.validRecords).toBeGreaterThan(0);
    expect(report.totalRecords).toBe(report.validRecords + report.invalidRecords);
    expect(report.byEntity).toHaveProperty("ward");
    expect(report.byEntity).toHaveProperty("road");
    expect(report.byEntity).toHaveProperty("work_order");
    expect(report.byEntity).toHaveProperty("complaint");
    expect(report.byEntity).toHaveProperty("contractor");

    // All wards in the dataset must have valid standard codes
    expect(report.byEntity.ward.errors).toBe(0);
    expect(report.byEntity.ward.total).toBe(24);
  });

  it("detects missing and duplicate identifiers", () => {
    const items = [
      { id: "A1" },
      { id: "A2" },
      { id: "A1" }, // duplicate
      { id: "" },   // missing
    ];
    const issues = checkDuplicateIds(items, (i) => i.id, "item");
    expect(issues).toHaveLength(2);
    expect(issues.some((i) => i.code === "DUPLICATE_ID")).toBe(true);
    expect(issues.some((i) => i.code === "MISSING_ID")).toBe(true);
  });

  it("detects out-of-range and non-finite coordinates", () => {
    const err1 = validateCoordinates(100, 72.8, "test", "T1");
    expect(err1).toHaveLength(1);
    expect(err1[0].code).toBe("INVALID_COORDINATES");
    expect(err1[0].severity).toBe("error");

    const err2 = validateCoordinates(Number.NaN, 72.8, "test", "T2");
    expect(err2).toHaveLength(1);
    expect(err2[0].code).toBe("INVALID_COORDINATES");

    // Outside Mumbai warning
    const warn = validateCoordinates(12.97, 77.59, "test", "T3"); // Bangalore
    expect(warn.some((i) => i.severity === "warning")).toBe(true);
  });

  it("detects invalid date formats", () => {
    const issues = validateDateString("not-a-date", "test", "T1", "dateField");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("MISSING_DATE");
    expect(issues[0].severity).toBe("error");

    const valid = validateDateString("2025-06-15", "test", "T2", "dateField");
    expect(valid).toHaveLength(0);
  });

  it("detects broken road and contractor references in work orders", () => {
    const ds = cloneDs(loadDataset());
    ds.workOrders = [
      {
        id: "WO_TEST_ERR",
        complaintIds: ["COMP_NONEXISTENT"],
        ward: "A",
        roadId: "ROAD_NONEXISTENT",
        workType: "Pothole",
        method: "UNKNOWN_METHOD_XYZ",
        contractorId: "CON_NONEXISTENT",
        contractorName: "Phantom",
        assignedAt: "2025-06-01",
        startedAt: "2025-06-02",
        completedAt: "2025-06-03",
        areaSqm: 10,
        costInr: 5000,
        slaHours: 24,
        slaMet: true,
        reopened: false,
        remark: "",
      },
    ];

    const roadIds = new Set(["ROAD_REAL"]);
    const contractorIds = new Set(["CON_REAL"]);
    const rateCardMethods = new Set(["Cold mix patch"]);
    const complaintIds = new Set(["COMP_REAL"]);

    const issues = validateWorkOrderRelationships(
      ds,
      roadIds,
      contractorIds,
      rateCardMethods,
      complaintIds,
    );

    expect(issues.some((i) => i.code === "BROKEN_ROAD_REF" && i.severity === "error")).toBe(true);
    expect(issues.some((i) => i.code === "BROKEN_CONTRACTOR_REF" && i.severity === "error")).toBe(true);
    expect(issues.some((i) => i.code === "UNKNOWN_METHOD" && i.severity === "warning")).toBe(true);
    expect(issues.some((i) => i.code === "UNLINKED_COMPLAINT_REF" && i.severity === "warning")).toBe(true);
  });

  it("differentiates hard errors from non-blocking warnings", () => {
    const ds = cloneDs(loadDataset());
    const report = validateDataset(ds);

    const errors = report.issues.filter((i) => i.severity === "error");
    const warnings = report.issues.filter((i) => i.severity === "warning");

    expect(report.errorCount).toBe(errors.length);
    expect(report.warningCount).toBe(warnings.length);
  });
});
