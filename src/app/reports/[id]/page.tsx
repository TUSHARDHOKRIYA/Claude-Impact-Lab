import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportStory } from "@/components/report/ReportStory";
import { RoadTrailCard } from "@/components/report/RoadTrailCard";
import { ShareBar } from "@/components/share/ShareBar";
import { getReportPage } from "@/lib/queries";
import { reportHeadline } from "@/lib/place-name";
import { reportAside } from "@/lib/report-copy";
import { getRoadTrail } from "@/lib/rupee/road-trail";
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
  const trail = getRoadTrail(data.location.roadId);

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
      {trail ? <RoadTrailCard trail={trail} reportId={data.report.id} /> : null}
      <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="ux4g-body-m-strong text-slate-900">Have questions about this repair?</p>
          <p className="ux4g-body-s-default text-slate-600">
            Ask the Citizen Accountability Assistant about work orders, contractor billing, or repair outcomes.
          </p>
        </div>
        <Link
          href={`/assistant?reportId=${encodeURIComponent(data.report.id)}`}
          className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary whitespace-nowrap"
        >
          Ask Claude &rarr;
        </Link>
      </div>
      <ShareBar path={`/reports/${data.report.id}`} title={shareTitle} text={shareText} />
    </article>
  );
}
