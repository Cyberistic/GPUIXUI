/**
 * Holds the premise `nested-overlay-lifecycle` is read against.
 *
 * The bugs these catch: a reducer that records an open as a close (the chain
 * would print a dismissal nobody made), one that collapses two closes of the
 * same surface (the probe's "one Escape, one surface" checks would pass a stack
 * that dismissed twice), one that keeps a surface open after re-opening it (the
 * readout would say `open` while the checks below it still read `closed`), and a
 * close order the readout prints out of the stack's order — the single
 * measurement the probe exists for.
 *
 * `node:fs` is deliberate, as in `confirm.test.ts`: this reads the repository's
 * own probe source and README, not a runtime path.
 */

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

/** Replays `events` from a fresh flow. */
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
    // The probe's chain, in the order it presses: menu, popover, dialog. A
    // readout that printed the surfaces' declaration order instead would pass
    // a stack that closed inside-out.
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
    // The guard the window measures is "one Escape, one surface": if the
    // reducer deduplicated a repeated close, a stack that dismissed the menu
    // and then the popover on one keystroke could still read as one close each.
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
    // A surface the readout forgot would print `undefined` rather than fail the
    // string above, so the count is held to the declaration.
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
    // A count a reader uses to tell a partial run from a complete one: an
    // assertion added without the sentence, and a sentence edited alone, both
    // fail. `paintedBox` asserts its own `expectSome` (a surface that never
    // paints fails by name), so each read is one check in the report too.
    const start = scenarios.indexOf("const nestedOverlaySteps");
    const end = scenarios.indexOf(
      "\n/** The bodies, one per registry id",
      start + 1,
    );
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
