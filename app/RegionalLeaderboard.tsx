"use client";

import { useMemo } from "react";
import { membershipData, type CenterMembership } from "./membership-data";
import { reports as fallbackReports, type CenterReport } from "./trial-data";

const pct = (top: number, bottom: number) => (bottom ? (top / bottom) * 100 : 0);

export default function RegionalLeaderboard({
  memberships = membershipData,
  reports = fallbackReports,
}: {
  memberships?: CenterMembership[];
  reports?: CenterReport[];
}) {

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
      <span>Live standings · August 2026</span>
    </div>
    <div className="leaderboard-grid">
      {categories.map((category) => <article className="leaderboard-card" key={category.label}>
        <div className="leaderboard-card-head"><div><small>{category.label}</small><span>{category.caption}</span></div><b>★</b></div>
        <div className="leaderboard-winner"><em>1</em><div><small>CURRENT LEADER</small><strong>{category.rows[0]?.center}</strong></div><b>{category.rows[0]?.display}</b></div>
        <ol>{category.rows.slice(1).map((row, index) => <li key={row.center}><span><i>{index + 2}</i>{row.center}</span><strong>{row.display}</strong></li>)}</ol>
      </article>)}
    </div>
  </section>;
}
