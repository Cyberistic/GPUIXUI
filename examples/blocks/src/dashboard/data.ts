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
  /** The period's total and its movement, printed under the chart's name. */
  readonly total: string;
  readonly change: string;
}

export const visitors: Readonly<Record<Range, Visitors>> = {
  "3m": {
    labels: [
      "Apr 3",
      "Apr 9",
      "Apr 15",
      "Apr 21",
      "Apr 27",
      "May 3",
      "May 9",
      "May 15",
      "May 22",
      "May 29",
      "Jun 4",
      "Jun 10",
      "Jun 16",
      "Jun 22",
      "Jun 30",
    ],
    values: [
      312, 468, 402, 556, 498, 624, 588, 742, 690, 812, 748, 906, 858, 972, 934,
    ],
    total: "18,412",
    change: "+12.5%",
  },
  "30d": {
    labels: [
      "May 30",
      "Jun 3",
      "Jun 7",
      "Jun 11",
      "Jun 15",
      "Jun 19",
      "Jun 23",
      "Jun 27",
    ],
    values: [524, 610, 578, 688, 642, 754, 712, 830],
    total: "6,238",
    change: "+6.1%",
  },
  "7d": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    values: [186, 214, 198, 246, 232, 268, 254],
    total: "1,598",
    change: "+2.8%",
  },
};

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
