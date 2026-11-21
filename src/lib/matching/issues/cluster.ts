import type {
  CanonicalCategory,
  CanonicalIssue,
  MatchCandidatePair,
  NormalizedChannel,
  NormalizedComplaintRecord,
} from "../types";

class DisjointSet {
  private parent = new Map<string, string>();

  find(id: string): string {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      return id;
    }
    const p = this.parent.get(id)!;
    if (p !== id) {
      const root = this.find(p);
      this.parent.set(id, root);
      return root;
    }
    return p;
  }

  union(idA: string, idB: string): void {
    const rootA = this.find(idA);
    const rootB = this.find(idB);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

function mode<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  let maxCount = 0;
  let modeItem = items[0];

  for (const item of items) {
    const c = (counts.get(item) ?? 0) + 1;
    counts.set(item, c);
    if (c > maxCount) {
      maxCount = c;
      modeItem = item;
    }
  }
  return modeItem;
}

/**
 * Clusters normalized complaints into canonical issues using high-confidence
 * auto-merge policy pairs.
 */
export function clusterComplaintsIntoIssues(
  complaints: NormalizedComplaintRecord[],
  candidatePairs: MatchCandidatePair[],
  matchingVersion = "v1.0.0",
): CanonicalIssue[] {
  const dsu = new DisjointSet();
  const complaintMap = new Map<string, NormalizedComplaintRecord>();

  for (const c of complaints) {
    complaintMap.set(c.id, c);
    dsu.find(c.id);
  }

  // Merge pairs that qualify for auto-merge policy
  for (const pair of candidatePairs) {
    if (pair.policy === "auto_merge") {
      dsu.union(pair.complaintAId, pair.complaintBId);
    }
  }

  // Group complaints by connected root
  const groups = new Map<string, NormalizedComplaintRecord[]>();
  for (const c of complaints) {
    const root = dsu.find(c.id);
    const list = groups.get(root) ?? [];
    list.push(c);
    groups.set(root, list);
  }

  const issues: CanonicalIssue[] = [];
  let issueCounter = 1;

  for (const memberComplaints of groups.values()) {
    // Sort chronologically
    memberComplaints.sort(
      (a, b) => new Date(a.normalizedTimestamp).getTime() - new Date(b.normalizedTimestamp).getTime(),
    );

    const first = memberComplaints[0];
    const last = memberComplaints[memberComplaints.length - 1];

    // Primary road ID
    const roadIds = memberComplaints.map((c) => c.resolution.roadId).filter((r): r is string => r != null);
    const primaryRoadId = mode(roadIds);

    // Primary ward
    const wards = memberComplaints.map((c) => c.resolution.ward).filter((w): w is string => w != null);
    const ward = mode(wards) ?? "UNKNOWN";

    // Category
    const specificCategories = memberComplaints
      .map((c) => c.inferredCategory ?? c.canonicalCategory)
      .filter((cat): cat is CanonicalCategory => cat !== "other" && cat !== "road_surface_other");
    const category = mode(specificCategories) ?? first.canonicalCategory;

    // Sources
    const sources = [...new Set(memberComplaints.map((c) => c.channel))] as NormalizedChannel[];

    // Centroid calculation
    const gpsPoints = memberComplaints.map((c) => c.gps).filter((g): g is NonNullable<typeof g> => g != null);
    let centroid: { lat: number; lng: number } | null = null;
    if (gpsPoints.length > 0) {
      const sumLat = gpsPoints.reduce((acc, p) => acc + p.lat, 0);
      const sumLng = gpsPoints.reduce((acc, p) => acc + p.lng, 0);
      centroid = {
        lat: Number((sumLat / gpsPoints.length).toFixed(6)),
        lng: Number((sumLng / gpsPoints.length).toFixed(6)),
      };
    }

    // Mean location confidence
    const meanConfidence = Number(
      (
        memberComplaints.reduce((acc, c) => acc + c.resolution.confidence, 0) /
        memberComplaints.length
      ).toFixed(2),
    );

    // Locality
    const localities = memberComplaints
      .map((c) => c.resolution.locality ?? c.rawLocality)
      .filter(Boolean);
    const locality = mode(localities);

    const issueId = `ISSUE-${ward.replace("/", "_")}-${String(issueCounter++).padStart(5, "0")}`;

    issues.push({
      id: issueId,
      primaryRoadId,
      ward,
      category,
      firstReportedAt: first.normalizedTimestamp,
      latestReportedAt: last.normalizedTimestamp,
      complaintCount: memberComplaints.length,
      sourceCount: sources.length,
      sources,
      complaintIds: memberComplaints.map((c) => c.id),
      locationConfidence: meanConfidence,
      centroid,
      locality: locality || null,
      recurrence: {
        isRecurrent: memberComplaints.length > 1,
        cycleCount: 1,
        previousWorkOrderIds: [],
      },
      matchingVersion,
      status: "open",
    });
  }

  return issues;
}
