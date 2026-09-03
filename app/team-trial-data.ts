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

// Frozen from the dated August rows in each center's Trial Tracker. Keeping
// these results by reporting period prevents a new month's live MTD feed from
// rewriting the individual performance shown in history.
export const archivedTeamTrialData: Record<string, TeamTrialPerformance[]> = {
  "2026-07": teamTrialData,
  "2026-08": [
    { center: "Brick", person: "Emma", showRate: 85, closeRate: 44, booked: 67, closed: 25 },
    { center: "Brick", person: "Unc. SSU", showRate: 40, closeRate: 23, booked: 55, closed: 5 },
    { center: "Brick", person: "Ashley", showRate: 75, closeRate: 42, booked: 16, closed: 5 },
    { center: "Brick", person: "Jamie", showRate: 93, closeRate: 46, booked: 14, closed: 6 },
    { center: "Mount Laurel", person: "Sydney", showRate: 88, closeRate: 65, booked: 26, closed: 15 },
    { center: "Mount Laurel", person: "Jamie", showRate: 86, closeRate: 67, booked: 7, closed: 4 },
    { center: "Mount Laurel", person: "Unc. SSU", showRate: 35, closeRate: 25, booked: 46, closed: 4 },
    { center: "Mount Laurel", person: "Casey", showRate: 82, closeRate: 67, booked: 33, closed: 18 },
    { center: "Turnersville", person: "Unc. SSU", showRate: 19, closeRate: 17, booked: 31, closed: 1 },
    { center: "Turnersville", person: "Jackson", showRate: 85, closeRate: 48, booked: 34, closed: 14 },
    { center: "Turnersville", person: "Jose", showRate: 88, closeRate: 50, booked: 25, closed: 11 },
    { center: "Turnersville", person: "Evie", showRate: 0, closeRate: null, booked: 1, closed: 0 },
    { center: "Turnersville", person: "Jamie", showRate: 100, closeRate: 50, booked: 2, closed: 1 },
    { center: "Voorhees", person: "Curtis", showRate: 86, closeRate: 42, booked: 44, closed: 16 },
    { center: "Voorhees", person: "Marissa", showRate: 89, closeRate: 13, booked: 9, closed: 1 },
    { center: "Voorhees", person: "Unc. SSU", showRate: 41, closeRate: 42, booked: 29, closed: 5 },
    { center: "Voorhees", person: "Kate", showRate: 94, closeRate: 19, booked: 17, closed: 3 },
    { center: "Voorhees", person: "Evie", showRate: 100, closeRate: 100, booked: 1, closed: 1 },
    { center: "Voorhees", person: "Jackson", showRate: 100, closeRate: 0, booked: 5, closed: 0 },
  ],
};
