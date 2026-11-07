export const stages = ["Idea", "Spec", "Build", "Review", "Shipped"] as const;
export type Stage = (typeof stages)[number];

export const projects = [
  "Hunter Exam",
  "Greed Island",
  "Heavens Arena",
] as const;
export type Project = (typeof projects)[number];

export interface WorkItem {
  readonly id: string;
  readonly title: string;
  readonly stage: Stage;
  readonly project: Project;
  readonly owner: string;

  readonly due: string;
  readonly estimate: number;
  readonly activity: ReadonlyArray<string>;
}

export const viewer = "Gon Freecss";

const item = (
  id: string,
  title: string,
  stage: Stage,
  project: Project,
  owner: string,
  due: string,
  estimate: number,
  activity: ReadonlyArray<string> = [],
): WorkItem => ({ id, title, stage, project, owner, due, estimate, activity });

export const work: ReadonlyArray<WorkItem> = [
  item(
    "w1",
    "Offline sync for drafts",
    "Build",
    "Greed Island",
    "Gon Freecss",
    "2026-11-12",
    5,
    ["Killua reviewed the sync queue", "Gon moved this to Build"],
  ),
  item(
    "w2",
    "Retry failed card payments",
    "Review",
    "Heavens Arena",
    "Leorio Paradinight",
    "2026-11-04",
    3,
    ["Bisky asked for an idempotency key"],
  ),
  item(
    "w3",
    "License photo upload",
    "Spec",
    "Hunter Exam",
    "Kurapika",
    "2026-11-20",
    2,
  ),
  item(
    "w4",
    "Exam timetable export",
    "Idea",
    "Hunter Exam",
    "Netero",
    "2026-12-01",
    1,
  ),
  item(
    "w5",
    "Card binder search",
    "Build",
    "Greed Island",
    "Killua Zoldyck",
    "2026-11-08",
    5,
    ["Killua split the index build"],
  ),
  item(
    "w6",
    "Floor ranking API",
    "Shipped",
    "Heavens Arena",
    "Gon Freecss",
    "2026-10-21",
    3,
  ),
  item(
    "w7",
    "Two-factor for examiners",
    "Review",
    "Hunter Exam",
    "Kurapika",
    "2026-11-03",
    3,
  ),
  item(
    "w8",
    "Spell card animations",
    "Spec",
    "Greed Island",
    "Bisky Krueger",
    "2026-11-26",
    8,
  ),
  item(
    "w9",
    "Arena seat map",
    "Idea",
    "Heavens Arena",
    "Leorio Paradinight",
    "2026-12-10",
    5,
  ),
  item(
    "w10",
    "Applicant waitlist",
    "Build",
    "Hunter Exam",
    "Gon Freecss",
    "2026-11-15",
    3,
  ),
  item(
    "w11",
    "Trade history ledger",
    "Shipped",
    "Greed Island",
    "Killua Zoldyck",
    "2026-10-18",
    5,
  ),
  item(
    "w12",
    "Fight replay viewer",
    "Build",
    "Heavens Arena",
    "Bisky Krueger",
    "2026-11-18",
    8,
  ),
  item(
    "w13",
    "Examiner notes sync",
    "Spec",
    "Hunter Exam",
    "Netero",
    "2026-11-22",
    2,
  ),
  item(
    "w14",
    "Dark mode for the binder",
    "Shipped",
    "Greed Island",
    "Gon Freecss",
    "2026-10-25",
    1,
  ),
  item(
    "w15",
    "Prize payout report",
    "Review",
    "Heavens Arena",
    "Leorio Paradinight",
    "2026-11-06",
    2,
  ),
  item(
    "w16",
    "Applicant check-in kiosk",
    "Idea",
    "Hunter Exam",
    "Kurapika",
    "2026-12-04",
    5,
  ),
  item(
    "w17",
    "Map fog reveal",
    "Build",
    "Greed Island",
    "Killua Zoldyck",
    "2026-11-10",
    3,
  ),
  item(
    "w18",
    "Ticket refunds",
    "Shipped",
    "Heavens Arena",
    "Netero",
    "2026-10-14",
    2,
  ),
];
