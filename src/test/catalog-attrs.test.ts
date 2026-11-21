import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CATALOG_ATTRS } from "@/lib/repo/mappers";

function byTypeNonKeyAttributes(yaml: string): string[] {
  const start = yaml.indexOf("IndexName: byType");
  const section = yaml.slice(start);
  const list = section.slice(section.indexOf("NonKeyAttributes:"));
  const names: string[] = [];
  for (const line of list.split("\n").slice(1)) {
    const match = /^\s+- ([A-Za-z0-9]+)\s*$/.exec(line);
    if (!match) break;
    names.push(match[1]);
  }
  return names;
}

describe("byType projection", () => {
  it("matches CATALOG_ATTRS to the table's NonKeyAttributes", () => {
    const yaml = readFileSync("infra/rastabaaz-table.yaml", "utf8");
    const fromTable = byTypeNonKeyAttributes(yaml).sort();
    expect(fromTable.length).toBeGreaterThan(0);
    expect([...CATALOG_ATTRS].sort()).toEqual(fromTable);
  });
});

describe("byType query", () => {
  it("projects the type key the catalog routes rows on", async () => {
    const { byTypeQueryInput, ingestCatalogItem, emptyCatalog } = await import("@/lib/repo/mappers");
    const input = byTypeQueryInput("report");
    const projected = input.ProjectionExpression.split(",").map((part) => input.ExpressionAttributeNames[part.trim()]);
    expect(projected).toContain("type");
    for (const attr of CATALOG_ATTRS) expect(projected).toContain(attr);

    // An item shaped exactly like the projection must land in the catalog.
    const item = Object.fromEntries(projected.map((name) => [name, name === "type" ? "report" : name === "affects" ? [] : "x"]));
    const catalog = emptyCatalog();
    ingestCatalogItem(catalog, item);
    expect(catalog.reports).toHaveLength(1);
  });
});
