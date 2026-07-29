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
    totalCalls: 1885,
    inboundCalls: 895,
    outboundCalls: 990,
    answeredCalls: 67,
    missedCalls: 136,
    voicemails: 91,
    totalMinutes: 2951.28,
    totalHours: 49.2,
    avgMinutes: 1.57,
  },
  {
    center: "Mount Laurel",
    totalCalls: 2076,
    inboundCalls: 675,
    outboundCalls: 1399,
    answeredCalls: 11,
    missedCalls: 108,
    voicemails: 89,
    totalMinutes: 2821.29,
    totalHours: 47,
    avgMinutes: 1.36,
  },
  {
    center: "Turnersville",
    totalCalls: 1684,
    inboundCalls: 644,
    outboundCalls: 1040,
    answeredCalls: 12,
    missedCalls: 182,
    voicemails: 68,
    totalMinutes: 2515.67,
    totalHours: 41.9,
    avgMinutes: 1.49,
  },
  {
    center: "Voorhees",
    totalCalls: 1756,
    inboundCalls: 774,
    outboundCalls: 982,
    answeredCalls: 79,
    missedCalls: 88,
    voicemails: 46,
    totalMinutes: 2560.63,
    totalHours: 42.7,
    avgMinutes: 1.46,
  },
];
