"use server";

import { processCitizenAccountabilityQuery } from "@/lib/assistant/service";
import type { AssistantLanguage, AssistantStructuredResponse } from "@/lib/assistant/types";
import { createComplaintIntelligenceEngine } from "@/lib/matching/engine";
import { loadDataset } from "@/lib/rupee/load";

let cachedEngine: ReturnType<typeof createComplaintIntelligenceEngine> | null = null;

function getEngine() {
  if (!cachedEngine) {
    const ds = loadDataset();
    cachedEngine = createComplaintIntelligenceEngine(ds);
  }
  return cachedEngine;
}

export type AssistantActionResult = {
  response: AssistantStructuredResponse | null;
  error?: string;
};

export async function askAssistantAction(
  query: string,
  complaintId?: string | null,
  preferredLanguage?: AssistantLanguage,
): Promise<AssistantActionResult> {
  if (!query || query.trim() === "") {
    return { response: null, error: "Please enter a question." };
  }

  try {
    const ds = loadDataset();
    const engine = getEngine();

    const response = await processCitizenAccountabilityQuery(
      {
        query: query.trim(),
        complaintId: complaintId?.trim() || null,
        preferredLanguage,
      },
      engine,
      ds,
    );

    return { response };
  } catch (err) {
    console.error("askAssistantAction error:", err);
    return {
      response: null,
      error: "Unable to contact citizen assistant right now. Please try again.",
    };
  }
}
