import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlaceHeader } from "@/components/place/PlaceHeader";
import { PlaceMeta } from "@/components/place/PlaceMeta";
import { PlaceTimeline } from "@/components/place/PlaceTimeline";
import { getPlacePage } from "@/lib/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ report?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = firstParam((await searchParams).report);
  const data = await getPlacePage(slug, undefined, report);
  if (!data) return { title: "Place" };
  return { title: `${data.location.name} · ${data.location.street}` };
}

export default async function PlacePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const report = firstParam((await searchParams).report);
  const data = await getPlacePage(slug, undefined, report);
  if (!data) notFound();

  return (
    <article className="shell py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-2 p-0">
          <li>
            <Link href="/map" className="ux4g-text-link-m touch-target inline-flex items-center">
              Kala Ghoda records
            </Link>
          </li>
          <li aria-hidden="true" className="ux4g-text ux4g-text-neutral-tertiary">
            /
          </li>
          <li className="ux4g-text min-w-0 break-words" aria-current="page">
            {data.location.name}
          </li>
        </ol>
      </nav>

      <PlaceHeader location={data.location} />

      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 lg:order-2">
          <PlaceMeta place={data.place} reports={data.reports} />
        </div>
        <div className="min-w-0 lg:order-1">
          <PlaceTimeline history={data.history} />
        </div>
      </div>
    </article>
  );
}
