import { notFound } from "next/navigation";
import { reports } from "../../../trial-data";
import CenterDetail from "../CenterDetail";
import ForecastDashboard from "../../../forecast/ForecastDashboard";

const sections = ["trials", "calls", "membership", "forecast"] as const;

export default async function CenterSectionPage({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params;
  if (!reports.some((report) => report.id === id) || !sections.includes(section as (typeof sections)[number])) notFound();
  if (section === "forecast") return <ForecastDashboard centerId={id} />;
  return <CenterDetail centerId={id} section={section as (typeof sections)[number]} />;
}
