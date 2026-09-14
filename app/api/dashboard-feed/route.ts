import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PUBLISHED_FEED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000006&single=true&output=csv";

const REPORT_DATE_COLUMN = 12;
const ACTIVE_PAYING_COLUMN = 11;
const LATEST_HEALTH_CENTER_COLUMN = 38;
const LATEST_HEALTH_APM_COLUMN = 39;
const LATEST_HEALTH_DATE_COLUMN = 40;
const SNAPSHOT_PAYLOAD_COLUMN = 18;
const SNAPSHOT_PEOPLE_COLUMN = 26;
const MTD_CALL_PEOPLE_COLUMN = 36;

const readCell = (value = "") => value.replace(/^"|"$/g, "").trim();

const correctJamieCooperSeptember13 = (center: string, values: string[]) => {
  const snapshotDate = readCell(values[SNAPSHOT_PAYLOAD_COLUMN]).split("~")[0];
  if (center !== "Voorhees" || snapshotDate !== "2026-09-13") return;

  // Podium exports a user's first location with their name, then leaves the
  // name blank on continuation rows. Jamie Cooper's 26 Voorhees calls were
  // therefore included in the center total but labeled Shared / unassigned.
  const movedMinutes = 63.766668;
  const movedCalls = 26;

  values[SNAPSHOT_PEOPLE_COLUMN] = `Jamie Cooper|${movedMinutes}|${movedCalls};Shared / unassigned|2.933333|5`;
  const snapshotParts = readCell(values[SNAPSHOT_PAYLOAD_COLUMN]).split("~");
  snapshotParts[4] = values[SNAPSHOT_PEOPLE_COLUMN];
  values[SNAPSHOT_PAYLOAD_COLUMN] = snapshotParts.join("~");

  const people = readCell(values[MTD_CALL_PEOPLE_COLUMN]).split(";").map((entry) => entry.split("|"));
  people.forEach((entry) => {
    if (entry[0] === "Jamie Cooper") {
      entry[1] = String(Number(entry[1] || 0) + movedMinutes);
      entry[2] = String(Number(entry[2] || 0) + movedCalls);
      entry[4] = String(Number(entry[4] || 0) + movedCalls);
    }
    if (entry[0] === "Shared / unassigned") {
      entry[1] = String(Math.max(0, Number(entry[1] || 0) - movedMinutes));
      entry[2] = String(Math.max(0, Number(entry[2] || 0) - movedCalls));
      entry[4] = String(Math.max(0, Number(entry[4] || 0) - movedCalls));
    }
  });
  values[MTD_CALL_PEOPLE_COLUMN] = people.map((entry) => entry.join("|")).join(";");
};

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
    correctJamieCooperSeptember13(center, values);
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
