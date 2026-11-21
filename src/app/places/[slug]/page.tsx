import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { placeTitle } from "@/components/map/place-title";
import { PlaceHeader } from "@/components/place/PlaceHeader";
import { PlaceTimeline } from "@/components/place/PlaceTimeline";
import { getPlacePage } from "@/lib/queries";
import { getRupee } from "@/lib/rupee";
import { wardSlug } from "@/lib/rupee/slug";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ report?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = firstParam((await searchParams).report);
  const data = await getPlacePage(slug, undefined, report);
  if (!data) return { title: "Place" };
  return { title: `${data.location.name}, ${data.location.street}` };
}

export default async function PlacePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const report = firstParam((await searchParams).report);
  const data = await getPlacePage(slug, undefined, report);
  if (!data) notFound();
  const hasLedger = getRupee().ledgers.some((row) => row.ward.code === data.location.ward);

  return (
    <article className="shell rb-place-page py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-2 p-0">
          <li>
            <Link
              href="/map"
              className="ux4g-text-link-m touch-target inline-flex items-center"
            >
              Map of reports
            </Link>
          </li>
          <li
            aria-hidden="true"
            className="ux4g-text ux4g-text-neutral-tertiary"
          >
            /
          </li>
          <li className="ux4g-text min-w-0 truncate" aria-current="page">
            {placeTitle(data)}
          </li>
        </ol>
      </nav>

      <PlaceHeader
        location={data.location}
        place={data.place}
        wardHref={hasLedger ? `/wards/${wardSlug(data.location.ward)}` : undefined}
      />

      <div className="ux4g-mt-2xl">
        <PlaceTimeline history={data.history} />
      </div>
    </article>
  );
}
