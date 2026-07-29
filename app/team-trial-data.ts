export type TeamTrialPerformance = {
  center: string;
  person: string;
  showRate: number | null;
  closeRate: number | null;
  booked: number;
  closed: number;
};

export const teamTrialData: TeamTrialPerformance[] = [
  { center: "Brick", person: "Unc. SSU", showRate: 44, closeRate: 36, booked: 32, closed: 5 },
  { center: "Brick", person: "Ashley", showRate: 86, closeRate: 33, booked: 36, closed: 9 },
  { center: "Brick", person: "Phillip", showRate: 100, closeRate: 42, booked: 12, closed: 5 },
  { center: "Brick", person: "Emma", showRate: 85, closeRate: 40, booked: 46, closed: 8 },
  { center: "Turnersville", person: "Unc. SSU", showRate: 52, closeRate: 20, booked: 29, closed: 1 },
  { center: "Turnersville", person: "Jose", showRate: 86, closeRate: 67, booked: 35, closed: 18 },
  { center: "Turnersville", person: "Jackson", showRate: 85, closeRate: 50, booked: 26, closed: 9 },
  { center: "Mount Laurel", person: "Unc. SSU", showRate: 62, closeRate: 34, booked: 58, closed: 10 },
  { center: "Mount Laurel", person: "Casey", showRate: 95, closeRate: 70, booked: 22, closed: 14 },
  { center: "Mount Laurel", person: "Jamie", showRate: 77, closeRate: 29, booked: 13, closed: 2 },
  { center: "Mount Laurel", person: "Sydney", showRate: 92, closeRate: 70, booked: 26, closed: 14 },
  { center: "Voorhees", person: "Unc. SSU", showRate: 43, closeRate: 45, booked: 40, closed: 5 },
  { center: "Voorhees", person: "Curtis", showRate: 84, closeRate: 48, booked: 37, closed: 11 },
  { center: "Voorhees", person: "Kate", showRate: 90, closeRate: 43, booked: 10, closed: 3 },
  { center: "Voorhees", person: "Marissa", showRate: 84, closeRate: 60, booked: 50, closed: 18 },
];
