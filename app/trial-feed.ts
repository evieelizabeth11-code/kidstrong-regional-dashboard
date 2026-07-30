import type { CenterReport } from "./trial-data";

export type TrialSourceComparison = {
  center: string;
  official: { scheduled: number; showed: number; closed: number };
  tracker: { scheduled: number; showed: number; closed: number };
};

const valuesFor = (row: string) =>
  row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());

const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const parseDays = (payload = "") =>
  payload.split(";").map((entry) => {
    const [day, scheduled, showed, closed] = entry.split("|");
    return { day, scheduled: Number(scheduled), showed: Number(showed), closed: Number(closed) };
  }).filter((row) => dayOrder.includes(row.day));

const timeValue = (time: string) => {
  const match = time.match(/^(\d+):(\d+)\s+(AM|PM)$/);
  if (!match) return 0;
  const hour = (Number(match[1]) % 12) + (match[3] === "PM" ? 12 : 0);
  return hour * 60 + Number(match[2]);
};

const parseClasses = (payload = "") =>
  payload.split(";").map((entry) => {
    const [day, time, scheduled, showed, closed] = entry.split("|");
    return { day, time, scheduled: Number(scheduled), showed: Number(showed), closed: Number(closed) };
  }).filter((row) => dayOrder.includes(row.day) && row.time)
    .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || timeValue(a.time) - timeValue(b.time));

export function mergeOfficialTrialFeed(base: CenterReport[], rows: string[]) {
  const live = new Map(
    rows.map(valuesFor).map((values) => [
      values[0],
      {
        scheduled: Number(values[28]),
        showed: Number(values[29]),
        closed: Number(values[30]),
        days: parseDays(values[34]),
        classes: parseClasses(values[35]),
      },
    ]),
  );

  return base.map((report) => {
    const official = live.get(report.center);
    if (!official || !official.scheduled) return report;
    return {
      ...report,
      scheduled: official.scheduled,
      showed: official.showed,
      closed: official.closed,
      days: official.days.length ? official.days : report.days,
      classes: official.classes.length ? official.classes : report.classes,
    };
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
