import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  groupOf,
  laneView,
  lanes,
  parseInventory,
  spans,
  summarize,
  supportLabel,
  type Inventory,
  type LaneName,
} from "./inventory";

/**
 * The inventory parse behind the composition pages.
 *
 * `/docs/layouts`, `/docs/data-display` and `/docs/workspace` render their rows
 * from `COMPONENTS.md`, so the parser is the seam that keeps a page honest. The
 * guards below check the parts that would fail silently: a row lost to a
 * malformed cell, a lane naming a row that was renamed, a status the page does
 * not know how to group, and the inline Markdown a note carries.
 */

const inventory = parseInventory(
  readFileSync(new URL("../../../../COMPONENTS.md", import.meta.url), "utf8"),
);

const laneNames = [
  "layout",
  "data-display",
  "workspace",
] as const satisfies ReadonlyArray<LaneName>;

describe("parseInventory", () => {
  it("reads a tier table's four columns", () => {
    const parsed = parseInventory(
      [
        "## Tier 3 — data presentation",
        "",
        "| Component | Status | GPUix support | Notes / limitations |",
        "| --------- | ------ | ------------- | ------------------- |",
        "| Tables | todo | ? | No `<table>` element; grid + `div` rows. |",
        "| Charts | wip | yes | `<svg>` draws static charts. |",
        "",
        "## Tier 4 — desktop workspace",
        "",
        "| Component | Status | GPUix support | Notes / limitations |",
        "| --------- | ------ | ------------- | ------------------- |",
        "| Status bars | done | yes | `div` + `<text>`. |",
      ].join("\n"),
    );

    expect(parsed.malformed).toEqual([]);
    expect(parsed.rows.map((row) => [row.tier, row.name, row.status])).toEqual([
      [3, "Tables", "todo"],
      [3, "Charts", "wip"],
      [4, "Status bars", "done"],
    ]);
    expect(parsed.rows[0]?.notes).toBe(
      "No `<table>` element; grid + `div` rows.",
    );
  });

  it("reports a row it cannot read instead of dropping it", () => {
    const parsed = parseInventory(
      [
        "## Tier 3 — data presentation",
        "",
        "| Component | Status | GPUix support | Notes / limitations |",
        "| --------- | ------ | ------------- | ------------------- |",
        "| Tables | todo | no notes cell |",
      ].join("\n"),
    );

    expect(parsed.rows).toEqual([]);
    expect(parsed.malformed).toHaveLength(1);
    expect(parsed.malformed[0]).toContain("expected 4 cells");
  });

  it("stops at the next section, so another table is not counted", () => {
    const parsed = parseInventory(
      [
        "## Tier 4 — desktop workspace",
        "",
        "| Component | Status | GPUix support | Notes / limitations |",
        "| --------- | ------ | ------------- | ------------------- |",
        "| Toolbars | todo | ? | `div` + Button groups. |",
        "",
        "## Tier 5 — specialised",
        "",
        "| Row | GPUix provides | Verdict |",
        "| --- | -------------- | ------- |",
        "| Icons | `<svg>` | verified |",
      ].join("\n"),
    );

    expect(parsed.rows.map((row) => row.name)).toEqual(["Toolbars"]);
    expect(parsed.malformed).toEqual([]);
  });
});

describe("the real inventory", () => {
  it("parses with no malformed row", () => {
    expect(inventory.malformed).toEqual([]);
  });

  it("groups every status the inventory uses", () => {
    // A new token would otherwise fall through to "pending" and hide a shipped
    // row (or show a blocked one as merely unbuilt).
    const ungrouped = inventory.rows
      .filter(
        (row) =>
          !/^(done|wip|todo|blocked|unsupported)\b/.test(row.status.trim()),
      )
      .map((row) => `${row.name}: ${row.status}`);

    expect(ungrouped).toEqual([]);
  });

  it("has a row behind every lane name, so a rename cannot orphan a page", () => {
    const missing = laneNames.flatMap((name) =>
      laneView(inventory, name).unmatched.map((row) => `${name}: ${row}`),
    );

    expect(missing).toEqual([]);
  });

  it("covers the tiers the inventory pages claim", () => {
    const rows = (name: LaneName) => laneView(inventory, name).rows;

    expect(rows("layout").length).toBeGreaterThanOrEqual(5);
    expect(rows("data-display").length).toBeGreaterThanOrEqual(14);
    expect(rows("workspace").length).toBeGreaterThanOrEqual(20);
  });

  it("lists every configured lane, so a new lane is checked too", () => {
    expect(Object.keys(lanes)).toEqual([...laneNames]);
  });
});

describe("supportLabel", () => {
  it("prints an unmeasured verdict as a word, not a question mark", () => {
    // `?` is the inventory's only non-word verdict, and a lane that copied it
    // cell-for-cell would show a reader a question mark where the column says
    // whether GPUix supports the row.
    expect(supportLabel("?")).toBe("unmeasured");
  });

  it("leaves every measured verdict exactly as the inventory writes it", () => {
    expect(supportLabel("yes (measured)")).toBe("yes (measured)");
    expect(supportLabel("partial (measured)")).toBe("partial (measured)");
    expect(supportLabel("yes")).toBe("yes");
  });

  it("has unmeasured rows in the inventory it is printed for", () => {
    // The mapping exists because real rows carry `?`; if none did, the label
    // would be dead code and this guard would say so rather than pass empty.
    const unmeasured = inventory.rows.filter((row) => row.support === "?");

    expect(unmeasured.length).toBeGreaterThan(0);
    expect(
      unmeasured.filter((row) => supportLabel(row.support) !== "unmeasured"),
    ).toEqual([]);
  });
});

describe("groupOf and summarize", () => {
  const row = (status: string) => ({
    tier: 3,
    name: "Row",
    status,
    support: "?",
    notes: "",
  });

  it("counts a conditional done as shipped", () => {
    expect(groupOf("done for `packages/primitives` (components pending)")).toBe(
      "shipped",
    );
    expect(groupOf("todo")).toBe("pending");
    expect(groupOf("blocked (no portal)")).toBe("blocked");
    expect(groupOf("unsupported (no canvas)")).toBe("unsupported");
  });

  it("prints how much of a lane is real", () => {
    const summary = summarize([
      row("done"),
      row("todo"),
      row("wip"),
      row("blocked (needs a window)"),
    ]);

    expect(summary).toEqual({ total: 4, shipped: 1, pending: 3 });
  });
});

describe("spans", () => {
  it("splits inline code and bold out of a note", () => {
    expect(spans("No `<table>` element; **unverified**.")).toEqual([
      { text: "No ", code: false, strong: false },
      { text: "<table>", code: true, strong: false },
      { text: " element; ", code: false, strong: false },
      { text: "unverified", code: false, strong: true },
      { text: ".", code: false, strong: false },
    ]);
  });

  it("leaves an unclosed marker as text", () => {
    expect(spans("a `b")).toEqual([
      { text: "a `b", code: false, strong: false },
    ]);
  });
});

describe("laneView", () => {
  const fixture: Inventory = {
    rows: [
      {
        tier: 1,
        name: "Boxes / containers",
        status: "done",
        support: "yes",
        notes: "",
      },
      {
        tier: 1,
        name: "Buttons",
        status: "done",
        support: "partial",
        notes: "",
      },
      { tier: 3, name: "Tables", status: "todo", support: "?", notes: "" },
    ],
    malformed: [],
  };

  it("takes the named rows of a part-tier lane, in the lane's order", () => {
    expect(laneView(fixture, "layout").rows.map((row) => row.name)).toEqual([
      "Boxes / containers",
    ]);
  });

  it("takes a whole tier for a tier lane", () => {
    expect(
      laneView(fixture, "data-display").rows.map((row) => row.name),
    ).toEqual(["Tables"]);
  });
});
