import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src", "scripts", "infra"];
const FILES = [
  "vitest.config.ts",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
];
const EXT = new Set([".ts", ".tsx", ".css", ".mjs"]);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "test" && dir.endsWith(`${path.sep}src`)) {
      /* still include src/test — tests must also stay ≤300 */
    }
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(name))) out.push(full);
  }
}

describe("source file cap", () => {
  it("keeps every ts/tsx/css/mjs file at or under 300 lines", () => {
    const files = [...FILES];
    for (const root of ROOTS) walk(root, files);
    const over = files
      .map((file) => ({ file, lines: readFileSync(file, "utf8").split(/\r?\n/).length }))
      .filter((row) => row.lines > 300);
    expect(over, JSON.stringify(over)).toEqual([]);
  });
});
