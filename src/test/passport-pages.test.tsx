import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrintButton } from "@/components/passport/PrintButton";
import { PassportHeader } from "@/components/passport/PassportHeader";
import { PassportLifecycle } from "@/components/passport/PassportLifecycle";
import { PassportActions } from "@/components/passport/PassportActions";
import { getRoadPassport } from "@/lib/passport/aggregate";
import { getPotholeReceipt } from "@/lib/passport/receipt";
import { getRupee } from "@/lib/rupee/index";
import { expectedCostInr } from "@/lib/rupee/audit";

afterEach(() => {
  cleanup();
});

describe("Passport UI Primitives & Receipt Logic", () => {
  it("renders PrintButton and invokes window.print on user interaction", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<PrintButton label="Print Test Dossier" />);

    const btn = screen.getByRole("button", { name: "Print Test Dossier" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toMatch(/touch-target/);

    fireEvent.click(btn);
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it("calculates rate-card expected cost in receipt taking area into account", () => {
    const receipt = getPotholeReceipt("BMC25-000005");
    expect(receipt).not.toBeNull();
    if (!receipt || !receipt.workOrder) return;

    const { ds } = getRupee();
    const wo = ds.workOrders.find((w) => w.id === receipt.workOrder?.id);
    expect(wo).toBeDefined();
    if (!wo) return;

    const canonicalExpected = expectedCostInr(ds, wo) ?? wo.costInr;
    expect(receipt.workOrder.expectedCostInr).toBe(canonicalExpected);
    expect(receipt.workOrder.expectedCostInr).toBeGreaterThan(0);
  });

  it("renders PassportHeader with correct accessible heading and metrics", () => {
    const passport = getRoadPassport("RD0001");
    expect(passport).not.toBeNull();
    if (!passport) return;

    render(<PassportHeader data={passport} />);
    expect(screen.getByRole("heading", { name: passport.road.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Total Amount Billed/i)).toBeInTheDocument();
    expect(screen.getByText(/Work Orders Executed/i)).toBeInTheDocument();
  });

  it("renders all 7 Promises vs Reality lifecycle stages and flags missing stages", () => {
    const passport = getRoadPassport("RD0001");
    expect(passport).not.toBeNull();
    if (!passport) return;

    render(<PassportLifecycle data={passport} />);
    expect(screen.getByRole("heading", { name: /Promises vs Reality Lifecycle/i })).toBeInTheDocument();

    const expectedStages = [
      "1. Announced",
      "2. Sanctioned",
      "3. Tendered",
      "4. Awarded",
      "5. Started",
      "6. Completion Recorded",
      "7. Independently Verified",
    ];

    for (const stage of expectedStages) {
      expect(screen.getByText(stage)).toBeInTheDocument();
    }

    const missingBadges = screen.getAllByText("MISSING");
    expect(missingBadges.length).toBeGreaterThanOrEqual(3);
  });

  it("renders deterministic recommended actions with assigned roles", () => {
    const passport = getRoadPassport("RD0001");
    expect(passport).not.toBeNull();
    if (!passport) return;

    render(<PassportActions actions={passport.recommendedActions} />);
    expect(screen.getByRole("heading", { name: /Recommended Next Actions/i })).toBeInTheDocument();
    expect(screen.getByText(/Assigned to:/i)).toBeInTheDocument();
  });
});
