import Link from "next/link";

export default function ReportingPeriodNav() {
  return <div className="reporting-period-area">
    <div className="reporting-period-nav">
      <div><small>REPORTING PERIOD</small><strong>July 2026</strong></div>
      <span>IN PROGRESS</span>
      <Link href="/history">View history →</Link>
      <Link className="daily-upload-link" href="/admin/scorecard">Daily upload</Link>
    </div>
    <nav className="header-center-links" aria-label="Jump to a center">
      <Link href="/centers/brick">Brick</Link>
      <Link href="/centers/mount-laurel">Mount Laurel</Link>
      <Link href="/centers/voorhees">Voorhees</Link>
      <Link href="/centers/turnersville">Turnersville</Link>
    </nav>
  </div>;
}
