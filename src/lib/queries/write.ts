import "server-only";

import { getRepository } from "@/lib/repo/context";
import type { KhabarRepository } from "@/lib/repo/port";
import type {
  CreateReportInput,
  CreateReportResult,
  ReportRecord,
  UpdateReportInput,
} from "@/lib/types";

function resolveRepo(repo?: KhabarRepository): KhabarRepository {
  return repo ?? getRepository();
}

export async function createReport(
  input: CreateReportInput,
  repo?: KhabarRepository,
): Promise<CreateReportResult> {
  return resolveRepo(repo).createReport(input);
}

export async function updateReport(
  input: UpdateReportInput,
  repo?: KhabarRepository,
): Promise<ReportRecord | null> {
  return resolveRepo(repo).updateReport(input);
}
