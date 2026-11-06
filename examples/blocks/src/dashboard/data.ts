/**
 * The dashboard's content: the three visitor ranges, the four KPI tiles, and
 * the document rows each tab of the report holds.
 *
 * Numbers are the reference block's (shadcn's `dashboard-01` sample data), so
 * the screen reads as the block a consumer recognises rather than a mock.
 */

export const ranges = [
  { value: "3m", label: "Last 3 months" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
] as const;

export type Range = (typeof ranges)[number]["value"];

export interface Visitors {
  readonly labels: ReadonlyArray<string>;
  readonly values: ReadonlyArray<number>;
  /** The same days on phones, the second layer of the traffic chart. */
  readonly mobile: ReadonlyArray<number>;
  /** The period's total and its movement, printed under the chart's name. */
  readonly total: string;
  readonly change: string;
}

export const visitors: Readonly<Record<Range, Visitors>> = {
  "3m": {
    labels: ["Apr 01", "Apr 04", "Apr 07", "Apr 10", "Apr 13", "Apr 16", "Apr 19", "Apr 22", "Apr 25", "Apr 28", "May 01", "May 04", "May 07", "May 10", "May 13", "May 16", "May 19", "May 22", "May 25", "May 28", "Jun 01", "Jun 04", "Jun 07", "Jun 10", "Jun 13", "Jun 16", "Jun 19", "Jun 22", "Jun 25", "Jun 28"],
    values: [220, 310, 280, 420, 610, 530, 700, 480, 560, 890, 760, 520, 640, 980, 1020, 700, 560, 640, 860, 1110, 760, 620, 720, 980, 1240, 1090, 720, 840, 1160, 1320],
    mobile: [130, 190, 150, 240, 330, 270, 380, 240, 300, 470, 390, 260, 350, 530, 560, 360, 300, 330, 470, 600, 400, 330, 390, 520, 640, 590, 370, 450, 600, 690],
    total: "18,412",
    change: "+12.5%",
  },
  "30d": {
    labels: ["Apr 01", "Apr 02", "Apr 03", "Apr 04", "Apr 05", "Apr 06", "Apr 07", "Apr 08", "Apr 09", "Apr 10", "Apr 11", "Apr 12", "Apr 13", "Apr 14", "Apr 15", "Apr 16", "Apr 17", "Apr 18", "Apr 19", "Apr 20", "Apr 21", "Apr 22", "Apr 23", "Apr 24", "Apr 25", "Apr 26", "Apr 27", "Apr 28", "Apr 29", "Apr 30"],
    values: [420, 380, 520, 740, 690, 480, 560, 860, 1040, 720, 500, 620, 780, 960, 1180, 1020, 640, 520, 700, 920, 1100, 840, 560, 660, 880, 1060, 780, 960, 1240, 1020],
    mobile: [210, 190, 260, 390, 350, 240, 300, 440, 560, 370, 260, 310, 410, 520, 630, 520, 320, 280, 360, 490, 590, 430, 280, 340, 470, 560, 400, 510, 660, 530],
    total: "6,238",
    change: "+6.1%",
  },
  "7d": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    values: [420, 760, 580, 1040, 860, 1220, 980],
    mobile: [210, 420, 300, 560, 440, 660, 520],
    total: "1,598",
    change: "+2.8%",
  },
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
