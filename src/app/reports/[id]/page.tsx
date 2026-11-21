import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportStory } from "@/components/report/ReportStory";
import { ShareBar } from "@/components/share/ShareBar";
import { getReportPage } from "@/lib/queries";
import { reportHeadline } from "@/lib/place-name";
import { reportAside } from "@/lib/report-copy";
import { ISSUE_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function loadReportPage(id: string) {
  return getReportPage(id);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await loadReportPage(id);
  if (!data) return { title: "Report" };
  const issue = ISSUE_TYPE_LABELS[data.report.issueType];
  const title = reportHeadline(issue, data.location.street);
  const description = reportAside(data.report, data.location);
  const images = data.report.photoIsIllustration
    ? ["/opengraph-image"]
    : [`/reports/${data.report.id}/photo`];
  return {
    title,
    description,
    openGraph: { title, description, type: "article", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadReportPage(id);
  if (!data) notFound();

  const issue = ISSUE_TYPE_LABELS[data.report.issueType];
  const shareTitle = reportHeadline(issue, data.location.street);
  const shareText = `${shareTitle}. ${reportAside(data.report, data.location)}`;

  return (
    <article className="shell max-w-[52rem] min-w-0 py-8 sm:py-10">
      <ReportStory
        report={data.report}
        location={data.location}
        place={data.place}
        history={data.history}
        similar={data.similar}
        connectedCount={data.connectedCount}
      />
      <ShareBar path={`/reports/${data.report.id}`} title={shareTitle} text={shareText} />
    </article>
  );
}
