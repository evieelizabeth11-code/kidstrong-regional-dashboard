"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ReportingPeriodNav() {
  const [period, setPeriod] = useState("August 2026");
  useEffect(() => {
    fetch(`/api/live-data?period=${Date.now()}`, { cache: "no-store" }).then((response) => response.text()).then((csv) => {
      const reportDate = csv.trim().split(/\r?\n/)[1]?.split(",")[12]?.replace(/^"|"$/g, "");
      if (reportDate) setPeriod(new Date(`${reportDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    }).catch(() => undefined);
  }, []);
  return <div className="reporting-period-area">
    <div className="reporting-period-nav">
      <div><small>REPORTING PERIOD</small><strong>{period}</strong></div>
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
