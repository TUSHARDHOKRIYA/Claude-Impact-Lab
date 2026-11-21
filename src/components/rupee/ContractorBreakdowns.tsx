import Link from "next/link";

import { FoldRows } from "@/components/rupee/FoldRows";
import { formatInrShort } from "@/lib/rupee/format";
import type { MethodSlice, WardSlice } from "@/lib/rupee/scorecard";
import { pct, wardSlug } from "@/lib/rupee/slug";

const worseThan = (actual: number, expected: number) =>
  actual > expected * 1.15;

/** The rate, red when well over expected. The expected rate rides along: "12% vs 10%". */
function Rate({
  actual,
  expected,
  label,
}: {
  actual: number;
  expected: number;
  label: string;
}) {
  return (
    <td
      data-label={label}
      className={
        worseThan(actual, expected)
          ? "rb-num rb-half rb-worse"
          : "rb-num rb-half"
      }
    >
      {pct(actual)}
      <span className="rb-vs"> vs {pct(expected)}</span>
    </td>
  );
}

/** Where they worked. Each ward links to that ward's own money trail. */
export function WardTable({ rows }: { rows: WardSlice[] }) {
  return (
    <FoldRows total={rows.length} noun="wards">
      <div className="ux4g-table-responsive">
        <table className="ux4g-table ux4g-table-s rb-table rb-stack">
          <caption className="sr-only">
            This contractor&apos;s work in each ward
          </caption>
          <thead>
            <tr>
              <th scope="col">Ward</th>
              <th scope="col" className="rb-num">
                Jobs
              </th>
              <th scope="col" className="rb-num">
                Billed
              </th>
              <th scope="col" className="rb-num">
                Of ward budget
              </th>
              <th scope="col" className="rb-num">
                Came back vs expected
              </th>
              <th scope="col" className="rb-num">
                Late vs expected
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ward}>
                <th scope="row">
                  <Link
                    href={`/wards/${wardSlug(row.ward)}`}
                    className="ux4g-text-link-s"
                  >
                    {row.ward}
                  </Link>{" "}
                  <span className="ux4g-body-xs-default ux4g-text-neutral-secondary">
                    {row.wardName}
                  </span>
                </th>
                <td data-label="Jobs" className="rb-num">
                  {row.jobs}
                </td>
                <td data-label="Billed" className="rb-num">
                  {formatInrShort(row.billedInr)}
                </td>
                <td data-label="Of ward budget" className="rb-num">
                  {pct(row.budgetShare)}
                </td>
                <Rate
                  label="Came back vs expected"
                  actual={row.reopenRate}
                  expected={row.expectedReopenRate}
                />
                <Rate
                  label="Late vs expected"
                  actual={row.slaMissRate}
                  expected={row.expectedSlaMissRate}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FoldRows>
  );
}

/** Durability and timeliness by repair method, each against its own expected rate. */
export function MethodTable({ rows }: { rows: MethodSlice[] }) {
  return (
    <FoldRows total={rows.length} noun="methods">
      <div className="ux4g-table-responsive">
        <table className="ux4g-table ux4g-table-s rb-table rb-stack">
          <caption className="sr-only">
            This contractor&apos;s results by repair method
          </caption>
          <thead>
            <tr>
              <th scope="col">Method</th>
              <th scope="col" className="rb-num">
                Jobs
              </th>
              <th scope="col" className="rb-num">
                Came back vs expected
              </th>
              <th scope="col" className="rb-num">
                Late vs expected
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.method}>
                <th scope="row">{row.method}</th>
                <td data-label="Jobs" className="rb-num rb-full">
                  {row.jobs}
                </td>
                <Rate
                  label="Came back vs expected"
                  actual={row.reopenRate}
                  expected={row.expectedReopenRate}
                />
                <Rate
                  label="Late vs expected"
                  actual={row.slaMissRate}
                  expected={row.expectedSlaMissRate}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FoldRows>
  );
}
