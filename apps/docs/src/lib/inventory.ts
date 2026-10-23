/**
 * The inventory lanes.
 *
 * `COMPONENTS.md` is the inventory's source of truth. The three composition
 * pages (`/docs/layouts`, `/docs/data-display`, `/docs/workspace`) render their
 * rows straight from its tier tables, so a page cannot call a row shipped while
 * the inventory says `todo`. The parser keeps the table's four columns and
 * reports a row it cannot read instead of dropping it.
 */

/** One row of a `COMPONENTS.md` tier table. */
export interface InventoryRow {
  readonly tier: number;
  readonly name: string;
  readonly status: string;
  /** The GPUix support verdict: `yes`, `partial`, `?` or a note. */
  readonly support: string;
  readonly notes: string;
}

export interface Inventory {
  readonly rows: ReadonlyArray<InventoryRow>;
  /** Table rows that did not have the four expected cells, with their line. */
  readonly malformed: ReadonlyArray<string>;
}

const tierHeading = /^## Tier (\d+)/;
const columnHeading = /^\|\s*Component\s*\|\s*Status\s*\|/;
const rule = /^\|[\s:|-]+\|$/;

/**
 * A cell separator: a bar the row does not escape.
 *
 * A note can carry a union in a code span (`"all" \| "any"`), and Markdown's
 * table syntax makes the escaped form the only way to write it — the code span
 * does not protect a raw bar.
 */
const cellSeparator = /(?<!\\)\|/;

/** The cells of a markdown row, without the outer pipes. */
const cells = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(cellSeparator)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));

/** Parse every tier table in the inventory. */
export const parseInventory = (markdown: string): Inventory => {
  const rows: InventoryRow[] = [];
  const malformed: string[] = [];
  // `0` means "no tier table is open"; a table outside a tier is reported.
  let tier = 0;
  let inTable = false;

  markdown.split("\n").forEach((line, index) => {
    const heading = tierHeading.exec(line);
    if (heading !== null) {
      tier = Number(heading[1]);
      inTable = false;
      return;
    }
    if (line.startsWith("#")) {
      inTable = false;
      return;
    }
    if (columnHeading.test(line)) {
      inTable = true;
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
      tier === 0 ||
      row.length !== 4 ||
      name === undefined ||
      status === undefined ||
      support === undefined ||
      notes === undefined
    ) {
      malformed.push(
        `line ${index + 1}: expected 4 cells under a tier, found ${row.length}`,
      );
      return;
    }
    rows.push({ tier, name, status, support, notes });
  });

  return { rows, malformed };
};

/** A composition lane: a whole tier, or the named rows of one. */
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
  /** Names the lane lists that the inventory does not have. */
  readonly unmatched: ReadonlyArray<string>;
}

/** The inventory rows a lane covers, in the lane's declared order. */
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

/**
 * The GPUix support cell a lane prints.
 *
 * `?` is the inventory's "the runtime was never measured for this row", so a
 * page that printed it raw would read as a verdict; every other cell is the
 * inventory's own wording and passes through unchanged.
 */
export const supportLabel = (support: string): string =>
  support === "?" ? "unmeasured" : support;

/** Which state a status cell is in. `done (…)` still counts as shipped. */
export const groupOf = (status: string): LaneGroup =>
  status.startsWith("done")
    ? "shipped"
    : status.startsWith("blocked")
      ? "blocked"
      : status.startsWith("unsupported")
        ? "unsupported"
        : "pending";

/** The counts a lane page prints: how much of the lane is real. */
export const summarize = (rows: ReadonlyArray<InventoryRow>): LaneSummary => {
  const shipped = rows.filter(
    (row) => groupOf(row.status) === "shipped",
  ).length;
  return { total: rows.length, shipped, pending: rows.length - shipped };
};

/** One run of a note: inline code, bold, or plain text. */
export interface Span {
  readonly text: string;
  readonly code: boolean;
  readonly strong: boolean;
}

const spanPattern = /(`[^`]*`|\*\*[^*]+\*\*)/g;

/**
 * Split a note's inline Markdown so a table can render `<code>` and `<strong>`
 * without handing the cell to an MDX pipeline. An unclosed marker stays text.
 */
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
