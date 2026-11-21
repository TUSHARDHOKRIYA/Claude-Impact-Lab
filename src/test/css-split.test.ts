import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LOCAL_CSS = [
  "src/app/globals.css",
  "src/styles/ux4g-core.css",
  "src/styles/ux4g-chrome.css",
  "src/styles/tokens.css",
  "src/styles/base.css",
  "src/styles/layout.css",
  "src/styles/map.css",
];

const COMPACT_CSS = ["src/styles/ux4g-core.css", "src/styles/ux4g-chrome.css"];

function lines(path: string): number {
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("css file cap", () => {
  it("keeps each stylesheet at or under 300 lines", () => {
    for (const file of LOCAL_CSS) {
      expect(lines(file), file).toBeLessThanOrEqual(300);
    }
  });
});

describe("ux4g token foundation", () => {
  it("imports compact local UX4G core instead of the vendor bundle", () => {
    const globals = read("src/app/globals.css");
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/ux4g-core\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/ux4g-chrome\.css["']/);
    expect(globals).not.toMatch(/ux4g-web-components\/styles\.css/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/tokens\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/base\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/layout\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/map\.css["']/);
    expect(globals).not.toMatch(/body::after/);
    expect(globals).not.toMatch(/municipal dossier/);
    const leftover = globals
      .replace(/@import\s+[^;]+;/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
    expect(leftover).toBe("");
  });

  it("serves no embedded fonts in local CSS", () => {
    const served = LOCAL_CSS.map(read).join("\n");
    expect(served).not.toMatch(/data:font/);
    expect(served).not.toMatch(/base64/);
    expect(served).not.toMatch(/@font-face/);
    for (const file of COMPACT_CSS) {
      const css = read(file);
      expect(css, file).not.toMatch(/data:font/);
      expect(css, file).not.toMatch(/base64/);
      expect(css, file).not.toMatch(/@font-face/);
    }
  });

  it("defines official UX4G token aliases used by Rastabaaz names", () => {
    const core = read("src/styles/ux4g-core.css");
    expect(core).toContain("--ux4g-bg-primary-strong");
    expect(core).toContain("--ux4g-color-red-600");
    expect(core).toMatch(/--ux4g-color-red-600:\s*#db372d/);
    expect(core).toMatch(
      /--ux4g-bg-primary-strong:\s*var\(--ux4g-color-primary-600/,
    );
    expect(core).toMatch(/--ux4g-color-blue-600:\s*#3271ea/);
    expect(core).toMatch(/--ux4g-color-blue-700:\s*#1157ce/);
    expect(core).toMatch(
      /--ux4g-color-primary-600:\s*(var\(--ux4g-color-blue-700\)|#1157ce)/,
    );
    expect(core).not.toMatch(/--ux4g-color-primary-600:\s*#4a2bc2/);
    expect(core).not.toMatch(/--ux4g-color-primary-50:\s*#f2efff/);
  });

  it("exposes Rastabaaz semantic tokens mapped from UX4G primitives", () => {
    const tokens = read("src/styles/tokens.css");
    for (const name of [
      "--enamel",
      "--oxide",
      "--moss",
      "--ink",
      "--paper",
      "--gutter",
    ]) {
      expect(tokens, name).toContain(name);
    }
    expect(tokens).toMatch(/--enamel:\s*var\(--ux4g-bg-primary-strong/);
    expect(tokens).not.toMatch(/#4a2bc2/);
    expect(tokens).toMatch(/--oxide:\s*var\(--ux4g-color-red-600/);
    expect(tokens).toMatch(/--moss:\s*var\(/);
  });

  it("defines official component class contracts for Task 10 adapters", () => {
    const core = read("src/styles/ux4g-core.css");
    for (const name of [
      ".ux4g-btn",
      ".ux4g-btn-md",
      ".ux4g-btn-lg",
      ".ux4g-btn-primary",
      ".ux4g-btn-outline-primary",
      ".ux4g-btn-text-primary",
      ".ux4g-alert",
      ".ux4g-alert-info",
      ".ux4g-alert-warning",
      ".ux4g-alert-error",
      ".ux4g-input-container",
      ".ux4g-input",
      ".ux4g-input-md",
      ".ux4g-input-lg",
      ".ux4g-input-default",
      ".ux4g-input-error",
      ".ux4g-form-group",
      ".ux4g-input-helper",
      ".ux4g-radio",
      ".ux4g-radio-md",
      ".ux4g-checkbox",
      ".ux4g-checkbox-md",
      ".ux4g-badge-m",
      ".ux4g-badge-digit-primary",
      ".ux4g-badge-digit-success",
      ".ux4g-badge-digit-danger",
      ".ux4g-stepper",
      ".ux4g-stepper-horizontal",
      ".ux4g-stepper-mobile",
      ".ux4g-stepper-step",
    ]) {
      expect(core, name).toContain(name);
    }
    expect(core).not.toMatch(/\.ux4g-btn-secondary\b/);
    expect(core).not.toMatch(/\.ux4g-badge(?![a-z0-9_-])/);
  });

  it("defines official chrome contracts used by header, footer, and map", () => {
    const chrome = read("src/styles/ux4g-chrome.css");
    for (const name of [
      ".ux4g-topbar",
      ".ux4g-navbar",
      ".ux4g-navbar-wrap",
      ".ux4g-navbar-logo",
      ".ux4g-navbar-links",
      '[aria-current="page"]',
      ".ux4g-text-link-md",
      ".ux4g-footer-wrapper",
      ".ux4g-footer-primary",
      ".ux4g-footer-row",
      ".ux4g-card",
      ".ux4g-card-solid",
      ".ux4g-card-outline",
      ".ux4g-card-vertical",
      ".ux4g-card-header",
      ".ux4g-card-body",
      ".ux4g-card-title",
      ".ux4g-card-sub-title",
      ".ux4g-heading-l-strong",
      ".ux4g-heading-xl-strong",
      ".ux4g-heading-xs-strong",
      ".ux4g-text-neutral-secondary",
      ".ux4g-list",
      ".ux4g-list-item",
      ".ux4g-list-item-row",
      ".ux4g-accordion",
      ".ux4g-accordion__item",
      ".ux4g-accordion__header",
      ".ux4g-accordion__body",
      ".ux4g-tag-text-info",
      ".ux4g-tag-filled-success",
      ".ux4g-tag-outline-warning",
      ".ux4g-tag-outline-error",
      ".ux4g-tag-tonal-neutral",
      ".ux4g-stepper-center",
    ]) {
      expect(chrome, name).toContain(name);
    }
    expect(chrome).not.toMatch(/\.ux4g-navbar-brand\b/);
    expect(chrome).not.toMatch(/\.ux4g-navbar-nav\b/);
    expect(chrome).not.toMatch(/\.ux4g-footer-content\b/);
    expect(chrome).not.toMatch(/tricolor|national emblem|emblem/i);
  });

  it("keeps the sticky header opaque and 48px chrome targets", () => {
    const chrome = read("src/styles/ux4g-chrome.css");
    const layout = read("src/styles/layout.css");
    const served = `${chrome}\n${layout}`;
    expect(served).toMatch(
      /(header|\.sticky)[^{]*\{[^}]*(background|background-color)\s*:/,
    );
    expect(chrome).toMatch(
      /\.ux4g-navbar-logo[^{]*\{[^}]*min-height:\s*3rem/,
    );
    expect(chrome).toMatch(
      /\.ux4g-text-link-md[^{]*\{[^}]*min-height:\s*3rem/,
    );
  });

  it("sizes official lg controls at 3rem and md at 2.5rem", () => {
    const core = read("src/styles/ux4g-core.css");
    expect(core).toMatch(
      /\.ux4g-btn-lg\s*\{[^}]*min-height:\s*3rem/,
    );
    expect(core).toMatch(
      /\.ux4g-input-lg\s+\.ux4g-input\s*\{[^}]*height:\s*3rem/,
    );
    expect(core).toMatch(
      /\.ux4g-btn-md\s*\{[^}]*min-height:\s*2\.5rem/,
    );
    expect(core).toMatch(
      /\.ux4g-input-md\s+\.ux4g-input\s*\{[^}]*height:\s*2\.5rem/,
    );
    expect(core).not.toMatch(
      /\.ux4g-input-md\s*,\s*\.ux4g-input-lg\s*,\s*\.ux4g-input-container input/,
    );
  });

  it("keeps 48px targets, skip-link, and reduced motion without broadsheet chrome", () => {
    const layout = read("src/styles/layout.css");
    const base = read("src/styles/base.css");
    expect(layout).toMatch(/\.touch-target/);
    expect(layout).toMatch(/\}\s*\.touch-target\s*\{[^}]*min-height:\s*48px/);
    expect(layout).toMatch(/min-width:\s*48px/);
    expect(layout).toMatch(/\.shell\b/);
    expect(layout).toMatch(/\.skip-link/);
    expect(layout).toMatch(/safe-area-inset-top/);
    expect(layout).toMatch(/safe-area-inset-bottom/);
    expect(base).toMatch(/Noto Sans/);
    expect(base).toMatch(/prefers-reduced-motion/);
    expect(base).not.toMatch(/body::after/);
    expect(base).not.toMatch(/Newsreader/);
  });

  it("loads Noto Sans locally and keeps the vendor package as provenance", () => {
    const layout = read("src/app/layout.tsx");
    const pkg = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
    };
    expect(layout).not.toMatch(/Newsreader|Archivo|DM_Mono/);
    expect(layout).toMatch(/Noto_Sans/);
    expect(layout).toMatch(/subsets:\s*\["latin"\]/);
    expect(layout).toMatch(/display:\s*"swap"/);
    expect(layout).toMatch(/Tiro_Devanagari_Hindi/);
    expect(layout).toMatch(/viewportFit:\s*"cover"/);
    expect(pkg.dependencies?.["ux4g-web-components"]).toMatch(/^2\.1\./);
    expect(pkg.dependencies?.["ux4g-components-react"]).toBeUndefined();
  });
});

describe("map layout", () => {
  it("splits the map and the list side by side only at the desktop breakpoint", () => {
    const css = read("src/styles/map.css");
    expect(css).toMatch(/@media\s*\(\s*min-width:\s*64rem\s*\)/);
    const desktop = css.slice(css.search(/@media\s*\(\s*min-width:\s*64rem\s*\)/));
    expect(desktop).toMatch(/\.rb-map-split\s*\{[^}]*grid-template-columns/);
    expect(css).not.toMatch(/rb-map-disclosure/);
  });
});
