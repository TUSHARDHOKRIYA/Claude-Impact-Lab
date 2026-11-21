import type { WorkOrder } from "@/lib/rupee/types";
import { classifyIssueOutcome } from "../issues/outcomes";
import type { IssueService } from "../issues/service";
import type {
  CanonicalIssue,
  IssueOutcome,
  NormalizedComplaintRecord,
  WorkOrderLinkRecord,
} from "../types";
import { resolveExplicitWorkOrderLinks } from "./explicit";
import { generateInferredWorkOrderCandidates } from "./inferred";

export type WorkOrderLinkingResult = {
  allLinks: WorkOrderLinkRecord[];
  explicitLinks: WorkOrderLinkRecord[];
  inferredCandidates: WorkOrderLinkRecord[];
  linksByIssueId: Map<string, WorkOrderLinkRecord[]>;
  linksByWorkOrderId: Map<string, WorkOrderLinkRecord[]>;
  outcomesByIssueId: Map<string, IssueOutcome>;
  brokenReferences: Array<{ workOrderId: string; complaintId: string }>;
};

/**
 * Executes full two-stage work-order linking:
 * 1. Resolves ground-truth explicit links from `linked_complaint_ids`.
 * 2. Generates candidate matches for unlinked issues on the same road segments.
 * 3. Classifies outcome status for every canonical civic issue.
 */
export function linkWorkOrdersToIssues(
  workOrders: WorkOrder[],
  complaints: NormalizedComplaintRecord[],
  issueService: IssueService,
  matchingVersion = "v1.0.0",
): WorkOrderLinkingResult {
  const complaintMap = new Map<string, NormalizedComplaintRecord>();
  const complaintsByIssueId = new Map<string, NormalizedComplaintRecord[]>();

  for (const c of complaints) {
    complaintMap.set(c.id, c);
    const issue = issueService.getIssueForComplaint(c.id);
    if (issue) {
      const list = complaintsByIssueId.get(issue.id) ?? [];
      list.push(c);
      complaintsByIssueId.set(issue.id, list);
    }
  }

  // Stage 1: Explicit Links
  const explicitResult = resolveExplicitWorkOrderLinks(
    workOrders,
    complaintMap,
    issueService,
    matchingVersion,
  );

  // Group explicit links by issue and work order
  const linksByIssueId = new Map<string, WorkOrderLinkRecord[]>();
  const linksByWorkOrderId = new Map<string, WorkOrderLinkRecord[]>();

  for (const link of explicitResult.links) {
    const issueList = linksByIssueId.get(link.issueId) ?? [];
    issueList.push(link);
    linksByIssueId.set(link.issueId, issueList);

    const woList = linksByWorkOrderId.get(link.workOrderId) ?? [];
    woList.push(link);
    linksByWorkOrderId.set(link.workOrderId, woList);
  }

  // Stage 2: Inferred Candidates for unlinked issues
  const unlinkedIssues: CanonicalIssue[] = [];
  for (const issue of issueService.issues) {
    if (!explicitResult.issueIdsWithExplicitLinks.has(issue.id)) {
      unlinkedIssues.push(issue);
    }
  }

  const inferredCandidates = generateInferredWorkOrderCandidates(
    unlinkedIssues,
    workOrders,
    {},
    matchingVersion,
  );

  for (const cand of inferredCandidates) {
    const issueList = linksByIssueId.get(cand.issueId) ?? [];
    issueList.push(cand);
    linksByIssueId.set(cand.issueId, issueList);

    const woList = linksByWorkOrderId.get(cand.workOrderId) ?? [];
    woList.push(cand);
    linksByWorkOrderId.set(cand.workOrderId, woList);
  }

  const allLinks = [...explicitResult.links, ...inferredCandidates];

  // Stage 3: Classify Outcomes for every issue
  const workOrderMap = new Map<string, WorkOrder>(workOrders.map((w) => [w.id, w]));
  const outcomesByIssueId = new Map<string, IssueOutcome>();

  for (const issue of issueService.issues) {
    const issueLinks = linksByIssueId.get(issue.id) ?? [];
    const linkedWos = issueLinks
      .map((l) => workOrderMap.get(l.workOrderId))
      .filter((w): w is WorkOrder => w != null);

    const members = complaintsByIssueId.get(issue.id) ?? [];
    const outcome = classifyIssueOutcome(issue, linkedWos, members);
    outcomesByIssueId.set(issue.id, outcome);
  }

  return {
    allLinks,
    explicitLinks: explicitResult.links,
    inferredCandidates,
    linksByIssueId,
    linksByWorkOrderId,
    outcomesByIssueId,
    brokenReferences: explicitResult.brokenReferences,
  };
}
