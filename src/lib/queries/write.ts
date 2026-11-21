import "server-only";

import { getRepository } from "@/lib/repo/context";
import type { RastabaazRepository } from "@/lib/repo/port";
import type {
  CreateReportInput,
  CreateReportResult,
  ReportRecord,
  UpdateReportInput,
} from "@/lib/types";

function resolveRepo(repo?: RastabaazRepository): RastabaazRepository {
  return repo ?? getRepository();
}

export async function createReport(
  input: CreateReportInput,
  repo?: RastabaazRepository,
): Promise<CreateReportResult> {
  return resolveRepo(repo).createReport(input);
}

export async function updateReport(
  input: UpdateReportInput,
  repo?: RastabaazRepository,
): Promise<ReportRecord | null> {
  return resolveRepo(repo).updateReport(input);
}
