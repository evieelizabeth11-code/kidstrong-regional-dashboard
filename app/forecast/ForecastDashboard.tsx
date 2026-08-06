"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { membershipData, type CenterMembership } from "../membership-data";
import ReportingPeriodNav from "../ReportingPeriodNav";
import { reports } from "../trial-data";

const DASHBOARD_FEED_URL = "/api/dashboard-feed";
const STANDARD_MILESTONE_CENTERS = new Set(["Mount Laurel", "Turnersville", "Voorhees"]);
const FIRST_BONUS_MILESTONE = 550;
const BONUS_STEP = 50;
const MAX_FORECAST_MONTHS = 60;

type TrialTotals = { scheduled: number; showed: number; closed: number };
type ForecastInput = CenterMembership & TrialTotals;
type MilestoneForecast = { payoutDate: Date; projectedApm: number } | null;
type ForecastCenter = ForecastInput & {
  dataThrough: Date;
  elapsedDays: number;
  daysInMonth: number;
  showRate: number;
  closeRate: number;
  attritionRate: number;
  projectedMonthlyTrials: number;
  projectedMonthlyTrialSigns: number;
  projectedMonthlyAttrition: number;
  projectedNextPayoutApm: number;
  milestones: number[];
};

const initialForecasts: ForecastInput[] = membershipData.map((membership) => {
  const trial = reports.find((report) => report.center === membership.center);
  return { ...membership, scheduled: trial?.scheduled ?? 0, showed: trial?.showed ?? 0, closed: trial?.closed ?? 0 };
});

const pct = (top: number, bottom: number) => bottom ? (top / bottom) * 100 : 0;
const payoutLabel = (date: Date) => date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const milestoneList = (center: string, apm: number) => {
  const milestones: number[] = [];
  if (STANDARD_MILESTONE_CENTERS.has(center)) milestones.push(500);
  const highestVisibleBonus = Math.max(700, Math.ceil(Math.max(apm, FIRST_BONUS_MILESTONE) / BONUS_STEP) * BONUS_STEP + 150);
  for (let target = FIRST_BONUS_MILESTONE; target <= highestVisibleBonus; target += BONUS_STEP) milestones.push(target);
  return milestones;
};

function enrichCenter(item: ForecastInput): ForecastCenter {
  const reportDate = item.reportDate ? new Date(`${item.reportDate}T12:00:00`) : new Date("2026-08-06T12:00:00");
  const dataThrough = new Date(reportDate);
  dataThrough.setDate(dataThrough.getDate() - 1);
  const elapsedDays = Math.max(1, dataThrough.getDate());
  const daysInMonth = new Date(dataThrough.getFullYear(), dataThrough.getMonth() + 1, 0).getDate();
  const showRate = item.scheduled ? item.showed / item.scheduled : 0;
  const closeRate = item.showed ? item.closed / item.showed : 0;
  const attritionRate = item.bomApm ? item.drops.total / item.bomApm : 0;
  const projectedMonthlyTrials = (item.scheduled / elapsedDays) * daysInMonth;
  const projectedMonthlyTrialSigns = projectedMonthlyTrials * showRate * closeRate;
  const projectedMonthlyAttrition = item.bomApm * attritionRate;
  return {
    ...item,
    dataThrough,
    elapsedDays,
    daysInMonth,
    showRate,
    closeRate,
    attritionRate,
    projectedMonthlyTrials,
    projectedMonthlyTrialSigns,
    projectedMonthlyAttrition,
    projectedNextPayoutApm: item.bomApm + projectedMonthlyTrialSigns - projectedMonthlyAttrition,
    milestones: milestoneList(item.center, item.bomApm),
  };
}

function forecastMilestone(center: ForecastCenter, target: number): MilestoneForecast {
  if (center.bomApm >= target) return { payoutDate: new Date(center.dataThrough.getFullYear(), center.dataThrough.getMonth() + 1, 1), projectedApm: center.bomApm };
  if (!center.projectedMonthlyTrialSigns || center.projectedMonthlyTrialSigns <= center.projectedMonthlyAttrition) return null;

  let projectedApm = center.bomApm;
  const payoutDate = new Date(center.dataThrough.getFullYear(), center.dataThrough.getMonth() + 1, 1);
  for (let month = 0; month < MAX_FORECAST_MONTHS; month += 1) {
    projectedApm += center.projectedMonthlyTrialSigns - projectedApm * center.attritionRate;
    if (projectedApm >= target) return { payoutDate: new Date(payoutDate), projectedApm };
    payoutDate.setMonth(payoutDate.getMonth() + 1);
  }
  return null;
}

export default function ForecastDashboard() {
  const [forecastInputs, setForecastInputs] = useState<ForecastInput[]>(initialForecasts);

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

  const forecasts = useMemo(() => forecastInputs.map(enrichCenter), [forecastInputs]);
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

  return <main className="forecast-page">
    <header className="navy-header brandless-header">
      <div className="header-title"><span>MEMBERSHIP GROWTH FORECAST</span><strong>MILESTONE ROADMAP</strong></div>
      <ReportingPeriodNav />
    </header>

    <div className="page-shell forecast-shell">
      <section className="forecast-hero">
        <div><p className="kicker">LIVE MEMBERSHIP FORECAST</p><h1>See the road to every <span>bonus milestone.</span></h1><p>The model holds each center&apos;s current trial volume, show rate, close rate, and attrition rate steady, then forecasts the first-of-the-month payout date.</p></div>
        <Link href="/">← Live dashboard</Link>
      </section>

      <section className="forecast-regional-strip" aria-label="Regional forecast summary">
        <article><small>REGIONAL APM</small><strong>{regionalApm.toLocaleString()}</strong><span>active paying members today</span></article>
        <article className={projectedRegionalApm >= regionalApm ? "growing" : "declining"}><small>NEXT PAYOUT-DATE APM</small><strong>{Math.round(projectedRegionalApm).toLocaleString()}</strong><span>projected across four centers</span></article>
        <article><small>NEXT-MONTH MILESTONES</small><strong>{centersReachingNextMilestone} <em>of {forecasts.length}</em></strong><span>centers projected to cross their next target</span></article>
        <article><small>DATA THROUGH</small><strong>{latestDataThrough?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "—"}</strong><span>forecast refreshes with the live feed</span></article>
      </section>

      <section className="forecast-method">
        <span>i</span><div><small>HOW THE FORECAST WORKS</small><strong>Trial pace × show rate × close rate − attrition = projected APM</strong><p>Milestones are evaluated after each completed month. Because bonuses are paid on the first, every forecast date is shown as the first day of the qualifying month.</p></div>
      </section>

      <section className="forecast-center-grid">
        {forecasts.map((center) => {
          const nextMilestone = center.milestones.find((target) => target > center.bomApm);
          const membersNeeded = nextMilestone ? nextMilestone - center.bomApm : 0;
          const nextForecast = nextMilestone ? forecastMilestone(center, nextMilestone) : null;
          const nextPayoutDate = new Date(center.dataThrough.getFullYear(), center.dataThrough.getMonth() + 1, 1);
          return <article className="forecast-center-card" key={center.center}>
            <div className="forecast-card-head">
              <div><small>{center.center.toUpperCase()}</small><strong>{center.bomApm} <em>APM</em></strong><span>{center.scheduled} trials scheduled through {center.dataThrough.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
              <div className="forecast-payout-apm"><small>PROJECTED {nextPayoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()} APM</small><strong>{Math.round(center.projectedNextPayoutApm)}</strong><span>at current operating rates</span></div>
            </div>

            <div className="forecast-rate-strip" aria-label={`${center.center} forecast rates`}>
              <div><small>SHOW RATE</small><strong>{pct(center.showed, center.scheduled).toFixed(1)}%</strong><span>{center.showed} of {center.scheduled}</span></div>
              <div><small>CLOSE RATE</small><strong>{pct(center.closed, center.showed).toFixed(1)}%</strong><span>{center.closed} of {center.showed}</span></div>
              <div><small>ATTRITION RATE</small><strong>{(center.attritionRate * 100).toFixed(1)}%</strong><span>{center.drops.total} drops ÷ {center.bomApm} APM</span></div>
            </div>

            {nextMilestone && <section className={`forecast-next-target ${nextForecast === null ? "off-pace" : ""}`}>
              <div><span>★</span><div><small>NEXT {nextMilestone === 500 ? "MEMBERSHIP" : "BONUS"} MILESTONE</small><strong>{nextMilestone} APM</strong></div></div>
              <div><strong>{membersNeeded}</strong><span>members needed today</span></div>
              <div><strong>{nextForecast ? payoutLabel(nextForecast.payoutDate) : "Not reached at current rates"}</strong><span>{nextForecast ? `Projected ${Math.round(nextForecast.projectedApm)} APM at payout` : "Increase trial volume, show rate, or close rate—or reduce attrition"}</span></div>
            </section>}

            <div className="forecast-pace-equation">
              <div><small>TRIAL VOLUME</small><strong>{Math.round(center.projectedMonthlyTrials)}</strong><span>projected per month</span></div><b>×</b>
              <div><small>SHOW × CLOSE</small><strong>{(center.showRate * 100).toFixed(0)}% × {(center.closeRate * 100).toFixed(0)}%</strong><span>current conversion</span></div><b>=</b>
              <div className="positive"><small>PROJECTED TRIAL SIGNS</small><strong>{center.projectedMonthlyTrialSigns.toFixed(1)}</strong><span>before attrition</span></div>
            </div>

            <div className="forecast-ladder">
              {center.milestones.map((target) => {
                const achieved = center.bomApm >= target;
                const projection = achieved ? null : forecastMilestone(center, target);
                const isNext = target === nextMilestone;
                return <div className={`${achieved ? "achieved" : ""} ${isNext ? "next" : ""}`} key={target}>
                  <span>{achieved ? "✓" : target === 500 ? "◆" : "★"}</span>
                  <strong>{target}</strong>
                  <small>{target === 500 ? "BIG MILESTONE · NO BONUS" : "BONUS MILESTONE"}</small>
                  <p>{achieved ? "ACHIEVED" : projection ? payoutLabel(projection.payoutDate) : "Not reached at current rates"}</p>
                </div>;
              })}
            </div>
          </article>;
        })}
      </section>

      <footer>Forecast basis: official trials plus Membership Health attrition <span>Bonus milestones continue every 50 APM after 550</span></footer>
    </div>
  </main>;
}
