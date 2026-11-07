export const ranges = [
  { value: "3m", label: "Last 3 months" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
] as const;

export type Range = (typeof ranges)[number]["value"];

export interface Visitors {
  readonly labels: ReadonlyArray<string>;
  readonly values: ReadonlyArray<number>;
  readonly mobile: ReadonlyArray<number>;
  readonly total: string;
  readonly change: string;
}

const LABELS: ReadonlyArray<string> = [
  "Apr 1",
  "Apr 2",
  "Apr 3",
  "Apr 4",
  "Apr 5",
  "Apr 6",
  "Apr 7",
  "Apr 8",
  "Apr 9",
  "Apr 10",
  "Apr 11",
  "Apr 12",
  "Apr 13",
  "Apr 14",
  "Apr 15",
  "Apr 16",
  "Apr 17",
  "Apr 18",
  "Apr 19",
  "Apr 20",
  "Apr 21",
  "Apr 22",
  "Apr 23",
  "Apr 24",
  "Apr 25",
  "Apr 26",
  "Apr 27",
  "Apr 28",
  "Apr 29",
  "Apr 30",
  "May 1",
  "May 2",
  "May 3",
  "May 4",
  "May 5",
  "May 6",
  "May 7",
  "May 8",
  "May 9",
  "May 10",
  "May 11",
  "May 12",
  "May 13",
  "May 14",
  "May 15",
  "May 16",
  "May 17",
  "May 18",
  "May 19",
  "May 20",
  "May 21",
  "May 22",
  "May 23",
  "May 24",
  "May 25",
  "May 26",
  "May 27",
  "May 28",
  "May 29",
  "May 30",
  "May 31",
  "Jun 1",
  "Jun 2",
  "Jun 3",
  "Jun 4",
  "Jun 5",
  "Jun 6",
  "Jun 7",
  "Jun 8",
  "Jun 9",
  "Jun 10",
  "Jun 11",
  "Jun 12",
  "Jun 13",
  "Jun 14",
  "Jun 15",
  "Jun 16",
  "Jun 17",
  "Jun 18",
  "Jun 19",
  "Jun 20",
  "Jun 21",
  "Jun 22",
  "Jun 23",
  "Jun 24",
  "Jun 25",
  "Jun 26",
  "Jun 27",
  "Jun 28",
  "Jun 29",
  "Jun 30",
];
const DESKTOP: ReadonlyArray<number> = [
  222, 97, 167, 242, 373, 301, 245, 409, 59, 261, 327, 292, 342, 137, 120, 138,
  446, 364, 243, 89, 137, 224, 138, 387, 215, 75, 383, 122, 315, 454, 165, 293,
  247, 385, 481, 498, 388, 149, 227, 293, 335, 197, 197, 448, 473, 338, 499,
  315, 235, 177, 82, 81, 252, 294, 201, 213, 420, 233, 78, 340, 178, 178, 470,
  103, 439, 88, 294, 323, 385, 438, 155, 92, 492, 81, 426, 307, 371, 475, 107,
  341, 408, 169, 317, 480, 132, 141, 434, 448, 149, 103, 446,
];
const MOBILE: ReadonlyArray<number> = [
  150, 180, 120, 260, 290, 340, 180, 320, 110, 190, 350, 210, 380, 220, 170,
  190, 360, 410, 180, 150, 200, 170, 230, 290, 250, 130, 420, 180, 240, 380,
  220, 310, 190, 420, 390, 520, 300, 210, 180, 330, 270, 240, 160, 490, 380,
  400, 420, 350, 180, 230, 140, 120, 290, 220, 250, 170, 460, 190, 130, 280,
  230, 200, 410, 160, 380, 140, 250, 370, 320, 480, 200, 150, 420, 130, 380,
  350, 310, 520, 170, 290, 450, 210, 270, 530, 180, 190, 380, 490, 200, 160,
  400,
];

const lastDays = (days: number, total: string, change: string): Visitors => ({
  labels: LABELS.slice(-days),
  values: DESKTOP.slice(-days),
  mobile: MOBILE.slice(-days),
  total,
  change,
});

export const visitors: Readonly<Record<Range, Visitors>> = {
  "3m": lastDays(LABELS.length, "18,412", "+12.5%"),
  "30d": lastDays(30, "6,238", "+6.1%"),
  "7d": lastDays(7, "1,598", "+2.8%"),
};

/** Where the traffic came from, the path through to paid, and the device mix. */
export const sources = [
  { path: "Organic", value: 42 },
  { path: "Direct", value: 26 },
  { path: "Referral", value: 18 },
  { path: "Social", value: 14 },
] as const;

export const funnel = {
  labels: ["Visits", "Trials", "Paid"],
  stages: [100, 60, 24],
} as const;

export const devices = [
  { key: "desktop", label: "Desktop", value: 54 },
  { key: "mobile", label: "Mobile", value: 34 },
  { key: "tablet", label: "Tablet", value: 12 },
] as const;

export interface Tile {
  readonly label: string;
  readonly value: string;
  readonly change: string;
  /** The tile's badge: a movement reads up or down, a rate reads flat. */
  readonly direction: "up" | "down" | "flat";
  readonly line: string;
  readonly note: string;
}

export const tiles: ReadonlyArray<Tile> = [
  {
    label: "Total Revenue",
    value: "$1,250.00",
    change: "+12.5%",
    direction: "up",
    line: "Trending up this month",
    note: "Visitors for the last 6 months",
  },
  {
    label: "New Customers",
    value: "1,234",
    change: "-20%",
    direction: "down",
    line: "Down 20% this period",
    note: "Acquisition needs attention",
  },
  {
    label: "Active Accounts",
    value: "45,678",
    change: "+12.5%",
    direction: "up",
    line: "Strong user retention",
    note: "Engagement exceeds targets",
  },
  {
    label: "Growth Rate",
    value: "4.5%",
    change: "+4.5%",
    direction: "flat",
    line: "Steady performance increase",
    note: "Meets growth projections",
  },
];

export const tabs = [
  { value: "outline", label: "Outline" },
  { value: "past", label: "Past Performance" },
  { value: "people", label: "Key Personnel" },
  { value: "focus", label: "Focus Documents" },
] as const;

export type Tab = (typeof tabs)[number]["value"];

export type Status = "In Process" | "Done";

export interface Row {
  readonly header: string;
  readonly section: string;
  readonly status: Status;
  readonly target: number;
  readonly limit: number;
  readonly reviewer: string;
}

export const rows: Readonly<Record<Tab, ReadonlyArray<Row>>> = {
  outline: [
    {
      header: "Cover page",
      section: "Cover page",
      status: "In Process",
      target: 18,
      limit: 5,
      reviewer: "Eddie Lake",
    },
    {
      header: "Table of contents",
      section: "Table of contents",
      status: "Done",
      target: 29,
      limit: 24,
      reviewer: "Eddie Lake",
    },
    {
      header: "Executive summary",
      section: "Narrative",
      status: "Done",
      target: 10,
      limit: 13,
      reviewer: "Eddie Lake",
    },
    {
      header: "Technical approach",
      section: "Narrative",
      status: "In Process",
      target: 15,
      limit: 8,
      reviewer: "Jamik Tashpulatov",
    },
    {
      header: "Design",
      section: "Design",
      status: "Done",
      target: 12,
      limit: 6,
      reviewer: "Jamik Tashpulatov",
    },
  ],
  past: [
    {
      header: "Lumen observation deck",
      section: "Case study",
      status: "Done",
      target: 24,
      limit: 18,
      reviewer: "Eddie Lake",
    },
    {
      header: "Harbour transit authority",
      section: "Case study",
      status: "Done",
      target: 21,
      limit: 19,
      reviewer: "Jamik Tashpulatov",
    },
    {
      header: "Regional grid retrofit",
      section: "Reference",
      status: "In Process",
      target: 16,
      limit: 9,
      reviewer: "Eddie Lake",
    },
  ],
  people: [
    {
      header: "Eddie Lake",
      section: "Principal",
      status: "Done",
      target: 32,
      limit: 32,
      reviewer: "Eddie Lake",
    },
    {
      header: "Jamik Tashpulatov",
      section: "Engineering",
      status: "Done",
      target: 28,
      limit: 28,
      reviewer: "Eddie Lake",
    },
    {
      header: "Sofia Lindqvist",
      section: "Design",
      status: "In Process",
      target: 19,
      limit: 21,
      reviewer: "Eddie Lake",
    },
    {
      header: "Noah Whitfield",
      section: "Delivery",
      status: "In Process",
      target: 14,
      limit: 12,
      reviewer: "Eddie Lake",
    },
  ],
  focus: [
    {
      header: "Retention mechanics",
      section: "Focus document",
      status: "In Process",
      target: 9,
      limit: 14,
      reviewer: "Sofia Lindqvist",
    },
    {
      header: "Pricing model",
      section: "Focus document",
      status: "Done",
      target: 17,
      limit: 17,
      reviewer: "Eddie Lake",
    },
  ],
};

/** The primary sidebar's rows, and the documents group's. */
export const navigation = [
  { icon: "grid", label: "Dashboard" },
  { icon: "sparkles", label: "Lifecycle" },
  { icon: "list", label: "Analytics" },
  { icon: "folder", label: "Projects" },
  { icon: "users", label: "Team" },
] as const;

export const documents = [
  { icon: "database", label: "Data Library" },
  { icon: "file-text", label: "Reports" },
  { icon: "bot", label: "Word Assistant" },
] as const;
