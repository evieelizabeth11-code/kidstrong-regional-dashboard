export type CenterCalls = {
  center: string;
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  answeredCalls: number;
  missedCalls: number;
  voicemails: number;
  totalMinutes: number;
  totalHours: number;
  avgMinutes: number;
};

export const callData: CenterCalls[] = [
  {
    center: "Brick",
    totalCalls: 0, inboundCalls: 0, outboundCalls: 0, answeredCalls: 0, missedCalls: 0, voicemails: 0, totalMinutes: 0, totalHours: 0, avgMinutes: 0,
  },
  {
    center: "Mount Laurel",
    totalCalls: 0, inboundCalls: 0, outboundCalls: 0, answeredCalls: 0, missedCalls: 0, voicemails: 0, totalMinutes: 0, totalHours: 0, avgMinutes: 0,
  },
  {
    center: "Turnersville",
    totalCalls: 0, inboundCalls: 0, outboundCalls: 0, answeredCalls: 0, missedCalls: 0, voicemails: 0, totalMinutes: 0, totalHours: 0, avgMinutes: 0,
  },
  {
    center: "Voorhees",
    totalCalls: 0, inboundCalls: 0, outboundCalls: 0, answeredCalls: 0, missedCalls: 0, voicemails: 0, totalMinutes: 0, totalHours: 0, avgMinutes: 0,
  },
];

export function mergeCallFeedRows(base: CenterCalls[], rows: string[]): CenterCalls[] {
  const additions = new Map(
    rows.map((row) => {
      const values = row.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
      return [values[0], values.slice(15, 22)] as const;
    }),
  );

  return base.map((item) => {
    const added = additions.get(item.center);
    if (!added || added.length < 7) return item;
    const numeric = added.map(Number);
    if ([0, 1, 2, 4, 5, 6].some((index) => !Number.isFinite(numeric[index]))) return item;
    const totalCalls = item.totalCalls + numeric[0];
    const totalMinutes = item.totalMinutes + numeric[6];
    return {
      ...item,
      totalCalls,
      inboundCalls: item.inboundCalls + numeric[1],
      outboundCalls: item.outboundCalls + numeric[2],
      missedCalls: item.missedCalls + numeric[4],
      voicemails: item.voicemails + numeric[5],
      totalMinutes,
      totalHours: totalMinutes / 60,
      avgMinutes: totalCalls ? totalMinutes / totalCalls : 0,
    };
  });
}
