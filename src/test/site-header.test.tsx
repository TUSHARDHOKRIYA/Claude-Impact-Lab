import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

afterEach(() => {
  cleanup();
});

describe("SiteHeader", () => {
  it("marks the record nav current and keeps 48px targets", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    expect(
      screen.getByText(/not a municipal complaint portal/i),
    ).toBeInTheDocument();
    const record = screen.getByRole("link", { name: /record/i });
    expect(record).toHaveAttribute("aria-current", "page");
    expect(record.className).toMatch(/touch-target/);
    expect(document.querySelector(".ux4g-topbar")).not.toBeNull();
    expect(document.querySelector(".ux4g-navbar-wrap")).not.toBeNull();
    expect(document.querySelector(".ux4g-navbar-brand")).toBeNull();
    const wordmark = screen.getByRole("link", { name: /rastabaaz/i });
    expect(wordmark.className).toMatch(/ux4g-navbar-logo/);
    expect(wordmark.className).toMatch(/touch-target/);
    expect(wordmark.querySelector(".rb-navbar-wordmark")).not.toBeNull();
    expect(record.className).toMatch(/ux4g-text-link-md/);
    const map = screen.getByRole("link", { name: /^map$/i });
    expect(map).toHaveAttribute("href", "/map");
    expect(map.className).toMatch(/ux4g-btn-primary/);
    expect(map.className).toMatch(/touch-target/);
    expect(document.querySelector(".ux4g-navbar-links")).not.toHaveAttribute(
      "style",
    );
    expect(document.querySelector("header")?.className).toMatch(/sticky/);
    await user.tab();
    expect(wordmark).toHaveFocus();
  });
});

describe("SiteFooter", () => {
  it("uses official footer tree and 48px text links", () => {
    render(<SiteFooter />);
    const footer = document.querySelector("footer");
    expect(footer?.className).toMatch(/ux4g-footer-wrapper/);
    expect(footer?.className).toMatch(/ux4g-footer-primary/);
    expect(document.querySelector(".ux4g-footer-content")).toBeNull();
    const map = screen.getByRole("link", { name: /map of the precinct/i });
    expect(map.className).toMatch(/ux4g-text-link-md/);
    expect(map.className).toMatch(/touch-target/);
  });
});
