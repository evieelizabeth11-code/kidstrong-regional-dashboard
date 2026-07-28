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
    totalCalls: 1768,
    inboundCalls: 860,
    outboundCalls: 908,
    answeredCalls: 55,
    missedCalls: 133,
    voicemails: 88,
    totalMinutes: 2738.7,
    totalHours: 45.6,
    avgMinutes: 1.55,
  },
  {
    center: "Mount Laurel",
    totalCalls: 2025,
    inboundCalls: 657,
    outboundCalls: 1366,
    answeredCalls: 8,
    missedCalls: 106,
    voicemails: 88,
    totalMinutes: 2781.52,
    totalHours: 46.4,
    avgMinutes: 1.37,
  },
  {
    center: "Turnersville",
    totalCalls: 1657,
    inboundCalls: 627,
    outboundCalls: 1030,
    answeredCalls: 8,
    missedCalls: 179,
    voicemails: 66,
    totalMinutes: 2466.4,
    totalHours: 41.1,
    avgMinutes: 1.49,
  },
  {
    center: "Voorhees",
    totalCalls: 1712,
    inboundCalls: 749,
    outboundCalls: 963,
    answeredCalls: 70,
    missedCalls: 87,
    voicemails: 46,
    totalMinutes: 2416.13,
    totalHours: 40.3,
    avgMinutes: 1.41,
  },
];
