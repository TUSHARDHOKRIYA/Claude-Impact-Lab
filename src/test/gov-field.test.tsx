import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GovField } from "@/components/gov/GovField";
import { readFileSync } from "node:fs";

afterEach(() => cleanup());

describe("GovField", () => {
  it("puts size and state on the container and the control class on the field", () => {
    render(
      <GovField
        label="Latitude"
        error="Enter a latitude in the precinct."
      />,
    );
    const input = screen.getByLabelText("Latitude");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toMatch(/\bux4g-input\b/);
    expect(input.className).toMatch(/touch-target/);
    expect(input.className).not.toMatch(/ux4g-input-md/);
    expect(input.className).not.toMatch(/ux4g-input-error/);
    const tree = input.closest(".ux4g-input-container");
    expect(tree?.className).toMatch(/ux4g-input-md/);
    expect(tree?.className).toMatch(/ux4g-input-error/);
    expect(tree?.className).not.toMatch(/ux4g-input-default/);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("id", `${input.id}-error`);
    expect(alert.className).toMatch(/ux4g-input-helper/);
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });

  it("uses default container state and describedby on the helper", () => {
    render(<GovField label="Street" hint="WGS84" />);
    const input = screen.getByLabelText("Street");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input.className).toMatch(/\bux4g-input\b/);
    expect(input.className).not.toMatch(/ux4g-input-md/);
    const tree = input.closest(".ux4g-input-container");
    expect(tree?.className).toMatch(/ux4g-input-default/);
    expect(tree?.className).toMatch(/ux4g-input-md/);
    expect(tree?.className).not.toMatch(/ux4g-input-error/);
    const hint = screen.getByText("WGS84");
    expect(hint).toHaveAttribute("id", `${input.id}-hint`);
    expect(hint.className).toMatch(/ux4g-input-helper/);
    expect(input).toHaveAttribute("aria-describedby", hint.id);
  });

  it("derives a stable id from name without client hydration", () => {
    const source = readFileSync("src/components/gov/GovField.tsx", "utf8");
    expect(source).not.toMatch(/["']use client["']/);
    expect(source).not.toMatch(/useId/);
    render(
      <GovField
        label="Password"
        name="password"
        type="password"
        error="That key did not match."
      />,
    );
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("id", "password");
    expect(input).toHaveAttribute("name", "password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "password-error");
    expect(screen.getByRole("alert")).toHaveAttribute("id", "password-error");
  });
});
