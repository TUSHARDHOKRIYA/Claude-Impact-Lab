import type { Dataset } from "../load";
import type { ValidationIssue } from "./types";

const MUMBAI_BOUNDS = {
  minLat: 18.85,
  maxLat: 19.35,
  minLng: 72.75,
  maxLng: 73.1,
};

export const STANDARD_WARDS = new Set([
  "A", "B", "C", "D", "E", "F/N", "F/S", "G/N", "G/S",
  "H/E", "H/W", "K/E", "K/W", "L", "M/E", "M/W", "N",
  "P/N", "P/S", "R/C", "R/N", "R/S", "S", "T",
]);

export function checkDuplicateIds<T>(
  items: T[],
  getId: (item: T) => string,
  entity: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const id = getId(item);
    if (!id || id.trim() === "") {
      issues.push({
        severity: "error",
        entity,
        recordId: "unknown",
        code: "MISSING_ID",
        message: `${entity} record is missing an identifier.`,
      });
      continue;
    }
    if (seen.has(id)) {
      issues.push({
        severity: "error",
        entity,
        recordId: id,
        code: "DUPLICATE_ID",
        message: `Duplicate ${entity} ID: "${id}".`,
      });
    } else {
      seen.add(id);
    }
  }

  return issues;
}

export function validateCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
  entity: string,
  recordId: string,
  optional = false,
): ValidationIssue[] {
  if (lat == null || lng == null) {
    if (optional) return [];
    return [
      {
        severity: "error",
        entity,
        recordId,
        code: "INVALID_COORDINATES",
        message: `Missing coordinates for ${entity} "${recordId}".`,
      },
    ];
  }

  const issues: ValidationIssue[] = [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    issues.push({
      severity: "error",
      entity,
      recordId,
      code: "INVALID_COORDINATES",
      message: `Non-finite coordinates (${lat}, ${lng}) for ${entity} "${recordId}".`,
    });
    return issues;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    issues.push({
      severity: "error",
      entity,
      recordId,
      code: "INVALID_COORDINATES",
      message: `Out-of-range coordinates (${lat}, ${lng}) for ${entity} "${recordId}".`,
    });
    return issues;
  }

  // Non-blocking warning if outside greater Mumbai metropolitan region
  if (
    lat < MUMBAI_BOUNDS.minLat ||
    lat > MUMBAI_BOUNDS.maxLat ||
    lng < MUMBAI_BOUNDS.minLng ||
    lng > MUMBAI_BOUNDS.maxLng
  ) {
    issues.push({
      severity: "warning",
      entity,
      recordId,
      code: "INVALID_COORDINATES",
      message: `Coordinates (${lat}, ${lng}) for ${entity} "${recordId}" lie outside standard Mumbai ward bounds.`,
    });
  }

  return issues;
}

export function validateDateString(
  dateStr: string | null | undefined,
  entity: string,
  recordId: string,
  field: string,
  optional = false,
): ValidationIssue[] {
  if (dateStr == null || dateStr.trim() === "") {
    if (optional) return [];
    return [
      {
        severity: "error",
        entity,
        recordId,
        field,
        code: "MISSING_DATE",
        message: `Missing required date for ${field} in ${entity} "${recordId}".`,
      },
    ];
  }

  const parsed = Date.parse(dateStr);
  if (Number.isNaN(parsed)) {
    return [
      {
        severity: "error",
        entity,
        recordId,
        field,
        code: "MISSING_DATE",
        message: `Invalid date format "${dateStr}" in ${field} for ${entity} "${recordId}".`,
      },
    ];
  }

  return [];
}

export function validateWorkOrderRelationships(
  ds: Dataset,
  roadIds: Set<string>,
  contractorIds: Set<string>,
  rateCardMethods: Set<string>,
  complaintIds: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const wo of ds.workOrders) {
    if (!roadIds.has(wo.roadId)) {
      issues.push({
        severity: "error",
        entity: "work_order",
        recordId: wo.id,
        code: "BROKEN_ROAD_REF",
        field: "roadId",
        message: `Work order "${wo.id}" references non-existent road "${wo.roadId}".`,
      });
    }

    if (!contractorIds.has(wo.contractorId)) {
      issues.push({
        severity: "error",
        entity: "work_order",
        recordId: wo.id,
        code: "BROKEN_CONTRACTOR_REF",
        field: "contractorId",
        message: `Work order "${wo.id}" references non-existent contractor "${wo.contractorId}".`,
      });
    }

    if (wo.method && !rateCardMethods.has(wo.method)) {
      issues.push({
        severity: "warning",
        entity: "work_order",
        recordId: wo.id,
        code: "UNKNOWN_METHOD",
        field: "method",
        message: `Work order "${wo.id}" uses method "${wo.method}" not in rate card.`,
      });
    }

    for (const cId of wo.complaintIds) {
      if (!complaintIds.has(cId)) {
        issues.push({
          severity: "warning",
          entity: "work_order",
          recordId: wo.id,
          code: "UNLINKED_COMPLAINT_REF",
          field: "complaintIds",
          message: `Work order "${wo.id}" references unlinked or unknown complaint "${cId}".`,
        });
      }
    }
  }

  return issues;
}
