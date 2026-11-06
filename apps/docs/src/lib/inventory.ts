export type InventoryTier = number | "animated";

export interface InventoryRow {
  readonly tier: InventoryTier;
  readonly name: string;
  readonly status: string;

  readonly support: string;
  readonly notes: string;
}

export interface InventorySection {
  readonly tier: InventoryTier;

  readonly title: string;
}

export interface Inventory {
  readonly rows: ReadonlyArray<InventoryRow>;
  readonly sections: ReadonlyArray<InventorySection>;

  readonly malformed: ReadonlyArray<string>;
}

const tierHeading = /^## Tier (\d+)/;

const animatedHeading = /^## (Animated primitives|Effects)\b/;
const columnHeading = /^\|\s*Component\s*\|\s*Status\s*\|/;
const rule = /^\|[\s:|-]+\|$/;

const cellSeparator = /(?<!\\)\|/;

const cells = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(cellSeparator)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));

export const parseInventory = (markdown: string): Inventory => {
  const rows: InventoryRow[] = [];
  const sections: InventorySection[] = [];
  const malformed: string[] = [];

  type Section =
    | { readonly kind: "none" }
    | { readonly kind: "component"; readonly tier: InventoryTier };
  let section: Section = { kind: "none" };
  let inTable = false;

  markdown.split("\n").forEach((line, index) => {
    const heading = tierHeading.exec(line);
    if (heading !== null) {
      section = { kind: "component", tier: Number(heading[1]) };
      sections.push({ tier: section.tier, title: line.slice(3).trim() });
      inTable = false;
      return;
    }
    if (animatedHeading.test(line)) {
      section = { kind: "component", tier: "animated" };
      sections.push({ tier: section.tier, title: line.slice(3).trim() });
      inTable = false;
      return;
    }
    if (/^#{1,6}\s/.test(line)) {
      section = { kind: "none" };
      inTable = false;
      return;
    }
    if (columnHeading.test(line)) {
      inTable = section.kind === "component";
      return;
    }
    if (!inTable) return;
    if (line.trim() === "" || !line.startsWith("|")) {
      inTable = false;
      return;
    }
    if (rule.test(line)) return;

    const row = cells(line);
    const [name, status, support, notes] = row;
    if (
      section.kind === "none" ||
      row.length !== 4 ||
      name === undefined ||
      status === undefined ||
      support === undefined ||
      notes === undefined
    ) {
      malformed.push(
        `line ${index + 1}: expected 4 cells under a section, found ${row.length}`,
      );
      return;
    }
    rows.push({ tier: section.tier, name, status, support, notes });
  });

  return { rows, sections, malformed };
};

export type Lane =
  | { readonly title: string; readonly kind: "tier"; readonly tier: number }
  | {
      readonly title: string;
      readonly kind: "rows";
      readonly tier: number;
      readonly names: ReadonlyArray<string>;
    };

export const lanes = {
  layout: {
    title: "Layout primitives",
    kind: "rows",
    tier: 1,
    names: [
      "Stack / layout primitives",
      "Boxes / containers",
      "Scrollable containers",
      "Separators",
      "Spacers",
    ],
  },
  "data-display": { title: "Data display", kind: "tier", tier: 3 },
  workspace: { title: "Desktop workspace", kind: "tier", tier: 4 },
} as const satisfies Record<string, Lane>;

export type LaneName = keyof typeof lanes;

export interface LaneView {
  readonly lane: Lane;
  readonly rows: ReadonlyArray<InventoryRow>;

  readonly unmatched: ReadonlyArray<string>;
}

export const laneView = (inventory: Inventory, name: LaneName): LaneView => {
  const lane: Lane = lanes[name];
  if (lane.kind === "tier") {
    return {
      lane,
      rows: inventory.rows.filter((row) => row.tier === lane.tier),
      unmatched: [],
    };
  }

  const rows = lane.names.flatMap((wanted) => {
    const row = inventory.rows.find(
      (candidate) => candidate.tier === lane.tier && candidate.name === wanted,
    );
    return row === undefined ? [] : [row];
  });

  return {
    lane,
    rows,
    unmatched: lane.names.filter(
      (wanted) => !rows.some((row) => row.name === wanted),
    ),
  };
};

export type LaneGroup = "shipped" | "pending" | "blocked" | "unsupported";
export type LaneSummary = {
  readonly total: number;
  readonly shipped: number;
  readonly pending: number;
};

export const supportLabel = (support: string): string =>
  support === "?" ? "unmeasured" : support;

export const groupOf = (status: string): LaneGroup =>
  status.startsWith("done")
    ? "shipped"
    : status.startsWith("blocked")
      ? "blocked"
      : status.startsWith("unsupported")
        ? "unsupported"
        : "pending";

export const summarize = (rows: ReadonlyArray<InventoryRow>): LaneSummary => {
  const shipped = rows.filter(
    (row) => groupOf(row.status) === "shipped",
  ).length;
  return { total: rows.length, shipped, pending: rows.length - shipped };
};

export interface Span {
  readonly text: string;
  readonly code: boolean;
  readonly strong: boolean;
}

const spanPattern = /(`[^`]*`|\*\*[^*]+\*\*)/g;

export const spans = (text: string): ReadonlyArray<Span> =>
  text
    .split(spanPattern)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith("`") && part.endsWith("`") && part.length > 2
        ? { text: part.slice(1, -1), code: true, strong: false }
        : part.startsWith("**") && part.endsWith("**") && part.length > 4
          ? { text: part.slice(2, -2), code: false, strong: true }
          : { text: part, code: false, strong: false },
    );
