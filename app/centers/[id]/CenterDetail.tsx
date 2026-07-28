"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { callData } from "../../call-data";
import { reports } from "../../trial-data";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const pct = (top: number, bottom: number) => (bottom ? (top / bottom) * 100 : 0);
const rate = (top: number, bottom: number) => `${pct(top, bottom).toFixed(1)}%`;
const tone = (value: number) => (value >= 80 ? "strong" : value >= 60 ? "monitor" : "attention");
const MONTHLY_CALL_MINUTE_GOAL = 3000;

export default function CenterDetail({ centerId }: { centerId: string }) {
  const [dayFilter, setDayFilter] = useState("All days");
  const [sort, setSort] = useState("day");
  const selected = reports.find((report) => report.id === centerId) ?? reports[0];
  const selectedCalls = callData.find((item) => item.center === selected.center) ?? callData[0];

  const classRows = useMemo(() => {
    const rows = selected.classes.filter((row) => dayFilter === "All days" || row.day === dayFilter);
    return [...rows].sort((a, b) => {
      if (sort === "show") return pct(b.showed, b.scheduled) - pct(a.showed, a.scheduled);
      if (sort === "close") return pct(b.closed, b.showed) - pct(a.closed, a.showed);
      if (sort === "volume") return b.scheduled - a.scheduled;
      return days.indexOf(a.day) - days.indexOf(b.day) || a.time.localeCompare(b.time);
    });
  }, [selected, dayFilter, sort]);

  return (
    <main className="detail-page">
      <header className="navy-header">
        <Link href="/" className="wordmark">
          <span className="shield">K</span>
          <div><strong>KIDSTRONG</strong><small>REGIONAL PERFORMANCE</small></div>
        </Link>
        <div className="header-title"><span>CENTER PERFORMANCE</span><strong>{selected.center.toUpperCase()}</strong></div>
        <div className="date-lockup"><span className="calendar-icon">27</span><div><small>REPORTING WINDOW</small><strong>July 1 – July 27</strong></div></div>
      </header>

      <div className="page-shell">
        <nav className="detail-nav" aria-label="Center navigation">
          <Link href="/">← All centers</Link>
          <div>{reports.map((report) => <Link className={report.id === centerId ? "active" : ""} href={`/centers/${report.id}`} key={report.id}>{report.center}</Link>)}</div>
        </nav>

        <section className="detail-hero">
          <div><p className="kicker">JULY 2026 CENTER REPORT</p><h1>{selected.center}</h1><p>{selected.dateRange} · Trial and call performance</p></div>
          <div className="detail-call-progress"><small>MONTHLY CALL-TIME GOAL</small><strong>{pct(selectedCalls.totalMinutes, MONTHLY_CALL_MINUTE_GOAL).toFixed(1)}%</strong><span>{selectedCalls.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} of 3,000 minutes</span><i><b style={{ width: `${Math.min(pct(selectedCalls.totalMinutes, MONTHLY_CALL_MINUTE_GOAL), 100)}%` }} /></i></div>
        </section>

        <section className="kpi-grid">
          <article><span className="metric-icon blue">S</span><div><small>TRIALS SCHEDULED</small><strong>{selected.scheduled}</strong><p>100% of total</p></div></article>
          <article><span className="metric-icon green">SH</span><div><small>TRIALS SHOWED</small><strong>{selected.showed}</strong><p>{rate(selected.showed, selected.scheduled)} show rate</p></div></article>
          <article><span className="metric-icon navy">C</span><div><small>TRIALS CLOSED</small><strong>{selected.closed}</strong><p>{rate(selected.closed, selected.showed)} close rate</p></div></article>
          <article><span className="metric-icon black">NS</span><div><small>NO SHOWS</small><strong>{selected.scheduled - selected.showed}</strong><p>{rate(selected.scheduled - selected.showed, selected.scheduled)} no-show rate</p></div></article>
        </section>

        <section className="call-detail-strip">
          <div><small>TOTAL CALL TIME</small><strong>{selectedCalls.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} min</strong><span>{selectedCalls.totalHours.toFixed(1)} hours</span></div>
          <div><small>AVERAGE CALL LENGTH</small><strong>{selectedCalls.avgMinutes.toFixed(2)} min</strong><span>across {selectedCalls.totalCalls.toLocaleString()} calls</span></div>
          <div><small>OUTBOUND EFFORT</small><strong>{selectedCalls.outboundCalls.toLocaleString()}</strong><span>{pct(selectedCalls.outboundCalls, selectedCalls.totalCalls).toFixed(1)}% of calls</span></div>
          <div><small>FOLLOW-UP SIGNALS</small><strong>{(selectedCalls.missedCalls + selectedCalls.voicemails).toLocaleString()}</strong><span>{selectedCalls.missedCalls} missed · {selectedCalls.voicemails} voicemail</span></div>
        </section>

        <section className="analysis-grid">
          <article className="panel day-table-panel">
            <div className="panel-bar"><h3>TRIAL PERFORMANCE BY DAY</h3><span>{selected.center}</span></div>
            <div className="day-table">
              <div className="day-table-head"><span>Day</span><span>Sched</span><span>Showed</span><span>Closed</span><span>Show %</span><span>Close %</span></div>
              {selected.days.map((row) => <div className="day-table-row" key={row.day}><strong>{row.day}</strong><span>{row.scheduled}</span><span>{row.showed}</span><span>{row.closed}</span><span className={tone(pct(row.showed, row.scheduled))}>{rate(row.showed, row.scheduled)}</span><span className={tone(pct(row.closed, row.showed))}>{rate(row.closed, row.showed)}</span></div>)}
            </div>
          </article>
          <article className="panel chart-panel">
            <div className="panel-bar"><h3>RATES BY DAY</h3><span>Show / Close</span></div>
            <div className="legend"><span><i className="show-key" /> Show rate</span><span><i className="close-key" /> Close rate</span></div>
            <div className="grouped-chart">
              {selected.days.map((row) => <div className="chart-group" key={row.day}><div className="bars"><span className="show-bar" style={{ height: `${pct(row.showed, row.scheduled)}%` }} /><span className="close-bar" style={{ height: `${pct(row.closed, row.showed)}%` }} /></div><small>{row.day.slice(0, 3).toUpperCase()}</small></div>)}
            </div>
          </article>
        </section>

        <section className="insights-grid">
          <article className="insight success"><span>★</span><div><small>WHAT&apos;S WORKING</small><strong>{selected.strongest}</strong></div></article>
          <article className="insight risk"><span>!</span><div><small>GREATEST OPPORTUNITY</small><strong>{selected.opportunity}</strong></div></article>
          <article className="insight focus"><span>◎</span><div><small>GOLD STANDARD</small><strong>{selected.goldStandard}</strong></div></article>
        </section>

        <section className="panel class-panel">
          <div className="panel-bar class-bar"><div><h3>DAILY CLASS PERFORMANCE DETAILS</h3><span>{classRows.length} class windows shown</span></div><div className="table-controls"><select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)} aria-label="Filter class details by day"><option>All days</option>{days.map((day) => <option key={day}>{day}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort class details"><option value="day">Sort: schedule</option><option value="volume">Sort: volume</option><option value="show">Sort: show rate</option><option value="close">Sort: close rate</option></select></div></div>
          <div className="class-table-wrap"><table><thead><tr><th>Day</th><th>Class time</th><th>Scheduled</th><th>Showed</th><th>Closed</th><th>Show %</th><th>Close %</th></tr></thead><tbody>{classRows.map((row) => <tr key={`${row.day}-${row.time}`}><td><strong>{row.day}</strong></td><td>{row.time}</td><td>{row.scheduled}</td><td>{row.showed}</td><td>{row.closed}</td><td><span className={`rate-chip ${tone(pct(row.showed, row.scheduled))}`}>{rate(row.showed, row.scheduled)}</span></td><td><span className={`rate-chip ${tone(pct(row.closed, row.showed))}`}>{row.showed ? rate(row.closed, row.showed) : "—"}</span></td></tr>)}</tbody></table></div>
        </section>

        <footer>Sources: July Trial Performance Report and Calls by Softphone User <span>Dashboard updated July 28, 2026</span></footer>
      </div>
    </main>
  );
}
