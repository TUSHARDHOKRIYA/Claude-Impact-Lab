import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const INVENTED = [
  "ux4g-navbar-brand",
  "ux4g-navbar-nav",
  "ux4g-footer-content",
  "ux4g-form-helper",
  "ux4g-btn-secondary",
  "ux4g-navbar-link-current",
] as const;

const SOURCE_ROOTS = ["src/components", "src/app", "src/lib"];
const STYLE_FILES = [
  "src/styles/ux4g-core.css",
  "src/styles/ux4g-chrome.css",
  "src/styles/tokens.css",
  "src/styles/base.css",
  "src/styles/layout.css",
  "src/styles/map.css",
];
const OFFICIAL_CSS = "node_modules/ux4g-web-components/styles/ux4g.css";
const CLASS_RE = /\bux4g-[a-z0-9_-]+\b/g;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
}

function usedClasses(): string[] {
  const files: string[] = [];
  for (const root of SOURCE_ROOTS) walk(root, files);
  const found = new Set<string>();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.match(CLASS_RE) ?? []) found.add(match);
  }
  return [...found].sort();
}

function definedClasses(): string {
  return STYLE_FILES.map((file) => readFileSync(file, "utf8")).join("\n");
}

function hasSelector(css: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\.${escaped}(?![A-Za-z0-9_-])`).test(css);
}

describe("ux4g chrome fidelity", () => {
  it("defines every UX4G class referenced by app source", () => {
    const css = definedClasses();
    const missing = usedClasses().filter((name) => !hasSelector(css, name));
    expect(missing, missing.join(", ")).toEqual([]);
  });

  it("does not reference invented or obsolete UX4G classes", () => {
    const files: string[] = [];
    for (const root of SOURCE_ROOTS) walk(root, files);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const name of INVENTED) {
        if (new RegExp(`\\b${name}\\b`).test(text)) hits.push(`${file}:${name}`);
      }
    }
    expect(hits, hits.join(", ")).toEqual([]);
  });

  it("only uses class names present in ux4g-web-components@2.1.0", () => {
    expect(existsSync(OFFICIAL_CSS), "install ux4g-web-components@2.1.0").toBe(
      true,
    );
    const official = readFileSync(OFFICIAL_CSS, "utf8");
    const unknown = usedClasses().filter((name) => !hasSelector(official, name));
    expect(unknown, unknown.join(", ")).toEqual([]);
  });

  it("maps enamel fallback to official UX4G blue, not purple", () => {
    const tokens = readFileSync("src/styles/tokens.css", "utf8");
    const mapStyle = readFileSync("src/components/map/map-style.ts", "utf8");
    expect(tokens).not.toMatch(/#4a2bc2/);
    expect(mapStyle).not.toMatch(/#4a2bc2/);
    expect(mapStyle).toMatch(/enamel:\s*"#1157ce"/);
  });

  it("gives inverse primary chrome a marking focus ring", () => {
    const chrome = readFileSync("src/styles/ux4g-chrome.css", "utf8");
    const layout = readFileSync("src/styles/layout.css", "utf8");
    expect(chrome).toMatch(
      /\.ux4g-topbar :focus-visible[^{]*\{[^}]*(--marking|#ffab27)/,
    );
    expect(chrome).toMatch(
      /\.ux4g-footer-primary :focus-visible[^{]*\{[^}]*(--marking|#ffab27)/,
    );
    expect(layout).toMatch(
      /\.skip-link:focus-visible[^{]*\{[^}]*(--marking|#ffab27)/,
    );
  });

  it("keeps the footer disclaimer from sitting in a stray fourth grid cell", () => {
    const chrome = readFileSync("src/styles/ux4g-chrome.css", "utf8");
    expect(chrome).toMatch(
      /\.ux4g-footer-row\s*>\s*:last-child[^{]*\{[^}]*grid-column:\s*1\s*\/\s*-1/,
    );
  });
});

