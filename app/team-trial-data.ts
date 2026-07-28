export type TeamTrialPerformance = {
  center: string;
  person: string;
  showRate: number | null;
  closeRate: number | null;
  booked: number;
  closed: number;
};

export const teamTrialData: TeamTrialPerformance[] = [
  { center: "Mount Laurel", person: "Unc. SSU", showRate: 62, closeRate: 34, booked: 58, closed: 10 },
  { center: "Mount Laurel", person: "Casey", showRate: 95, closeRate: 68, booked: 21, closed: 13 },
  { center: "Mount Laurel", person: "Jamie", showRate: 77, closeRate: 29, booked: 13, closed: 2 },
  { center: "Mount Laurel", person: "Sydney", showRate: 92, closeRate: 68, booked: 25, closed: 13 },
  { center: "Voorhees", person: "Unc. SSU", showRate: 44, closeRate: 45, booked: 39, closed: 5 },
  { center: "Voorhees", person: "Curtis", showRate: 84, closeRate: 48, booked: 37, closed: 11 },
  { center: "Voorhees", person: "Kate", showRate: 90, closeRate: 43, booked: 10, closed: 3 },
  { center: "Voorhees", person: "Marissa", showRate: 84, closeRate: 59, booked: 49, closed: 17 },
];
