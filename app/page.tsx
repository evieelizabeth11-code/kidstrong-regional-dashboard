"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { callData, mergeCallFeedRows } from "./call-data";
import { membershipData, type CenterMembership } from "./membership-data";
import ReportingPeriodNav from "./ReportingPeriodNav";
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
  const [liveMembershipData, setLiveMembershipData] = useState<CenterMembership[]>(membershipData);
  const [liveReports, setLiveReports] = useState(reports);

  useEffect(() => {
    const loadCalls = async () => {
      try {
        const response = await fetch(`${DASHBOARD_FEED_URL}&t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const rows = (await response.text()).trim().split(/\r?\n/).slice(1);
        setLiveCallData(mergeCallFeedRows(callData, rows));
        setLiveReports(mergeOfficialTrialFeed(reports, rows));
        const memberships = rows.map((row) => {
          const values = row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
          return {
            center: values[0],
            totalMembers: Number(values[1]),
            bomApm: Number(values[2]),
            holds: { total: Number(values[3]), scheduled: null, starting: Number(values[4]), lifting: Number(values[5]) },
            drops: { total: Number(values[6]), pending: Number(values[7]) },
            signups: {
              current: Number(values[8]),
              goal: Number(values[9]),
              trial: Number(values[13]),
              nonTrial: Number(values[14]),
            },
            pastDue: Number(values[10]),
            reportDate: values[12],
          };
        }).filter((item) => item.center && Number.isFinite(item.signups.current));
        if (memberships.length) setLiveMembershipData(memberships);
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
  const totalSignups = liveMembershipData.reduce((sum, item) => sum + item.signups.current, 0);
  const totalDrops = liveMembershipData.reduce((sum, item) => sum + item.drops.total, 0);
  const totalBomApm = liveMembershipData.reduce((sum, item) => sum + item.bomApm, 0);
  const regionalAttrition = pct(totalDrops, totalBomApm);

  return (
    <main className="overview-page">
      <header className="navy-header brandless-header">
        <div className="header-title">
          <span>REGIONAL PERFORMANCE COMMAND CENTER</span>
          <strong>JULY 2026</strong>
        </div>
        <ReportingPeriodNav />
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
          <article><small>SIGN-UPS MTD</small><strong>{totalSignups}</strong><span>regional new memberships</span></article>
          <article><small>ATTRITION RATE</small><strong>{regionalAttrition.toFixed(1)}%</strong><span>{totalDrops} drops ÷ {totalBomApm.toLocaleString()} BOM APM</span></article>
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
            const membership = liveMembershipData.find((item) => item.center === report.center);
            const centerAttrition = membership ? pct(membership.drops.total, membership.bomApm) : 0;
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
                  <div><small>SIGNS MTD</small><strong>{membership?.signups.current ?? "—"}</strong></div>
                  <div className="featured-rate"><small>SHOW RATE</small><strong>{rate(report.showed, report.scheduled)}</strong></div>
                  <div className="featured-rate"><small>CLOSE RATE</small><strong>{rate(report.closed, report.showed)}</strong></div>
                  <div className="attrition-rate"><small>ATTRITION</small><strong>{membership ? `${centerAttrition.toFixed(1)}%` : "—"}</strong></div>
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

        <footer>Official center trial totals: Daily Scorecard · Coaching detail: Trial Tracker <span>Dashboard updated through July 31, 2026</span></footer>
      </div>
    </main>
  );
}
