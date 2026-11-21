import type { CanonicalIssue, MatchCandidatePair, NormalizedComplaintRecord } from "../types";
import { clusterComplaintsIntoIssues } from "./cluster";

export type IssueService = {
  issues: CanonicalIssue[];
  issueById: Map<string, CanonicalIssue>;
  issueIdByComplaintId: Map<string, string>;
  getIssue: (id: string) => CanonicalIssue | undefined;
  getIssueForComplaint: (complaintId: string) => CanonicalIssue | undefined;
};

export function buildIssueService(
  complaints: NormalizedComplaintRecord[],
  candidatePairs: MatchCandidatePair[],
  matchingVersion = "v1.0.0",
): IssueService {
  const issues = clusterComplaintsIntoIssues(complaints, candidatePairs, matchingVersion);
  const issueById = new Map<string, CanonicalIssue>();
  const issueIdByComplaintId = new Map<string, string>();

  for (const issue of issues) {
    issueById.set(issue.id, issue);
    for (const cId of issue.complaintIds) {
      issueIdByComplaintId.set(cId, issue.id);
    }
  }

  return {
    issues,
    issueById,
    issueIdByComplaintId,
    getIssue: (id: string) => issueById.get(id),
    getIssueForComplaint: (cId: string) => {
      const issueId = issueIdByComplaintId.get(cId);
      return issueId ? issueById.get(issueId) : undefined;
    },
  };
}
