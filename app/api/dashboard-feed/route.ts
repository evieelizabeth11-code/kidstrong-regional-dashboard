import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PUBLISHED_FEED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000006&single=true&output=csv";

const REPORT_DATE_COLUMN = 12;
const ACTIVE_PAYING_COLUMN = 11;
const LATEST_HEALTH_CENTER_COLUMN = 38;
const LATEST_HEALTH_APM_COLUMN = 39;
const LATEST_HEALTH_DATE_COLUMN = 40;

const readCell = (value = "") => value.replace(/^"|"$/g, "").trim();

const mergeNewestCenterRows = (feeds: string[]) => {
  const parsedFeeds = feeds.map((csv) => csv.trim().split(/\r?\n/).filter(Boolean));
  const header = parsedFeeds.find((rows) => rows.length)?.[0] ?? "";
  const newestByCenter = new Map<string, { reportDate: string; row: string }>();
  const latestHealthByCenter = new Map<string, { reportDate: string; apm: string }>();

  parsedFeeds.forEach((rows) => {
    rows.slice(1).forEach((row) => {
      const values = row.split(",");
      const center = readCell(values[0]);
      const reportDate = readCell(values[REPORT_DATE_COLUMN]);

      const healthCenter = readCell(values[LATEST_HEALTH_CENTER_COLUMN]);
      const healthApm = readCell(values[LATEST_HEALTH_APM_COLUMN]);
      const healthDate = readCell(values[LATEST_HEALTH_DATE_COLUMN]);
      if (healthCenter && Number.isFinite(Number(healthApm)) && /^20\d{2}-\d{2}-\d{2}$/.test(healthDate)) {
        const currentHealth = latestHealthByCenter.get(healthCenter);
        if (!currentHealth || healthDate >= currentHealth.reportDate) {
          latestHealthByCenter.set(healthCenter, { reportDate: healthDate, apm: healthApm });
        }
      }

      if (!center || !/^20\d{2}-\d{2}-\d{2}$/.test(reportDate)) return;

      const current = newestByCenter.get(center);
      if (!current || reportDate >= current.reportDate) {
        newestByCenter.set(center, { reportDate, row });
      }
    });
  });

  const mergedRows = Array.from(newestByCenter.entries()).map(([center, { row }]) => {
    const values = row.split(",");
    const latestHealth = latestHealthByCenter.get(center);
    if (latestHealth) values[ACTIVE_PAYING_COLUMN] = latestHealth.apm;
    return values.join(",");
  });

  return [header, ...mergedRows].join("\n");
};

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
    // Google can briefly serve a mixed published-sheet generation where only
    // some center rows have refreshed. Sample several copies and keep the
    // newest report-date row independently for each center.
    const feeds = await Promise.all([
      fetchPublishedFeed(),
      fetchPublishedFeed(),
      fetchPublishedFeed(),
      fetchPublishedFeed(),
    ]);
    const latestFeed = mergeNewestCenterRows(feeds);

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
