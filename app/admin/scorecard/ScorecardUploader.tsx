"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ScorecardRow = {
  center: string;
  activePayingMembers: number;
  activePayerNetGain: number;
  membershipRevenue: number;
  totalRevenue: number;
  churnRate: number;
  salesMtd: number;
  totalDropsMtd: number;
  leadsMtd: number;
  leadToBooked: number;
  trialsBooked: number;
  totalTrialsBooked: number;
  trialsExpected: number;
  showRate: number;
  trialsAttended: number;
  salesFromTrial: number;
  salesNoTrial: number;
  winbacks: number;
  pendingDropsIgnored: number;
};

type Preview = {
  reportDate: string;
  fileName: string;
  sourceFileId: string;
  sourceFileUrl: string;
  rows: ScorecardRow[];
};

type Reconciliation = {
  reportDate: string;
  checkedAt: string;
  centersChecked: number;
  checks: { health: boolean; calls: boolean; trials: boolean; scorecard: boolean };
};

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export default function ScorecardUploader() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [reportDate, setReportDate] = useState(today);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [reconcileMessage, setReconcileMessage] = useState("");

  useEffect(() => {
    fetch("/api/scorecard", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setReady(Boolean(result.ready)))
      .catch(() => setReady(false));
  }, []);

  const regionalSales = useMemo(() => preview?.rows.reduce((sum, row) => sum + row.salesMtd, 0) ?? 0, [preview]);

  const parsePdf = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return setMessage("Choose the daily scorecard PDF first.");
    setBusy(true); setMessage(""); setComplete(false);
    const form = new FormData();
    form.set("action", "parse"); form.set("password", password); form.set("reportDate", reportDate); form.set("file", file);
    try {
      const response = await fetch("/api/scorecard", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "The PDF could not be read.");
      setPreview(result); setMessage("Four centers found and every total passed validation. Review, then approve.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The PDF could not be read.");
    } finally { setBusy(false); }
  };

  const approve = async () => {
    if (!preview) return;
    setBusy(true); setMessage("");
    const form = new FormData();
    form.set("action", "approve"); form.set("password", password); form.set("reportDate", preview.reportDate);
    form.set("fileName", preview.fileName); form.set("sourceFileId", preview.sourceFileId); form.set("rows", JSON.stringify(preview.rows));
    try {
      const response = await fetch("/api/scorecard", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "The dashboard could not be updated.");
      setComplete(true); setMessage(`${result.centersUpdated} centers updated for ${result.reportDate}. Regional sales: ${result.regionalSales}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The dashboard could not be updated.");
    } finally { setBusy(false); }
  };

  const updateValue = (rowIndex: number, field: keyof ScorecardRow, value: string) => {
    if (!preview || field === "center") return;
    const rows = preview.rows.map((row, index) => index === rowIndex ? { ...row, [field]: Number(value) } : row);
    setPreview({ ...preview, rows });
  };

  const reconcile = async () => {
    if (!password) return setReconcileMessage("Enter the admin password above first.");
    setReconciling(true); setReconcileMessage(""); setReconciliation(null);
    const form = new FormData();
    form.set("password", password);
    try {
      const response = await fetch("/api/reconcile", { method: "POST", body: form, cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "The dashboard could not be reconciled.");
      setReconciliation(result);
      setReconcileMessage("Dashboard reconciled successfully. The live site is reading the latest sheet data.");
    } catch (error) {
      setReconcileMessage(error instanceof Error ? error.message : "The dashboard could not be reconciled.");
    } finally { setReconciling(false); }
  };

  return <section className="scorecard-workflow">
    {ready === false && <div className="setup-banner"><strong>ONE-TIME CONNECTION NEEDED</strong><span>The upload page is built, but its private Google connection still needs to be activated.</span></div>}
    <div className="workflow-steps" aria-label="Upload steps">
      <article className={!preview ? "active" : "done"}><b>1</b><div><small>UPLOAD</small><strong>Select the PDF</strong></div></article>
      <article className={preview && !complete ? "active" : complete ? "done" : ""}><b>2</b><div><small>REVIEW</small><strong>Check four centers</strong></div></article>
      <article className={complete ? "done" : ""}><b>3</b><div><small>APPROVE</small><strong>Update dashboard</strong></div></article>
    </div>

    {!preview && <form className="upload-card" onSubmit={parsePdf}>
      <div className="upload-card-heading"><div><small>PRIVATE ADMIN UPLOAD</small><h2>Daily Scorecard PDF</h2></div><span>PDF · 5 MB MAX</span></div>
      <div className="upload-fields">
        <label><span>REPORT DATE</span><input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} required /></label>
        <label><span>ADMIN PASSWORD</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
      </div>
      <label className={`file-drop ${file ? "selected" : ""}`}>
        <input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
        <b>{file ? "✓" : "+"}</b><strong>{file?.name ?? "Choose the scorecard PDF"}</strong><span>{file ? `${(file.size / 1024).toFixed(0)} KB ready for validation` : "Click to browse your computer"}</span>
      </label>
      <button className="primary-admin-button" disabled={busy || ready === false}>{busy ? "Reading & validating…" : "Read & validate four centers →"}</button>
    </form>}

    {preview && <div className="review-card">
      <div className="review-heading"><div><small>REVIEW BEFORE APPROVAL</small><h2>{preview.fileName}</h2><span>{preview.reportDate} · Regional sales {regionalSales}</span></div><button onClick={() => { setPreview(null); setMessage(""); }}>Choose another PDF</button></div>
      <div className="scorecard-review-table">
        <div className="review-row review-head"><span>CENTER</span><span>APM</span><span>ATTRITION</span><span>SALES</span><span>DROPS</span><span>SHOW</span><span>ATTENDED</span><span>TRIAL SIGNS</span><span>NON-TRIAL</span></div>
        {preview.rows.map((row, index) => <div className="review-row" key={row.center}>
          <strong>{row.center}</strong>
          <input aria-label={`${row.center} active paying members`} type="number" value={row.activePayingMembers} onChange={(event) => updateValue(index, "activePayingMembers", event.target.value)} />
          <input aria-label={`${row.center} attrition rate`} type="number" step="0.1" value={row.churnRate} onChange={(event) => updateValue(index, "churnRate", event.target.value)} />
          <input aria-label={`${row.center} sales`} type="number" value={row.salesMtd} onChange={(event) => updateValue(index, "salesMtd", event.target.value)} />
          <input aria-label={`${row.center} drops`} type="number" value={row.totalDropsMtd} onChange={(event) => updateValue(index, "totalDropsMtd", event.target.value)} />
          <input aria-label={`${row.center} show rate`} type="number" step="0.1" value={row.showRate} onChange={(event) => updateValue(index, "showRate", event.target.value)} />
          <input aria-label={`${row.center} attended trials`} type="number" value={row.trialsAttended} onChange={(event) => updateValue(index, "trialsAttended", event.target.value)} />
          <input aria-label={`${row.center} trial signs`} type="number" value={row.salesFromTrial} onChange={(event) => updateValue(index, "salesFromTrial", event.target.value)} />
          <input aria-label={`${row.center} non-trial signs`} type="number" value={row.salesNoTrial} onChange={(event) => updateValue(index, "salesNoTrial", event.target.value)} />
        </div>)}
      </div>
      <div className="pending-rule"><b>✓</b><div><strong>Pending drops remain protected</strong><span>Scorecard pending drops were read for comparison but will not overwrite Membership Health.</span></div></div>
      <button className="primary-admin-button approve" disabled={busy || complete} onClick={approve}>{complete ? "Dashboard updated ✓" : busy ? "Updating dashboard…" : "Approve & update dashboard →"}</button>
    </div>}
    {message && <p className={`admin-message ${complete ? "success" : ""}`} role="status">{message}</p>}

    <div className="reconcile-card">
      <div className="reconcile-heading">
        <div><small>FINAL MORNING STEP</small><h2>Reconcile &amp; refresh dashboard</h2><p>After Health, Calls, and the Daily Scorecard are complete, run one final check against the live Google Sheet feed.</p></div>
        <span>{reconciliation ? "READY ✓" : "4 DATA CHECKS"}</span>
      </div>
      <div className="reconcile-checks" aria-label="Reconciliation checks">
        {(["health", "calls", "trials", "scorecard"] as const).map((check) => <div className={reconciliation?.checks[check] ? "passed" : ""} key={check}>
          <b>{reconciliation?.checks[check] ? "✓" : "•"}</b><span>{check === "scorecard" ? "Daily Scorecard" : check[0].toUpperCase() + check.slice(1)}</span>
        </div>)}
      </div>
      <button className="primary-admin-button reconcile-button" disabled={reconciling || ready === false} onClick={reconcile}>
        {reconciling ? "Reconciling four centers…" : reconciliation ? "Reconcile again ↻" : "Reconcile & refresh dashboard ↻"}
      </button>
      {reconcileMessage && <p className={`admin-message ${reconciliation ? "success" : ""}`} role="status">{reconcileMessage}</p>}
      {reconciliation && <div className="reconcile-confirmation"><strong>{reconciliation.centersChecked} centers confirmed</strong><span>Report date {reconciliation.reportDate} · Checked {new Date(reconciliation.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span><a href={`/?refresh=${Date.now()}`}>Open refreshed dashboard →</a></div>}
    </div>
  </section>;
}
