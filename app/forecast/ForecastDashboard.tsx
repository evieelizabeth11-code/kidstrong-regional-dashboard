"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { membershipData, type CenterMembership } from "../membership-data";
import ReportingPeriodNav from "../ReportingPeriodNav";

const DASHBOARD_FEED_URL = "/api/dashboard-feed";
const STANDARD_MILESTONE_CENTERS = new Set(["Mount Laurel", "Turnersville", "Voorhees"]);
const FIRST_BONUS_MILESTONE = 550;
const BONUS_STEP = 50;

type ForecastCenter = CenterMembership & {
  dataThrough: Date;
  elapsedDays: number;
  daysInMonth: number;
  signupPace: number;
  monthlyDropLoad: number;
  netMonthlyPace: number;
  milestones: number[];
};

const monthsLabel = (months: number) => {
  if (months < 1) return "Under 1 month";
  if (months < 1.05) return "About 1 month";
  return `About ${months.toFixed(1)} months`;
};

const milestoneDate = (start: Date, months: number) => {
  const projected = new Date(start);
  projected.setDate(projected.getDate() + Math.ceil(months * 30.4375));
  return projected.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const milestoneList = (center: string, apm: number) => {
  const milestones: number[] = [];
  if (STANDARD_MILESTONE_CENTERS.has(center)) milestones.push(500);
  const highestVisibleBonus = Math.max(700, Math.ceil(Math.max(apm, FIRST_BONUS_MILESTONE) / BONUS_STEP) * BONUS_STEP + 150);
  for (let target = FIRST_BONUS_MILESTONE; target <= highestVisibleBonus; target += BONUS_STEP) milestones.push(target);
  return milestones;
};

function enrichMembership(item: CenterMembership): ForecastCenter {
  const reportDate = item.reportDate ? new Date(`${item.reportDate}T12:00:00`) : new Date("2026-08-06T12:00:00");
  const dataThrough = new Date(reportDate);
  dataThrough.setDate(dataThrough.getDate() - 1);
  const elapsedDays = Math.max(1, dataThrough.getDate());
  const daysInMonth = new Date(dataThrough.getFullYear(), dataThrough.getMonth() + 1, 0).getDate();
  const signupPace = (item.signups.current / elapsedDays) * daysInMonth;
  const monthlyDropLoad = item.drops.total;
  return {
    ...item,
    dataThrough,
    elapsedDays,
    daysInMonth,
    signupPace,
    monthlyDropLoad,
    netMonthlyPace: signupPace - monthlyDropLoad,
    milestones: milestoneList(item.center, item.bomApm),
  };
}

export default function ForecastDashboard() {
  const [memberships, setMemberships] = useState<CenterMembership[]>(membershipData);

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
          } satisfies CenterMembership;
        }).filter((item) => item.center && Number.isFinite(item.bomApm));
        if (live.length) setMemberships(live);
      } catch {
        // Keep the built-in membership snapshot available if the live feed is temporarily unavailable.
      }
    };
    loadForecast();
  }, []);

  const forecasts = useMemo(() => memberships.map(enrichMembership), [memberships]);
  const regionalApm = forecasts.reduce((sum, item) => sum + item.bomApm, 0);
  const regionalNetPace = forecasts.reduce((sum, item) => sum + item.netMonthlyPace, 0);
  const centersGrowing = forecasts.filter((item) => item.netMonthlyPace > 0).length;
  const latestDataThrough = forecasts.map((item) => item.dataThrough).sort((a, b) => b.getTime() - a.getTime())[0];

  return <main className="forecast-page">
    <header className="navy-header brandless-header">
      <div className="header-title"><span>MEMBERSHIP GROWTH FORECAST</span><strong>MILESTONE ROADMAP</strong></div>
      <ReportingPeriodNav />
    </header>

    <div className="page-shell forecast-shell">
      <section className="forecast-hero">
        <div><p className="kicker">LIVE MEMBERSHIP FORECAST</p><h1>See what it takes to reach the <span>next level.</span></h1><p>Target dates use each center&apos;s current month-to-date sign-up and drop pace. As the daily data changes, the forecast changes with it.</p></div>
        <Link href="/">← Live dashboard</Link>
      </section>

      <section className="forecast-regional-strip" aria-label="Regional forecast summary">
        <article><small>REGIONAL APM</small><strong>{regionalApm.toLocaleString()}</strong><span>active paying members today</span></article>
        <article className={regionalNetPace > 0 ? "growing" : "declining"}><small>PROJECTED NET GROWTH</small><strong>{regionalNetPace >= 0 ? "+" : ""}{regionalNetPace.toFixed(1)}</strong><span>members per month at current pace</span></article>
        <article><small>CENTERS GROWING</small><strong>{centersGrowing} <em>of {forecasts.length}</em></strong><span>positive net monthly pace</span></article>
        <article><small>DATA THROUGH</small><strong>{latestDataThrough?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "—"}</strong><span>forecast refreshes with the live feed</span></article>
      </section>

      <section className="forecast-method">
        <span>i</span><div><small>HOW THE FORECAST WORKS</small><strong>Projected monthly sign-ups − this month&apos;s total drop load = net monthly growth</strong><p>Total Drops already represents the month&apos;s complete drop load, so it is counted once rather than multiplied by elapsed days. Every new daily update will sharpen the timeline.</p></div>
      </section>

      <section className="forecast-center-grid">
        {forecasts.map((center) => {
          const nextMilestone = center.milestones.find((target) => target > center.bomApm);
          const membersNeeded = nextMilestone ? nextMilestone - center.bomApm : 0;
          const monthsToNext = nextMilestone && center.netMonthlyPace > 0 ? membersNeeded / center.netMonthlyPace : null;
          const monthlySalesForOneYear = Math.ceil(center.monthlyDropLoad + membersNeeded / 12);
          return <article className="forecast-center-card" key={center.center}>
            <div className="forecast-card-head">
              <div><small>{center.center.toUpperCase()}</small><strong>{center.bomApm} <em>APM</em></strong><span>{center.signups.current} sign-ups · {center.drops.total} drops through {center.dataThrough.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
              <div className={center.netMonthlyPace > 0 ? "positive" : "negative"}><small>NET PACE</small><strong>{center.netMonthlyPace >= 0 ? "+" : ""}{center.netMonthlyPace.toFixed(1)}</strong><span>per month</span></div>
            </div>

            {nextMilestone && <section className={`forecast-next-target ${monthsToNext === null ? "off-pace" : ""}`}>
              <div><span>★</span><div><small>NEXT {nextMilestone === 500 ? "MEMBERSHIP" : "BONUS"} MILESTONE</small><strong>{nextMilestone} APM</strong></div></div>
              <div><strong>{membersNeeded}</strong><span>members needed</span></div>
              <div><strong>{monthsToNext === null ? "Not on pace" : monthsLabel(monthsToNext)}</strong><span>{monthsToNext === null ? `${monthlySalesForOneYear} sign-ups/month creates a 12-month path` : `Estimated ${milestoneDate(center.dataThrough, monthsToNext)}`}</span></div>
            </section>}

            <div className="forecast-pace-equation">
              <div><small>SALES PACE</small><strong>+{center.signupPace.toFixed(1)}</strong><span>projected monthly</span></div><b>−</b>
              <div><small>MONTHLY DROP LOAD</small><strong>{center.monthlyDropLoad.toFixed(0)}</strong><span>counted once for the month</span></div><b>=</b>
              <div className={center.netMonthlyPace > 0 ? "positive" : "negative"}><small>NET GROWTH</small><strong>{center.netMonthlyPace >= 0 ? "+" : ""}{center.netMonthlyPace.toFixed(1)}</strong><span>projected monthly</span></div>
            </div>

            <div className="forecast-ladder">
              {center.milestones.map((target) => {
                const achieved = center.bomApm >= target;
                const needed = Math.max(0, target - center.bomApm);
                const months = !achieved && center.netMonthlyPace > 0 ? needed / center.netMonthlyPace : null;
                const isNext = target === nextMilestone;
                return <div className={`${achieved ? "achieved" : ""} ${isNext ? "next" : ""}`} key={target}>
                  <span>{achieved ? "✓" : target === 500 ? "◆" : "★"}</span>
                  <strong>{target}</strong>
                  <small>{target === 500 ? "BIG MILESTONE · NO BONUS" : "BONUS MILESTONE"}</small>
                  <p>{achieved ? "ACHIEVED" : months === null ? `${needed} needed · ${Math.ceil(center.monthlyDropLoad + needed / 12)}/month for a 12-month path` : `${needed} needed · ${milestoneDate(center.dataThrough, months)}`}</p>
                </div>;
              })}
            </div>
          </article>;
        })}
      </section>

      <footer>Forecast basis: live Membership Health data <span>Milestones continue every 50 APM after 550</span></footer>
    </div>
  </main>;
}
