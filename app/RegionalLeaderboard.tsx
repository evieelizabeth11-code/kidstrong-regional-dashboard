"use client";

import { useEffect, useMemo, useState } from "react";
import { membershipData, type CenterMembership } from "./membership-data";
import { reports } from "./trial-data";
import { mergeOfficialTrialFeed } from "./trial-feed";

const MEMBERSHIP_FEED_URL = "/api/dashboard-feed";
const pct = (top: number, bottom: number) => (bottom ? (top / bottom) * 100 : 0);

export default function RegionalLeaderboard() {
  const [memberships, setMemberships] = useState<CenterMembership[]>(membershipData);
  const [liveReports, setLiveReports] = useState(reports);

  useEffect(() => {
    const loadMemberships = async () => {
      try {
        const response = await fetch(`${MEMBERSHIP_FEED_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const rows = (await response.text()).trim().split(/\r?\n/).slice(1);
        setLiveReports(mergeOfficialTrialFeed(reports, rows));
        const updated = rows.map((row) => {
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
        if (updated.length) setMemberships(updated);
      } catch {
        // Keep the built-in snapshot if Google is temporarily unavailable.
      }
    };

    loadMemberships();
  }, []);

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
      rows: liveReports
        .map((item) => ({ center: item.center, value: pct(item.closed, item.showed), display: `${pct(item.closed, item.showed).toFixed(1)}%` }))
        .sort((a, b) => b.value - a.value),
    },
    {
      label: "SHOW RATE",
      caption: "Showed ÷ scheduled",
      rows: liveReports
        .map((item) => ({ center: item.center, value: pct(item.showed, item.scheduled), display: `${pct(item.showed, item.scheduled).toFixed(1)}%` }))
        .sort((a, b) => b.value - a.value),
    },
  ], [memberships, liveReports]);

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
