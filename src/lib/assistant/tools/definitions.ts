import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages";

export const ASSISTANT_TOOLS: Tool[] = [
  {
    name: "get_complaint",
    description: "Fetch public-safe details of a citizen road complaint by its ID (e.g., BMC25-000005).",
    input_schema: {
      type: "object",
      properties: {
        complaint_id: { type: "string", description: "The complaint ID to look up." },
      },
      required: ["complaint_id"],
    },
  },
  {
    name: "get_canonical_issue",
    description: "Fetch details of the canonical civic issue clustered around this road defect.",
    input_schema: {
      type: "object",
      properties: {
        issue_id: { type: "string", description: "The canonical issue ID (e.g. ISSUE-F_S-00001)." },
      },
      required: ["issue_id"],
    },
  },
  {
    name: "get_road_details",
    description: "Fetch details of a road segment: name, surface, length, and Defect Liability Period (DLP) status.",
    input_schema: {
      type: "object",
      properties: {
        road_id: { type: "string", description: "The municipal road ID (e.g. RD0065)." },
      },
      required: ["road_id"],
    },
  },
  {
    name: "get_work_orders",
    description: "Fetch official BMC repair work orders matching a road ID, work order ID, or issue ID.",
    input_schema: {
      type: "object",
      properties: {
        road_id: { type: "string", description: "Filter by road segment ID." },
        work_order_id: { type: "string", description: "Specific work order ID." },
        issue_id: { type: "string", description: "Filter by associated issue ID." },
      },
    },
  },
  {
    name: "get_contractor_details",
    description: "Fetch contractor name, empanelment history, and historical repair performance.",
    input_schema: {
      type: "object",
      properties: {
        contractor_id: { type: "string", description: "Contractor ID (e.g. CT05)." },
      },
      required: ["contractor_id"],
    },
  },
  {
    name: "get_issue_timeline",
    description: "Retrieve chronological sequence of milestones from initial report to repair completion.",
    input_schema: {
      type: "object",
      properties: {
        issue_id: { type: "string", description: "Canonical issue ID." },
        complaint_id: { type: "string", description: "Optional complaint ID." },
      },
      required: ["issue_id"],
    },
  },
  {
    name: "get_source_evidence",
    description: "Retrieve photo descriptions, reporting channels, and official work-order reference records.",
    input_schema: {
      type: "object",
      properties: {
        complaint_id: { type: "string", description: "Complaint ID." },
        issue_id: { type: "string", description: "Issue ID." },
        work_order_id: { type: "string", description: "Work order ID." },
      },
    },
  },
  {
    name: "get_next_steps",
    description: "Retrieve recommended citizen follow-up actions and escalation paths based on issue status.",
    input_schema: {
      type: "object",
      properties: {
        issue_status: { type: "string", description: "Current status: open, in_progress, completed, reopened, unlinked." },
        days_pending: { type: "number", description: "Days elapsed since the problem was first reported." },
        is_reopened: { type: "boolean", description: "Whether the repair previously failed within 30 days." },
      },
      required: ["issue_status"],
    },
  },
];
