import { redirect } from "next/navigation";

type LegacyReportPageProps = {
  searchParams: Promise<{ type?: string | string[] }>;
};

/** Old links to the report form. The form now lives at `/`. */
export default async function LegacyReportPage({ searchParams }: LegacyReportPageProps) {
  const { type } = await searchParams;
  const value = Array.isArray(type) ? type[0] : type;
  redirect(value ? `/?type=${encodeURIComponent(value)}` : "/");
}
