import type { Dataset } from "../load";
import {
  STANDARD_WARDS,
  checkDuplicateIds,
  validateCoordinates,
  validateDateString,
  validateWorkOrderRelationships,
} from "./rules";
import type { EntityValidationSummary, ValidationIssue, ValidationReport } from "./types";

function checkWardCode(
  wardCode: string | null | undefined,
  entity: string,
  recordId: string,
  optional = false,
): ValidationIssue[] {
  if (wardCode == null || wardCode.trim() === "") {
    if (optional) return [];
    return [
      {
        severity: "error",
        entity,
        recordId,
        code: "INVALID_WARD_CODE",
        message: `Missing ward code in ${entity} "${recordId}".`,
      },
    ];
  }
  if (!STANDARD_WARDS.has(wardCode)) {
    return [
      {
        severity: "error",
        entity,
        recordId,
        code: "INVALID_WARD_CODE",
        message: `Unknown or non-standard ward code "${wardCode}" in ${entity} "${recordId}".`,
      },
    ];
  }
  return [];
}

function checkNonNegative(
  val: number | null | undefined,
  field: string,
  entity: string,
  recordId: string,
): ValidationIssue[] {
  if (val == null || !Number.isFinite(val) || val < 0) {
    return [
      {
        severity: "error",
        entity,
        recordId,
        code: "INVALID_NUMERIC",
        field,
        message: `Field "${field}" in ${entity} "${recordId}" must be non-negative, got ${val}.`,
      },
    ];
  }
  return [];
}

export function validateDataset(ds: Dataset): ValidationReport {
  const issues: ValidationIssue[] = [];

  const wardCodes = new Set(ds.wards.map((w) => w.code));
  const roadIds = new Set(ds.roads.map((r) => r.id));
  const contractorIds = new Set(ds.contractors.map((c) => c.id));
  const rateCardMethods = new Set(ds.rateCard.map((rc) => rc.method));
  const complaintIds = new Set(ds.complaints.map((c) => c.id));

  // 1. Wards
  issues.push(...checkDuplicateIds(ds.wards, (w) => w.code, "ward"));
  for (const w of ds.wards) {
    issues.push(...checkWardCode(w.code, "ward", w.code));
    issues.push(...validateCoordinates(w.centroid.lat, w.centroid.lng, "ward", w.code));
    issues.push(...checkNonNegative(w.budgetInr, "budgetInr", "ward", w.code));
    issues.push(...checkNonNegative(w.areaKm2, "areaKm2", "ward", w.code));
    issues.push(...checkNonNegative(w.population, "population", "ward", w.code));
  }

  // 2. Roads
  issues.push(...checkDuplicateIds(ds.roads, (r) => r.id, "road"));
  for (const r of ds.roads) {
    issues.push(...checkWardCode(r.ward, "road", r.id));
    issues.push(...validateCoordinates(r.start.lat, r.start.lng, "road_start", r.id));
    issues.push(...validateCoordinates(r.end.lat, r.end.lng, "road_end", r.id));
    issues.push(...checkNonNegative(r.lengthM, "lengthM", "road", r.id));
    issues.push(...checkNonNegative(r.lanes, "lanes", "road", r.id));
  }

  // 3. Contractors
  issues.push(...checkDuplicateIds(ds.contractors, (c) => c.id, "contractor"));
  for (const c of ds.contractors) {
    if (c.empanelledSince < 1900 || c.empanelledSince > 2100) {
      issues.push({
        severity: "error",
        entity: "contractor",
        recordId: c.id,
        code: "INVALID_NUMERIC",
        field: "empanelledSince",
        message: `Invalid empanelment year ${c.empanelledSince} for contractor "${c.id}".`,
      });
    }
  }

  // 4. Rate Card
  issues.push(...checkDuplicateIds(ds.rateCard, (rc) => rc.method, "rate_card"));
  for (const rc of ds.rateCard) {
    issues.push(...checkNonNegative(rc.rateInr, "rateInr", "rate_card", rc.method));
  }

  // 5. Work Orders
  issues.push(...checkDuplicateIds(ds.workOrders, (wo) => wo.id, "work_order"));
  issues.push(...validateWorkOrderRelationships(ds, roadIds, contractorIds, rateCardMethods, complaintIds));
  for (const wo of ds.workOrders) {
    issues.push(...checkWardCode(wo.ward, "work_order", wo.id));
    issues.push(...checkNonNegative(wo.costInr, "costInr", "work_order", wo.id));
    issues.push(...checkNonNegative(wo.areaSqm, "areaSqm", "work_order", wo.id));
    issues.push(...validateDateString(wo.assignedAt, "work_order", wo.id, "assignedAt"));
    issues.push(...validateDateString(wo.startedAt, "work_order", wo.id, "startedAt", true));
    issues.push(...validateDateString(wo.completedAt, "work_order", wo.id, "completedAt", true));
  }

  // 6. Complaints
  issues.push(...checkDuplicateIds(ds.complaints, (c) => c.id, "complaint"));
  for (const c of ds.complaints) {
    issues.push(...checkWardCode(c.ward, "complaint", c.id, true));
    issues.push(...validateCoordinates(c.lat, c.lng, "complaint", c.id, true));
    issues.push(...validateDateString(c.receivedAt, "complaint", c.id, "receivedAt"));
    issues.push(...validateDateString(c.resolvedAt, "complaint", c.id, "resolvedAt", true));
    issues.push(...checkNonNegative(c.upvotes, "upvotes", "complaint", c.id));
  }

  // 7. Accidents
  issues.push(...checkDuplicateIds(ds.accidents, (a) => a.id, "accident"));
  for (const a of ds.accidents) {
    issues.push(...checkWardCode(a.ward, "accident", a.id));
    issues.push(...validateCoordinates(a.lat, a.lng, "accident", a.id));
    issues.push(...validateDateString(a.occurredAt, "accident", a.id, "occurredAt"));
    if (a.roadId && !roadIds.has(a.roadId)) {
      issues.push({
        severity: "warning",
        entity: "accident",
        recordId: a.id,
        code: "BROKEN_ROAD_REF",
        field: "roadId",
        message: `Accident "${a.id}" references non-existent road "${a.roadId}".`,
      });
    }
  }

  // 8. Flood Hotspots
  issues.push(...checkDuplicateIds(ds.floodHotspots, (fh) => fh.id, "flood_hotspot"));
  for (const fh of ds.floodHotspots) {
    issues.push(...checkWardCode(fh.ward, "flood_hotspot", fh.id));
    issues.push(...validateCoordinates(fh.lat, fh.lng, "flood_hotspot", fh.id));
    issues.push(...checkNonNegative(fh.floodThresholdMm, "floodThresholdMm", "flood_hotspot", fh.id));
  }

  // 9. Facilities
  issues.push(...checkDuplicateIds(ds.facilities, (f) => f.id, "facility"));
  for (const f of ds.facilities) {
    issues.push(...checkWardCode(f.ward, "facility", f.id));
    issues.push(...validateCoordinates(f.lat, f.lng, "facility", f.id));
  }

  return buildReport(ds, issues);
}

function buildReport(ds: Dataset, issues: ValidationIssue[]): ValidationReport {
  const byEntity: Record<string, EntityValidationSummary> = {};

  const registerEntity = (entity: string, total: number) => {
    byEntity[entity] = { total, valid: total, invalid: 0, errors: 0, warnings: 0 };
  };

  registerEntity("ward", ds.wards.length);
  registerEntity("road", ds.roads.length);
  registerEntity("contractor", ds.contractors.length);
  registerEntity("rate_card", ds.rateCard.length);
  registerEntity("work_order", ds.workOrders.length);
  registerEntity("complaint", ds.complaints.length);
  registerEntity("accident", ds.accidents.length);
  registerEntity("flood_hotspot", ds.floodHotspots.length);
  registerEntity("facility", ds.facilities.length);

  const invalidRecordKeys = new Set<string>();
  let errorCount = 0;
  let warningCount = 0;

  for (const issue of issues) {
    const summary = byEntity[issue.entity] ?? {
      total: 0,
      valid: 0,
      invalid: 0,
      errors: 0,
      warnings: 0,
    };

    if (issue.severity === "error") {
      errorCount += 1;
      summary.errors += 1;
      const key = `${issue.entity}:${issue.recordId}`;
      if (!invalidRecordKeys.has(key)) {
        invalidRecordKeys.add(key);
        summary.invalid += 1;
        summary.valid = Math.max(0, summary.total - summary.invalid);
      }
    } else {
      warningCount += 1;
      summary.warnings += 1;
    }
    byEntity[issue.entity] = summary;
  }

  const totalRecords =
    ds.wards.length +
    ds.roads.length +
    ds.contractors.length +
    ds.rateCard.length +
    ds.workOrders.length +
    ds.complaints.length +
    ds.accidents.length +
    ds.floodHotspots.length +
    ds.facilities.length;

  const invalidRecords = invalidRecordKeys.size;
  const validRecords = totalRecords - invalidRecords;

  return {
    totalRecords,
    validRecords,
    invalidRecords,
    errorCount,
    warningCount,
    issues,
    byEntity,
    isValid: errorCount === 0,
  };
}
