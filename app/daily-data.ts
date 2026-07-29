export type DailyCalls = {
  center: string;
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  answeredCalls: number;
  missedCalls: number;
  voicemails: number;
  totalMinutes: number;
};

export type DailyTrials = {
  center: string;
  scheduled: number;
  showed: number;
  closed: number;
};

export const yesterdayCalls: DailyCalls[] = [
  { center: "Brick", totalCalls: 117, inboundCalls: 35, outboundCalls: 82, answeredCalls: 12, missedCalls: 3, voicemails: 3, totalMinutes: 212.58 },
  { center: "Mount Laurel", totalCalls: 51, inboundCalls: 18, outboundCalls: 33, answeredCalls: 3, missedCalls: 2, voicemails: 1, totalMinutes: 39.77 },
  { center: "Turnersville", totalCalls: 27, inboundCalls: 17, outboundCalls: 10, answeredCalls: 4, missedCalls: 3, voicemails: 2, totalMinutes: 49.27 },
  { center: "Voorhees", totalCalls: 44, inboundCalls: 25, outboundCalls: 19, answeredCalls: 9, missedCalls: 1, voicemails: 0, totalMinutes: 144.5 },
];

export const yesterdayTrials: DailyTrials[] = [
  { center: "Brick", scheduled: 6, showed: 2, closed: 0 },
];
