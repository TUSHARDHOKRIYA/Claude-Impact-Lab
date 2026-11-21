import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GovButton } from "@/components/gov/GovButton";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("GovButton", () => {
  it("renders a 48px primary submit control", () => {
    const { container } = render(
      <GovButton type="submit" variant="primary">
        Record a street condition
      </GovButton>,
    );
    const button = screen.getByRole("button", { name: "Record a street condition" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toMatch(/touch-target/);
    expect(button.className).toMatch(/ux4g-btn-l/);
    expect(button.className).not.toMatch(/ux4g-btn-md/);
    expect(button.className).toMatch(/ux4g-btn-primary/);
    expect(container.querySelector("a")).toBeNull();
  });

  it("renders a link with the same official button classes", () => {
    const { container } = render(
      <GovButton href="/report/new" variant="primary">
        Record a street condition
      </GovButton>,
    );
    const link = screen.getByRole("link", { name: "Record a street condition" });
    expect(link).toHaveAttribute("href", "/report/new");
    expect(link.tagName).toBe("A");
    expect(link.className).toMatch(/ux4g-btn/);
    expect(link.className).toMatch(/ux4g-btn-l/);
    expect(link.className).not.toMatch(/ux4g-btn-md/);
    expect(link.className).toMatch(/ux4g-btn-primary/);
    expect(link.className).toMatch(/touch-target/);
    expect(container.querySelector("button")).toBeNull();
  });

  it("keeps the lg 3rem contract so unlayered md 40px cannot win", () => {
    const adapter = read("src/components/gov/GovButton.tsx");
    const core = read("node_modules/ux4g-web-components/styles/ux4g.css");
    const layout = read("src/styles/layout.css");
    expect(adapter).toMatch(/ux4g-btn-l/);
    expect(adapter).not.toMatch(/ux4g-btn-md/);
    expect(core).toMatch(/\.ux4g-btn-l/);
    expect(core).toMatch(/\.ux4g-btn-m/);
    expect(layout).toMatch(/\}\s*\.touch-target\s*\{[^}]*min-height:\s*48px/);
    const layer = layout.match(/@layer\s+components\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(layer).not.toMatch(/\.touch-target\s*\{/);
  });

  it("marks a disabled link and prevents navigation", () => {
    render(
      <GovButton href="/admin" disabled>
        Open admin
      </GovButton>,
    );
    const link = screen.getByRole("link", { name: "Open admin" });
    expect(link).toHaveAttribute("href", "/admin");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(fireEvent.click(link)).toBe(false);
  });

  it("does not prevent navigation on an enabled link", () => {
    render(<GovButton href="/">Go to the wards</GovButton>);
    const link = screen.getByRole("link", { name: "Go to the wards" });
    expect(link).not.toHaveAttribute("aria-disabled");
    expect(fireEvent.click(link)).toBe(true);
  });
});
