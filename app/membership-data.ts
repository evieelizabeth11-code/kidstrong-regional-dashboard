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
    center: "Brick",
    totalMembers: 605,
    bomApm: 545,
    holds: { total: 53, scheduled: null, lifting: 0, starting: 6 },
    drops: { total: 26, pending: 0 },
    signups: { goal: 60, current: 31 },
    pastDue: 13,
  },
  {
    center: "Turnersville",
    totalMembers: 496,
    bomApm: 445,
    holds: { total: 35, scheduled: null, lifting: 1, starting: 2 },
    drops: { total: 46, pending: 1 },
    signups: { goal: 50, current: 33 },
    pastDue: 12,
  },
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
