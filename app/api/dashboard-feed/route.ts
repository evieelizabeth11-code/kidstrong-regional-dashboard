import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PUBLISHED_FEED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000006&single=true&output=csv";

export async function GET() {
  try {
    const upstream = await fetch(`${PUBLISHED_FEED_URL}&t=${Date.now()}`, {
      cache: "no-store",
      headers: { "User-Agent": "KidStrong Regional Dashboard" },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Dashboard feed unavailable" }, { status: 502 });
    }

    return new NextResponse(await upstream.text(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json({ error: "Dashboard feed unavailable" }, { status: 502 });
  }
}
