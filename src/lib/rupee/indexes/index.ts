/**
 * Server-side Data Access Indexes for Rasta Hisaab.
 *
 * Precomputes in-memory O(1) Maps for relational queries across complaints,
 * work orders, roads, contractors, wards, and locality aliases, eliminating
 * repeated O(N) full-table scans.
 */

import { LOCALITIES, type Locality } from "@/lib/city";
import { type Complaint, type Dataset, loadDataset } from "../load";
import type { Contractor, Road, Ward, WorkOrder } from "../types";

export type DatasetIndexes = {
  complaintsById: Map<string, Complaint>;
  workOrdersById: Map<string, WorkOrder>;
  roadsById: Map<string, Road>;
  wardsByCode: Map<string, Ward>;
  contractorsById: Map<string, Contractor>;
  workOrdersByComplaintId: Map<string, WorkOrder[]>;
  roadsByWard: Map<string, Road[]>;
  workOrdersByWard: Map<string, WorkOrder[]>;
  workOrdersByRoadId: Map<string, WorkOrder[]>;
  workOrdersByContractorId: Map<string, WorkOrder[]>;
  complaintsByWard: Map<string, Complaint[]>;
  localitiesByAlias: Map<string, Locality>;

  // Fast accessors
  getComplaint: (id: string) => Complaint | undefined;
  getWorkOrder: (id: string) => WorkOrder | undefined;
  getRoad: (id: string) => Road | undefined;
  getWard: (code: string) => Ward | undefined;
  getContractor: (id: string) => Contractor | undefined;
  getWorkOrdersForComplaint: (complaintId: string) => WorkOrder[];
  getRoadsForWard: (wardCode: string) => Road[];
  getWorkOrdersForWard: (wardCode: string) => WorkOrder[];
  getWorkOrdersForRoad: (roadId: string) => WorkOrder[];
  getWorkOrdersForContractor: (contractorId: string) => WorkOrder[];
  getComplaintsForWard: (wardCode: string) => Complaint[];
  findLocality: (query: string) => Locality | undefined;
};

export function createDatasetIndexes(ds: Dataset): DatasetIndexes {
  const complaintsById = new Map<string, Complaint>();
  const complaintsByWard = new Map<string, Complaint[]>();

  for (const c of ds.complaints) {
    complaintsById.set(c.id, c);
    if (c.ward) {
      const list = complaintsByWard.get(c.ward) ?? [];
      list.push(c);
      complaintsByWard.set(c.ward, list);
    }
  }

  const workOrdersById = new Map<string, WorkOrder>();
  const workOrdersByComplaintId = new Map<string, WorkOrder[]>();
  const workOrdersByWard = new Map<string, WorkOrder[]>();
  const workOrdersByRoadId = new Map<string, WorkOrder[]>();
  const workOrdersByContractorId = new Map<string, WorkOrder[]>();

  for (const wo of ds.workOrders) {
    workOrdersById.set(wo.id, wo);

    // Index by linked complaint IDs
    for (const cId of wo.complaintIds) {
      const list = workOrdersByComplaintId.get(cId) ?? [];
      list.push(wo);
      workOrdersByComplaintId.set(cId, list);
    }

    // Index by ward
    const wardList = workOrdersByWard.get(wo.ward) ?? [];
    wardList.push(wo);
    workOrdersByWard.set(wo.ward, wardList);

    // Index by road
    const roadList = workOrdersByRoadId.get(wo.roadId) ?? [];
    roadList.push(wo);
    workOrdersByRoadId.set(wo.roadId, roadList);

    // Index by contractor
    const contractorList = workOrdersByContractorId.get(wo.contractorId) ?? [];
    contractorList.push(wo);
    workOrdersByContractorId.set(wo.contractorId, contractorList);
  }

  const roadsById = new Map<string, Road>();
  const roadsByWard = new Map<string, Road[]>();

  for (const r of ds.roads) {
    roadsById.set(r.id, r);
    const list = roadsByWard.get(r.ward) ?? [];
    list.push(r);
    roadsByWard.set(r.ward, list);
  }

  const wardsByCode = new Map<string, Ward>();
  for (const w of ds.wards) {
    wardsByCode.set(w.code, w);
  }

  const contractorsById = new Map<string, Contractor>();
  for (const c of ds.contractors) {
    contractorsById.set(c.id, c);
  }

  const localitiesByAlias = new Map<string, Locality>();
  for (const loc of LOCALITIES) {
    localitiesByAlias.set(loc.name.toLowerCase().trim(), loc);
    for (const alias of loc.aliases) {
      localitiesByAlias.set(alias.toLowerCase().trim(), loc);
    }
  }

  return {
    complaintsById,
    workOrdersById,
    roadsById,
    wardsByCode,
    contractorsById,
    workOrdersByComplaintId,
    roadsByWard,
    workOrdersByWard,
    workOrdersByRoadId,
    workOrdersByContractorId,
    complaintsByWard,
    localitiesByAlias,

    getComplaint: (id: string) => complaintsById.get(id),
    getWorkOrder: (id: string) => workOrdersById.get(id),
    getRoad: (id: string) => roadsById.get(id),
    getWard: (code: string) => wardsByCode.get(code),
    getContractor: (id: string) => contractorsById.get(id),
    getWorkOrdersForComplaint: (cId: string) => workOrdersByComplaintId.get(cId) ?? [],
    getRoadsForWard: (code: string) => roadsByWard.get(code) ?? [],
    getWorkOrdersForWard: (code: string) => workOrdersByWard.get(code) ?? [],
    getWorkOrdersForRoad: (roadId: string) => workOrdersByRoadId.get(roadId) ?? [],
    getWorkOrdersForContractor: (cId: string) => workOrdersByContractorId.get(cId) ?? [],
    getComplaintsForWard: (code: string) => complaintsByWard.get(code) ?? [],
    findLocality: (query: string) => localitiesByAlias.get(query.toLowerCase().trim()),
  };
}

let cachedIndexes: DatasetIndexes | null = null;

export function getDatasetIndexes(ds?: Dataset): DatasetIndexes {
  if (ds) return createDatasetIndexes(ds);
  if (!cachedIndexes) {
    cachedIndexes = createDatasetIndexes(loadDataset());
  }
  return cachedIndexes;
}
