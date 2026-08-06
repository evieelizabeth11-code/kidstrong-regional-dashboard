import type { Metadata } from "next";
import ForecastDashboard from "./ForecastDashboard";

export const metadata: Metadata = {
  title: "Membership Forecast | KidStrong Regional Dashboard",
  description: "Live membership milestone forecasts for the Southern New Jersey centers.",
};

export default function ForecastPage() {
  return <ForecastDashboard />;
}
