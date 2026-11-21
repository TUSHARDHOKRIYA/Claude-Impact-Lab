/** Downloadable A4 scorecard: GET /contractors/<id>/scorecard.pdf */

import { getScorecards } from "@/lib/rupee/scorecard";
import { renderScorecardPdf } from "@/lib/rupee/scorecard-pdf/render";
import { slugOf } from "@/lib/rupee/scorecard-pdf/text";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const { cards } = getScorecards();
  const card = cards.find((c) => c.id.toLowerCase() === id.toLowerCase());
  if (!card) return new Response("Contractor not found", { status: 404 });

  const bytes = await renderScorecardPdf(card, { total: cards.length, generatedOn: new Date() });
  // Copy onto a plain ArrayBuffer so the body satisfies the DOM BodyInit type.
  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugOf(card.name)}-scorecard.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
