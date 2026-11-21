/**
 * Types for Dataset Validation in Rasta Hisaab.
 * Distinguishes hard data integrity errors from non-blocking contextual warnings.
 */

export type ValidationSeverity = "error" | "warning";

export type ValidationRuleCode =
  | "MISSING_ID"
  | "DUPLICATE_ID"
  | "INVALID_NUMERIC"
  | "MISSING_DATE"
  | "INVALID_COORDINATES"
  | "BROKEN_ROAD_REF"
  | "BROKEN_CONTRACTOR_REF"
  | "UNKNOWN_METHOD"
  | "UNLINKED_COMPLAINT_REF"
  | "INVALID_WARD_CODE"
  | "MALFORMED_GEOJSON";

export type ValidationIssue = {
  severity: ValidationSeverity;
  entity: string;
  recordId: string;
  code: ValidationRuleCode;
  field?: string;
  message: string;
};

export type EntityValidationSummary = {
  total: number;
  valid: number;
  invalid: number;
  errors: number;
  warnings: number;
};

export type ValidationReport = {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  byEntity: Record<string, EntityValidationSummary>;
  isValid: boolean;
};
