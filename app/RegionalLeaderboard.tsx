"use client";

import { useMemo } from "react";
import { membershipData, type CenterMembership } from "./membership-data";
import { reports as fallbackReports, type CenterReport } from "./trial-data";

const pct = (top: number, bottom: number) => (bottom ? (top / bottom) * 100 : 0);

const membershipStrength = (item: CenterMembership) => {
  const calculatedActivePaying = item.totalMembers - item.holds.total - item.pastDue;
  // The first report date of a new month still reflects the prior day's
  // completed activity. Use the approved new-month baseline so the APM
  // standings reset with the reporting period. After that, use the direct
  // APM value when present or the same Total Members - Holds - Past Due
  // calculation used on each center page.
  const reportDay = item.reportDate ? new Date(`${item.reportDate}T12:00:00`).getDate() : null;
  if (reportDay === 1) return item.bomApm;
  if (item.activePaying && item.activePaying > 0) return item.activePaying;
  return calculatedActivePaying > 0 ? calculatedActivePaying : item.bomApm;
};

export default function RegionalLeaderboard({
  memberships = membershipData,
  reports = fallbackReports,
  reportingPeriod = "August 2026",
}: {
  memberships?: CenterMembership[];
  reports?: CenterReport[];
  reportingPeriod?: string;
}) {

  const apmStandings = useMemo(() => memberships
    .map((item) => ({ center: item.center, value: membershipStrength(item) }))
    .sort((a, b) => b.value - a.value), [memberships]);
  const apmLeader = apmStandings[0]?.value ?? 0;

  const categories = useMemo(() => [
    {
      label: "SIGN-UPS",
      caption: "Month-to-date",
      rows: memberships
        .map((item) => ({ center: item.center, value: item.signups.current, display: `${item.signups.current}` }))
        .sort((a, b) => b.value - a.value),
    },
    {
      label: "CLOSE RATE",
      caption: "Closed ÷ showed",
      rows: reports
        .map((item) => ({ center: item.center, value: pct(item.closed, item.showed), display: `${pct(item.closed, item.showed).toFixed(1)}%` }))
        .sort((a, b) => b.value - a.value),
    },
    {
      label: "SHOW RATE",
      caption: "Showed ÷ scheduled",
      rows: reports
        .map((item) => ({ center: item.center, value: pct(item.showed, item.scheduled), display: `${pct(item.showed, item.scheduled).toFixed(1)}%` }))
        .sort((a, b) => b.value - a.value),
    },
  ], [memberships, reports]);

  return <section className="regional-leaderboard">
    <div className="leaderboard-heading">
      <div><p className="kicker">REGIONAL LEADERBOARD</p><h2>Who&apos;s setting the pace?</h2></div>
      <span>Live standings · {reportingPeriod}</span>
    </div>
    <section className="apm-standings" aria-label="Active paying member leaderboard">
      <div className="apm-standings-intro">
        <div><small>APM STANDINGS</small><strong>Membership strength</strong><span>Live active paying members</span></div>
        <div className="apm-champion"><i>♛</i><div><small>REGIONAL LEADER</small><strong>{apmStandings[0]?.center}</strong></div><b>{apmLeader.toLocaleString()} <em>APM</em></b></div>
      </div>
      <ol className="apm-ranking-list">
        {apmStandings.map((row, index) => {
          const medal = ["gold", "silver", "bronze"][index];
          return <li className={medal ? `medal-${medal}` : "fourth"} key={row.center}>
          <span className="apm-rank">{index + 1}</span>
          <div><strong>{row.center}{medal && <small>{medal.toUpperCase()}</small>}</strong><i><b style={{ width: `${apmLeader ? (row.value / apmLeader) * 100 : 0}%` }} /></i></div>
          <b>{row.value.toLocaleString()} <small>APM</small></b>
        </li>})}
      </ol>
    </section>
    <div className="leaderboard-grid">
      {categories.map((category) => <article className="leaderboard-card" key={category.label}>
        <div className="leaderboard-card-head"><div><small>{category.label}</small><span>{category.caption}</span></div><b>★</b></div>
        <div className="leaderboard-winner"><em>1</em><div><small>CURRENT LEADER</small><strong>{category.rows[0]?.center}</strong></div><b>{category.rows[0]?.display}</b></div>
        <ol>{category.rows.slice(1).map((row, index) => <li key={row.center}><span><i>{index + 2}</i>{row.center}</span><strong>{row.display}</strong></li>)}</ol>
      </article>)}
    </div>
  </section>;
}
