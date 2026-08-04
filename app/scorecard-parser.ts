export type ScorecardRow = {
  center: string; activePayingMembers: number; activePayerNetGain: number; membershipRevenue: number; totalRevenue: number; churnRate: number;
  salesMtd: number; totalDropsMtd: number; leadsMtd: number; leadToBooked: number; trialsBooked: number; totalTrialsBooked: number;
  trialsExpected: number; showRate: number; trialsAttended: number; salesFromTrial: number; salesNoTrial: number; winbacks: number; pendingDropsIgnored: number;
};
const CENTERS: Array<[string, string]> = [["ks_brick", "Brick"], ["ks_mount_laurel", "Mount Laurel"], ["ks_turnersville", "Turnersville"], ["ks_voorhees", "Voorhees"]];
export function parseScorecardText(rawText: string): ScorecardRow[] {
  const text = rawText.replace(/\r/g, "");
  const start = text.indexOf("MONTH-TO-DATE PERFORMANCE");
  const end = text.indexOf("YESTERDAY'S ACTIVITY", Math.max(0, start));
  if (start < 0 || end < 0) throw new Error("The PDF is missing its month-to-date performance section.");
  const section = text.slice(start, end);
  const rows = CENTERS.map(([key, center], index) => {
    const rowStart = section.indexOf(key);
    if (rowStart < 0) throw new Error(`${center} could not be found in the PDF.`);
    const nextKey = CENTERS[index + 1]?.[0];
    const rowEnd = nextKey ? section.indexOf(nextKey, rowStart + key.length) : section.length;
    const values = (section.slice(rowStart + key.length, rowEnd < 0 ? section.length : rowEnd).match(/-?\d[\d,]*(?:\.\d+)?%?/g) ?? []).slice(0, 18).map((v) => Number(v.replace(/[,％%]/g, "")));
    if (values.length !== 18 || values.some((v) => !Number.isFinite(v))) throw new Error(`${center} did not contain all 18 expected scorecard values.`);
    return { center, activePayingMembers: values[0], activePayerNetGain: values[1], membershipRevenue: values[2], totalRevenue: values[3], churnRate: values[4], salesMtd: values[5], totalDropsMtd: values[6], leadsMtd: values[7], leadToBooked: values[8], trialsBooked: values[9], totalTrialsBooked: values[10], trialsExpected: values[11], showRate: values[12], trialsAttended: values[13], salesFromTrial: values[14], salesNoTrial: values[15], winbacks: values[16], pendingDropsIgnored: values[17] };
  });
  for (const row of rows) {
    if (row.activePayingMembers < 100 || row.activePayingMembers > 2000) throw new Error(`${row.center}'s APM looks invalid.`);
    if (row.churnRate < 0 || row.churnRate > 100 || row.showRate < 0 || row.showRate > 100) throw new Error(`${row.center}'s percentage values look invalid.`);
    if (row.salesFromTrial > row.trialsAttended) throw new Error(`${row.center} has more trial signs than attended trials.`);
    if (row.salesFromTrial + row.salesNoTrial > row.salesMtd) throw new Error(`${row.center}'s signup totals do not reconcile.`);
    if (row.trialsExpected > 0 && Math.abs(row.trialsAttended / row.trialsExpected * 100 - row.showRate) > 0.8) throw new Error(`${row.center}'s show rate does not reconcile with attended trials.`);
  }
  return rows;
}
