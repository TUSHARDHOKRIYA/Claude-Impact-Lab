import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/admin/actions", () => ({
  updateReportAction: vi.fn(),
}));

import { ReportEditor } from "@/components/admin/ReportEditor";
import type { ReportListItem } from "@/lib/types";
import { readFileSync } from "node:fs";

const listed: ReportListItem = {
  id: "rpt_desk_1",
  locationId: "loc_desk",
  issueType: "pothole",
  lat: 18.9298,
  lng: 72.8324,
  noticedAt: "2026-09-01",
  noticedWindow: "this_week",
  recurs: false,
    description: "Listed without a photo attribute",
  isSample: true,
  photoIsIllustration: true,
  createdAt: "2026-09-01T12:00:00.000Z",
};

afterEach(() => {
  cleanup();
});

describe("ReportEditor photo surface", () => {
  it("does not render an image for a catalog row without photo", () => {
    const { container } = render(<ReportEditor report={listed} notes={[]} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[src]")).toBeNull();
    expect(container.querySelector('[src=""]')).toBeNull();
    expect(screen.getByText("rpt_desk_1")).toBeInTheDocument();
    expect(screen.getByText("Noticed in the week up to 1 September 2026")).toBeInTheDocument();
    expect(screen.queryByText("Sample")).not.toBeInTheDocument();
    const publicPage = screen.getByRole("link", { name: "Open the public page" });
    expect(publicPage).toHaveAttribute("href", "/reports/rpt_desk_1");
    expect(publicPage.className).toMatch(/touch-target/);
  });

  it("does not request a photo even if a runtime extra field is present", () => {
    const withPhoto = { ...listed, photo: "/admin" };
    const { container } = render(
      <ReportEditor report={withPhoto} notes={[]} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[src="/admin"]')).toBeNull();
    expect(container.querySelector('[src=""]')).toBeNull();
    expect(screen.getByRole("link", { name: "Open the public page" })).toBeInTheDocument();
  });

  it("keeps the update action and desk fields", () => {
    const source = readFileSync("src/components/admin/ReportEditor.tsx", "utf8");
    expect(source).toMatch(/from "@\/app\/admin\/actions"/);
    expect(source).toMatch(/action=\{updateReportAction\}/);
    render(
      <ReportEditor
        report={listed}
        notes={[{ id: "n1", body: "Check paving", createdAt: "2026-09-02" }]}
      />,
    );
    expect(screen.getByLabelText("Issue type")).toBeInTheDocument();
    expect(screen.getByLabelText("Recurs")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Note")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toHaveAttribute("type", "submit");
    expect(save.className).toMatch(/ux4g-btn-l\b/);
    expect(screen.getByText("Check paving")).toBeInTheDocument();
  });

  it("namespaces control ids per report without changing form names", () => {
    const second: ReportListItem = { ...listed, id: "rpt_desk_2" };
    const { container } = render(
      <>
        <ReportEditor report={listed} notes={[]} />
        <ReportEditor report={second} notes={[]} />
      </>,
    );
    const names = ["issueType", "recurs", "description", "note"] as const;
    const articles = [...container.querySelectorAll("article")];
    expect(articles).toHaveLength(2);
    const ids: string[] = [];
    const helperIds: string[] = [];
    for (const article of articles) {
      const reportId = article.querySelector("p")?.textContent?.trim();
      expect(reportId).toMatch(/^rpt_desk_/);
      const form = article.querySelector("form");
      expect(form).not.toBeNull();
      for (const name of names) {
        const control = article.querySelector(`[name="${name}"]`);
        expect(control, name).not.toBeNull();
        expect(control).toHaveAttribute("name", name);
        expect(control).toHaveAttribute("id", `${reportId}-${name}`);
        const id = control?.getAttribute("id") ?? "";
        ids.push(id);
        helperIds.push(`${id}-error`, `${id}-hint`);
        const label = article.querySelector(`label[for="${id}"]`);
        expect(label, name).not.toBeNull();
        expect(label).toHaveAttribute("for", id);
        expect(form?.contains(control)).toBe(true);
        expect(form?.contains(label)).toBe(true);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(helperIds).size).toBe(helperIds.length);
    const source = readFileSync("src/components/admin/ReportEditor.tsx", "utf8");
    expect(source).toMatch(/action=\{updateReportAction\}/);
    expect(readFileSync("src/components/gov/GovField.tsx", "utf8")).not.toMatch(
      /["']use client["']/,
    );
  });
});
