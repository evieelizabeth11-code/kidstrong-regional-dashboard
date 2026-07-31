import type { Metadata } from "next";
import Link from "next/link";
import ScorecardUploader from "./ScorecardUploader";

export const metadata: Metadata = {
  title: "Daily Scorecard Upload | KidStrong Regional Dashboard",
  robots: { index: false, follow: false },
};

export default function ScorecardUploadPage() {
  return <main className="admin-page">
    <header className="navy-header brandless-header admin-header">
      <div className="header-title"><span>REGIONAL PERFORMANCE COMMAND CENTER</span><strong>DAILY ADMIN</strong></div>
      <Link href="/">← Return to dashboard</Link>
    </header>
    <div className="page-shell admin-shell">
      <section className="admin-hero">
        <p className="kicker">DAILY SCORECARD</p>
        <h1>Upload. Review. <span>Approve.</span></h1>
        <p>The PDF is archived privately, then the four Southern New Jersey centers are extracted for your review before any dashboard number changes.</p>
      </section>
      <ScorecardUploader />
    </div>
  </main>;
}
