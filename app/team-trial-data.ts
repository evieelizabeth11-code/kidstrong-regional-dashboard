export type TeamTrialPerformance = {
  center: string;
  person: string;
  showRate: number | null;
  closeRate: number | null;
  booked: number;
  closed: number;
};

export const teamTrialData: TeamTrialPerformance[] = [
  { center: "Voorhees", person: "Unc. SSU", showRate: 44, closeRate: 45, booked: 39, closed: 5 },
  { center: "Voorhees", person: "Evie", showRate: null, closeRate: null, booked: 0, closed: 0 },
  { center: "Voorhees", person: "Curtis", showRate: 84, closeRate: 48, booked: 37, closed: 11 },
  { center: "Voorhees", person: "Kate", showRate: 90, closeRate: 43, booked: 10, closed: 3 },
  { center: "Voorhees", person: "Marissa", showRate: 84, closeRate: 59, booked: 49, closed: 17 },
];
