import Link from "next/link";

export default function ReportingPeriodNav() {
  return <div className="reporting-period-nav">
    <div><small>REPORTING PERIOD</small><strong>July 2026</strong></div>
    <span>IN PROGRESS</span>
    <Link href="/history">View history →</Link>
  </div>;
}
