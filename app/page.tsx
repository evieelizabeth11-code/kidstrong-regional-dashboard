"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { callData, mergeCallFeedRows } from "./call-data";
import RegionalLeaderboard from "./RegionalLeaderboard";
import { reports } from "./trial-data";
import { mergeOfficialTrialFeed } from "./trial-feed";

const pct = (top: number, bottom: number) => (bottom ? (top / bottom) * 100 : 0);
const rate = (top: number, bottom: number) => `${pct(top, bottom).toFixed(1)}%`;
const progressTone = (value: number) =>
  value > 100 ? "progress-surpassed" : value >= 100 ? "progress-goal" : value >= 80 ? "progress-close" : "progress-behind";
const MONTHLY_CALL_MINUTE_GOAL = 3000;
const CALL_PUSH_GOALS = [3500, 4000];
const DASHBOARD_FEED_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000006&single=true&output=csv";

export default function Home() {
  const [liveCallData, setLiveCallData] = useState(callData);
  const [liveReports, setLiveReports] = useState(reports);

  useEffect(() => {
    const loadCalls = async () => {
      try {
        const response = await fetch(`${DASHBOARD_FEED_URL}&t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const rows = (await response.text()).trim().split(/\r?\n/).slice(1);
        setLiveCallData(mergeCallFeedRows(callData, rows));
        setLiveReports(mergeOfficialTrialFeed(reports, rows));
      } catch {
        // Keep the last built-in MTD totals when the live feed is unavailable.
      }
    };
    loadCalls();
  }, []);

  const totals = liveReports.reduce(
    (sum, report) => ({
      scheduled: sum.scheduled + report.scheduled,
      showed: sum.showed + report.showed,
      closed: sum.closed + report.closed,
    }),
    { scheduled: 0, showed: 0, closed: 0 },
  );
  const totalMinutes = liveCallData.reduce((sum, item) => sum + item.totalMinutes, 0);
  const totalCalls = liveCallData.reduce((sum, item) => sum + item.totalCalls, 0);

  return (
    <main className="overview-page">
      <header className="navy-header brandless-header">
        <div className="header-title">
          <span>REGIONAL PERFORMANCE COMMAND CENTER</span>
          <strong>JULY 2026</strong>
        </div>
        <div className="date-lockup">
          <span className="calendar-icon">29</span>
          <div><small>REPORTING WINDOW</small><strong>July 1 – July 29</strong></div>
        </div>
      </header>

      <div className="page-shell overview-shell">
        <section className="overview-hero">
          <div>
            <h1>NJ/CT/NY/DE/MD. <span>Southern New Jersey.</span></h1>
            <p>See the regional picture at a glance, then select a center for its complete trial, call-time, and membership performance story.</p>
          </div>
        </section>

        <section className="regional-totals" aria-label="Regional totals">
          <article><small>TRIALS SCHEDULED</small><strong>{totals.scheduled}</strong><span>across Southern New Jersey</span></article>
          <article><small>TRIALS SHOWED</small><div className="regional-value-pair"><strong>{totals.showed}</strong><em>{rate(totals.showed, totals.scheduled)}</em></div><span>regional show rate</span></article>
          <article><small>TRIALS CLOSED</small><div className="regional-value-pair"><strong>{totals.closed}</strong><em>{rate(totals.closed, totals.showed)}</em></div><span>regional close rate</span></article>
          <article><small>CALL TIME</small><div className="regional-value-pair"><strong>{totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong><em>{pct(totalMinutes, 12000).toFixed(1)}%</em></div><span>of 12,000 regional minutes</span></article>
        </section>

        <RegionalLeaderboard />

        <section className="overview-section-head">
          <div><p className="kicker">CENTER SCORECARDS</p><h2>Select a center to explore</h2></div>
          <span>{totalCalls.toLocaleString()} calls tracked this month</span>
        </section>

        <section className="overview-center-grid">
          {liveReports.map((report) => {
            const calls = liveCallData.find((item) => item.center === report.center) ?? liveCallData[0];
            const callProgress = pct(calls.totalMinutes, MONTHLY_CALL_MINUTE_GOAL);
            const nextCallTarget = [MONTHLY_CALL_MINUTE_GOAL, ...CALL_PUSH_GOALS].find((goal) => goal > calls.totalMinutes)
              ?? Math.ceil((calls.totalMinutes + 1) / 500) * 500;
            return (
              <Link className="overview-center-card" href={`/centers/${report.id}`} key={report.id}>
                <div className="overview-card-top">
                  <div><small>JULY 2026</small><h2>{report.center}</h2></div>
                  <span>OPEN CENTER <b>→</b></span>
                </div>
                <div className="overview-card-metrics">
                  <div><small>SCHEDULED</small><strong>{report.scheduled}</strong></div>
                  <div className="featured-rate"><small>SHOW RATE</small><strong>{rate(report.showed, report.scheduled)}</strong></div>
                  <div className="featured-rate"><small>CLOSE RATE</small><strong>{rate(report.closed, report.showed)}</strong></div>
                </div>
                <div className={`overview-call-goal ${progressTone(callProgress)}`}>
                  <div><span>{callProgress > 100 ? "GOAL SURPASSED ★" : callProgress >= 100 ? "GOAL HIT ✓" : "CALL-TIME GOAL"}</span><strong>{callProgress.toFixed(1)}%</strong></div>
                  <i><b style={{ width: `${Math.min(callProgress, 100)}%` }} /></i>
                  <small>{calls.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} minutes · {Math.max(0, nextCallTarget - calls.totalMinutes).toLocaleString(undefined, { maximumFractionDigits: 0 })} to {nextCallTarget.toLocaleString()} milestone</small>
                </div>
              </Link>
            );
          })}
        </section>

        <footer>Official center trial totals: Daily Scorecard · Coaching detail: Trial Tracker <span>Dashboard updated through July 29, 2026</span></footer>
      </div>
    </main>
  );
}
