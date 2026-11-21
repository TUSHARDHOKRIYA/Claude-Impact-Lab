import type { Metadata } from "next";

import { ReportForm } from "@/components/report/ReportForm";
import { parseIssueType } from "@/lib/issue-type-param";

export const metadata: Metadata = {
  title: "Report a road problem",
  description:
    "Photograph a pothole, waterlogging or open manhole in Mumbai. Your report joins the ward's repair money trail.",
};

type HomePageProps = {
  searchParams: Promise<{ type?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { type } = await searchParams;
  const initialIssueType = parseIssueType(type);

  return (
    <div className="shell-narrow rb-home">
      <div className="rb-intro">
        <h1 className="ux4g-display-xs-strong">Report a road problem</h1>
      <p className="ux4g-body-m-default ux4g-text-neutral-secondary rb-measure ux4g-mt-xs">
        It takes about a minute. Your report goes on the ward&apos;s record, next
        to what the ward spent fixing that road.
      </p>
      </div>
      <ReportForm initialIssueType={initialIssueType} />
    </div>
  );
}
