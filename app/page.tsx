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
type StoplightTone = "metric-green" | "metric-amber" | "metric-red" | "metric-pending";
const thresholdTone = (value: number, greenAt: number, amberAt: number): StoplightTone =>
  value >= greenAt ? "metric-green" : value >= amberAt ? "metric-amber" : "metric-red";
const attritionTone = (value: number): StoplightTone =>
  value < 6 ? "metric-green" : value < 9 ? "metric-amber" : "metric-red";
const paceTone = (actual: number, expected: number): StoplightTone => {
  if (!expected) return "metric-pending";
  const pace = actual / expected;
  return pace >= 1 ? "metric-green" : pace >= 0.8 ? "metric-amber" : "metric-red";
};
const DEFAULT_CALL_MINUTE_GOAL = 3000;
const DASHBOARD_FEED_URL = "/api/live-data";

export default function Home() {
  const [liveCallData, setLiveCallData] = useState(callData);
  const [liveMembershipData, setLiveMembershipData] = useState<CenterMembership[]>(membershipData);
  const [liveReports, setLiveReports] = useState(reports);

  useEffect(() => {
    const loadCalls = async () => {
      try {
        const response = await fetch(`${DASHBOARD_FEED_URL}?t=${Date.now()}`, { cache: "no-store" });
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
            activePaying: values[11] ? Number(values[11]) : undefined,
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
            callGoal: values[43] ? Number(values[43]) : undefined,
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
  const regionalCallGoal = liveMembershipData.reduce((sum, item) => sum + (item.callGoal ?? DEFAULT_CALL_MINUTE_GOAL), 0);
  const totalSignups = liveMembershipData.reduce((sum, item) => sum + item.signups.current, 0);
  const totalDrops = liveMembershipData.reduce((sum, item) => sum + item.drops.total, 0);
  const totalBomApm = liveMembershipData.reduce((sum, item) => sum + item.bomApm, 0);
  const regionalAttrition = pct(totalDrops, totalBomApm);
  const latestReportDate = liveMembershipData
    .map((item) => item.reportDate)
    .filter(Boolean)
    .sort()
    .at(-1);
  const dataThrough = latestReportDate
    ? new Date(`${latestReportDate}T12:00:00`)
    : new Date("2026-08-04T12:00:00");
  dataThrough.setDate(dataThrough.getDate() - 1);
  const dataThroughLabel = dataThrough.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const reportingPeriodLabel = latestReportDate
    ? new Date(`${latestReportDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "August 2026";
  const daysInMonth = new Date(dataThrough.getFullYear(), dataThrough.getMonth() + 1, 0).getDate();
  const elapsedDays = Math.max(1, dataThrough.getDate());

  return (
    <main className="overview-page">
      <header className="navy-header brandless-header">
        <div className="header-title">
          <span>SOUTHERN NEW JERSEY PERFORMANCE HUB</span>
          <strong>{reportingPeriodLabel.toUpperCase()}</strong>
        </div>
        <ReportingPeriodNav />
      </header>

      <div className="page-shell overview-shell">
        <section className="overview-hero">
          <div>
            <h1><span>Southern New Jersey</span></h1>
          </div>
        </section>

        <section className="regional-totals" aria-label="Regional totals">
          <article><small>TRIALS SCHEDULED</small><strong>{totals.scheduled}</strong><span>across Southern New Jersey</span></article>
          <article><small>TRIALS SHOWED</small><div className="regional-value-pair"><strong>{totals.showed}</strong><em>{rate(totals.showed, totals.scheduled)}</em></div><span>regional show rate</span></article>
          <article><small>TRIALS CLOSED</small><div className="regional-value-pair"><strong>{totals.closed}</strong><em>{rate(totals.closed, totals.showed)}</em></div><span>regional close rate</span></article>
          <article><small>SIGN-UPS MTD</small><strong>{totalSignups}</strong><span>regional new memberships</span></article>
          <article><small>ATTRITION RATE</small><strong>{regionalAttrition.toFixed(1)}%</strong><span>{totalDrops} drops ÷ {totalBomApm.toLocaleString()} BOM APM</span></article>
          <article><small>CALL TIME</small><div className="regional-value-pair"><strong>{totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong><em>{pct(totalMinutes, regionalCallGoal).toFixed(1)}%</em></div><span>of {regionalCallGoal.toLocaleString()} regional minutes</span></article>
        </section>

        <RegionalLeaderboard memberships={liveMembershipData} reports={liveReports} reportingPeriod={reportingPeriodLabel} />

        <section className="overview-section-head">
          <div><p className="kicker">CENTER SCORECARDS</p><h2>Select a center to explore</h2></div>
          <span>{totalCalls.toLocaleString()} calls tracked this month</span>
        </section>

        <div className="overview-stoplight-legend" aria-label="Scorecard stoplight guide">
          <div><span className="green">ON TRACK</span><span className="amber">WATCH</span><span className="red">NEEDS ATTENTION</span></div>
          <small>Sign-ups &amp; talk time use today&apos;s pace · Show 70%+ · Close 70%+ · Attrition under 6%</small>
        </div>

        <section className="overview-center-grid">
          {liveReports.map((report) => {
            const calls = liveCallData.find((item) => item.center === report.center) ?? liveCallData[0];
            const membership = liveMembershipData.find((item) => item.center === report.center);
            const centerAttrition = membership ? pct(membership.drops.total, membership.bomApm) : 0;
            const callGoal = membership?.callGoal ?? DEFAULT_CALL_MINUTE_GOAL;
            const callTargets = [callGoal, callGoal + 500, callGoal + 1000];
            const callProgress = pct(calls.totalMinutes, callGoal);
            const nextCallTarget = callTargets.find((goal) => goal > calls.totalMinutes)
              ?? Math.ceil((calls.totalMinutes + 1) / 500) * 500;
            const expectedSignups = membership ? membership.signups.goal * (elapsedDays / daysInMonth) : 0;
            const signupTone = membership ? paceTone(membership.signups.current, expectedSignups) : "metric-pending";
            const showTone = thresholdTone(pct(report.showed, report.scheduled), 70, 60);
            const closeTone = thresholdTone(pct(report.closed, report.showed), 70, 50);
            const centerAttritionTone = membership ? attritionTone(centerAttrition) : "metric-pending";
            const expectedCallMinutes = callGoal * (elapsedDays / daysInMonth);
            const callTone = paceTone(calls.totalMinutes, expectedCallMinutes);
            const callPaceLabel = callTone === "metric-green" ? "ON PACE" : callTone === "metric-amber" ? "WATCH" : "OFF PACE";
            const paceStatus = signupTone === "metric-green"
              ? { label: "ON TRACK", tone: "on-track" }
              : signupTone === "metric-amber"
                ? { label: "WARNING", tone: "warning" }
                : signupTone === "metric-red"
                  ? { label: "OFF TRACK", tone: "off-track" }
                  : { label: "STATUS PENDING", tone: "pending" };
            return (
              <Link className="overview-center-card" href={`/centers/${report.id}`} key={report.id}>
                <div className="overview-card-top">
                  <div><small>{reportingPeriodLabel.toUpperCase()}</small><h2>{report.center}</h2></div>
                  <div className="overview-card-actions">
                    <span className={`overview-card-status ${paceStatus.tone}`}>{paceStatus.label}</span>
                    <span className="overview-card-open">OPEN CENTER <b>→</b></span>
                  </div>
                </div>
                <div className="overview-card-metrics">
                  <div className={`scorecard-metric signup-metric ${signupTone}`}><small>SIGNS MTD</small><strong>{membership?.signups.current ?? "—"}</strong></div>
                  <div className={`scorecard-metric show-metric ${showTone}`}><small>SHOW RATE</small><strong>{rate(report.showed, report.scheduled)}</strong></div>
                  <div className={`scorecard-metric close-metric ${closeTone}`}><small>CLOSE RATE</small><strong>{rate(report.closed, report.showed)}</strong></div>
                  <div className={`scorecard-metric attrition-metric ${centerAttritionTone}`}><small>ATTRITION</small><strong>{membership ? `${centerAttrition.toFixed(1)}%` : "—"}</strong></div>
                </div>
                <div className={`overview-call-goal ${callTone}`}>
                  <div><span>CALL-TIME PACE · {callPaceLabel}</span><strong>{callProgress.toFixed(1)}% of goal</strong></div>
                  <i><b style={{ width: `${Math.min(callProgress, 100)}%` }} /></i>
                  <small>{calls.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} minutes · {Math.max(0, nextCallTarget - calls.totalMinutes).toLocaleString(undefined, { maximumFractionDigits: 0 })} to {nextCallTarget.toLocaleString()} milestone</small>
                </div>
              </Link>
            );
          })}
        </section>

        <footer>Official center trial totals: Daily Scorecard · Coaching detail: Trial Tracker <span>{reportingPeriodLabel} reporting through EOD {dataThroughLabel}</span></footer>
      </div>
    </main>
  );
}
