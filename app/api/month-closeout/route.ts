export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLISHED_FEED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000006&single=true&output=csv";
const EXPECTED_CENTERS = ["Brick", "Mount Laurel", "Turnersville", "Voorhees"];

function safeEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function parseCsvLine(row: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

async function currentFeed() {
  const upstream = await fetch(`${PUBLISHED_FEED_URL}&closeout=${Date.now()}`, { cache: "no-store" });
  if (!upstream.ok) throw new Error("The live Google Sheet feed is unavailable.");
  const rows = (await upstream.text()).trim().split(/\r?\n/).slice(1).map(parseCsvLine);
  const centers = EXPECTED_CENTERS.map((center) => rows.find((row) => row[0] === center));
  if (centers.some((row) => !row)) throw new Error("All four centers must be present before month closeout.");
  const present = centers as string[][];
  const dates = [...new Set(present.map((row) => row[12]).filter(Boolean))];
  if (dates.length !== 1) throw new Error("The four centers do not share one report date.");
  return { reportDate: dates[0], rows: present };
}

function closeoutSummary(reportDate: string, rows: string[][]) {
  const date = new Date(`${reportDate}T12:00:00`);
  const dataThrough = new Date(date); dataThrough.setDate(dataThrough.getDate() - 1);
  const period = `${dataThrough.getFullYear()}-${String(dataThrough.getMonth() + 1).padStart(2, "0")}`;
  const canFinalize = date.getDate() === 1;
  return {
    reportDate,
    dataThrough: dataThrough.toISOString().slice(0, 10),
    period,
    canFinalize,
    centers: rows.map((row) => ({
      center: row[0], apm: Number(row[11]), signups: Number(row[8]), scheduled: Number(row[28]),
      attended: Number(row[29]), closed: Number(row[30]), callMinutes: Number(row[21]), drops: Number(row[6]),
    })),
  };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const configuredPassword = process.env.SCORECARD_UPLOAD_PASSWORD ?? "";
  if (!safeEqual(password, configuredPassword)) {
    return Response.json({ ok: false, error: "That admin password is not correct." }, { status: 401 });
  }

  try {
    const feed = await currentFeed();
    const summary = closeoutSummary(feed.reportDate, feed.rows);
    const action = String(form.get("action") ?? "preview");
    if (action === "preview") return Response.json({ ok: true, ...summary });
    if (action !== "finalize") return Response.json({ ok: false, error: "Unknown closeout action." }, { status: 400 });
    if (!summary.canFinalize) {
      return Response.json({ ok: false, error: `Final closeout unlocks on the first report date of the new month. Current report date: ${summary.reportDate}.` }, { status: 422 });
    }

    const webhookUrl = process.env.SCORECARD_WEBHOOK_URL ?? "";
    const secret = process.env.SCORECARD_WEBHOOK_SECRET ?? "";
    if (!webhookUrl || !secret) throw new Error("The private Google connection is not configured.");
    const goals = JSON.parse(String(form.get("goals") ?? "[]"));
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "month-closeout", secret, reportDate: summary.reportDate, goals }),
      redirect: "follow",
    });
    const result = await response.json();
    return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Month closeout could not be completed." }, { status: 502 });
  }
}
