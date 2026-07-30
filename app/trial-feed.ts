import type { CenterReport } from "./trial-data";

export type TrialSourceComparison = {
  center: string;
  official: { scheduled: number; showed: number; closed: number };
  tracker: { scheduled: number; showed: number; closed: number };
};

const valuesFor = (row: string) =>
  row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());

export function mergeOfficialTrialFeed(base: CenterReport[], rows: string[]) {
  const live = new Map(
    rows.map(valuesFor).map((values) => [
      values[0],
      {
        scheduled: Number(values[28]),
        showed: Number(values[29]),
        closed: Number(values[30]),
      },
    ]),
  );

  return base.map((report) => {
    const official = live.get(report.center);
    if (!official || !official.scheduled) return report;
    return { ...report, ...official };
  });
}

export function trialSourceComparisons(rows: string[]): TrialSourceComparison[] {
  return rows
    .map(valuesFor)
    .map((values) => ({
      center: values[0],
      official: {
        scheduled: Number(values[28]),
        showed: Number(values[29]),
        closed: Number(values[30]),
      },
      tracker: {
        scheduled: Number(values[31]),
        showed: Number(values[32]),
        closed: Number(values[33]),
      },
    }))
    .filter((item) => item.center && item.official.scheduled > 0);
}
