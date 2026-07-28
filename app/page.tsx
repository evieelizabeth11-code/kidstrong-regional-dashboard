import Link from "next/link";
import { callData } from "./call-data";
import { reports } from "./trial-data";

const pct = (top: number, bottom: number) => (bottom ? (top / bottom) * 100 : 0);
const rate = (top: number, bottom: number) => `${pct(top, bottom).toFixed(1)}%`;
const MONTHLY_CALL_MINUTE_GOAL = 3000;

export default function Home() {
  const totals = reports.reduce(
    (sum, report) => ({
      scheduled: sum.scheduled + report.scheduled,
      showed: sum.showed + report.showed,
      closed: sum.closed + report.closed,
    }),
    { scheduled: 0, showed: 0, closed: 0 },
  );
  const totalMinutes = callData.reduce((sum, item) => sum + item.totalMinutes, 0);
  const totalCalls = callData.reduce((sum, item) => sum + item.totalCalls, 0);

  return (
    <main className="overview-page">
      <header className="navy-header">
        <div className="wordmark">
          <span className="shield">K</span>
          <div><strong>KIDSTRONG</strong><small>REGIONAL PERFORMANCE</small></div>
        </div>
        <div className="header-title">
          <span>REGIONAL PERFORMANCE COMMAND CENTER</span>
          <strong>JULY 2026</strong>
        </div>
        <div className="date-lockup">
          <span className="calendar-icon">27</span>
          <div><small>REPORTING WINDOW</small><strong>July 1 – July 27</strong></div>
        </div>
      </header>

      <div className="page-shell overview-shell">
        <section className="overview-hero">
          <div>
            <p className="kicker">4 CENTER ROLLUP</p>
            <h1>One region.<br /><span>Four centers.</span></h1>
          </div>
          <p>See the regional picture at a glance, then select a center for its complete trial and call-time performance story.</p>
        </section>

        <section className="regional-totals" aria-label="Regional totals">
          <article><small>TRIALS SCHEDULED</small><strong>{totals.scheduled}</strong><span>across four centers</span></article>
          <article><small>TRIALS SHOWED</small><strong>{totals.showed}</strong><span>{rate(totals.showed, totals.scheduled)} show rate</span></article>
          <article><small>TRIALS CLOSED</small><strong>{totals.closed}</strong><span>{rate(totals.closed, totals.showed)} close rate</span></article>
          <article><small>CALL TIME</small><strong>{totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong><span>of 12,000 regional minutes · {pct(totalMinutes, 12000).toFixed(1)}%</span></article>
        </section>

        <section className="overview-section-head">
          <div><p className="kicker">CENTER SCORECARDS</p><h2>Select a center to explore</h2></div>
          <span>{totalCalls.toLocaleString()} calls tracked this month</span>
        </section>

        <section className="overview-center-grid">
          {reports.map((report) => {
            const calls = callData.find((item) => item.center === report.center) ?? callData[0];
            const callProgress = pct(calls.totalMinutes, MONTHLY_CALL_MINUTE_GOAL);
            return (
              <Link className="overview-center-card" href={`/centers/${report.id}`} key={report.id}>
                <div className="overview-card-top">
                  <div><small>JULY 2026</small><h2>{report.center}</h2></div>
                  <span>OPEN CENTER <b>→</b></span>
                </div>
                <div className="overview-card-metrics">
                  <div><small>SCHEDULED</small><strong>{report.scheduled}</strong></div>
                  <div className="featured-rate"><small>SHOW RATE</small><strong>{rate(report.showed, report.scheduled)}</strong></div>
                  <div className="featured-rate"><small>CLOSE RATE</small><strong>{rate(report.closed, report.showed)}</strong></div>
                </div>
                <div className="overview-call-goal">
                  <div><span>CALL-TIME GOAL</span><strong>{callProgress.toFixed(1)}%</strong></div>
                  <i><b style={{ width: `${Math.min(callProgress, 100)}%` }} /></i>
                  <small>{calls.totalMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} of 3,000 minutes</small>
                </div>
              </Link>
            );
          })}
        </section>

        <footer>Sources: July Trial Performance Reports and Calls by Softphone User <span>Dashboard updated July 28, 2026</span></footer>
      </div>
    </main>
  );
}
