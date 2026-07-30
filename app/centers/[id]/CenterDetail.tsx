"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { callData, mergeCallFeedRows } from "../../call-data";
import { callPersonData } from "../../call-person-data";
import {
  yesterdayCalls,
  yesterdayPersonCalls,
  yesterdayTrials,
  type DailyCalls,
  type DailyPersonCalls,
  type DailyTrials,
} from "../../daily-data";
import { membershipData, type CenterMembership } from "../../membership-data";
import { reports } from "../../trial-data";
import { mergeOfficialTrialFeed, trialSourceComparisons, type TrialSourceComparison } from "../../trial-feed";
import { teamTrialData } from "../../team-trial-data";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const pct = (top: number, bottom: number) => (bottom ? (top / bottom) * 100 : 0);
const rate = (top: number, bottom: number) => `${pct(top, bottom).toFixed(1)}%`;
const tone = (value: number) => (value >= 80 ? "strong" : value >= 60 ? "monitor" : "attention");
const progressTone = (value: number) =>
  value > 100 ? "progress-surpassed" : value >= 100 ? "progress-goal" : value >= 80 ? "progress-close" : "progress-behind";
const MONTHLY_CALL_MINUTE_GOAL = 3000;
const DAYS_REMAINING = 2;
const MEMBERSHIP_FEED_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStYm8FUld375ztzjfoQxGkA6o9h7YW4GAYM_xSLPB4Q78WQn-MoDr1RHbh7e3dPt1VrtBa-p3ptZi2/pub?gid=300000006&single=true&output=csv";
type Section = "overview" | "trials" | "calls" | "membership";

export default function CenterDetail({ centerId, section }: { centerId: string; section: Section }) {
  const [dayFilter, setDayFilter] = useState("All days");
  const [sort, setSort] = useState("day");
  const [liveMembershipData, setLiveMembershipData] = useState<CenterMembership[]>(membershipData);
  const [liveCallData, setLiveCallData] = useState(callData);
  const [liveYesterdayCalls, setLiveYesterdayCalls] = useState<DailyCalls[]>(yesterdayCalls);
  const [liveYesterdayPeople, setLiveYesterdayPeople] = useState<DailyPersonCalls[]>(yesterdayPersonCalls);
  const [liveYesterdayTrials, setLiveYesterdayTrials] = useState<DailyTrials[]>(yesterdayTrials);
  const [liveReports, setLiveReports] = useState(reports);
  const [trialComparisons, setTrialComparisons] = useState<TrialSourceComparison[]>([]);
  const [snapshotDate, setSnapshotDate] = useState("Wednesday, July 29");

  useEffect(() => {
    const loadMembershipData = async () => {
      try {
        const response = await fetch(`${MEMBERSHIP_FEED_URL}&t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const rows = (await response.text()).trim().split(/\r?\n/).slice(1);
        setLiveCallData(mergeCallFeedRows(callData, rows));
        setLiveReports(mergeOfficialTrialFeed(reports, rows));
        setTrialComparisons(trialSourceComparisons(rows));
        const dailyCalls: DailyCalls[] = [];
        const dailyPeople: DailyPersonCalls[] = [];
        const dailyTrials: DailyTrials[] = [];
        let latestSnapshotSerial = 0;
        const updated = rows.map((row) => {
          const values = row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
          const snapshotSerial = Number(values[22]) || 0;
          const snapshotCalls = Number(values[23]) || 0;
          const snapshotOutbound = Number(values[24]) || 0;
          const snapshotMinutes = Number(values[25]) || 0;
          if (values[0] && snapshotSerial) {
            latestSnapshotSerial = Math.max(latestSnapshotSerial, snapshotSerial);
            dailyCalls.push({
              center: values[0],
              totalCalls: snapshotCalls,
              inboundCalls: Math.max(0, snapshotCalls - snapshotOutbound),
              outboundCalls: snapshotOutbound,
              answeredCalls: 0,
              missedCalls: 0,
              voicemails: 0,
              totalMinutes: snapshotMinutes,
            });
            (values[26] ?? "").split(";").forEach((entry) => {
              const [person, minutes, calls] = entry.split("|");
              if (person && Number(minutes) > 0) {
                dailyPeople.push({
                  center: values[0],
                  person,
                  totalMinutes: Number(minutes),
                  totalCalls: Number(calls) || 0,
                });
              }
            });
          }
          const [, trialScheduled, trialShowed, trialClosed] = (values[27] ?? "").split("~");
          if (values[0] && trialScheduled !== undefined) {
            dailyTrials.push({
              center: values[0],
              scheduled: Number(trialScheduled) || 0,
              showed: Number(trialShowed) || 0,
              closed: Number(trialClosed) || 0,
            });
          }
          return {
            center: values[0],
            totalMembers: Number(values[1]),
            bomApm: Number(values[2]),
            holds: {
              total: Number(values[3]),
              scheduled: null,
              starting: Number(values[4]),
              lifting: Number(values[5]),
            },
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
        if (updated.length) setLiveMembershipData(updated);
        if (dailyCalls.length) setLiveYesterdayCalls(dailyCalls);
        if (dailyPeople.length) setLiveYesterdayPeople(dailyPeople);
        if (dailyTrials.length) setLiveYesterdayTrials(dailyTrials);
        if (latestSnapshotSerial) {
          const snapshot = new Date(Date.UTC(1899, 11, 30) + latestSnapshotSerial * 86400000);
          setSnapshotDate(snapshot.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          }));
        }
      } catch {
        // Keep the last built-in snapshot when the published feed is unavailable.
      }
    };

    loadMembershipData();
  }, []);

  const selected = liveReports.find((report) => report.id === centerId) ?? liveReports[0];
  const trialComparison = trialComparisons.find((item) => item.center === selected.center);
  const trackerMatchesOfficial = trialComparison
    ? trialComparison.official.scheduled === trialComparison.tracker.scheduled
      && trialComparison.official.showed === trialComparison.tracker.showed
      && trialComparison.official.closed === trialComparison.tracker.closed
    : true;
  const selectedCalls = liveCallData.find((item) => item.center === selected.center) ?? liveCallData[0];
  const people = callPersonData.filter((item) => item.center === selected.center && item.totalMinutes > 0);
  const teamTrials = teamTrialData.filter((item) => item.center === selected.center);
  const membership = liveMembershipData.find((item) => item.center === selected.center);
  const yesterdayCall = liveYesterdayCalls.find((item) => item.center === selected.center);
  const yesterdayTrial = liveYesterdayTrials.find((item) => item.center === selected.center);
  const yesterdayPeople = liveYesterdayPeople
    .filter((item) => item.center === selected.center && item.totalMinutes > 0)
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
  const namedMinutes = people.reduce((sum, item) => sum + item.totalMinutes, 0);
  const sharedMinutes = Math.max(0, selectedCalls.totalMinutes - namedMinutes);
  const callGoalPct = pct(selectedCalls.totalMinutes, MONTHLY_CALL_MINUTE_GOAL);
  const signupGoalPct = membership ? pct(membership.signups.current, membership.signups.goal) : 0;
  const expectedSignups = membership ? membership.signups.goal * (29 / 31) : 0;
  const goalAchieved = membership ? membership.signups.current >= membership.signups.goal : false;
  const paceLabel = membership ? (goalAchieved ? "Goal crushed" : membership.signups.current >= expectedSignups - 1 ? "On pace" : "Behind pace") : "";
  const currentActivePaying = membership ? membership.totalMembers - membership.holds.total - membership.pastDue : 0;
  const holdsStarting = membership?.holds.starting ?? 0;
  const holdsLifting = membership?.holds.lifting ?? 0;
  const projectedSignups = membership ? Math.round((membership.signups.current / 28) * 31) : 0;
  const projectedAdditionalSignups = membership ? Math.max(0, projectedSignups - membership.signups.current) : 0;
  const noSignupEomActive = membership ? currentActivePaying - holdsStarting + holdsLifting - membership.drops.pending : 0;
  const goalEomActive = membership ? noSignupEomActive + Math.max(0, membership.signups.goal - membership.signups.current) : 0;
  const projectedEomActive = membership ? noSignupEomActive + projectedAdditionalSignups : 0;
  const signupsNeeded = membership ? Math.max(0, membership.signups.goal - membership.signups.current) : 0;
  const firstPushGoal = membership ? Math.ceil(membership.signups.goal / 5) * 5 + 5 : 0;
  const secondPushGoal = firstPushGoal + 5;
  const stretchGoal = membership
    ? [firstPushGoal, secondPushGoal].find((goal) => goal > membership.signups.current)
      ?? Math.ceil((membership.signups.current + 1) / 5) * 5
    : 0;
  const stretchRemaining = membership ? Math.max(0, stretchGoal - membership.signups.current) : 0;
  const stretchEomActive = membership ? noSignupEomActive + stretchRemaining : 0;
  const targetRemaining = goalAchieved ? stretchRemaining : signupsNeeded;
  const signupsPerDay = targetRemaining / DAYS_REMAINING;
  const centerCloseRate = pct(selected.closed, selected.showed) / 100;
  const centerShowRate = pct(selected.showed, selected.scheduled) / 100;
  const showsNeeded = centerCloseRate ? Math.ceil(signupsNeeded / centerCloseRate) : 0;
  const scheduledNeeded = centerShowRate ? Math.ceil(showsNeeded / centerShowRate) : 0;
  const dataThroughDate = membership?.reportDate
    ? new Date(`${membership.reportDate}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Jul 29, 2026";

  const classRows = useMemo(() => {
    const rows = selected.classes.filter((row) => dayFilter === "All days" || row.day === dayFilter);
    return [...rows].sort((a, b) => {
      if (sort === "show") return pct(b.showed, b.scheduled) - pct(a.showed, a.scheduled);
      if (sort === "close") return pct(b.closed, b.showed) - pct(a.closed, a.showed);
      if (sort === "volume") return b.scheduled - a.scheduled;
      return days.indexOf(a.day) - days.indexOf(b.day) || a.time.localeCompare(b.time);
    });
  }, [selected, dayFilter, sort]);

  const sectionTitle = section === "overview" ? "CENTER OVERVIEW" : `${section.toUpperCase()} PERFORMANCE`;

  return (
    <main className="detail-page">
      <header className="navy-header">
        <Link href="/" className="wordmark"><span className="shield">K</span><div><strong>KIDSTRONG</strong><small>REGIONAL PERFORMANCE</small></div></Link>
        <div className="header-title"><span>{sectionTitle}</span><strong>{selected.center.toUpperCase()}</strong></div>
        <div className="date-lockup"><span className="calendar-icon">29</span><div><small>REPORTING WINDOW</small><strong>July 1 – July 29</strong></div></div>
      </header>

      <div className="page-shell">
        <nav className="detail-nav" aria-label="Center navigation">
          <Link href="/">← All centers</Link>
          <div className="section-tabs">
            <Link className={section === "overview" ? "active" : ""} href={`/centers/${centerId}`}>Overview</Link>
            <Link className={section === "trials" ? "active" : ""} href={`/centers/${centerId}/trials`}>Trials</Link>
            <Link className={section === "calls" ? "active" : ""} href={`/centers/${centerId}/calls`}>Calls</Link>
            <Link className={section === "membership" ? "active" : ""} href={`/centers/${centerId}/membership`}>Membership</Link>
          </div>
        </nav>

        <section className="detail-hero">
          <div><p className="kicker">JULY 2026 · {sectionTitle}</p><h1>{selected.center}</h1><p>{selected.dateRange}</p></div>
          <div className="center-switcher">{liveReports.map((report) => <Link className={report.id === centerId ? "active" : ""} href={`/centers/${report.id}${section === "overview" ? "" : `/${section}`}`} key={report.id}>{report.center}</Link>)}</div>
        </section>

        {section === "overview" && <>
          <section className="overview-primary-kpis">
            <article><small>CENTER SHOW RATE · OFFICIAL SCORECARD</small><strong>{rate(selected.showed, selected.scheduled)}</strong><span>{selected.showed} of {selected.scheduled} trials attended</span></article>
            <article><small>CENTER CLOSE RATE · OFFICIAL SCORECARD</small><strong>{rate(selected.closed, selected.showed)}</strong><span>{selected.closed} of {selected.showed} attended trials signed</span></article>
          </section>

          {trialComparison && <section className={`trial-reconciliation ${trackerMatchesOfficial ? "matched" : "warning"}`}>
            <div><strong>{trackerMatchesOfficial ? "✓ TRIAL DATA RECONCILED" : "⚠ TRIAL TRACKER NEEDS REVIEW"}</strong><span>Official center reporting uses the Daily Scorecard.</span></div>
            <p>Scorecard: {trialComparison.official.scheduled} scheduled · {trialComparison.official.showed} attended · {trialComparison.official.closed} signed</p>
            <p>Trial Tracker: {trialComparison.tracker.scheduled} scheduled · {trialComparison.tracker.showed} attended · {trialComparison.tracker.closed} signed</p>
          </section>}

          <section className="yesterday-snapshot">
            <div className="snapshot-heading"><div><small>YESTERDAY&apos;S SNAPSHOT · TRIAL TRACKER</small><strong>{snapshotDate}</strong></div><span>Operational detail for reconciliation</span></div>
            <div className="snapshot-grid">
              <article><small>TRIALS SCHEDULED</small><strong>{yesterdayTrial?.scheduled ?? "—"}</strong><span>{yesterdayTrial ? "yesterday's trial volume" : "awaiting July 29 results"}</span></article>
              <article><small>TRIALS SHOWED</small><strong>{yesterdayTrial?.showed ?? "—"}</strong><span>{yesterdayTrial ? `${rate(yesterdayTrial.showed, yesterdayTrial.scheduled)} show rate` : "awaiting July 29 results"}</span></article>
              <article><small>TRIALS SIGNED</small><strong>{yesterdayTrial?.closed ?? "—"}</strong><span>{yesterdayTrial ? `${rate(yesterdayTrial.closed, yesterdayTrial.showed)} close rate` : "awaiting July 29 results"}</span></article>
              <article><small>TOTAL TALK TIME</small><strong>{yesterdayCall?.totalMinutes.toFixed(1) ?? "—"} <em>min</em></strong><span>{yesterdayCall?.totalCalls ?? 0} calls · {yesterdayCall?.outboundCalls ?? 0} outbound</span></article>
            </div>
            <div className="snapshot-people">
              <div><small>TALK TIME BY PERSON</small><span>Users with recorded talk time</span></div>
              <div className="snapshot-person-list">{yesterdayPeople.map((person) => <article key={person.person}><strong>{person.person}</strong><span>{person.totalMinutes.toFixed(1)} min</span><i><b style={{ width: `${Math.min(pct(person.totalMinutes, yesterdayCall?.totalMinutes ?? 0), 100)}%` }} /></i><small>{person.totalCalls} calls</small></article>)}</div>
            </div>
          </section>

          <section className="center-section-cards">
            <Link href={`/centers/${centerId}/trials`} className="center-section-card">
              <div><small>TRIALS</small><strong>{selected.scheduled} scheduled</strong><span>{selected.closed} closed</span></div><b>View trial details →</b>
            </Link>
            <Link href={`/centers/${centerId}/calls`} className={`center-section-card ${progressTone(callGoalPct)}`}>
              <div><small>CALLS</small><strong>{selectedCalls.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} minutes</strong><span>{callGoalPct.toFixed(1)}% of 3,000-minute goal</span></div><i><em style={{ width: `${Math.min(callGoalPct, 100)}%` }} /></i><b>View call details →</b>
            </Link>
            <Link href={`/centers/${centerId}/membership`} className={`center-section-card ${!membership ? "unavailable" : ""}`}>
              <div><small>MEMBERSHIP</small><strong>{membership ? `${membership.signups.current} of ${membership.signups.goal} sign-ups` : "Data coming soon"}</strong><span>{membership ? `${signupGoalPct.toFixed(1)}% of monthly goal · ${paceLabel}` : "Membership health has not been added yet"}</span></div>{membership && <i><em style={{ width: `${Math.min(signupGoalPct, 100)}%` }} /></i>}<b>{membership ? "View membership details →" : "Awaiting data"}</b>
            </Link>
          </section>

          <DayPerformance selected={selected} />
          <section className="insights-grid">
            <article className="insight success"><span>★</span><div><small>WHAT&apos;S WORKING</small><strong>{selected.strongest}</strong></div></article>
            <article className="insight risk"><span>!</span><div><small>GREATEST OPPORTUNITY</small><strong>{selected.opportunity}</strong></div></article>
            <article className="insight focus"><span>◎</span><div><small>GOLD STANDARD</small><strong>{selected.goldStandard}</strong></div></article>
          </section>
        </>}

        {section === "trials" && <>
          <section className="kpi-grid">
            <article><span className="metric-icon blue">S</span><div><small>TRIALS SCHEDULED</small><strong>{selected.scheduled}</strong><p>100% of total</p></div></article>
            <article><span className="metric-icon green">SH</span><div><small>TRIALS SHOWED</small><strong>{selected.showed}</strong><p>{rate(selected.showed, selected.scheduled)} show rate</p></div></article>
            <article><span className="metric-icon navy">C</span><div><small>TRIALS CLOSED</small><strong>{selected.closed}</strong><p>{rate(selected.closed, selected.showed)} close rate</p></div></article>
            <article><span className="metric-icon black">NS</span><div><small>NO SHOWS</small><strong>{selected.scheduled - selected.showed}</strong><p>{rate(selected.scheduled - selected.showed, selected.scheduled)} no-show rate</p></div></article>
          </section>
          {teamTrials.length > 0 && <section className="panel team-trial-panel">
            <div className="panel-bar team-trial-bar"><div><h3>SHOW &amp; CLOSE RATES BY PERSON</h3><span>Trial Tracker coaching data · may differ from official scorecard totals</span></div><strong>{teamTrials.reduce((sum, item) => sum + item.closed, 0)} tracker closes</strong></div>
            <div className="team-trial-grid">{teamTrials.map((person) => <article className="team-trial-card" key={person.person}><div className="team-trial-name"><strong>{person.person}</strong><span>{person.booked} booked · {person.closed} closed</span></div><div className="team-rate-pair"><div><small>SHOW RATE</small><strong>{person.showRate === null ? "—" : `${person.showRate}%`}</strong><i><b style={{ width: `${person.showRate ?? 0}%` }} /></i></div><div><small>CLOSE RATE</small><strong>{person.closeRate === null ? "—" : `${person.closeRate}%`}</strong><i><b style={{ width: `${person.closeRate ?? 0}%` }} /></i></div></div></article>)}</div>
          </section>}
          <section className="panel class-panel">
            <div className="panel-bar class-bar"><div><h3>DAILY CLASS PERFORMANCE DETAILS</h3><span>{classRows.length} class windows shown</span></div><div className="table-controls"><select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}><option>All days</option>{days.map((day) => <option key={day}>{day}</option>)}</select><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="day">Sort: schedule</option><option value="volume">Sort: volume</option><option value="show">Sort: show rate</option><option value="close">Sort: close rate</option></select></div></div>
            <div className="class-table-wrap"><table><thead><tr><th>Day</th><th>Class time</th><th>Scheduled</th><th>Showed</th><th>Closed</th><th>Show %</th><th>Close %</th></tr></thead><tbody>{classRows.map((row) => <tr key={`${row.day}-${row.time}`}><td><strong>{row.day}</strong></td><td>{row.time}</td><td>{row.scheduled}</td><td>{row.showed}</td><td>{row.closed}</td><td><span className={`rate-chip ${tone(pct(row.showed, row.scheduled))}`}>{rate(row.showed, row.scheduled)}</span></td><td><span className={`rate-chip ${tone(pct(row.closed, row.showed))}`}>{row.showed ? rate(row.closed, row.showed) : "—"}</span></td></tr>)}</tbody></table></div>
          </section>
        </>}

        {section === "calls" && <>
          <section className={`call-goal-hero ${progressTone(callGoalPct)}`}><div><small>{callGoalPct > 100 ? "MONTHLY GOAL SURPASSED ★" : callGoalPct >= 100 ? "MONTHLY GOAL HIT ✓" : "MONTHLY CALL-TIME GOAL"}</small><strong>{callGoalPct.toFixed(1)}%</strong><span>{selectedCalls.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} of 3,000 minutes · {callGoalPct >= 100 ? `${(selectedCalls.totalMinutes - MONTHLY_CALL_MINUTE_GOAL).toLocaleString(undefined, { maximumFractionDigits: 0 })} above goal` : `${(MONTHLY_CALL_MINUTE_GOAL - selectedCalls.totalMinutes).toLocaleString(undefined, { maximumFractionDigits: 0 })} remaining`}</span></div><i><b style={{ width: `${Math.min(callGoalPct, 100)}%` }} /></i></section>
          <section className="call-detail-strip">
            <div><small>TOTAL CALL TIME</small><strong>{selectedCalls.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} min</strong><span>{selectedCalls.totalHours.toFixed(1)} hours</span></div>
            <div><small>AVERAGE CALL LENGTH</small><strong>{selectedCalls.avgMinutes.toFixed(2)} min</strong><span>across {selectedCalls.totalCalls.toLocaleString()} calls</span></div>
            <div><small>OUTBOUND EFFORT</small><strong>{selectedCalls.outboundCalls.toLocaleString()}</strong><span>{pct(selectedCalls.outboundCalls, selectedCalls.totalCalls).toFixed(1)}% of calls</span></div>
            <div><small>FOLLOW-UP SIGNALS</small><strong>{selectedCalls.missedCalls + selectedCalls.voicemails}</strong><span>{selectedCalls.missedCalls} missed · {selectedCalls.voicemails} voicemail</span></div>
          </section>
          <section className="panel people-call-panel">
            <div className="panel-bar people-call-bar"><div><h3>TEAM CALL ACTIVITY</h3><span>People with recorded call time · ranked by minutes</span></div><div className="shared-call-note"><strong>{sharedMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} min</strong><span>shared / unassigned inbound time</span></div></div>
            <div className="people-call-head"><span>Team member</span><span>Call time</span><span>Center share</span><span>Total calls</span><span>Inbound</span><span>Outbound</span><span>Avg. length</span></div>
            <div className="people-call-list">{people.map((person, index) => { const share = pct(person.totalMinutes, selectedCalls.totalMinutes); return <div className="people-call-row" key={person.person}><div className="person-name"><b>{index + 1}</b><strong>{person.person}</strong></div><div className="person-call-time"><strong>{person.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} min</strong><span>{(person.totalMinutes / 60).toFixed(1)} hrs</span></div><div className="person-share"><strong>{share.toFixed(1)}%</strong><i><b style={{ width: `${Math.min(share, 100)}%` }} /></i></div><span>{person.totalCalls.toLocaleString()}</span><span>{person.inboundCalls.toLocaleString()}</span><span>{person.outboundCalls.toLocaleString()}</span><span>{person.avgMinutes.toFixed(2)} min</span></div>; })}</div>
          </section>
        </>}

        {section === "membership" && membership && <section className="panel membership-panel">
          <div className="panel-bar membership-bar"><div><h3>MEMBERSHIP HEALTH</h3><span>Report date {dataThroughDate} · reflects prior-day completed data</span></div><div className="membership-apm"><small>BOM ACTIVE PAYING MEMBERS</small><strong>{membership.bomApm}</strong></div></div>
          <div className="membership-current-row">
            <article><small>TOTAL MEMBERS</small><strong>{membership.totalMembers}</strong></article>
            <span>−</span><article><small>HOLDS</small><strong>{membership.holds.total}</strong></article>
            <span>−</span><article><small>PAST DUE</small><strong>{membership.pastDue}</strong></article>
            <span>=</span><article className="active-paying-now"><small>CURRENT ACTIVE PAYING</small><strong>{currentActivePaying}</strong></article>
          </div>
          <div className={`membership-pace ${progressTone(signupGoalPct)}`}><div><small>{signupGoalPct > 100 ? "MONTHLY GOAL SURPASSED ★" : signupGoalPct >= 100 ? "MONTHLY GOAL HIT ✓" : "MONTHLY SIGN-UP PACE"}</small><strong>{paceLabel}</strong><span>{membership.signups.current} actual vs. {expectedSignups.toFixed(1)} expected through July 29</span></div><div><strong>{membership.signups.current} <small>of {membership.signups.goal}</small></strong><span>{goalAchieved ? `${stretchRemaining} to the ${stretchGoal} stretch milestone` : `${Math.max(0, membership.signups.goal - membership.signups.current)} sign-ups remaining`}</span></div><i><b style={{ width: `${Math.min(signupGoalPct, 100)}%` }} /></i></div>
          <section className="signup-milestones" aria-label="Sign-up milestone ladder">
            {[
              { goal: membership.signups.goal, label: "ORIGINAL GOAL", tone: "original" },
              { goal: firstPushGoal, label: "PUSH GOAL", tone: "push" },
              { goal: secondPushGoal, label: "NEXT LEVEL", tone: "next" },
            ].map((milestone, index) => {
              const earned = membership.signups.current >= milestone.goal;
              const remaining = Math.max(0, milestone.goal - membership.signups.current);
              return <article className={`milestone-star ${milestone.tone} ${earned ? "earned" : "upcoming"} ${index === 0 ? "primary" : ""}`} key={milestone.goal}>
                <span>★</span>
                <div><small>{earned ? `${milestone.label} ACHIEVED` : milestone.label}</small><strong>{milestone.goal}</strong><p>{earned ? `${membership.signups.current - milestone.goal} above milestone` : `${remaining} more sign-up${remaining === 1 ? "" : "s"} to earn`}</p></div>
              </article>;
            })}
          </section>
          <div className="signup-breakdown" aria-label="Month-to-date sign-up breakdown">
            <article className="signup-total"><small>TOTAL SIGN-UPS MTD</small><strong>{membership.signups.current}</strong><span>All new memberships</span></article>
            <div className="signup-sources">
              <article><div><small>TRIAL SIGN-UPS</small><span>Signed from a trial</span></div><strong>{membership.signups.trial}</strong></article>
              <article><div><small>NON-TRIAL SIGN-UPS</small><span>Signed without a trial</span></div><strong>{membership.signups.nonTrial}</strong></article>
            </div>
          </div>
          <section className="scenario-section">
            <div className="scenario-heading"><div><small>END-OF-MONTH OUTLOOK</small><strong>Projected active-paying members</strong></div><span>Three clear outcomes based on the final two days</span></div>
            <div className="membership-scenarios">
              <article className="eom-forecast no-signups"><div className="scenario-label"><i>↓</i><div><small>FLOOR</small><b>NO MORE SIGN-UPS</b></div></div><strong>{noSignupEomActive}</strong><em>PROJECTED APM</em><span>{currentActivePaying} today → scheduled holds and drops applied</span></article>
              <article className="eom-forecast goal-scenario"><div className="scenario-label"><i>★</i><div><small>TARGET</small><b>{goalAchieved ? `REACH ${stretchGoal} SIGN-UPS` : "HIT THE SIGN-UP GOAL"}</b></div></div><strong>{goalAchieved ? stretchEomActive : goalEomActive}</strong><em>PROJECTED APM</em><span>{noSignupEomActive} floor + {targetRemaining} additional sign-up{targetRemaining === 1 ? "" : "s"}</span></article>
              <article className="eom-forecast pace-scenario"><div className="scenario-label"><i>→</i><div><small>FORECAST</small><b>CURRENT SIGN-UP PACE</b></div></div><strong>{projectedEomActive}</strong><em>PROJECTED APM</em><span>{noSignupEomActive} floor + {projectedAdditionalSignups} projected sign-up{projectedAdditionalSignups === 1 ? "" : "s"}</span><mark>LIKELY OUTCOME</mark></article>
            </div>
          </section>
          <section className="membership-action-plan">
            <div className="action-plan-heading"><div><small>FINAL-TWO-DAY ACTION PLAN</small><strong>{goalAchieved ? `Push to the ${stretchGoal}-signup milestone` : `Close the gap to ${membership.signups.goal} sign-ups`}</strong><span>Built from the official {rate(selected.showed, selected.scheduled)} show rate and {rate(selected.closed, selected.showed)} close rate</span></div><div><strong>{signupsPerDay.toFixed(1)}</strong><span>sign-ups<br />per day</span></div></div>
            {signupsNeeded > 0
              ? <div className="action-funnel"><article><small>SCHEDULE</small><strong>{scheduledNeeded}</strong><span>more trials</span></article><b>→</b><article><small>ATTEND</small><strong>{showsNeeded}</strong><span>need to show</span></article><b>→</b><article><small>SIGN</small><strong>{signupsNeeded}</strong><span>new members</span></article></div>
              : <div className="action-celebration"><span>★</span><div><small>ORIGINAL GOAL ACHIEVED</small><strong>{stretchRemaining} more sign-up{stretchRemaining === 1 ? "" : "s"} unlock the {stretchGoal} milestone</strong></div></div>}
          </section>
          <section className="membership-watchlist">
            <div className="watchlist-heading"><div><small>MEMBERSHIP WATCHLIST</small><strong>Items that can still move EOM APM</strong></div><span>Focus on the numbers requiring action</span></div>
            <div className="watchlist-grid">
              <article className="holds-watch"><i>H</i><div><small>CURRENTLY ON HOLD</small><strong>{membership.holds.total}</strong><span>{membership.holds.starting ?? "—"} starting · {membership.holds.lifting} lifting before EOM</span></div></article>
              <article className="drops-watch"><i>D</i><div><small>PENDING DROPS</small><strong>{membership.drops.pending}</strong><span>{membership.drops.total} total drops MTD</span></div></article>
              <article className="pastdue-watch"><i>!</i><div><small>PAST DUE</small><strong>{membership.pastDue}</strong><span>members requiring payment follow-up</span></div></article>
            </div>
          </section>
          {membership.holds.starting === null && <p className="membership-footnote">The number of holds starting before month-end is awaiting the next data update.</p>}
        </section>}
        {section === "membership" && !membership && <section className="empty-state"><strong>Membership data is coming soon.</strong><span>This center will populate when its membership report is added.</span></section>}

        <footer>Sources: July Trial Performance Report and Calls by Softphone User <span>Dashboard updated July 29, 2026</span></footer>
      </div>
    </main>
  );
}

function DayPerformance({ selected }: { selected: (typeof reports)[number] }) {
  return <section className="analysis-grid overview-day-performance">
    <article className="panel day-table-panel"><div className="panel-bar"><h3>TRIAL PERFORMANCE BY DAY</h3><span>{selected.center}</span></div><div className="day-table"><div className="day-table-head"><span>Day</span><span>Sched</span><span>Showed</span><span>Closed</span><span>Show %</span><span>Close %</span></div>{selected.days.map((row) => <div className="day-table-row" key={row.day}><strong>{row.day}</strong><span>{row.scheduled}</span><span>{row.showed}</span><span>{row.closed}</span><span className={tone(pct(row.showed, row.scheduled))}>{rate(row.showed, row.scheduled)}</span><span className={tone(pct(row.closed, row.showed))}>{rate(row.closed, row.showed)}</span></div>)}</div></article>
    <article className="panel chart-panel"><div className="panel-bar"><h3>RATES BY DAY</h3><span>Show / Close</span></div><div className="legend"><span><i className="show-key" /> Show rate</span><span><i className="close-key" /> Close rate</span></div><div className="grouped-chart">{selected.days.map((row) => <div className="chart-group" key={row.day}><div className="bars"><span className="show-bar" style={{ height: `${pct(row.showed, row.scheduled)}%` }} /><span className="close-bar" style={{ height: `${pct(row.closed, row.showed)}%` }} /></div><small>{row.day.slice(0, 3).toUpperCase()}</small></div>)}</div></article>
  </section>;
}
