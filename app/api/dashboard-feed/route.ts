import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PUBLISHED_FEED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000006&single=true&output=csv";

const newestReportDate = (csv: string) =>
  csv.match(/20\d{2}-\d{2}-\d{2}/g)?.sort().at(-1) ?? "";

const fetchPublishedFeed = async () => {
  const upstream = await fetch(`${PUBLISHED_FEED_URL}&t=${Date.now()}-${Math.random()}`, {
    cache: "no-store",
    headers: { "User-Agent": "KidStrong Regional Dashboard" },
  });
  if (!upstream.ok) throw new Error("Dashboard feed unavailable");
  return upstream.text();
};

export async function GET() {
  try {
    // Google can briefly serve different published-sheet generations to
    // concurrent requests. Compare two fresh copies and return the newest
    // report date so the regional homepage cannot get stuck on yesterday.
    const feeds = await Promise.all([fetchPublishedFeed(), fetchPublishedFeed()]);
    const latestFeed = feeds.sort((a, b) => newestReportDate(b).localeCompare(newestReportDate(a)))[0];

    return new NextResponse(latestFeed, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json({ error: "Dashboard feed unavailable" }, { status: 502 });
  }
}
