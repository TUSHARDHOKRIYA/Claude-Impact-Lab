import { GovButton } from "@/components/gov/GovButton";
import { HOME_ISSUE_TYPES } from "@/lib/issue-type-param";
import { ISSUE_TYPE_LABELS, type IssueType } from "@/lib/types";

export function HomeIssueLinks({
  types = HOME_ISSUE_TYPES,
}: {
  types?: readonly IssueType[];
}) {
  return (
    <nav aria-label="Condition types">
      <h2 className="ux4g-heading-xs-strong">Choose a condition type</h2>
      <ul className="rb-home-issues mt-3" role="list">
        {types.map((type) => (
          <li key={type} className="min-w-0">
            <GovButton
              href={`/?type=${type}`}
              variant="secondary"
              className="w-full"
            >
              {ISSUE_TYPE_LABELS[type]}
            </GovButton>
          </li>
        ))}
      </ul>
    </nav>
  );
}
