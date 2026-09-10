"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { membershipData, type CenterMembership } from "../membership-data";
import ReportingPeriodNav from "../ReportingPeriodNav";
import { reports } from "../trial-data";

const DASHBOARD_FEED_URL = "/api/live-data";
const STANDARD_MILESTONE_CENTERS = new Set(["Mount Laurel", "Turnersville", "Voorhees"]);
const FIRST_STANDARD_MILESTONE = 550;
const MILESTONE_STEP = 50;
const GROWTH_CHECKPOINTS: Record<string, number[]> = {
  Brick: [600, 650, 700],
  "Mount Laurel": [450, 500, 550],
  Turnersville: [500, 550, 600],
  Voorhees: [450, 500, 550],
};

type TrialTotals = { scheduled: number; showed: number; closed: number };
type ForecastInput = CenterMembership & TrialTotals & { rolling30Leads?: number; rolling30Booked?: number };
type ForecastCenter = ForecastInput & {
  dataThrough: Date;
  elapsedDays: number;
  daysInMonth: number;
  showRate: number;
  closeRate: number;
  remainingDays: number;
  dailyLeadAverage: number;
  leadToBookedRate: number;
  projectedRemainingLeads: number;
  projectedRemainingTrials: number;
  projectedMonthlyTrialSigns: number;
  projectedMonthlyOtherSales: number;
  projectedMonthlyTotalSales: number;
  projectedNextPayoutApm: number;
  milestones: number[];
};

const initialForecasts: ForecastInput[] = membershipData.map((membership) => {
  const trial = reports.find((report) => report.center === membership.center);
  return { ...membership, scheduled: trial?.scheduled ?? 0, showed: trial?.showed ?? 0, closed: trial?.closed ?? 0 };
});

const milestoneList = (center: string, apm: number) => {
  const milestones: number[] = [...(GROWTH_CHECKPOINTS[center] ?? [])];
  if (!milestones.length && STANDARD_MILESTONE_CENTERS.has(center)) milestones.push(500);
  const highestVisibleMilestone = Math.max(700, Math.ceil(Math.max(apm, FIRST_STANDARD_MILESTONE) / MILESTONE_STEP) * MILESTONE_STEP + 150);
  const firstVisibleMilestone = milestones[0] ?? FIRST_STANDARD_MILESTONE;
  for (let target = FIRST_STANDARD_MILESTONE; target <= highestVisibleMilestone; target += MILESTONE_STEP) if (target >= firstVisibleMilestone && !milestones.includes(target)) milestones.push(target);
  return milestones.sort((a, b) => a - b);
};

function enrichCenter(item: ForecastInput): ForecastCenter {
  const reportDate = item.reportDate ? new Date(`${item.reportDate}T12:00:00`) : new Date("2026-08-06T12:00:00");
  const dataThrough = new Date(reportDate);
  dataThrough.setDate(dataThrough.getDate() - 1);
  const elapsedDays = Math.max(1, dataThrough.getDate());
  const daysInMonth = new Date(dataThrough.getFullYear(), dataThrough.getMonth() + 1, 0).getDate();
  // Forecast conversion from the official current-month scorecard, not the rolling Looker baseline.
  const showRate = item.scheduled ? item.showed / item.scheduled : 0;
  const closeRate = item.showed ? item.closed / item.showed : 0;
  const remainingDays = Math.max(0, daysInMonth - elapsedDays);
  const dailyLeadAverage = (item.rolling30Leads ?? 0) / 30;
  const leadToBookedRate = item.rolling30Leads ? (item.rolling30Booked ?? 0) / item.rolling30Leads : 0;
  const projectedRemainingLeads = dailyLeadAverage * remainingDays;
  const projectedRemainingTrials = projectedRemainingLeads * leadToBookedRate;
  const projectedMonthlyTrialSigns = projectedRemainingTrials * showRate * closeRate;
  const projectedMonthlyOtherSales = Math.max(0, (item.signups.nonTrial / elapsedDays) * remainingDays);
  const projectedMonthlyTotalSales = projectedMonthlyTrialSigns + projectedMonthlyOtherSales;
  const currentApm = item.activePaying ?? (item.totalMembers - item.holds.total - item.pastDue);
  const holdMovement = item.holds.lifting - (item.holds.starting ?? 0);
  return {
    ...item,
    dataThrough,
    elapsedDays,
    daysInMonth,
    showRate,
    closeRate,
    remainingDays,
    dailyLeadAverage,
    leadToBookedRate,
    projectedRemainingLeads,
    projectedRemainingTrials,
    projectedMonthlyTrialSigns,
    projectedMonthlyOtherSales,
    projectedMonthlyTotalSales,
    projectedNextPayoutApm: currentApm + projectedMonthlyTotalSales + holdMovement - item.drops.pending,
    milestones: milestoneList(item.center, currentApm),
  };
}

export default function ForecastDashboard({ centerId }: { centerId?: string }) {
  const [forecastInputs, setForecastInputs] = useState<ForecastInput[]>(initialForecasts);
  const [scenarioShowRates, setScenarioShowRates] = useState<Record<string, number>>({});
  const [scenarioCloseRates, setScenarioCloseRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadForecast = async () => {
      try {
        const response = await fetch(`${DASHBOARD_FEED_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const live = (await response.text()).trim().split(/\r?\n/).slice(1).map((row) => {
          const values = row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
          return {
            center: values[0],
            totalMembers: Number(values[1]),
            bomApm: Number(values[2]),
            activePaying: values[11] ? Number(values[11]) : undefined,
            holds: { total: Number(values[3]), scheduled: null, starting: Number(values[4]), lifting: Number(values[5]) },
            drops: { total: Number(values[6]), pending: Number(values[7]) },
            signups: { current: Number(values[8]), goal: Number(values[9]), trial: Number(values[13]), nonTrial: Number(values[14]) },
            pastDue: Number(values[10]),
            reportDate: values[12],
            scheduled: Number(values[28]),
            showed: Number(values[29]),
            closed: Number(values[30]),
            rolling30Leads: Number(values[41]),
            rolling30Booked: Number(values[42]),
          } satisfies ForecastInput;
        }).filter((item) => item.center && Number.isFinite(item.bomApm));
        if (live.length) setForecastInputs(live);
      } catch {
        // Keep the built-in snapshot available if the live feed is temporarily unavailable.
      }
    };
    loadForecast();
  }, []);

  const forecasts = useMemo(() => forecastInputs
    .filter((item) => !centerId || reports.find((report) => report.center === item.center)?.id === centerId)
    .map((item) => enrichCenter(item)), [forecastInputs, centerId]);
  const regionalApm = forecasts.reduce((sum, item) => sum + (item.activePaying ?? item.bomApm), 0);
  const projectedRegionalApm = forecasts.reduce((sum, item) => sum + item.projectedNextPayoutApm, 0);
  const centersReachingNextMilestone = forecasts.filter((center) => {
    const currentApm = center.activePaying ?? center.bomApm;
    const next = center.milestones.find((target) => target > currentApm);
    if (!next) return false;
    return center.projectedNextPayoutApm >= next;
  }).length;
  const latestDataThrough = forecasts.map((item) => item.dataThrough).sort((a, b) => b.getTime() - a.getTime())[0];
  const selectedCenter = forecasts[0];

  return <main className="forecast-page">
    <header className="navy-header brandless-header">
      <div className="header-title"><span>MEMBERSHIP FORECAST</span><strong>{selectedCenter?.center.toUpperCase() ?? "MILESTONE ROADMAP"}</strong></div>
      <ReportingPeriodNav />
    </header>

    <div className="page-shell forecast-shell">
      {centerId && <nav className="detail-nav" aria-label="Center navigation">
        <Link href="/">← All centers</Link>
        <div className="section-tabs">
          <Link href={`/centers/${centerId}`}>Overview</Link>
          <Link href={`/centers/${centerId}/trials`}>Trials</Link>
          <Link href={`/centers/${centerId}/calls`}>Calls</Link>
          <Link href={`/centers/${centerId}/membership`}>Membership</Link>
          <Link className="active" href={`/centers/${centerId}/forecast`}>Forecast</Link>
        </div>
      </nav>}
      <section className="forecast-hero">
        <div><p className="kicker">{selectedCenter?.center.toUpperCase() ?? "LIVE"} MEMBERSHIP FORECAST</p><h1>See where your current pace will <span>finish the month.</span></h1><p>Start with the same likely outcome shown on the Membership tab, then adjust show and close rates to see what changes.</p></div>
        {centerId && <nav className="center-switcher" aria-label="Switch center and stay in Forecast">
          {reports.map((report) => <Link className={report.id === centerId ? "active" : ""} href={`/centers/${report.id}/forecast`} key={report.id}>{report.center}</Link>)}
        </nav>}
      </section>

      {!centerId && <section className="forecast-regional-strip" aria-label="Regional forecast summary">
        <article><small>REGIONAL APM</small><strong>{regionalApm.toLocaleString()}</strong><span>active paying members today</span></article>
        <article className={projectedRegionalApm >= regionalApm ? "growing" : "declining"}><small>NEXT PAYOUT-DATE APM</small><strong>{Math.round(projectedRegionalApm).toLocaleString()}</strong><span>projected across four centers</span></article>
        <article><small>NEXT-MONTH MILESTONES</small><strong>{centersReachingNextMilestone} <em>of {forecasts.length}</em></strong><span>centers projected to cross their next target</span></article>
        <article><small>DATA THROUGH</small><strong>{latestDataThrough?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "—"}</strong><span>forecast refreshes with the live feed</span></article>
      </section>}

      <section className={`forecast-center-grid ${centerId ? "single-center" : ""}`}>
        {forecasts.map((center) => {
          const currentApm = center.activePaying ?? (center.totalMembers - center.holds.total - center.pastDue);
          const checkpoints = GROWTH_CHECKPOINTS[center.center] ?? center.milestones;
          const nextCheckpoint = checkpoints.find((target) => target > currentApm) ?? checkpoints[checkpoints.length - 1];
          const membersNeeded = Math.max(0, nextCheckpoint - currentApm);
          const currentMonthHoldMovement = center.holds.lifting - (center.holds.starting ?? 0);
          const projectedSignupsAtPace = Math.round((center.signups.current / center.elapsedDays) * center.daysInMonth);
          const projectedAdditionalSignups = Math.max(0, projectedSignupsAtPace - center.signups.current);
          const currentPaceMonthEndApm = currentApm + projectedAdditionalSignups + currentMonthHoldMovement - center.drops.pending;
          const selectedShowRate = scenarioShowRates[center.center] ?? center.showRate;
          const selectedCloseRate = scenarioCloseRates[center.center] ?? center.closeRate;
          const currentRateTrialSigns = center.projectedRemainingTrials * center.showRate * center.closeRate;
          const scenarioTrialSigns = center.projectedRemainingTrials * selectedShowRate * selectedCloseRate;
          const scenarioSalesLift = scenarioTrialSigns - currentRateTrialSigns;
          const scenarioAdditionalSignups = Math.max(0, projectedAdditionalSignups + scenarioSalesLift);
          const scenarioMonthEndApm = currentPaceMonthEndApm + scenarioSalesLift;
          const scenarioApmLift = scenarioMonthEndApm - currentPaceMonthEndApm;
          return <article className="forecast-center-card" key={center.center}>
            <div className="forecast-card-head">
              <div><small>CURRENT ACTIVE PAYING</small><strong>{currentApm} <em>APM</em></strong><span>Live membership data through {center.dataThrough.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
              <div className="forecast-payout-apm"><small>IF CURRENT PACE CONTINUES</small><strong>{Math.round(currentPaceMonthEndApm)}</strong><span>projected month-end APM</span></div>
            </div>

            <section className="forecast-rate-simulator" aria-label={`${center.center} show and close rate simulator`}>
              <div className="forecast-simulator-head"><div><small>TRY A DIFFERENT OUTCOME</small><strong>Adjust show and close rates</strong></div><button type="button" onClick={() => { setScenarioShowRates((current) => ({ ...current, [center.center]: center.showRate })); setScenarioCloseRates((current) => ({ ...current, [center.center]: center.closeRate })); }}>Reset to current rates</button></div>
              <div className="forecast-slider-grid">
                <label><span><b>SHOW RATE</b><strong>{(selectedShowRate * 100).toFixed(0)}%</strong></span><input aria-label={`${center.center} show rate`} type="range" min="0" max="100" step="1" value={Math.round(selectedShowRate * 100)} onChange={(event) => setScenarioShowRates((current) => ({ ...current, [center.center]: Number(event.target.value) / 100 }))} /><small>Current: {(center.showRate * 100).toFixed(1)}%</small></label>
                <label><span><b>CLOSE RATE</b><strong>{(selectedCloseRate * 100).toFixed(0)}%</strong></span><input aria-label={`${center.center} close rate`} type="range" min="0" max="100" step="1" value={Math.round(selectedCloseRate * 100)} onChange={(event) => setScenarioCloseRates((current) => ({ ...current, [center.center]: Number(event.target.value) / 100 }))} /><small>Current: {(center.closeRate * 100).toFixed(1)}%</small></label>
              </div>
              <div className="forecast-impact-grid" aria-live="polite">
                <div><small>CURRENT PACE</small><strong>{Math.round(currentPaceMonthEndApm)} APM</strong><span>same likely outcome as Membership</span></div>
                <div className={scenarioApmLift > .5 ? "improved" : scenarioApmLift < -.5 ? "declined" : ""}><small>WITH THESE RATES</small><strong>{Math.round(scenarioMonthEndApm)} APM</strong><span>{scenarioApmLift >= 0 ? "+" : ""}{scenarioApmLift.toFixed(1)} APM impact</span></div>
                <div><small>REMAINING SIGN-UPS</small><strong>{scenarioAdditionalSignups.toFixed(1)}</strong><span>{scenarioSalesLift >= 0 ? "+" : ""}{scenarioSalesLift.toFixed(1)} vs current rates</span></div>
                <div><small>KNOWN MEMBER MOVEMENT</small><strong>{currentMonthHoldMovement - center.drops.pending >= 0 ? "+" : ""}{currentMonthHoldMovement - center.drops.pending}</strong><span>hold movement minus pending drops</span></div>
              </div>
            </section>

            <section className="forecast-next-checkpoint" aria-label={`${center.center} next growth checkpoint`}>
              <div><small>NEXT GROWTH CHECKPOINT</small><strong>{nextCheckpoint} APM</strong></div>
              <span>{membersNeeded} net members from today&apos;s APM</span>
            </section>

            <div className="forecast-rate-strip" aria-label={`${center.center} forecast rates`}>
              <div><small>CURRENT-MONTH SHOW RATE</small><strong>{(center.showRate * 100).toFixed(1)}%</strong><span>{center.showed} attended ÷ {center.scheduled} scheduled</span></div>
              <div><small>CURRENT-MONTH CLOSE RATE</small><strong>{(center.closeRate * 100).toFixed(1)}%</strong><span>{center.closed} closed ÷ {center.showed} attended</span></div>
              <div><small>30-DAY LEAD-TO-BOOKED</small><strong>{(center.leadToBookedRate * 100).toFixed(1)}%</strong><span>{center.rolling30Booked ?? 0} booked ÷ {center.rolling30Leads ?? 0} leads</span></div>
            </div>

          </article>;
        })}
      </section>

      <footer>Forecast basis: trailing 30-day leads and lead-to-booked performance with live current-month show and close rates <span>Pending drops and scheduled hold movement are included</span></footer>
    </div>
  </main>;
}
