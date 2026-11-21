import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "../lib/rupee/csv";
import { loadDataset } from "../lib/rupee/load";

describe("rupee csv integrity and dataset determinism", () => {
  it("preserves quotes and embedded newlines in CSV fields", () => {
    const rawCsv = `id,name,description\n1,"Alpha, Beta","Line 1\nLine 2"\n2,"Simple","No newlines"`;
    const rows = parseCsv(rawCsv);

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("1");
    expect(rows[0].name).toBe("Alpha, Beta");
    expect(rows[0].description).toBe("Line 1\nLine 2");

    expect(rows[1].id).toBe("2");
    expect(rows[1].name).toBe("Simple");
    expect(rows[1].description).toBe("No newlines");
  });

  it("handles escaped double quotes within quoted strings", () => {
    const rawCsv = `id,remark\n101,"Contractor said ""Work completed successfully"""`;
    const rows = parseCsv(rawCsv);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("101");
    expect(rows[0].remark).toBe('Contractor said "Work completed successfully"');
  });

  it("loads the full complaints CSV file accurately matching line count", () => {
    const complaintsFilePath = path.join(process.cwd(), "data", "rupee", "complaints.csv");
    const content = fs.readFileSync(complaintsFilePath, "utf8");
    const parsedRows = parseCsv(content);

    const ds = loadDataset();
    expect(ds.complaints.length).toBe(parsedRows.length);
    expect(ds.complaints.length).toBeGreaterThan(1000);

    // Verify first and last records
    const firstParsed = parsedRows[0];
    expect(ds.complaints[0].id).toBe(firstParsed.complaint_id);
    expect(ds.complaints[0].channel).toBe(firstParsed.channel);

    const lastParsed = parsedRows[parsedRows.length - 1];
    expect(ds.complaints[ds.complaints.length - 1].id).toBe(lastParsed.complaint_id);
  });

  it("produces deterministic loads across multiple invocations", () => {
    const ds1 = loadDataset();
    const ds2 = loadDataset();

    expect(ds1.wards.length).toBe(ds2.wards.length);
    expect(ds1.roads.length).toBe(ds2.roads.length);
    expect(ds1.workOrders.length).toBe(ds2.workOrders.length);
    expect(ds1.complaints.length).toBe(ds2.complaints.length);
    expect(ds1.contractors.length).toBe(ds2.contractors.length);

    // Verify deep equality of sample complaint
    expect(ds1.complaints[0]).toEqual(ds2.complaints[0]);
    expect(ds1.complaints[100]).toEqual(ds2.complaints[100]);
  });

  it("does not mutate dataset properties when accessed", () => {
    const ds = loadDataset();
    const originalFirstId = ds.complaints[0].id;
    const originalFirstCost = ds.workOrders[0].costInr;

    // Read properties and perform operations
    const totalCost = ds.workOrders.reduce((sum, wo) => sum + wo.costInr, 0);
    expect(totalCost).toBeGreaterThan(0);

    // Ensure originals unchanged
    expect(ds.complaints[0].id).toBe(originalFirstId);
    expect(ds.workOrders[0].costInr).toBe(originalFirstCost);
  });
});
