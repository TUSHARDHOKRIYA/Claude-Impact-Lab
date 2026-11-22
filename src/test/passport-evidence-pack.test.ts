import { describe, expect, it } from "vitest";
import {
  buildEvidencePack,
  exportEvidencePackCsv,
  exportEvidencePackJson,
} from "@/lib/passport/evidence-pack";
import { getPotholeReceipt } from "@/lib/passport/receipt";

describe("Evidence Pack & Pothole Receipt Exports", () => {
  it("builds an audit-ready evidence pack for RD0001", () => {
    const pack = buildEvidencePack("RD0001");
    expect(pack).not.toBeNull();
    if (!pack) return;

    expect(pack.metadata.roadId).toBe("RD0001");
    expect(pack.metadata.dossierTitle).toContain("RD0001");
    expect(pack.metadata.privacyDisclaimer).toContain("DPDP");
    expect(pack.workOrders.length).toBe(3);
    expect(pack.complaints.length).toBeGreaterThan(0);
    expect(pack.auditDisclaimer).toContain("billed");
  });

  it("exports valid JSON and CSV strings", () => {
    const json = exportEvidencePackJson("RD0001");
    expect(json).not.toBeNull();
    expect(() => JSON.parse(json!)).not.toThrow();

    const csv = exportEvidencePackCsv("RD0001");
    expect(csv).not.toBeNull();
    expect(csv).toContain("AUDIT-READY EVIDENCE PACK");
    expect(csv).toContain("WORK ORDERS TABLE");
    expect(csv).toContain("LINKED CITIZEN COMPLAINTS");
  });

  it("builds a transparent Pothole-to-Rupee receipt for a complaint", () => {
    const receipt = getPotholeReceipt("BMC25-000005");
    expect(receipt).not.toBeNull();
    if (!receipt) return;

    expect(receipt.complaintId).toBe("BMC25-000005");
    expect(receipt.receivedAt).toBeDefined();
    expect(receipt.description.length).toBeGreaterThan(0);
    expect(receipt.missingRecords.length).toBeGreaterThan(0);
    expect(receipt.provenance.dataIntegrityNotice).toContain("Billed");
  });

  it("returns null for non-existent complaints or roads", () => {
    expect(buildEvidencePack("INVALID_ROAD_9999")).toBeNull();
    expect(getPotholeReceipt("INVALID_CMP_9999")).toBeNull();
  });
});
