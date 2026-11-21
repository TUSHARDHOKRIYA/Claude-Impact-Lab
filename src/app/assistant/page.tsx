import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant/AssistantChat";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ask about a road repair",
  description: "Ask Claude what happened to your Mumbai road repair complaint using official BMC records.",
};

type PageProps = {
  searchParams: Promise<{ complaintId?: string; reportId?: string }>;
};

export default async function AssistantPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialId = params.complaintId || params.reportId || "";

  return (
    <main className="shell max-w-[52rem] min-w-0 py-6 sm:py-12">
      <header className="mb-6 sm:mb-8">
        <h1 className="ux4g-display-xs-strong text-slate-900 mb-2">Citizen Accountability Assistant</h1>
        <p className="ux4g-body-m-default text-slate-600">
          Find out what happened to road repair money in Mumbai. Check whether your complaint led to an official work
          order, who was hired, what was billed, and whether the repair lasted.
        </p>
      </header>

      <section className="sm:bg-white sm:rounded-2xl sm:border sm:border-slate-200 sm:p-8 sm:shadow-sm">
        <AssistantChat initialComplaintId={initialId} />
      </section>
    </main>
  );
}
