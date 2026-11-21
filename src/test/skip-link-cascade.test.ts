import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const LAYOUT = "src/styles/layout.css";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function stripLayerBlocks(css: string): string {
  let result = "";
  let index = 0;
  while (index < css.length) {
    const rest = css.slice(index);
    const lead = rest.match(/^@layer\s+[\w-]+\s*\{/);
    if (lead) {
      index += lead[0].length;
      let depth = 1;
      while (index < css.length && depth > 0) {
        if (css[index] === "{") depth += 1;
        else if (css[index] === "}") depth -= 1;
        index += 1;
      }
      continue;
    }
    result += css[index];
    index += 1;
  }
  return result;
}

function declarationBlocks(css: string, selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, "g"))].map(
    (match) => match[1],
  );
}

function property(blocks: string[], name: string): string[] {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*:\\s*([^;]+)`, "g");
  const values: string[] = [];
  for (const block of blocks) {
    for (const match of block.matchAll(re)) values.push(match[1].trim());
  }
  return values;
}

function attachLayoutSheet(): CSSStyleSheet | null {
  const style = document.createElement("style");
  style.dataset.test = "skip-link-cascade";
  style.textContent = read(LAYOUT);
  document.head.append(style);
  return style.sheet;
}

function cssomValues(sheet: CSSStyleSheet, selector: string, name: string): string[] {
  const values: string[] = [];
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
        visit((rule as CSSGroupingRule).cssRules);
      }
      if (!(rule instanceof CSSStyleRule)) continue;
      const selectors = rule.selectorText.split(",").map((part) => part.trim());
      if (!selectors.includes(selector)) continue;
      const value = rule.style.getPropertyValue(name).trim();
      if (value) values.push(value);
    }
  };
  visit(sheet.cssRules);
  return values;
}

afterEach(() => {
  document
    .querySelectorAll("[data-test='skip-link-cascade']")
    .forEach((node) => node.remove());
  document.querySelectorAll("a.skip-link").forEach((node) => node.remove());
});

describe("skip-link cascade", () => {
  it("does not park the control off-screen with a translating rest transform", () => {
    const css = read(LAYOUT);
    const sheet = attachLayoutSheet();
    const restTransform = [
      ...property(declarationBlocks(css, ".skip-link"), "transform"),
      ...(sheet ? cssomValues(sheet, ".skip-link", "transform") : []),
    ];
    expect(
      restTransform.join(" | "),
      "rest .skip-link transform must not translate out of the viewport",
    ).not.toMatch(/translate/i);
  });

  it("keeps on-screen skip-link styles unlayered so they beat sticky z-50", () => {
    const unlayered = stripLayerBlocks(read(LAYOUT));
    expect(unlayered).toMatch(/\.skip-link/);
    expect(unlayered).toMatch(
      /\.skip-link:focus-visible[^{]*\{[^}]*z-index:\s*(?:[8-9]\d|\d{3,})/,
    );
  });

  it("makes :focus-visible win a visible, 48px, on-canvas skip-link", () => {
    const css = read(LAYOUT);
    const sheet = attachLayoutSheet();
    const visibleBlocks = [
      ...declarationBlocks(css, ".skip-link:focus"),
      ...declarationBlocks(css, ".skip-link:focus-visible"),
    ];
    const visibleTransform = [
      ...property(visibleBlocks, "transform"),
      ...(sheet ? cssomValues(sheet, ".skip-link:focus-visible", "transform") : []),
      ...(sheet ? cssomValues(sheet, ".skip-link:focus", "transform") : []),
    ];
    const visibleClip = property(visibleBlocks, "clip-path");
    const visibleMinHeight = property(visibleBlocks, "min-height");
    const visiblePosition = property(visibleBlocks, "position");
    const visibleOutline = property(
      declarationBlocks(css, ".skip-link:focus-visible"),
      "outline",
    );

    expect(visiblePosition.join(" ")).toMatch(/fixed/);
    expect(visibleClip.join(" ")).toMatch(/none/);
    expect(visibleTransform.join(" ")).not.toMatch(/translate/i);
    expect(visibleMinHeight.join(" ")).toMatch(/48px|3rem/);
    expect(visibleOutline.join(" ")).toMatch(/--marking|#ffab27/);

    const skip = document.createElement("a");
    skip.className = "skip-link is-skip-focused";
    skip.href = "#main";
    skip.textContent = "Skip to the record";
    const hooked = document.createElement("style");
    hooked.dataset.test = "skip-link-cascade";
    hooked.textContent = `
      .skip-link:focus, .skip-link:focus-visible, .skip-link.is-skip-focused {
        ${visibleBlocks.join("\n")}
      }
    `;
    document.head.append(hooked);
    document.body.append(skip);
    const focused = getComputedStyle(skip);
    expect(focused.position).toBe("fixed");
    expect(Number.parseFloat(focused.minHeight)).toBeGreaterThanOrEqual(48);
    expect(Number.parseInt(focused.zIndex, 10)).toBeGreaterThanOrEqual(80);
  });
});
