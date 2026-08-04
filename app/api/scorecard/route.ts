export const runtime = "nodejs";

import { PDFParse } from "pdf-parse";
import { parseScorecardText } from "../../scorecard-parser";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

function safeEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function configuration() {
  return {
    password: process.env.SCORECARD_UPLOAD_PASSWORD ?? "",
    secret: process.env.SCORECARD_WEBHOOK_SECRET ?? "",
    webhookUrl: process.env.SCORECARD_WEBHOOK_URL ?? "",
  };
}

export async function GET() {
  const config = configuration();
  return Response.json({ ready: Boolean(config.password && config.secret && config.webhookUrl) });
}

export async function POST(request: Request) {
  const config = configuration();
  if (!config.password || !config.secret || !config.webhookUrl) {
    return Response.json({ ok: false, error: "The private upload connection still needs its one-time setup." }, { status: 503 });
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!safeEqual(password, config.password)) {
    return Response.json({ ok: false, error: "That admin password is not correct." }, { status: 401 });
  }

  const action = String(form.get("action") ?? "");
  const reportDate = String(form.get("reportDate") ?? "");
  let payload: Record<string, unknown> = { action, reportDate, secret: config.secret };

  if (action === "parse") {
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf") {
      return Response.json({ ok: false, error: "Choose a PDF scorecard." }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return Response.json({ ok: false, error: "The PDF must be smaller than 5 MB." }, { status: 400 });
    }
    const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const extracted = await parser.getText({ first: 1 });
      const rows = parseScorecardText(extracted.text);
      return Response.json({ ok: true, reportDate, fileName: file.name, sourceFileId: "dashboard-local-parse", sourceFileUrl: "", rows });
    } catch (error) {
      return Response.json({ ok: false, error: error instanceof Error ? error.message : "The PDF could not be validated." }, { status: 422 });
    } finally { await parser.destroy(); }
  } else if (action === "approve") {
    try {
      payload = {
        ...payload,
        fileName: String(form.get("fileName") ?? ""),
        sourceFileId: String(form.get("sourceFileId") ?? ""),
        rows: JSON.parse(String(form.get("rows") ?? "[]")),
      };
    } catch {
      return Response.json({ ok: false, error: "The review data could not be read." }, { status: 400 });
    }
  } else {
    return Response.json({ ok: false, error: "Unknown upload action." }, { status: 400 });
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    const result = await response.json() as Record<string, unknown>;
    return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch {
    return Response.json({ ok: false, error: "The Google scorecard processor could not be reached." }, { status: 502 });
  }
}
