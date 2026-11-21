import { describe, expect, it } from "vitest";
import { createDatasetIndexes, getDatasetIndexes } from "../lib/rupee/indexes";
import { loadDataset } from "../lib/rupee/load";

describe("rupee data access indexes", () => {
  const ds = loadDataset();
  const indexes = createDatasetIndexes(ds);

  it("indexes all entities accurately", () => {
    expect(indexes.complaintsById.size).toBe(ds.complaints.length);
    expect(indexes.workOrdersById.size).toBe(ds.workOrders.length);
    expect(indexes.roadsById.size).toBe(ds.roads.length);
    expect(indexes.wardsByCode.size).toBe(ds.wards.length);
    expect(indexes.contractorsById.size).toBe(ds.contractors.length);
  });

  it("provides O(1) lookups for complaints, roads, and work orders", () => {
    const firstComplaint = ds.complaints[0];
    expect(indexes.getComplaint(firstComplaint.id)).toBe(firstComplaint);

    const firstRoad = ds.roads[0];
    expect(indexes.getRoad(firstRoad.id)).toBe(firstRoad);

    const firstWorkOrder = ds.workOrders[0];
    expect(indexes.getWorkOrder(firstWorkOrder.id)).toBe(firstWorkOrder);

    const firstContractor = ds.contractors[0];
    expect(indexes.getContractor(firstContractor.id)).toBe(firstContractor);

    const firstWard = ds.wards[0];
    expect(indexes.getWard(firstWard.code)).toBe(firstWard);
  });

  it("indexes work orders by linked complaint ID", () => {
    // Find a work order that has linked complaint IDs
    const woWithComplaints = ds.workOrders.find((w) => w.complaintIds.length > 0);
    expect(woWithComplaints).toBeDefined();

    if (woWithComplaints) {
      const linkedComplaintId = woWithComplaints.complaintIds[0];
      const orders = indexes.getWorkOrdersForComplaint(linkedComplaintId);
      expect(orders.some((o) => o.id === woWithComplaints.id)).toBe(true);
    }

    // Non-existent complaint ID should return empty array
    expect(indexes.getWorkOrdersForComplaint("NON_EXISTENT_ID")).toEqual([]);
  });

  it("indexes roads and work orders by ward code", () => {
    const wardA_Roads = indexes.getRoadsForWard("A");
    expect(wardA_Roads.length).toBeGreaterThan(0);
    expect(wardA_Roads.every((r) => r.ward === "A")).toBe(true);

    const wardA_Orders = indexes.getWorkOrdersForWard("A");
    expect(wardA_Orders.length).toBeGreaterThan(0);
    expect(wardA_Orders.every((o) => o.ward === "A")).toBe(true);
  });

  it("indexes work orders by road and contractor", () => {
    const firstRoad = ds.roads[0];
    const roadOrders = indexes.getWorkOrdersForRoad(firstRoad.id);
    expect(roadOrders.every((o) => o.roadId === firstRoad.id)).toBe(true);

    const firstContractor = ds.contractors[0];
    const contractorOrders = indexes.getWorkOrdersForContractor(firstContractor.id);
    expect(contractorOrders.every((o) => o.contractorId === firstContractor.id)).toBe(true);
  });

  it("resolves localities by standard name and alias", () => {
    const byName = indexes.findLocality("Hindmata");
    expect(byName).toBeDefined();
    expect(byName?.name).toBe("Hindmata");

    // Case-insensitive lookup
    const lower = indexes.findLocality("hindmata");
    expect(lower).toBe(byName);

    // Devanagari alias lookup if present
    const devanagari = indexes.findLocality("हिंदमाता");
    expect(devanagari).toBeDefined();
    expect(devanagari?.name).toBe("Hindmata");
  });

  it("does not mutate the source dataset", () => {
    const rawCount = ds.complaints.length;
    createDatasetIndexes(ds);
    expect(ds.complaints.length).toBe(rawCount);
  });

  it("returns singleton cached indexes consistently", () => {
    const idx1 = getDatasetIndexes();
    const idx2 = getDatasetIndexes();
    expect(idx1).toBe(idx2);
  });
});
