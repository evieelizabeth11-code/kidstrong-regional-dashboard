"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type HistoryRow = {
  snapshotDate: string;
  dataThrough: string;
  period: string;
  status: string;
  center: string;
  totalMembers: number;
  bomApm: number;
  activePaying: number;
  drops: number;
  signups: number;
  signupGoal: number;
  scheduled: number;
  attended: number;
  closed: number;
  callMinutes: number;
};

const HISTORY_FEED_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000008&single=true&output=csv";
const HISTORY_FALLBACK: HistoryRow[] = [
  { snapshotDate: "2026-08-01", dataThrough: "2026-07-31", period: "2026-07", status: "FINAL", center: "Brick", totalMembers: 608, bomApm: 537, activePaying: 536, drops: 27, signups: 31, signupGoal: 60, scheduled: 161, attended: 98, closed: 33, callMinutes: 3362.73 },
  { snapshotDate: "2026-08-01", dataThrough: "2026-07-31", period: "2026-07", status: "FINAL", center: "Mount Laurel", totalMembers: 480, bomApm: 402, activePaying: 402, drops: 27, signups: 46, signupGoal: 36, scheduled: 130, attended: 82, closed: 41, callMinutes: 3157.34 },
  { snapshotDate: "2026-08-01", dataThrough: "2026-07-31", period: "2026-07", status: "FINAL", center: "Turnersville", totalMembers: 498, bomApm: 447, activePaying: 447, drops: 47, signups: 35, signupGoal: 50, scheduled: 96, attended: 64, closed: 34, callMinutes: 2931 },
  { snapshotDate: "2026-08-01", dataThrough: "2026-07-31", period: "2026-07", status: "FINAL", center: "Voorhees", totalMembers: 481, bomApm: 407, activePaying: 404, drops: 34, signups: 46, signupGoal: 51, scheduled: 138, attended: 81, closed: 45, callMinutes: 2866.31 },
  { snapshotDate: "2026-08-02", dataThrough: "2026-08-01", period: "2026-08", status: "IN PROGRESS", center: "Brick", totalMembers: 608, bomApm: 537, activePaying: 536, drops: 27, signups: 0, signupGoal: 35, scheduled: 8, attended: 3, closed: 0, callMinutes: 49.22 },
  { snapshotDate: "2026-08-02", dataThrough: "2026-08-01", period: "2026-08", status: "IN PROGRESS", center: "Mount Laurel", totalMembers: 481, bomApm: 402, activePaying: 402, drops: 23, signups: 1, signupGoal: 36, scheduled: 5, attended: 4, closed: 1, callMinutes: 76.57 },
  { snapshotDate: "2026-08-02", dataThrough: "2026-08-01", period: "2026-08", status: "IN PROGRESS", center: "Turnersville", totalMembers: 500, bomApm: 447, activePaying: 446, drops: 45, signups: 2, signupGoal: 52, scheduled: 4, attended: 1, closed: 1, callMinutes: 38.35 },
  { snapshotDate: "2026-08-02", dataThrough: "2026-08-01", period: "2026-08", status: "IN PROGRESS", center: "Voorhees", totalMembers: 482, bomApm: 404, activePaying: 404, drops: 44, signups: 1, signupGoal: 52, scheduled: 4, attended: 3, closed: 1, callMinutes: 22.87 },
];
const pct = (top: number, bottom: number) => bottom ? (top / bottom) * 100 : 0;
const periodLabel = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export default function HistoryDashboard() {
  const [rows, setRows] = useState<HistoryRow[]>(HISTORY_FALLBACK);
  const [selectedPeriod, setSelectedPeriod] = useState("2026-07");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`${HISTORY_FEED_URL}&t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const records = (await response.text()).trim().split(/\r?\n/).slice(1).map((row) => {
          const values = row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
          return {
            snapshotDate: values[0],
            dataThrough: values[1],
            period: values[2],
            status: values[3],
            center: values[4],
            totalMembers: Number(values[5]),
            bomApm: Number(values[6]),
            activePaying: Number(values[7]),
            drops: Number(values[12]),
            signups: Number(values[14]),
            signupGoal: Number(values[17]),
            scheduled: Number(values[18]),
            attended: Number(values[19]),
            closed: Number(values[20]),
            callMinutes: Number(values[24]),
          };
        }).filter((row) => row.period && row.center);
        setRows(records);
        if (records.length) setSelectedPeriod(records[records.length - 1].period);
      } catch {
        // The live dashboard remains available if the archive feed is temporarily unavailable.
      }
    };
    loadHistory();
  }, []);

  const periods = useMemo(() => [...new Set(rows.map((row) => row.period))].sort().reverse(), [rows]);
  const selectedRows = useMemo(() => {
    const periodRows = rows.filter((row) => row.period === selectedPeriod);
    const latestByCenter = new Map<string, HistoryRow>();
    periodRows.forEach((row) => {
      const existing = latestByCenter.get(row.center);
      if (!existing || row.snapshotDate >= existing.snapshotDate) latestByCenter.set(row.center, row);
    });
    return [...latestByCenter.values()];
  }, [rows, selectedPeriod]);
  const totals = selectedRows.reduce((sum, row) => ({
    scheduled: sum.scheduled + row.scheduled,
    attended: sum.attended + row.attended,
    closed: sum.closed + row.closed,
    signups: sum.signups + row.signups,
    callMinutes: sum.callMinutes + row.callMinutes,
    activePaying: sum.activePaying + row.activePaying,
    drops: sum.drops + row.drops,
    bomApm: sum.bomApm + row.bomApm,
  }), { scheduled: 0, attended: 0, closed: 0, signups: 0, callMinutes: 0, activePaying: 0, drops: 0, bomApm: 0 });
  const status = selectedRows[0]?.status ?? "IN PROGRESS";
  const dataThrough = selectedRows[0]?.dataThrough || "2026-07-29";
  const statusForPeriod = (period: string) => rows.some((row) => row.period === period && row.status === "FINAL") ? "final" : "in progress";

  return <main className="history-page">
    <header className="navy-header brandless-header">
      <div className="header-title"><span>REGIONAL PERFORMANCE HISTORY</span><strong>{selectedPeriod ? periodLabel(selectedPeriod).toUpperCase() : "HISTORY"}</strong></div>
      <div className="history-header-actions"><Link href="/">← Live dashboard</Link><span className={status === "FINAL" ? "final" : ""}>{status}</span></div>
    </header>
    <div className="page-shell history-shell">
      <section className="history-hero">
        <div><p className="kicker">MONTHLY ARCHIVE</p><h1>Performance that stays <span>accessible.</span></h1><p>Every dated center snapshot is retained here so future updates cannot replace prior results.</p></div>
        <label><span>REPORTING PERIOD</span><select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)}>{periods.length ? periods.map((period) => <option value={period} key={period}>{periodLabel(period)} · {statusForPeriod(period)}</option>) : <option>July 2026 · loading</option>}</select></label>
      </section>

      <section className="history-status">
        <div><small>{status === "FINAL" ? "FINALIZED MONTH" : "MONTH IN PROGRESS"}</small><strong>{periodLabel(selectedPeriod)}</strong><span>Data through {dataThrough}</span></div>
        <p>{status === "FINAL" ? "This month is frozen and preserved." : "July remains editable until the final reconciliation is approved."}</p>
      </section>

      <section className="history-totals">
        <article><small>SIGN-UPS</small><strong>{totals.signups}</strong><span>regional MTD</span></article>
        <article><small>SHOW RATE</small><strong>{pct(totals.attended, totals.scheduled).toFixed(1)}%</strong><span>{totals.attended} of {totals.scheduled}</span></article>
        <article><small>CLOSE RATE</small><strong>{pct(totals.closed, totals.attended).toFixed(1)}%</strong><span>{totals.closed} of {totals.attended}</span></article>
        <article><small>TALK TIME</small><strong>{totals.callMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong><span>regional minutes</span></article>
        <article><small>ATTRITION</small><strong>{pct(totals.drops, totals.bomApm).toFixed(1)}%</strong><span>{totals.drops} drops ÷ {totals.bomApm.toLocaleString()} BOM APM</span></article>
        <article><small>ACTIVE PAYING</small><strong>{totals.activePaying.toLocaleString()}</strong><span>across four centers</span></article>
      </section>

      <div className="overview-section-head"><div><p className="kicker">CENTER HISTORY</p><h2>{periodLabel(selectedPeriod)} snapshot</h2></div><span>Latest retained record for each center</span></div>
      <section className="history-center-grid">
        {selectedRows.map((row) => <article key={row.center}>
          <div><small>{row.status}</small><h3>{row.center}</h3></div>
          <dl>
            <div><dt>SIGN-UPS</dt><dd>{row.signups} <small>/ {row.signupGoal}</small></dd></div>
            <div><dt>SHOW</dt><dd>{pct(row.attended, row.scheduled).toFixed(1)}%</dd></div>
            <div><dt>CLOSE</dt><dd>{pct(row.closed, row.attended).toFixed(1)}%</dd></div>
            <div><dt>CALL MIN.</dt><dd>{row.callMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</dd></div>
            <div><dt>ATTRITION</dt><dd>{pct(row.drops, row.bomApm).toFixed(1)}%</dd></div>
            <div><dt>ACTIVE PAYING</dt><dd>{row.activePaying}</dd></div>
          </dl>
        </article>)}
      </section>

      <section className="history-coming">
        <div><span>↗</span><div><small>AUGUST TRACKING IS LIVE</small><strong>The first August snapshot is now retained</strong><p>August is being saved as an in-progress month through EOD August 1. July remains frozen, and the completed August month will support the first full month-over-month comparison.</p></div></div>
      </section>
    </div>
  </main>;
}
