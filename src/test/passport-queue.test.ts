import { describe, expect, it } from "vitest";
import { getActionQueueSummary, listActionQueueItems } from "@/lib/passport/queue";

describe("Ward Engineer Action Queue", () => {
  it("generates prioritized action items from audit flags and chronic defects", () => {
    const queue = listActionQueueItems();
    expect(queue.length).toBeGreaterThan(0);

    const first = queue[0];
    expect(["critical", "high", "medium"]).toContain(first.priority);
    expect(first.headline.length).toBeGreaterThan(5);
    expect(first.recommendedAction.length).toBeGreaterThan(10);
    expect(first.reason.length).toBeGreaterThan(5);
    expect(first.evidenceCount).toBeGreaterThanOrEqual(1);
    expect(["new", "under_review", "action_required", "resolved"]).toContain(first.status);
  });

  it("filters action queue items by ward", () => {
    const wardBQueue = listActionQueueItems("B");
    for (const item of wardBQueue) {
      expect(item.ward).toBe("B");
    }
  });

  it("calculates accurate summary stats of action items", () => {
    const summary = getActionQueueSummary();
    expect(summary.totalItems).toBeGreaterThan(0);
    expect(summary.criticalCount).toBeGreaterThanOrEqual(0);
    expect(summary.highCount).toBeGreaterThanOrEqual(0);
    expect(summary.totalAtRiskInr).toBeGreaterThan(0);
    expect(summary.byCategory.cost_anomaly).toBeGreaterThanOrEqual(0);
    expect(summary.byCategory.repeat_work_cluster).toBeGreaterThanOrEqual(0);
  });
});
