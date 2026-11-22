import { NextResponse } from "next/server";
import { exportEvidencePackCsv } from "@/lib/passport/evidence-pack";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const csv = exportEvidencePackCsv(id);
  if (!csv) {
    return NextResponse.json({ error: "Road not found" }, { status: 404 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id}-evidence-pack.csv"`,
    },
  });
}
