export type CenterMembership = {
  center: string;
  totalMembers: number;
  bomApm: number;
  holds: {
    total: number;
    scheduled: number | null;
    lifting: number;
    starting: number | null;
  };
  drops: {
    total: number;
    pending: number;
  };
  signups: {
    goal: number;
    current: number;
  };
  pastDue: number;
};

export const membershipData: CenterMembership[] = [
  {
    center: "Mount Laurel",
    totalMembers: 477,
    bomApm: 396,
    holds: { total: 61, scheduled: null, lifting: 1, starting: 4 },
    drops: { total: 26, pending: 3 },
    signups: { goal: 36, current: 43 },
    pastDue: 16,
  },
  {
    center: "Voorhees",
    totalMembers: 485,
    bomApm: 407,
    holds: { total: 67, scheduled: null, lifting: 0, starting: null },
    drops: { total: 34, pending: 7 },
    signups: { goal: 51, current: 44 },
    pastDue: 19,
  },
];
