import { NextResponse } from "next/server";
import { exportEvidencePackJson } from "@/lib/passport/evidence-pack";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const json = exportEvidencePackJson(id);
  if (!json) {
    return NextResponse.json({ error: "Road not found" }, { status: 404 });
  }

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${id}-evidence-pack.json"`,
    },
  });
}
