import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LOCAL_CSS = [
  "src/app/globals.css",
  "src/styles/tokens.css",
  "src/styles/base.css",
  "src/styles/chrome.css",
  "src/styles/layout.css",
  "src/styles/report.css",
  "src/styles/rupee.css",
  "src/styles/map.css",
];

const COMPACT_CSS = ["src/styles/chrome.css"];

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
  it("imports UX4G 3.3.3 and local modular stylesheets", () => {
    const globals = read("src/app/globals.css");
    expect(globals).toMatch(/@import\s+["']ux4g-web-components\/styles\.css["']/);
    expect(globals).toMatch(/@import\s+["']tailwindcss["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/tokens\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/base\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/chrome\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/layout\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/report\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/rupee\.css["']/);
    expect(globals).toMatch(/@import\s+["']\.\.\/styles\/map\.css["']/);
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

  it("exposes Rastabaaz semantic tokens mapped from UX4G primitives", () => {
    const tokens = read("src/styles/tokens.css");
    for (const name of [
      "--enamel",
      "--oxide",
      "--moss",
      "--ink",
      "--paper",
      "--gutter",
      "--asphalt",
      "--lane",
      "--held",
      "--flagged",
      "--failed",
    ]) {
      expect(tokens, name).toContain(name);
    }
    expect(tokens).toMatch(/--enamel:\s*var\(--ux4g-bg-primary-strong/);
    expect(tokens).toMatch(/--oxide:\s*var\(--failed/);
    expect(tokens).toMatch(/--moss:\s*var\(--held/);
  });

  it("keeps the sticky header opaque and 48px chrome targets", () => {
    const chrome = read("src/styles/chrome.css");
    const layout = read("src/styles/layout.css");
    const served = `${chrome}\n${layout}`;
    expect(served).toMatch(
      /(header|\.sticky)[^{]*\{[^}]*(background|background-color)\s*:/,
    );
    expect(chrome).toMatch(
      /\.ux4g-navbar-logo[^{]*\{[^}]*min-height:\s*3rem/,
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
    expect(read("src/styles/tokens.css")).toMatch(/Noto Sans/);
    expect(base).toMatch(/prefers-reduced-motion/);
    expect(base).not.toMatch(/body::after/);
    expect(base).not.toMatch(/Newsreader/);
  });

  it("keeps the root layout clean and the vendor package as provenance", () => {
    const layout = read("src/app/layout.tsx");
    const pkg = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
    };
    expect(layout).not.toMatch(/Newsreader|Archivo|DM_Mono/);
    expect(layout).toMatch(/viewportFit:\s*"cover"/);
    expect(pkg.dependencies?.["ux4g-web-components"]).toMatch(/^3\./);
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
