import { notFound } from "next/navigation";
import { reports } from "../../trial-data";
import CenterDetail from "./CenterDetail";

export default async function CenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!reports.some((report) => report.id === id)) notFound();
  return <CenterDetail centerId={id} />;
}
