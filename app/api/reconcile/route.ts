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

function valuesFor(row: string) {
  return row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
}

function finite(values: string[], indexes: number[]) {
  return indexes.every((index) => values[index] !== "" && Number.isFinite(Number(values[index])));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const configuredPassword = process.env.SCORECARD_UPLOAD_PASSWORD ?? "";

  if (!safeEqual(password, configuredPassword)) {
    return Response.json({ ok: false, error: "That admin password is not correct." }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${PUBLISHED_FEED_URL}&reconcile=${Date.now()}`, {
      cache: "no-store",
      headers: { "User-Agent": "KidStrong Regional Dashboard Reconciliation" },
    });
    if (!upstream.ok) throw new Error("The published Google Sheet feed is unavailable.");

    const rows = (await upstream.text()).trim().split(/\r?\n/).slice(1).map(valuesFor);
    const centers = EXPECTED_CENTERS.map((center) => rows.find((values) => values[0] === center));
    const missingCenters = EXPECTED_CENTERS.filter((_, index) => !centers[index]);
    if (missingCenters.length) {
      return Response.json({ ok: false, error: `Missing from the dashboard feed: ${missingCenters.join(", ")}.` }, { status: 422 });
    }

    const present = centers as string[][];
    const reportDates = [...new Set(present.map((values) => values[12]).filter(Boolean))];
    const checks = {
      health: present.every((values) => finite(values, [1, 2, 3, 6, 7, 8, 9, 10]) && Boolean(values[12])),
      calls: present.every((values) => finite(values, [15, 16, 17, 21, 22, 23, 24, 25])),
      trials: present.every((values) => finite(values, [28, 29, 30, 31, 32, 33])),
      scorecard: present.every((values) => finite(values, [13, 14, 28, 29, 30])),
    };
    const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
    if (reportDates.length !== 1 || failed.length) {
      const issues = [
        ...(reportDates.length !== 1 ? ["the four centers do not share one report date"] : []),
        ...(failed.length ? [`missing ${failed.join(", ")} data`] : []),
      ];
      return Response.json({ ok: false, error: `Reconciliation stopped: ${issues.join(" and ")}.`, checks, reportDates }, { status: 422 });
    }

    return Response.json({
      ok: true,
      reportDate: reportDates[0],
      checkedAt: new Date().toISOString(),
      centersChecked: EXPECTED_CENTERS.length,
      checks,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "The dashboard could not be reconciled." }, { status: 502 });
  }
}
