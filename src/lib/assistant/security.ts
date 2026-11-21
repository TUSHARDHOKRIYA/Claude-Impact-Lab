/**
 * Security, privacy, rate limiting, and PII masking for Citizen Assistant.
 */

export const MAX_QUERY_LENGTH = 1000;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const MAX_REQUESTS_PER_WINDOW = 20;

// Rate limiter state: IP -> timestamps
const rateLimitMap = new Map<string, number[]>();

export type SecurityCheckResult = {
  allowed: boolean;
  sanitizedQuery: string;
  rejectionReason?: string;
};

/** Masks phone numbers, emails, Aadhaar-like IDs, and personal identifiers. */
export function maskPII(text: string): string {
  if (!text) return "";
  return text
    // Indian 10-digit mobile numbers with optional country code
    .replace(/(?:\+?91|0)?[6-9]\d{9}\b/g, "[PHONE NUMBER REDACTED]")
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL REDACTED]")
    // 12-digit Aadhaar / National ID patterns
    .replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, "[ID REDACTED]")
    .replace(/\b\d{12}\b/g, "[ID REDACTED]");
}

/** Validates request bounds and checks for rate limit exhaustion or injection attacks. */
export function validateAssistantRequest(
  query: string,
  clientIdentifier = "anonymous",
): SecurityCheckResult {
  if (!query || query.trim().length === 0) {
    return { allowed: false, sanitizedQuery: "", rejectionReason: "Query cannot be empty." };
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return {
      allowed: false,
      sanitizedQuery: "",
      rejectionReason: `Query exceeds maximum allowed length of ${MAX_QUERY_LENGTH} characters.`,
    };
  }

  // Sliding window rate limiter
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientIdentifier) ?? [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      sanitizedQuery: "",
      rejectionReason: "Too many requests. Please wait a minute before asking another question.",
    };
  }

  validTimestamps.push(now);
  rateLimitMap.set(clientIdentifier, validTimestamps);

  // Check for malicious prompt injection patterns
  const lower = query.toLowerCase();
  const injectionPatterns = [
    /ignore previous instructions/i,
    /bypass system prompt/i,
    /reveal system prompt/i,
    /what is your system prompt/i,
    /api[-_ ]?key/i,
    /anthropic[-_ ]?key/i,
    /reveal credentials/i,
    /drop table/i,
    /select \* from/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(lower)) {
      return {
        allowed: false,
        sanitizedQuery: "",
        rejectionReason: "Request flagged for safety policy violation. Please ask about road repairs or complaints.",
      };
    }
  }

  return {
    allowed: true,
    sanitizedQuery: maskPII(query.trim()),
  };
}
