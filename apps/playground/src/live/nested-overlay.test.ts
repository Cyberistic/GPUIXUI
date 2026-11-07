import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NESTED_DIALOG,
  NESTED_MENU_ITEM,
  NESTED_MENU_PANEL,
  NESTED_MENU_TRIGGER,
  NESTED_OPENER,
  NESTED_POPOVER_PANEL,
  NESTED_POPOVER_TRIGGER,
  NESTED_READOUT,
  initialNestedFlow,
  nestedFlow,
  nestedReadout,
  nestedSurfaces,
  type NestedEvent,
  type NestedFlow,
} from "./nested-overlay.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const replay = (events: ReadonlyArray<NestedEvent>): NestedFlow =>
  events.reduce(nestedFlow, initialNestedFlow);

const openAll: ReadonlyArray<NestedEvent> = [
  { surface: "dialog", open: true },
  { surface: "popover", open: true },
  { surface: "menu", open: true },
];

describe("the nested flow the probe records", () => {
  it("records each surface's open once and closes nothing", () => {
    expect(replay(openAll)).toEqual({
      open: { dialog: true, popover: true, menu: true },
      opens: { dialog: 1, popover: 1, menu: 1 },
      closes: { dialog: 0, popover: 0, menu: 0 },
      dismissed: [],
    });
  });

  it("prints the outside-in order the three Escape presses assert", () => {
    expect(
      nestedReadout(
        replay([
          ...openAll,
          { surface: "menu", open: false },
          { surface: "popover", open: false },
          { surface: "dialog", open: false },
        ]),
      ),
    ).toBe(
      "dialog=closed popover=closed menu=closed opens=1,1,1 closes=1,1,1 dismissed=menu,popover,dialog",
    );
  });

  it("counts a second close of one surface, so a double dismissal cannot pass", () => {
    const flow = replay([
      { surface: "menu", open: false },
      { surface: "menu", open: false },
    ]);
    expect(flow.closes.menu).toBe(2);
    expect(flow.dismissed).toEqual(["menu", "menu"]);
  });

  it("re-opening a surface clears only its own flag", () => {
    const flow = replay([
      ...openAll,
      { surface: "menu", open: false },
      { surface: "menu", open: true },
    ]);
    expect(flow.open).toEqual({ dialog: true, popover: true, menu: true });
    expect(flow.dismissed).toEqual(["menu"]);
  });

  it("prints one value per surface and an empty close order", () => {
    expect(nestedReadout(initialNestedFlow)).toBe(
      "dialog=closed popover=closed menu=closed opens=0,0,0 closes=0,0,0 dismissed=none",
    );

    expect(nestedSurfaces).toEqual(["dialog", "popover", "menu"]);
  });

  it("addresses every surface with an id no other probe owns", () => {
    const ids = [
      NESTED_OPENER,
      NESTED_DIALOG,
      NESTED_POPOVER_TRIGGER,
      NESTED_POPOVER_PANEL,
      NESTED_MENU_TRIGGER,
      NESTED_MENU_PANEL,
      NESTED_MENU_ITEM,
      NESTED_READOUT,
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("nested-"))).toBe(true);
    expect(scenarios).toContain("<NestedOverlayProbe />");
  });

  it("prints the check count the probe actually asserts", () => {
    const start = scenarios.indexOf("const nestedOverlaySteps");

    const end = scenarios.indexOf("\nconst ", start + 1);
    const steps = start === -1 || end === -1 ? "" : scenarios.slice(start, end);
    const asserted =
      (steps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0) +
      (steps.match(/paintedBox\(ctx,/g)?.length ?? 0);
    expect(asserted).toBeGreaterThan(1);
    const printed = Number(
      /(\d+) checks, `--only nested-overlay-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(asserted);
  });
});
