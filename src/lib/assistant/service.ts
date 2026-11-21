import "server-only";

import type { ComplaintIntelligenceEngine } from "@/lib/matching/engine";
import type { Dataset } from "@/lib/rupee/load";
import { queryClaudeAssistant } from "./claude";
import { buildEvidenceBundle } from "./evidence";
import { validateAssistantRequest } from "./security";
import type {
  AssistantLanguage,
  AssistantQueryRequest,
  AssistantStructuredResponse,
} from "./types";

/** Detects language from query text if not explicitly specified. */
export function detectLanguage(text: string, fallback: AssistantLanguage = "en"): AssistantLanguage {
  // Check for Devanagari Unicode block (\u0900-\u097F)
  if (/[\u0900-\u097F]/.test(text)) {
    // Specific Marathi tokens
    if (/(आहे|नाही|झाले|झाली|झाला|केले|केली|पडला|पडली|रस्त्यावर|कधी|माझ्या|माझे|माझी|तक्रारीवर|तक्रार|कारवाई)/.test(text)) return "mr";
    return "hi";
  }
  return fallback;
}

/** Extracts complaint ID from user query text (e.g. "What happened to BMC25-000005?"). */
export function extractComplaintIdFromQuery(text: string): string | null {
  const match = text.match(/\b(BMC\d{2}-\d{6}|BMC\d{2}-\d+)\b/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Master service entrypoint for citizen accountability questions.
 * Validates request safety, retrieves bounded evidence, calls Claude tool loop,
 * and validates structured output.
 */
export async function processCitizenAccountabilityQuery(
  request: AssistantQueryRequest,
  engine: ComplaintIntelligenceEngine,
  dataset: Dataset,
): Promise<AssistantStructuredResponse> {
  const clientIdentifier = request.clientIp ?? request.sessionId ?? "anonymous";

  // 1. Security & Input Validation
  const sec = validateAssistantRequest(request.query, clientIdentifier);
  if (!sec.allowed) {
    return {
      answer: sec.rejectionReason ?? "Your request could not be processed due to safety constraints.",
      responseLanguage: request.preferredLanguage ?? "en",
      complaintStatus: "Rejected",
      linkedIssueReference: null,
      workOrderReferences: [],
      relevantTimelineEvents: [],
      evidenceSources: [],
      nextAction: "Please rephrase your question regarding a specific road complaint or repair work order.",
      limitations: ["Request failed security check."],
      isOfficialLink: false,
      contractorName: null,
      costInr: null,
    };
  }

  // 2. Language Resolution
  const language = request.preferredLanguage ?? detectLanguage(sec.sanitizedQuery);

  // 3. Resolve Target Complaint ID
  const targetComplaintId =
    request.complaintId?.trim() || extractComplaintIdFromQuery(sec.sanitizedQuery);

  // 4. Retrieve Bounded Evidence Bundle
  const evidence = targetComplaintId
    ? buildEvidenceBundle(targetComplaintId, engine, dataset)
    : null;

  // 5. Invoke Claude Function Calling / Factual Synthesis
  const toolCtx = { engine, dataset };
  return queryClaudeAssistant(sec.sanitizedQuery, {
    evidence,
    toolCtx,
    language,
  });
}
