import Link from "next/link";

import { formatInrShort } from "@/lib/rupee/format";
import type { MethodSlice, WardSlice } from "@/lib/rupee/scorecard";
import { pct, wardSlug } from "@/lib/rupee/slug";

const worseThan = (actual: number, expected: number) => actual > expected * 1.15;

function Rate({ actual, expected }: { actual: number; expected: number }) {
  return <td className={worseThan(actual, expected) ? "rb-num rb-worse" : "rb-num"}>{pct(actual)}</td>;
}

/** Where they worked. Each ward links to that ward's own money trail. */
export function WardTable({ rows }: { rows: WardSlice[] }) {
  return (
    <div className="ux4g-table-responsive">
      <table className="ux4g-table ux4g-table-s rb-table">
        <caption className="sr-only">This contractor&apos;s work in each ward</caption>
        <thead>
          <tr>
            <th scope="col">Ward</th>
            <th scope="col" className="rb-num">Jobs</th>
            <th scope="col" className="rb-num">Billed</th>
            <th scope="col" className="rb-num">Of ward budget</th>
            <th scope="col" className="rb-num">Came back</th>
            <th scope="col" className="rb-num">Expected</th>
            <th scope="col" className="rb-num">Late</th>
            <th scope="col" className="rb-num">Expected</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ward}>
              <th scope="row">
                <Link href={`/wards/${wardSlug(row.ward)}`} className="ux4g-text-link-s">
                  {row.ward}
                </Link>{" "}
                <span className="ux4g-body-xs-default ux4g-text-neutral-secondary">{row.wardName.slice(0, 28)}</span>
              </th>
              <td className="rb-num">{row.jobs}</td>
              <td className="rb-num">{formatInrShort(row.billedInr)}</td>
              <td className="rb-num">{pct(row.budgetShare)}</td>
              <Rate actual={row.reopenRate} expected={row.expectedReopenRate} />
              <td className="rb-num">{pct(row.expectedReopenRate)}</td>
              <Rate actual={row.slaMissRate} expected={row.expectedSlaMissRate} />
              <td className="rb-num">{pct(row.expectedSlaMissRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Durability and timeliness by repair method, each against its own expected rate. */
export function MethodTable({ rows }: { rows: MethodSlice[] }) {
  return (
    <div className="ux4g-table-responsive">
      <table className="ux4g-table ux4g-table-s rb-table">
        <caption className="sr-only">This contractor&apos;s results by repair method</caption>
        <thead>
          <tr>
            <th scope="col">Method</th>
            <th scope="col" className="rb-num">Jobs</th>
            <th scope="col" className="rb-num">Came back</th>
            <th scope="col" className="rb-num">Expected</th>
            <th scope="col" className="rb-num">Late</th>
            <th scope="col" className="rb-num">Expected</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.method}>
              <th scope="row">{row.method}</th>
              <td className="rb-num">{row.jobs}</td>
              <Rate actual={row.reopenRate} expected={row.expectedReopenRate} />
              <td className="rb-num">{pct(row.expectedReopenRate)}</td>
              <Rate actual={row.slaMissRate} expected={row.expectedSlaMissRate} />
              <td className="rb-num">{pct(row.expectedSlaMissRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
