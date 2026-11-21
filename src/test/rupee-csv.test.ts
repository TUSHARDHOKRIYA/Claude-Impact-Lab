import { describe, expect, it } from "vitest";
import { parseCsv } from "../lib/rupee/csv";

describe("parseCsv", () => {
  it("turns a header and rows into keyed records", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n4,5,6");
    expect(rows).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    const rows = parseCsv('id,name\n1,"Colaba, Fort"');
    expect(rows).toEqual([{ id: "1", name: "Colaba, Fort" }]);
  });

  it("unescapes doubled quotes", () => {
    const rows = parseCsv('id,text\n1,"He said ""hello"""');
    expect(rows[0].text).toBe('He said "hello"');
  });

  it("handles CRLF line endings and trailing blank lines", () => {
    const rows = parseCsv("id,name\r\n1,A\r\n2,B\r\n\r\n");
    expect(rows).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);
  });

  it("preserves newlines inside quoted fields", () => {
    const rows = parseCsv('id,text\n1,"line one\nline two"');
    expect(rows[0].text).toBe("line one\nline two");
  });

  it("returns empty records for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("a,b\n")).toEqual([]);
  });
});
