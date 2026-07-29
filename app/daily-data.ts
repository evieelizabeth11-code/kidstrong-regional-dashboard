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

export type DailyPersonCalls = {
  center: string;
  person: string;
  totalMinutes: number;
  totalCalls: number;
};

export const yesterdayCalls: DailyCalls[] = [
  { center: "Brick", totalCalls: 117, inboundCalls: 35, outboundCalls: 82, answeredCalls: 12, missedCalls: 3, voicemails: 3, totalMinutes: 212.58 },
  { center: "Mount Laurel", totalCalls: 51, inboundCalls: 18, outboundCalls: 33, answeredCalls: 3, missedCalls: 2, voicemails: 1, totalMinutes: 39.77 },
  { center: "Turnersville", totalCalls: 27, inboundCalls: 17, outboundCalls: 10, answeredCalls: 4, missedCalls: 3, voicemails: 2, totalMinutes: 49.27 },
  { center: "Voorhees", totalCalls: 44, inboundCalls: 25, outboundCalls: 19, answeredCalls: 9, missedCalls: 1, voicemails: 0, totalMinutes: 144.5 },
];

export const yesterdayTrials: DailyTrials[] = [
  { center: "Brick", scheduled: 6, showed: 2, closed: 0 },
  { center: "Mount Laurel", scheduled: 2, showed: 2, closed: 2 },
];

export const yesterdayPersonCalls: DailyPersonCalls[] = [
  { center: "Brick", person: "Sydney Sventy", totalMinutes: 87.05, totalCalls: 45 },
  { center: "Brick", person: "Emma Gelsleichter", totalMinutes: 55.65, totalCalls: 25 },
  { center: "Brick", person: "Ashley Reinecke", totalMinutes: 40.45, totalCalls: 18 },
  { center: "Brick", person: "Shared / unassigned", totalMinutes: 20.87, totalCalls: 14 },
  { center: "Brick", person: "Casey Vineyard", totalMinutes: 8.57, totalCalls: 9 },
  { center: "Mount Laurel", person: "Casey Vineyard", totalMinutes: 37.2, totalCalls: 36 },
  { center: "Mount Laurel", person: "Shared / unassigned", totalMinutes: 2.57, totalCalls: 6 },
  { center: "Turnersville", person: "Jose Ledezma Jr", totalMinutes: 41.08, totalCalls: 10 },
  { center: "Turnersville", person: "Shared / unassigned", totalMinutes: 8.18, totalCalls: 9 },
  { center: "Voorhees", person: "Curtis Schofield", totalMinutes: 69.83, totalCalls: 7 },
  { center: "Voorhees", person: "Marissa Baker", totalMinutes: 68.77, totalCalls: 22 },
  { center: "Voorhees", person: "Shared / unassigned", totalMinutes: 5.9, totalCalls: 7 },
];
