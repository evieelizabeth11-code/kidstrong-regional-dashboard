export type DayRow = {
  day: string;
  scheduled: number;
  showed: number;
  closed: number;
};

export type ClassRow = {
  day: string;
  time: string;
  scheduled: number;
  showed: number;
  closed: number;
};

export type CenterReport = {
  id: string;
  center: string;
  month: string;
  dateRange: string;
  scheduled: number;
  showed: number;
  closed: number;
  days: DayRow[];
  classes: ClassRow[];
  strongest: string;
  opportunity: string;
  goldStandard: string;
};

export const reports: CenterReport[] = [
  {
    id: "brick",
    center: "Brick",
    month: "August 2026",
    dateRange: "August 1, 2026",
    scheduled: 8,
    showed: 3,
    closed: 0,
    strongest: "Friday led conversion with 6 closes and a 66.7% close rate.",
    opportunity: "Thursday carried 24 trials but closed only 3 of 17 attendees.",
    goldStandard: "Wednesday 4:30 PM - 100% show and 75% close.",
    days: [
      { day: "Monday", scheduled: 12, showed: 8, closed: 4 },
      { day: "Tuesday", scheduled: 14, showed: 10, closed: 3 },
      { day: "Wednesday", scheduled: 15, showed: 10, closed: 5 },
      { day: "Thursday", scheduled: 24, showed: 17, closed: 3 },
      { day: "Friday", scheduled: 14, showed: 9, closed: 6 },
      { day: "Saturday", scheduled: 16, showed: 10, closed: 4 },
      { day: "Sunday", scheduled: 26, showed: 18, closed: 4 },
    ],
    classes: [
      ["Monday", "4:15 PM", 1, 0, 0], ["Monday", "4:30 PM", 4, 4, 1],
      ["Monday", "5:15 PM", 3, 3, 2], ["Monday", "5:30 PM", 1, 1, 1],
      ["Monday", "6:15 PM", 1, 0, 0], ["Monday", "6:30 PM", 2, 0, 0],
      ["Tuesday", "9:15 AM", 3, 3, 1], ["Tuesday", "10:15 AM", 3, 3, 1],
      ["Tuesday", "4:15 PM", 1, 1, 0], ["Tuesday", "4:30 PM", 3, 2, 1],
      ["Tuesday", "5:15 PM", 2, 1, 0],
      ["Tuesday", "6:15 PM", 1, 0, 0], ["Tuesday", "6:30 PM", 1, 0, 0],
      ["Wednesday", "10:15 AM", 1, 1, 1],
      ["Wednesday", "3:30 PM", 1, 0, 0], ["Wednesday", "4:15 PM", 1, 0, 0],
      ["Wednesday", "4:30 PM", 4, 4, 3], ["Wednesday", "5:30 PM", 5, 4, 1],
      ["Wednesday", "6:15 PM", 2, 1, 0], ["Wednesday", "6:30 PM", 1, 0, 0],
      ["Thursday", "9:15 AM", 3, 2, 0], ["Thursday", "10:15 AM", 4, 3, 1],
      ["Thursday", "4:15 PM", 2, 1, 0], ["Thursday", "4:30 PM", 2, 1, 1],
      ["Thursday", "5:15 PM", 1, 0, 0], ["Thursday", "5:30 PM", 3, 2, 0],
      ["Thursday", "6:15 PM", 5, 4, 0], ["Thursday", "6:30 PM", 4, 4, 1],
      ["Friday", "4:15 PM", 4, 2, 2], ["Friday", "4:30 PM", 2, 2, 1],
      ["Friday", "5:15 PM", 2, 2, 0], ["Friday", "6:30 PM", 6, 3, 3],
      ["Saturday", "9:15 AM", 4, 3, 1], ["Saturday", "9:30 AM", 1, 1, 1],
      ["Saturday", "10:30 AM", 7, 2, 0], ["Saturday", "11:30 AM", 1, 1, 0],
      ["Saturday", "12:15 PM", 2, 2, 1], ["Saturday", "12:30 PM", 1, 1, 1],
      ["Sunday", "9:15 AM", 3, 2, 0], ["Sunday", "9:30 AM", 6, 6, 2],
      ["Sunday", "10:15 AM", 1, 1, 0], ["Sunday", "10:30 AM", 7, 5, 1],
      ["Sunday", "11:15 AM", 3, 1, 0], ["Sunday", "11:30 AM", 2, 1, 0],
      ["Sunday", "12:15 PM", 3, 1, 1], ["Sunday", "12:30 PM", 1, 1, 0],
    ].map(([day, time, scheduled, showed, closed]) => ({ day, time, scheduled, showed, closed })) as ClassRow[],
  },
  {
    id: "mount-laurel",
    center: "Mount Laurel",
    month: "August 2026",
    dateRange: "August 1, 2026",
    scheduled: 5,
    showed: 4,
    closed: 1,
    strongest: "Thursday posted the strongest show rate at 92.3%.",
    opportunity: "Saturday carried 30 trials and the largest missed opportunity.",
    goldStandard: "Sunday 11:15 AM - 83.3% show and 100% close with 5 closes.",
    days: [
      { day: "Monday", scheduled: 12, showed: 10, closed: 4 },
      { day: "Tuesday", scheduled: 7, showed: 6, closed: 3 },
      { day: "Wednesday", scheduled: 18, showed: 11, closed: 4 },
      { day: "Thursday", scheduled: 13, showed: 12, closed: 6 },
      { day: "Friday", scheduled: 6, showed: 4, closed: 4 },
      { day: "Saturday", scheduled: 30, showed: 20, closed: 9 },
      { day: "Sunday", scheduled: 17, showed: 12, closed: 8 },
    ],
    classes: [
      ["Monday", "9:15 AM", 2, 2, 1], ["Monday", "10:15 AM", 2, 2, 0],
      ["Monday", "11:15 AM", 1, 1, 0], ["Monday", "4:30 PM", 2, 1, 0],
      ["Monday", "5:15 PM", 1, 1, 0], ["Monday", "6:15 PM", 3, 2, 2],
      ["Monday", "6:30 PM", 1, 1, 1], ["Tuesday", "4:15 PM", 4, 4, 2],
      ["Tuesday", "5:15 PM", 1, 1, 0], ["Tuesday", "6:15 PM", 1, 0, 0],
      ["Tuesday", "6:30 PM", 1, 1, 1], ["Wednesday", "9:15 AM", 4, 2, 0],
      ["Wednesday", "3:30 PM", 3, 2, 1], ["Wednesday", "4:30 PM", 1, 0, 0],
      ["Wednesday", "5:15 PM", 4, 3, 1], ["Wednesday", "5:30 PM", 2, 2, 1],
      ["Wednesday", "6:15 PM", 2, 2, 1], ["Wednesday", "6:30 PM", 2, 0, 0],
      ["Thursday", "9:15 AM", 2, 2, 2], ["Thursday", "10:15 AM", 2, 2, 1],
      ["Thursday", "4:15 PM", 2, 1, 1], ["Thursday", "4:30 PM", 1, 1, 1],
      ["Thursday", "6:15 PM", 2, 2, 0], ["Thursday", "6:30 PM", 4, 4, 1],
      ["Friday", "9:15 AM", 1, 1, 1], ["Friday", "5:15 PM", 1, 1, 1],
      ["Friday", "6:15 PM", 4, 2, 2], ["Saturday", "8:30 AM", 5, 3, 0],
      ["Saturday", "9:15 AM", 3, 2, 1], ["Saturday", "9:30 AM", 5, 3, 3],
      ["Saturday", "10:15 AM", 1, 1, 0], ["Saturday", "10:30 AM", 5, 4, 1],
      ["Saturday", "11:15 AM", 1, 1, 0], ["Saturday", "11:30 AM", 2, 1, 1],
      ["Saturday", "12:15 PM", 3, 2, 1], ["Saturday", "12:30 PM", 2, 2, 1],
      ["Saturday", "1:15 PM", 3, 1, 1], ["Sunday", "9:15 AM", 2, 2, 1],
      ["Sunday", "9:30 AM", 1, 1, 0], ["Sunday", "10:15 AM", 1, 0, 0],
      ["Sunday", "10:30 AM", 3, 2, 1], ["Sunday", "11:15 AM", 6, 5, 5],
      ["Sunday", "11:30 AM", 1, 0, 0], ["Sunday", "12:15 PM", 1, 1, 1],
      ["Sunday", "12:30 PM", 2, 1, 0],
    ].map(([day, time, scheduled, showed, closed]) => ({ day, time, scheduled, showed, closed })) as ClassRow[],
  },
  {
    id: "voorhees",
    center: "Voorhees",
    month: "August 2026",
    dateRange: "August 1, 2026",
    scheduled: 4,
    showed: 3,
    closed: 1,
    strongest: "Wednesday led with 80.0% show and 62.5% close.",
    opportunity: "Saturday held 28 trials but closed at 50.0%.",
    goldStandard: "Monday 10:15 AM and Sunday 11:15 AM both delivered 100% show and 75% close.",
    days: [
      { day: "Monday", scheduled: 17, showed: 10, closed: 7 },
      { day: "Tuesday", scheduled: 14, showed: 8, closed: 4 },
      { day: "Wednesday", scheduled: 10, showed: 8, closed: 5 },
      { day: "Thursday", scheduled: 12, showed: 7, closed: 3 },
      { day: "Friday", scheduled: 15, showed: 11, closed: 5 },
      { day: "Saturday", scheduled: 28, showed: 20, closed: 10 },
      { day: "Sunday", scheduled: 11, showed: 6, closed: 3 },
    ],
    classes: [
      ["Monday", "9:15 AM", 2, 2, 1], ["Monday", "10:15 AM", 4, 4, 3],
      ["Monday", "11:15 AM", 4, 1, 0], ["Monday", "4:15 PM", 1, 0, 0],
      ["Monday", "4:30 PM", 1, 1, 1], ["Monday", "5:15 PM", 1, 1, 1],
      ["Monday", "6:15 PM", 2, 0, 0], ["Monday", "6:30 PM", 2, 1, 1],
      ["Tuesday", "4:30 PM", 1, 0, 0], ["Tuesday", "5:15 PM", 6, 4, 2], ["Tuesday", "5:30 PM", 5, 3, 1],
      ["Tuesday", "6:15 PM", 1, 1, 1], ["Tuesday", "6:30 PM", 1, 0, 0],
      ["Wednesday", "8:15 AM", 5, 4, 2], ["Wednesday", "9:15 AM", 1, 1, 0],
      ["Wednesday", "5:15 PM", 2, 1, 1], ["Wednesday", "5:30 PM", 1, 1, 1],
      ["Wednesday", "6:30 PM", 1, 1, 1], ["Thursday", "9:15 AM", 1, 0, 0],
      ["Thursday", "10:15 AM", 1, 0, 0], ["Thursday", "4:15 PM", 1, 0, 0],
      ["Thursday", "5:30 PM", 5, 4, 1], ["Thursday", "6:30 PM", 4, 3, 2],
      ["Friday", "9:15 AM", 4, 4, 1], ["Friday", "5:15 PM", 3, 1, 1],
      ["Friday", "6:15 PM", 8, 6, 3], ["Saturday", "8:15 AM", 4, 3, 0],
      ["Saturday", "9:15 AM", 6, 4, 3], ["Saturday", "9:30 AM", 2, 1, 1],
      ["Saturday", "10:15 AM", 4, 4, 2], ["Saturday", "10:30 AM", 5, 5, 2],
      ["Saturday", "11:15 AM", 3, 2, 2], ["Saturday", "11:30 AM", 2, 0, 0],
      ["Saturday", "12:15 PM", 2, 1, 0], ["Sunday", "9:15 AM", 1, 1, 0],
      ["Sunday", "10:15 AM", 1, 0, 0], ["Sunday", "10:30 AM", 1, 0, 0],
      ["Sunday", "11:15 AM", 4, 4, 3], ["Sunday", "11:30 AM", 2, 0, 0],
      ["Sunday", "12:30 PM", 2, 1, 0],
    ].map(([day, time, scheduled, showed, closed]) => ({ day, time, scheduled, showed, closed })) as ClassRow[],
  },
  {
    id: "turnersville",
    center: "Turnersville",
    month: "August 2026",
    dateRange: "August 1, 2026",
    scheduled: 4,
    showed: 1,
    closed: 1,
    strongest: "Wednesday led with a 93.8% show rate and 73.3% close rate.",
    opportunity: "Weekend mornings are the biggest opportunity, especially Saturday.",
    goldStandard: "Wednesday 4:30 PM and 6:30 PM both delivered 100% show and 100% close.",
    days: [
      { day: "Monday", scheduled: 12, showed: 6, closed: 3 },
      { day: "Tuesday", scheduled: 7, showed: 4, closed: 4 },
      { day: "Wednesday", scheduled: 16, showed: 15, closed: 11 },
      { day: "Thursday", scheduled: 10, showed: 9, closed: 4 },
      { day: "Friday", scheduled: 4, showed: 3, closed: 2 },
      { day: "Saturday", scheduled: 12, showed: 7, closed: 2 },
      { day: "Sunday", scheduled: 12, showed: 6, closed: 2 },
    ],
    classes: [
      ["Monday", "9:15 AM", 4, 2, 1], ["Monday", "10:15 AM", 3, 2, 1],
      ["Monday", "4:30 PM", 1, 0, 0], ["Monday", "5:15 PM", 1, 1, 1],
      ["Tuesday", "4:15 PM", 1, 1, 1], ["Tuesday", "5:15 PM", 2, 1, 1], ["Tuesday", "5:30 PM", 1, 0, 0],
      ["Tuesday", "6:15 PM", 1, 1, 1], ["Tuesday", "6:30 PM", 2, 1, 1],
      ["Wednesday", "10:15 AM", 4, 4, 2], ["Wednesday", "4:15 PM", 1, 1, 1],
      ["Wednesday", "4:30 PM", 4, 4, 4], ["Wednesday", "6:15 PM", 1, 1, 0],
      ["Wednesday", "6:30 PM", 4, 4, 4], ["Thursday", "9:15 AM", 3, 3, 1],
      ["Thursday", "5:15 PM", 2, 2, 0], ["Thursday", "5:30 PM", 1, 1, 1],
      ["Thursday", "6:15 PM", 3, 3, 1], ["Friday", "9:15 AM", 2, 2, 1],
      ["Friday", "4:30 PM", 1, 1, 1], ["Friday", "5:30 PM", 1, 0, 0],
      ["Saturday", "8:30 AM", 1, 1, 1], ["Saturday", "9:15 AM", 4, 2, 0],
      ["Saturday", "10:15 AM", 2, 1, 0], ["Saturday", "11:15 AM", 1, 0, 0],
      ["Saturday", "11:30 AM", 2, 2, 1], ["Saturday", "12:15 PM", 2, 1, 0],
      ["Sunday", "10:15 AM", 3, 1, 1], ["Sunday", "10:30 AM", 3, 3, 1],
      ["Sunday", "11:30 AM", 1, 0, 0], ["Sunday", "12:15 PM", 2, 0, 0],
      ["Sunday", "4:15 PM", 1, 0, 0],
    ].map(([day, time, scheduled, showed, closed]) => ({ day, time, scheduled, showed, closed })) as ClassRow[],
  },
];
