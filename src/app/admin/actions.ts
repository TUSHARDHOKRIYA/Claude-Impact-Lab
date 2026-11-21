"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  ADMIN_COOKIE,
  adminCookieOptions,
  isAdminAuthed,
  keyMatches,
  signAdminCookie,
} from "@/lib/admin-auth";
import { clientIp } from "@/lib/client-ip";
import { isReportId } from "@/lib/id";
import { allowRequest } from "@/lib/rate-limit";
import { updateReport } from "@/lib/queries";
import { getRepository } from "@/lib/repo/context";
import { ItemTooLargeError, ReportValidationError } from "@/lib/repo/errors";
import { ISSUE_TYPES, type IssueType, type UpdateReportInput } from "@/lib/types";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60 * 1000;
const NOTE_LIMIT = 2000;
const DESCRIPTION_LIMIT = 2000;

function failSave(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  // Unidentified requests share one bucket instead of skipping the limit.
  const ip = (await clientIp()) ?? "unknown";
  if (!allowRequest(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
    redirect("/admin/login?error=1");
  }

  const password = String(formData.get("password") ?? "");
  if (!keyMatches(password)) {
    redirect("/admin/login?error=1");
  }

  const token = signAdminCookie();
  if (!token) {
    redirect("/admin/login?error=1");
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, adminCookieOptions());
  redirect("/admin");
}

export async function logout() {
  const jar = await cookies();
  const options = adminCookieOptions();
  jar.delete({
    name: ADMIN_COOKIE,
    path: options.path,
    secure: options.secure,
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
  });
  redirect("/admin/login");
}

function asIssueType(value: FormDataEntryValue | null): IssueType | undefined {
  if (typeof value !== "string") return undefined;
  return ISSUE_TYPES.includes(value as IssueType) ? (value as IssueType) : undefined;
}

function requireReportId(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !isReportId(value)) {
    failSave("That report is not on the desk.");
  }
  return value;
}

export async function updateReportAction(formData: FormData) {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const id = requireReportId(formData.get("id"));
  const issueType = asIssueType(formData.get("issueType"));
  if (!issueType) failSave("Choose an issue type.");

  const recursRaw = String(formData.get("recurs") ?? "");
  if (recursRaw !== "true" && recursRaw !== "false") {
    failSave("Say whether this condition recurs.");
  }

  const rawDescription = String(formData.get("description") ?? "").trim();
  if (rawDescription.length > DESCRIPTION_LIMIT) failSave("Description is too long.");
  const description = rawDescription.length > 0 ? rawDescription : null;
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > NOTE_LIMIT) failSave("Note is too long.");
  const photo = String(formData.get("photo") ?? "");

  const repo = getRepository();
  const current = await repo.getReport(id);
  if (!current) failSave("That report is not on the desk.");

  const input: UpdateReportInput = { id, issueType, description, recurs: recursRaw === "true" };
  if (photo) input.photo = photo;

  try {
    const updated = await updateReport(input);
    if (!updated) failSave("That report is not on the desk.");
  } catch (error) {
    if (error instanceof ReportValidationError || error instanceof ItemTooLargeError) {
      failSave(error.message);
    }
    failSave("Could not save those changes.");
  }

  let noteError: string | undefined;
  if (note.length > 0) {
    try {
      await repo.addDeskNote(id, note);
    } catch {
      noteError = "The report was saved but the note was not.";
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/reports/${id}`);
  if (noteError) {
    redirect(
      `/admin?saved=${encodeURIComponent(id)}&error=${encodeURIComponent(noteError)}`,
    );
  }
  redirect(`/admin?saved=${encodeURIComponent(id)}`);
}
