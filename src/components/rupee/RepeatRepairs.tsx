import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { formatInrShort } from "@/lib/rupee/format";
import { REPEAT_WINDOW_DAYS } from "@/lib/rupee/scorecard";
import type { Repeats } from "@/lib/rupee/scorecard";
import { wardSlug } from "@/lib/rupee/slug";

function gapText(days: number): string {
  if (days === 0) return "Same day";
  return days === 1 ? "1 day" : `${days} days`;
}

/**
 * Repeat-repair evidence. It sits beside the score and is not part of it: the
 * data has no pothole-level coordinates, so "again" means the same kind of
 * problem on the same road segment within a short window.
 */
export function RepeatRepairs({ repeats, contractorName }: { repeats: Repeats; contractorName: string }) {
  const facts: Array<[string, string, string]> = [
    ["Came back in 30 days", String(repeats.reopened), `${formatInrShort(repeats.reopenedInr)} spent on them`],
    ["Fixed again", String(repeats.repeatJobs), `${formatInrShort(repeats.repeatInr)} within ${REPEAT_WINDOW_DAYS} days of an earlier fix`],
    ["Roads fixed twice or more", String(repeats.roadsFixedTwice), `${repeats.roadsFixedThreePlus} fixed three times or more`],
  ];
  return (
    <>
      <dl className="rb-facts-row">
        {facts.map(([term, value, note]) => (
          <div key={term} className="rb-fact">
            <dt className="ux4g-body-s-default ux4g-text-neutral-secondary">{term}</dt>
            <dd className="ux4g-heading-m-strong">{value}</dd>
            <dd className="ux4g-body-xs-default ux4g-text-neutral-secondary">{note}</dd>
          </div>
        ))}
      </dl>

      {repeats.examples.length > 0 ? (
        <>
          <h3 className="ux4g-title-m-strong ux4g-mt-l">Quickest repeats</h3>
          <div className="ux4g-table-responsive ux4g-mt-xs">
            <table className="ux4g-table ux4g-table-s rb-table">
              <caption className="sr-only">Same problem fixed again on the same road, quickest first</caption>
              <thead>
                <tr>
                  <th scope="col">Road</th>
                  <th scope="col">Problem</th>
                  <th scope="col" className="rb-num">Gap</th>
                  <th scope="col">Work orders</th>
                </tr>
              </thead>
              <tbody>
                {repeats.examples.map((row) => (
                  <tr key={row.workOrderId}>
                    <th scope="row">
                      {row.roadName}
                      <span className="ux4g-body-xs-default ux4g-text-neutral-secondary">
                        {" "}
                        <Link href={`/wards/${wardSlug(row.ward)}`} className="ux4g-text-link-s">
                          {row.roadId}, {row.ward}
                        </Link>
                      </span>
                    </th>
                    <td>{row.workType}</td>
                    <td className="rb-num">{gapText(row.days)}</td>
                    <td>
                      {row.earlierWorkOrderId} then {row.workOrderId}{" "}
                      {row.sameContractor ? null : (
                        <GovBadge tone="info" small>
                          earlier fix by someone else
                        </GovBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
            For example, {repeats.examples[0].roadName} ({repeats.examples[0].roadId}) had the same kind of problem
            fixed again {repeats.examples[0].days === 0 ? "on the same day" : `${repeats.examples[0].days} days later`}, in{" "}
            {repeats.examples[0].workOrderId}, a job given to {contractorName}. A repeat can be bad luck, a busy road, a
            poor fix or a duplicate order. This list is where to ask.
          </p>
        </>
      ) : null}

      {repeats.topRoads.length > 0 ? (
        <>
          <h3 className="ux4g-title-m-strong ux4g-mt-l">Roads fixed most often</h3>
          <div className="ux4g-table-responsive ux4g-mt-xs">
            <table className="ux4g-table ux4g-table-s rb-table">
              <caption className="sr-only">Road segments this contractor repaired more than once</caption>
              <thead>
                <tr>
                  <th scope="col">Road</th>
                  <th scope="col" className="rb-num">Jobs</th>
                  <th scope="col" className="rb-num">Came back</th>
                  <th scope="col" className="rb-num">Billed</th>
                </tr>
              </thead>
              <tbody>
                {repeats.topRoads.map((road) => (
                  <tr key={road.roadId}>
                    <th scope="row">
                      {road.roadName}
                      <span className="ux4g-body-xs-default ux4g-text-neutral-secondary"> {road.roadId}, {road.ward}</span>
                    </th>
                    <td className="rb-num">{road.jobs}</td>
                    <td className="rb-num">{road.reopened}</td>
                    <td className="rb-num">{formatInrShort(road.costInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
