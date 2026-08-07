"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { membershipData, type CenterMembership } from "../membership-data";
import ReportingPeriodNav from "../ReportingPeriodNav";
import { reports } from "../trial-data";

const DASHBOARD_FEED_URL = "/api/dashboard-feed";
const HISTORY_FEED_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000008&single=true&output=csv";
const STANDARD_MILESTONE_CENTERS = new Set(["Mount Laurel", "Turnersville", "Voorhees"]);
const FIRST_STANDARD_MILESTONE = 550;
const MILESTONE_STEP = 50;
const MAX_FORECAST_MONTHS = 60;
const OCTOBER_HOLD_PATHS: Record<string, [number, number]> = {
  Brick: [29, 31],
  "Mount Laurel": [28, 29],
  Turnersville: [15, 19],
  Voorhees: [22, 38],
};
const GROWTH_CHECKPOINTS: Record<string, number[]> = {
  Brick: [600, 650, 700],
  "Mount Laurel": [450, 500, 550],
  Turnersville: [500, 550, 600],
  Voorhees: [450, 500, 550],
};

type TrialTotals = { scheduled: number; showed: number; closed: number };
type MonthlyAttrition = { period: string; rate: number };
type AttritionHistory = Record<string, MonthlyAttrition[]>;
type RollingBaseline = { leads90: number; leadToBooked: number; showRate: number; closeRate: number; completedSales: [number, number, number] };
type ForecastInput = CenterMembership & TrialTotals;
type MilestoneForecast = { payoutDate: Date; projectedApm: number } | null;
type ForecastCenter = ForecastInput & {
  dataThrough: Date;
  elapsedDays: number;
  daysInMonth: number;
  showRate: number;
  closeRate: number;
  attritionRate: number;
  attritionMonths: MonthlyAttrition[];
  attritionLockedOn: Date;
  projectedMonthlyTrials: number;
  projectedMonthlyTrialSigns: number;
  projectedMonthlyOtherSales: number;
  projectedMonthlyTotalSales: number;
  projectedMonthlyAttrition: number;
  projectedNextPayoutApm: number;
  milestones: number[];
};

const SEEDED_ATTRITION_HISTORY: AttritionHistory = {
  Brick: [{ period: "2026-05", rate: .011 }, { period: "2026-06", rate: .055 }, { period: "2026-07", rate: .048 }],
  "Mount Laurel": [{ period: "2026-05", rate: .075 }, { period: "2026-06", rate: .101 }, { period: "2026-07", rate: .057 }],
  Turnersville: [{ period: "2026-05", rate: .106 }, { period: "2026-06", rate: .098 }, { period: "2026-07", rate: .067 }],
  Voorhees: [{ period: "2026-05", rate: .102 }, { period: "2026-06", rate: .092 }, { period: "2026-07", rate: .072 }],
};

// Looker Studio rolling 90-day funnel and the three most recently completed months of total sales.
const ROLLING_BASELINES: Record<string, RollingBaseline> = {
  Brick: { leads90: 720, leadToBooked: .318, showRate: .642, closeRate: .428, completedSales: [68, 36, 33] },
  "Mount Laurel": { leads90: 302, leadToBooked: .629, showRate: .668, closeRate: .489, completedSales: [49, 34, 46] },
  Turnersville: { leads90: 297, leadToBooked: .569, showRate: .619, closeRate: .537, completedSales: [33, 30, 36] },
  Voorhees: { leads90: 307, leadToBooked: .645, showRate: .636, closeRate: .514, completedSales: [38, 35, 50] },
};

const initialForecasts: ForecastInput[] = membershipData.map((membership) => {
  const trial = reports.find((report) => report.center === membership.center);
  return { ...membership, scheduled: trial?.scheduled ?? 0, showed: trial?.showed ?? 0, closed: trial?.closed ?? 0 };
});

const periodLabel = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
};

const milestoneList = (center: string, apm: number) => {
  const milestones: number[] = [...(GROWTH_CHECKPOINTS[center] ?? [])];
  if (!milestones.length && STANDARD_MILESTONE_CENTERS.has(center)) milestones.push(500);
  const highestVisibleMilestone = Math.max(700, Math.ceil(Math.max(apm, FIRST_STANDARD_MILESTONE) / MILESTONE_STEP) * MILESTONE_STEP + 150);
  const firstVisibleMilestone = milestones[0] ?? FIRST_STANDARD_MILESTONE;
  for (let target = FIRST_STANDARD_MILESTONE; target <= highestVisibleMilestone; target += MILESTONE_STEP) if (target >= firstVisibleMilestone && !milestones.includes(target)) milestones.push(target);
  return milestones.sort((a, b) => a - b);
};

function enrichCenter(item: ForecastInput, attritionHistory: AttritionHistory): ForecastCenter {
  const reportDate = item.reportDate ? new Date(`${item.reportDate}T12:00:00`) : new Date("2026-08-06T12:00:00");
  const dataThrough = new Date(reportDate);
  dataThrough.setDate(dataThrough.getDate() - 1);
  const elapsedDays = Math.max(1, dataThrough.getDate());
  const daysInMonth = new Date(dataThrough.getFullYear(), dataThrough.getMonth() + 1, 0).getDate();
  const baseline = ROLLING_BASELINES[item.center];
  const showRate = baseline?.showRate ?? (item.scheduled ? item.showed / item.scheduled : 0);
  const closeRate = baseline?.closeRate ?? (item.showed ? item.closed / item.showed : 0);
  const currentPeriod = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`;
  const attritionMonths = (attritionHistory[item.center] ?? [])
    .filter((month) => month.period < currentPeriod)
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-3);
  const rollingRate = attritionMonths.length ? attritionMonths.reduce((sum, month) => sum + month.rate, 0) / attritionMonths.length : 0;
  // Brick's early commitment period suppresses observed churn. Use a conservative floor until post-commitment data matures.
  const attritionRate = item.center === "Brick" && currentPeriod < "2026-12" ? Math.max(.05, rollingRate) : rollingRate;
  const projectedMonthlyTrials = baseline ? (baseline.leads90 / 3) * baseline.leadToBooked : (item.scheduled / elapsedDays) * daysInMonth;
  const projectedMonthlyTrialSigns = projectedMonthlyTrials * showRate * closeRate;
  const recentMonthlySales = baseline ? baseline.completedSales.reduce((sum, sales) => sum + sales, 0) / baseline.completedSales.length : projectedMonthlyTrialSigns;
  const projectedMonthlyOtherSales = Math.max(0, recentMonthlySales - projectedMonthlyTrialSigns);
  const projectedMonthlyTotalSales = projectedMonthlyTrialSigns + projectedMonthlyOtherSales;
  const projectedMonthlyAttrition = item.bomApm * attritionRate;
  return {
    ...item,
    dataThrough,
    elapsedDays,
    daysInMonth,
    showRate,
    closeRate,
    attritionRate,
    attritionMonths,
    attritionLockedOn: new Date(reportDate.getFullYear(), reportDate.getMonth(), 1),
    projectedMonthlyTrials,
    projectedMonthlyTrialSigns,
    projectedMonthlyOtherSales,
    projectedMonthlyTotalSales,
    projectedMonthlyAttrition,
    projectedNextPayoutApm: item.bomApm + projectedMonthlyTotalSales - projectedMonthlyAttrition,
    milestones: milestoneList(item.center, item.bomApm),
  };
}

function forecastMilestone(center: ForecastCenter, target: number, closeRate = center.closeRate): MilestoneForecast {
  if (center.bomApm >= target) return { payoutDate: new Date(center.dataThrough.getFullYear(), center.dataThrough.getMonth() + 1, 1), projectedApm: center.bomApm };
  const monthlyTotalSales = center.projectedMonthlyOtherSales + center.projectedMonthlyTrials * center.showRate * closeRate;
  if (!monthlyTotalSales || monthlyTotalSales <= center.projectedMonthlyAttrition) return null;

  let projectedApm = center.bomApm;
  const payoutDate = new Date(center.dataThrough.getFullYear(), center.dataThrough.getMonth() + 1, 1);
  for (let month = 0; month < MAX_FORECAST_MONTHS; month += 1) {
    projectedApm += monthlyTotalSales - projectedApm * center.attritionRate;
    if (projectedApm >= target) return { payoutDate: new Date(payoutDate), projectedApm };
    payoutDate.setMonth(payoutDate.getMonth() + 1);
  }
  return null;
}

export default function ForecastDashboard({ centerId }: { centerId?: string }) {
  const [forecastInputs, setForecastInputs] = useState<ForecastInput[]>(initialForecasts);
  const [attritionHistory, setAttritionHistory] = useState<AttritionHistory>(SEEDED_ATTRITION_HISTORY);
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
            holds: { total: Number(values[3]), scheduled: null, starting: Number(values[4]), lifting: Number(values[5]) },
            drops: { total: Number(values[6]), pending: Number(values[7]) },
            signups: { current: Number(values[8]), goal: Number(values[9]), trial: Number(values[13]), nonTrial: Number(values[14]) },
            pastDue: Number(values[10]),
            reportDate: values[12],
            scheduled: Number(values[28]),
            showed: Number(values[29]),
            closed: Number(values[30]),
          } satisfies ForecastInput;
        }).filter((item) => item.center && Number.isFinite(item.bomApm));
        if (live.length) setForecastInputs(live);
      } catch {
        // Keep the built-in snapshot available if the live feed is temporarily unavailable.
      }
    };
    loadForecast();
  }, []);

  useEffect(() => {
    const loadFinalizedAttrition = async () => {
      try {
        const response = await fetch(`${HISTORY_FEED_URL}&t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const completed: AttritionHistory = structuredClone(SEEDED_ATTRITION_HISTORY);
        (await response.text()).trim().split(/\r?\n/).slice(1).forEach((row) => {
          const values = row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
          const period = values[2];
          const status = values[3];
          const center = values[4];
          const bomApm = Number(values[6]);
          const drops = Number(values[12]);
          if (status !== "FINAL" || period <= "2026-07" || !center || !bomApm || !Number.isFinite(drops)) return;
          const existing = completed[center] ?? [];
          completed[center] = [...existing.filter((month) => month.period !== period), { period, rate: drops / bomApm }];
        });
        setAttritionHistory(completed);
      } catch {
        // Keep the supplied three-month history if the finalized archive is temporarily unavailable.
      }
    };
    loadFinalizedAttrition();
  }, []);

  const forecasts = useMemo(() => forecastInputs
    .filter((item) => !centerId || reports.find((report) => report.center === item.center)?.id === centerId)
    .map((item) => enrichCenter(item, attritionHistory)), [forecastInputs, attritionHistory, centerId]);
  const regionalApm = forecasts.reduce((sum, item) => sum + item.bomApm, 0);
  const projectedRegionalApm = forecasts.reduce((sum, item) => sum + item.projectedNextPayoutApm, 0);
  const centersReachingNextMilestone = forecasts.filter((center) => {
    const next = center.milestones.find((target) => target > center.bomApm);
    if (!next) return false;
    const projected = forecastMilestone(center, next);
    const nextPayout = new Date(center.dataThrough.getFullYear(), center.dataThrough.getMonth() + 1, 1);
    return projected?.payoutDate.getTime() === nextPayout.getTime();
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
        <div><p className="kicker">{selectedCenter?.center.toUpperCase() ?? "LIVE"} GROWTH ROADMAP</p><h1>See what moves the <span>membership number.</span></h1><p>Start with the current forecast, then adjust show and close rates to see the direct impact on month-end APM.</p></div>
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

      <section className="forecast-method">
        <span>i</span><div><small>HOW THE FORECAST WORKS</small><strong>Trial pace × show rate × close rate + other sales + known hold movement − rolling attrition = month-end APM</strong><p>The sliders change only show and close performance, so the team can see exactly how stronger execution changes the month-end result.</p></div>
      </section>

      <section className={`forecast-center-grid ${centerId ? "single-center" : ""}`}>
        {forecasts.map((center) => {
          const nextPayoutDate = new Date(center.dataThrough.getFullYear(), center.dataThrough.getMonth() + 1, 1);
          const checkpoints = GROWTH_CHECKPOINTS[center.center] ?? center.milestones;
          const nextCheckpoint = checkpoints.find((target) => target > center.bomApm) ?? checkpoints[checkpoints.length - 1];
          const priorCheckpoint = Math.max(0, nextCheckpoint - 50);
          const membersNeeded = Math.max(0, nextCheckpoint - center.bomApm);
          const checkpointProgress = Math.max(0, Math.min(100, ((center.bomApm - priorCheckpoint) / Math.max(1, nextCheckpoint - priorCheckpoint)) * 100));
          const holdMovement = OCTOBER_HOLD_PATHS[center.center] ?? [0, 0];
          const currentMonthHoldMovement = holdMovement[0];
          const currentMonthEndApm = center.bomApm + center.projectedMonthlyTotalSales - center.projectedMonthlyAttrition + currentMonthHoldMovement;
          const selectedShowRate = scenarioShowRates[center.center] ?? center.showRate;
          const selectedCloseRate = scenarioCloseRates[center.center] ?? center.closeRate;
          const scenarioTrialSigns = center.projectedMonthlyTrials * selectedShowRate * selectedCloseRate;
          const scenarioTotalSales = scenarioTrialSigns + center.projectedMonthlyOtherSales;
          const scenarioMonthEndApm = center.bomApm + scenarioTotalSales - center.projectedMonthlyAttrition + currentMonthHoldMovement;
          const scenarioApmLift = scenarioMonthEndApm - currentMonthEndApm;
          const scenarioSalesLift = scenarioTotalSales - center.projectedMonthlyTotalSales;
          return <article className="forecast-center-card" key={center.center}>
            <div className="forecast-card-head">
              <div><small>{center.center.toUpperCase()}</small><strong>{center.bomApm} <em>APM</em></strong><span>{center.scheduled} trials scheduled through {center.dataThrough.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
              <div className="forecast-payout-apm"><small>PROJECTED {nextPayoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()} APM</small><strong>{Math.round(currentMonthEndApm)}</strong><span>current rates + known hold movement</span></div>
            </div>

            <section className="forecast-october-challenge" aria-label={`${center.center} growth checkpoint`}>
              <div className="forecast-challenge-heading">
                <div><small>NEXT GROWTH CHECKPOINT</small><strong>{nextCheckpoint} APM</strong><span>Here&apos;s what moves the number this week.</span></div>
                <div><strong>{membersNeeded}</strong><span>net members to go</span></div>
              </div>
              <div className="forecast-challenge-track"><span style={{ width: `${checkpointProgress}%` }} /></div>
              <div className="forecast-challenge-labels"><span>{center.bomApm} APM today</span><strong>{nextCheckpoint} APM checkpoint</strong></div>
              <div className="forecast-checkpoint-row">
                {checkpoints.map((target) => <div className={center.bomApm >= target ? "achieved" : target === nextCheckpoint ? "next" : ""} key={target}><span>{center.bomApm >= target ? "✓" : "★"}</span><strong>{target}</strong><small>{center.bomApm >= target ? "REACHED" : target === nextCheckpoint ? "NEXT" : "AHEAD"}</small></div>)}
              </div>
            </section>

            <section className="forecast-rate-simulator" aria-label={`${center.center} show and close rate simulator`}>
              <div className="forecast-simulator-head"><div><small>MOVE THE NEEDLE</small><strong>Adjust the rates. See the month-end result.</strong></div><button type="button" onClick={() => { setScenarioShowRates((current) => ({ ...current, [center.center]: center.showRate })); setScenarioCloseRates((current) => ({ ...current, [center.center]: center.closeRate })); }}>Reset to current</button></div>
              <div className="forecast-slider-grid">
                <label><span><b>SHOW RATE</b><strong>{(selectedShowRate * 100).toFixed(0)}%</strong></span><input aria-label={`${center.center} show rate`} type="range" min="30" max="100" step="1" value={Math.round(selectedShowRate * 100)} onChange={(event) => setScenarioShowRates((current) => ({ ...current, [center.center]: Number(event.target.value) / 100 }))} /><small>Current: {(center.showRate * 100).toFixed(1)}%</small></label>
                <label><span><b>CLOSE RATE</b><strong>{(selectedCloseRate * 100).toFixed(0)}%</strong></span><input aria-label={`${center.center} close rate`} type="range" min="20" max="100" step="1" value={Math.round(selectedCloseRate * 100)} onChange={(event) => setScenarioCloseRates((current) => ({ ...current, [center.center]: Number(event.target.value) / 100 }))} /><small>Current: {(center.closeRate * 100).toFixed(1)}%</small></label>
              </div>
              <div className="forecast-impact-grid" aria-live="polite">
                <div><small>AT CURRENT RATES</small><strong>{Math.round(currentMonthEndApm)} APM</strong><span>projected month end</span></div>
                <div className={scenarioApmLift > .5 ? "improved" : scenarioApmLift < -.5 ? "declined" : ""}><small>WITH THESE RATES</small><strong>{Math.round(scenarioMonthEndApm)} APM</strong><span>{scenarioApmLift >= 0 ? "+" : ""}{scenarioApmLift.toFixed(1)} APM impact</span></div>
                <div><small>PROJECTED SALES</small><strong>{scenarioTotalSales.toFixed(1)}</strong><span>{scenarioSalesLift >= 0 ? "+" : ""}{scenarioSalesLift.toFixed(1)} vs current rates</span></div>
                <div><small>KNOWN HOLD MOVEMENT</small><strong>+{currentMonthHoldMovement}</strong><span>included this month</span></div>
              </div>
            </section>

            <div className="forecast-rate-strip" aria-label={`${center.center} forecast rates`}>
              <div><small>90-DAY SHOW RATE</small><strong>{(center.showRate * 100).toFixed(1)}%</strong><span>Looker rolling baseline</span></div>
              <div><small>90-DAY CLOSE RATE</small><strong>{(center.closeRate * 100).toFixed(1)}%</strong><span>Looker rolling baseline</span></div>
              <div><small>3-MONTH ATTRITION</small><strong>{(center.attritionRate * 100).toFixed(1)}%</strong><span>{center.attritionMonths.map((month) => `${periodLabel(month.period)} ${(month.rate * 100).toFixed(1)}%`).join(" · ")}</span></div>
            </div>

            <section className="forecast-attrition-note">
              <div><small>MONTHLY RATE LOCK</small><strong>Locked {center.attritionLockedOn.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</strong><span>Recalculates automatically on the first using the prior three completed months.</span></div>
              {center.center === "Brick" && <p><b>BRICK NEW-CENTER CAVEAT</b> The observed average is {(center.attritionMonths.reduce((sum, month) => sum + month.rate, 0) / Math.max(1, center.attritionMonths.length) * 100).toFixed(1)}%, but the forecast uses a 5.0% planning floor through November. Six-month founding commitments begin ending September 21.</p>}
            </section>

            <div className="forecast-pace-equation">
              <div><small>90-DAY TRIAL PACE</small><strong>{Math.round(center.projectedMonthlyTrials)}</strong><span>rolling monthly baseline</span></div><b>×</b>
              <div><small>SHOW × CLOSE</small><strong>{(center.showRate * 100).toFixed(0)}% × {(center.closeRate * 100).toFixed(0)}%</strong><span>rolling conversion</span></div><b>=</b>
              <div className="positive"><small>PROJECTED TOTAL SALES</small><strong>{center.projectedMonthlyTotalSales.toFixed(1)}</strong><span>{center.projectedMonthlyTrialSigns.toFixed(1)} trial + {center.projectedMonthlyOtherSales.toFixed(1)} other</span></div>
            </div>
          </article>;
        })}
      </section>

      <footer>Forecast basis: Looker rolling 90-day funnel, three completed months of sales, and rolling attrition <span>Milestones continue every 50 APM after 550</span></footer>
    </div>
  </main>;
}
