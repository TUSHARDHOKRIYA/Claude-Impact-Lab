import { getRupee } from "../rupee/index";
import { getRoadPassport } from "./aggregate";

export type RupeeReceiptData = {
  complaintId: string;
  receivedAt: string;
  channel: string;
  category: string;
  description: string;
  locality: string;
  ward: string;
  road: {
    id: string;
    name: string;
    surface: string;
    underDlp: boolean;
  } | null;
  workOrder: {
    id: string;
    assignedAt: string;
    startedAt: string;
    completedAt: string;
    slaHours: number;
    slaMet: boolean;
    reopened: boolean;
    areaSqm: number;
    amountBilledInr: number;
    expectedCostInr: number;
    contractorName: string;
    method: string;
    engineerRemark: string;
  } | null;
  auditStatus: {
    hasFlag: boolean;
    flags: string[];
  };
  missingRecords: string[];
  citizenObservation: {
    verifiedByCitizen: boolean;
    verificationStatus: string;
  };
  provenance: {
    algorithmVersion: string;
    dataIntegrityNotice: string;
  };
};

export function getPotholeReceipt(complaintId: string): RupeeReceiptData | null {
  const { ds, flags } = getRupee();

  // Find complaint
  const complaint = ds.complaints.find((c) => c.id.toLowerCase() === complaintId.toLowerCase());
  if (!complaint) return null;

  // Find linked work order
  const wo = ds.workOrders.find((w) => w.complaintIds.includes(complaint.id));
  const road = wo ? ds.roads.find((r) => r.id === wo.roadId) : null;

  const woFlags = wo ? flags.filter((f) => f.workOrderId === wo.id) : [];

  const missing: string[] = [
    "eMB physical measurement book approvals not in civic dataset",
    "Municipal bank transaction reference & payment vouchers not in dataset",
    "Detailed contractor tender BOQ specifications not in dataset",
  ];
  if (!wo) {
    missing.unshift("No work order linked in municipal records for this complaint");
  } else if (!road) {
    missing.unshift("Road segment geometry unmapped in records");
  }

  const expectedInr = wo
    ? ds.rateCard.find((rc) => rc.method === wo.method)?.rateInr ?? wo.costInr
    : 0;

  return {
    complaintId: complaint.id,
    receivedAt: complaint.receivedAt,
    channel: complaint.channel,
    category: complaint.category,
    description: complaint.description,
    locality: complaint.locality,
    ward: complaint.ward ?? "Unassigned Ward",
    road: road
      ? {
          id: road.id,
          name: road.name,
          surface: road.surface,
          underDlp: road.underDlp,
        }
      : null,
    workOrder: wo
      ? {
          id: wo.id,
          assignedAt: wo.assignedAt,
          startedAt: wo.startedAt,
          completedAt: wo.completedAt,
          slaHours: wo.slaHours,
          slaMet: wo.slaMet,
          reopened: wo.reopened,
          areaSqm: wo.areaSqm,
          amountBilledInr: wo.costInr,
          expectedCostInr: expectedInr * (wo.areaSqm || 1),
          contractorName: wo.contractorName,
          method: wo.method,
          engineerRemark: wo.remark,
        }
      : null,
    auditStatus: {
      hasFlag: woFlags.length > 0,
      flags: woFlags.map((f) => f.reason),
    },
    missingRecords: missing,
    citizenObservation: {
      verifiedByCitizen: false,
      verificationStatus: "Pending independent citizen field observation",
    },
    provenance: {
      algorithmVersion: "2.0.0-pothole-receipt",
      dataIntegrityNotice:
        "Billed amount reflects work order invoice figures, not confirmed payment. Simulated BMC records.",
    },
  };
}
