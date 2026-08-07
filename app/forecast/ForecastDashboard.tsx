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
const OCTOBER_CHALLENGE_DATE = new Date("2026-10-01T12:00:00");
const OCTOBER_HOLD_PATHS: Record<string, [number, number]> = {
  Brick: [29, 31],
  "Mount Laurel": [28, 29],
  Turnersville: [15, 19],
  Voorhees: [22, 38],
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

const payoutLabel = (date: Date) => date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const periodLabel = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
};

const milestoneList = (center: string, apm: number) => {
  const milestones: number[] = [];
  if (STANDARD_MILESTONE_CENTERS.has(center)) milestones.push(500);
  const highestVisibleMilestone = Math.max(700, Math.ceil(Math.max(apm, FIRST_STANDARD_MILESTONE) / MILESTONE_STEP) * MILESTONE_STEP + 150);
  for (let target = FIRST_STANDARD_MILESTONE; target <= highestVisibleMilestone; target += MILESTONE_STEP) milestones.push(target);
  return milestones;
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

function requiredMonthlySales(center: ForecastCenter, target: number, months: number, holdMovement: [number, number]) {
  if (center.bomApm >= target || months <= 0) return 0;
  const retention = 1 - center.attritionRate;
  const retainedStartingApm = center.bomApm * Math.pow(retention, months);
  const salesRetentionFactor = Array.from({ length: months }, (_, index) => Math.pow(retention, index)).reduce((sum, factor) => sum + factor, 0);
  const retainedHoldMovement = holdMovement[0] * retention + holdMovement[1];
  return Math.max(0, (target - retainedStartingApm - retainedHoldMovement) / salesRetentionFactor);
}

function projectOctoberApm(center: ForecastCenter, monthlySales: number, holdMovement: [number, number]) {
  const retention = 1 - center.attritionRate;
  const septemberApm = center.bomApm * retention + monthlySales + holdMovement[0];
  return septemberApm * retention + monthlySales + holdMovement[1];
}

export default function ForecastDashboard({ centerId }: { centerId?: string }) {
  const [forecastInputs, setForecastInputs] = useState<ForecastInput[]>(initialForecasts);
  const [attritionHistory, setAttritionHistory] = useState<AttritionHistory>(SEEDED_ATTRITION_HISTORY);
  const [scenarioRates, setScenarioRates] = useState<Record<string, number>>({});

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
        <div><p className="kicker">{selectedCenter?.center.toUpperCase() ?? "LIVE"} MEMBERSHIP FORECAST</p><h1>See the road to every <span>membership milestone.</span></h1><p>Compare today&apos;s close rate with 50%, 60%, and 70% to see how stronger conversion can move the next milestone closer.</p></div>
      </section>

      {!centerId && <section className="forecast-regional-strip" aria-label="Regional forecast summary">
        <article><small>REGIONAL APM</small><strong>{regionalApm.toLocaleString()}</strong><span>active paying members today</span></article>
        <article className={projectedRegionalApm >= regionalApm ? "growing" : "declining"}><small>NEXT PAYOUT-DATE APM</small><strong>{Math.round(projectedRegionalApm).toLocaleString()}</strong><span>projected across four centers</span></article>
        <article><small>NEXT-MONTH MILESTONES</small><strong>{centersReachingNextMilestone} <em>of {forecasts.length}</em></strong><span>centers projected to cross their next target</span></article>
        <article><small>DATA THROUGH</small><strong>{latestDataThrough?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "—"}</strong><span>forecast refreshes with the live feed</span></article>
      </section>}

      <section className="forecast-method">
        <span>i</span><div><small>HOW THE FORECAST WORKS</small><strong>90-day trial pace × show rate × close rate + non-trial sales − rolling attrition = projected APM</strong><p>The Looker funnel and three most recently completed sales months establish the operating baseline. Attrition is refreshed from the prior three completed months, milestones are evaluated after each completed month, and achievement dates always fall on the first.</p></div>
      </section>

      <section className={`forecast-center-grid ${centerId ? "single-center" : ""}`}>
        {forecasts.map((center) => {
          const nextMilestone = center.milestones.find((target) => target > center.bomApm);
          const membersNeeded = nextMilestone ? nextMilestone - center.bomApm : 0;
          const nextForecast = nextMilestone ? forecastMilestone(center, nextMilestone) : null;
          const nextPayoutDate = new Date(center.dataThrough.getFullYear(), center.dataThrough.getMonth() + 1, 1);
          const challengeTarget = center.center === "Brick" ? 600 : 500;
          const holdMovement = OCTOBER_HOLD_PATHS[center.center] ?? [0, 0];
          const totalHoldMovement = holdMovement[0] + holdMovement[1];
          const challengeMonths = Math.max(1, (OCTOBER_CHALLENGE_DATE.getFullYear() - center.dataThrough.getFullYear()) * 12 + OCTOBER_CHALLENGE_DATE.getMonth() - center.dataThrough.getMonth());
          const challengeMonthlySales = requiredMonthlySales(center, challengeTarget, challengeMonths, holdMovement);
          const challengeWeeks = Math.max(1, (OCTOBER_CHALLENGE_DATE.getTime() - center.dataThrough.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const challengeWeeklySales = (challengeMonthlySales * challengeMonths) / challengeWeeks;
          const challengeProgressStart = challengeTarget === 500 ? 400 : 500;
          const challengeProgress = Math.max(0, Math.min(100, ((center.bomApm - challengeProgressStart) / (challengeTarget - challengeProgressStart)) * 100));
          const monthlySalesGap = Math.max(0, challengeMonthlySales - center.projectedMonthlyTotalSales);
          const projectedOctoberApm = projectOctoberApm(center, center.projectedMonthlyTotalSales, holdMovement);
          const selectedCloseRate = scenarioRates[center.center] ?? center.closeRate;
          const scenarioForecast = nextMilestone ? forecastMilestone(center, nextMilestone, selectedCloseRate) : null;
          const scenarioTrialSigns = center.projectedMonthlyTrials * center.showRate * selectedCloseRate;
          const scenarioTotalSales = scenarioTrialSigns + center.projectedMonthlyOtherSales;
          const breakEvenCloseRate = center.projectedMonthlyTrials && center.showRate
            ? Math.max(0, (center.projectedMonthlyAttrition - center.projectedMonthlyOtherSales) / (center.projectedMonthlyTrials * center.showRate))
            : 0;
          const monthsSaved = nextForecast && scenarioForecast
            ? Math.max(0, (nextForecast.payoutDate.getFullYear() - scenarioForecast.payoutDate.getFullYear()) * 12 + nextForecast.payoutDate.getMonth() - scenarioForecast.payoutDate.getMonth())
            : 0;
          const createsPath = !nextForecast && Boolean(scenarioForecast);
          return <article className="forecast-center-card" key={center.center}>
            <div className="forecast-card-head">
              <div><small>{center.center.toUpperCase()}</small><strong>{center.bomApm} <em>APM</em></strong><span>{center.scheduled} trials scheduled through {center.dataThrough.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
              <div className="forecast-payout-apm"><small>PROJECTED {nextPayoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()} APM</small><strong>{Math.round(center.projectedNextPayoutApm)}</strong><span>at current operating rates</span></div>
            </div>

            <section className="forecast-october-challenge" aria-label={`${center.center} October 1 membership path`}>
              <div className="forecast-challenge-heading">
                <div><small>THE PATH</small><strong>Road to {challengeTarget}</strong><span>October 1 membership target</span></div>
                <div><strong>{Math.round(projectedOctoberApm)}</strong><span>projected Oct 1 APM</span></div>
              </div>
              <div className="forecast-challenge-track"><span style={{ width: `${challengeProgress}%` }} /></div>
              <div className="forecast-challenge-labels"><span>{center.bomApm} APM today</span><strong>{challengeTarget} APM by Oct 1</strong></div>
              <p className="forecast-hold-path"><b>+{totalHoldMovement} known net hold movement included</b><span>+{holdMovement[0]} by Sep 1 · +{holdMovement[1]} by Oct 1</span></p>
              <div className="forecast-challenge-wins">
                <div><small>WIN EACH WEEK</small><strong>{Math.ceil(challengeWeeklySales)} sales</strong><span>gross sign-ups needed</span></div>
                <div><small>MONTHLY TARGET</small><strong>{Math.ceil(challengeMonthlySales)} sales</strong><span>includes attrition replacement</span></div>
                <div className={projectedOctoberApm >= challengeTarget ? "on-challenge-pace" : "challenge-gap"}><small>OCT 1 AT CURRENT PACE</small><strong>{Math.round(projectedOctoberApm)} APM</strong><span>{projectedOctoberApm >= challengeTarget ? `${Math.round(projectedOctoberApm - challengeTarget)} above the milestone` : `${Math.ceil(monthlySalesGap)} more sales/month unlocks the goal`}</span></div>
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

            {nextMilestone && <section className={`forecast-next-target ${nextForecast === null ? "off-pace" : ""}`}>
              <div><span>★</span><div><small>NEXT MEMBERSHIP MILESTONE</small><strong>{nextMilestone} APM</strong></div></div>
              <div><strong>{membersNeeded}</strong><span>members needed today</span></div>
              <div><small>ESTIMATED ACHIEVEMENT DATE</small><strong>{nextForecast ? payoutLabel(nextForecast.payoutDate) : "No estimate yet"}</strong><span>{nextForecast ? `Projected ${Math.round(nextForecast.projectedApm)} APM at that time` : `Current growth must improve before a reliable date can be calculated`}</span></div>
            </section>}

            <div className="forecast-pace-equation">
              <div><small>90-DAY TRIAL PACE</small><strong>{Math.round(center.projectedMonthlyTrials)}</strong><span>rolling monthly baseline</span></div><b>×</b>
              <div><small>SHOW × CLOSE</small><strong>{(center.showRate * 100).toFixed(0)}% × {(center.closeRate * 100).toFixed(0)}%</strong><span>rolling conversion</span></div><b>=</b>
              <div className="positive"><small>PROJECTED TOTAL SALES</small><strong>{center.projectedMonthlyTotalSales.toFixed(1)}</strong><span>{center.projectedMonthlyTrialSigns.toFixed(1)} trial + {center.projectedMonthlyOtherSales.toFixed(1)} other</span></div>
            </div>

            {nextMilestone && <section className="forecast-scenario-tool">
              <div className="forecast-scenario-head"><div><small>WHAT IF WE CLOSE MORE?</small><strong>See how conversion changes the road to {nextMilestone}.</strong></div><span>Selected scenario: {(selectedCloseRate * 100).toFixed(0)}% close</span></div>
              <div className="forecast-scenario-buttons" role="group" aria-label={`${center.center} close rate scenario`}>
                {[center.closeRate, .5, .6, .7].map((rate, index) => <button className={Math.abs(selectedCloseRate - rate) < .001 ? "active" : ""} key={`${center.center}-${index}`} onClick={() => setScenarioRates((current) => ({ ...current, [center.center]: rate }))}>{index === 0 ? `CURRENT ${(rate * 100).toFixed(0)}%` : `${(rate * 100).toFixed(0)}% CLOSE`}</button>)}
              </div>
              <div className="forecast-scenario-result" aria-live="polite">
                <div><small>PROJECTED MONTHLY SALES</small><strong>{scenarioTotalSales.toFixed(1)}</strong><span>{scenarioTrialSigns.toFixed(1)} trial + {center.projectedMonthlyOtherSales.toFixed(1)} other</span></div>
                <div className={scenarioForecast ? "scenario-date-ready" : ""}><small>ESTIMATED ACHIEVED BY</small><strong>{scenarioForecast ? payoutLabel(scenarioForecast.payoutDate) : "No estimate yet"}</strong><span>{scenarioForecast ? `${Math.round(scenarioForecast.projectedApm)} projected APM` : `${Math.ceil(breakEvenCloseRate * 100)}% close needed to begin net growth at this volume`}</span></div>
                <div className={monthsSaved || createsPath ? "accelerated" : ""}><small>TIME SAVED</small><strong>{createsPath ? "New achievable path" : monthsSaved ? `${monthsSaved} month${monthsSaved === 1 ? "" : "s"}` : nextForecast && scenarioForecast ? "0 months" : "Not calculable yet"}</strong><span>{createsPath ? "current rate has no achievement date" : monthsSaved ? "faster than today's rate" : nextForecast && scenarioForecast ? "already at the earliest first-of-month date" : "close rate alone does not yet overcome attrition"}</span></div>
              </div>
            </section>}

            <div className="forecast-ladder">
              {center.milestones.map((target) => {
                const achieved = center.bomApm >= target;
                const projection = achieved ? null : forecastMilestone(center, target);
                const isNext = target === nextMilestone;
                return <div className={`${achieved ? "achieved" : ""} ${isNext ? "next" : ""}`} key={target}>
                  <span>{achieved ? "✓" : target === 500 ? "◆" : "★"}</span>
                  <strong>{target}</strong>
                  <small>MEMBERSHIP MILESTONE</small>
                  <p>{achieved ? "ACHIEVED" : projection ? `Estimated ${payoutLabel(projection.payoutDate)}` : "No estimate yet"}</p>
                </div>;
              })}
            </div>
          </article>;
        })}
      </section>

      <footer>Forecast basis: Looker rolling 90-day funnel, three completed months of sales, and rolling attrition <span>Milestones continue every 50 APM after 550</span></footer>
    </div>
  </main>;
}
