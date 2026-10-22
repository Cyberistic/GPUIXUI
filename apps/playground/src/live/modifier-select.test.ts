/**
 * Holds the selection arithmetic the `modifier-select-lifecycle` probe reads a
 * window with, and the claims the probe has to keep making.
 *
 * The failure being guarded is a plain-press-only list: a probe with no
 * `clickWith` verb measures a selection that never sees a chord, so `shift`
 * replaces the set instead of extending it and every readout still looks
 * plausible. The rule and the probe are therefore held separately — the
 * arithmetic here, the payload the window delivered there — and the anchor's
 * two behaviours (a `shift` press keeps it, a `cmd` toggle moves it) are each
 * one case, because a component that moves the anchor on a range press passes a
 * single range and fails the second one.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  MODIFIER_SELECT_IDS,
  NO_MODIFIERS,
  emptySelection,
  flagText,
  modifierLabel,
  pressedModifiers,
  selectRow,
  selectionState,
  type PressedModifiers,
  type RowSelection,
} from "./modifier-select.js";
import { liveRegistry } from "./registry.js";

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** The `modifierSelectSteps` effect, bounded by the next declaration. */
const steps = (() => {
  const start = scenarios.indexOf("const modifierSelectSteps");
  if (start === -1) return "";
  const ends = Arr.filter(
    [
      scenarios.indexOf("\nconst ", start + 1),
      scenarios.indexOf("/** The bodies", start + 1),
    ],
    (end) => end > start,
  );
  return scenarios.slice(
    start,
    Arr.reduce(ends, scenarios.length, (first, end) => Math.min(first, end)),
  );
})();

/** The count the README prints for this probe, if any. */
const printedCheckCount = (): number =>
  Number(
    /(\d+) checks, `--only modifier-select-lifecycle`/.exec(readme)?.[1] ??
      Number.NaN,
  );

const withShift: PressedModifiers = { ...NO_MODIFIERS, shift: true };
const withCmd: PressedModifiers = { ...NO_MODIFIERS, cmd: true };
const withBoth: PressedModifiers = { ...NO_MODIFIERS, cmd: true, shift: true };

/** A selection built from presses, so a case reads as the gesture it names. */
const after = (
  presses: ReadonlyArray<readonly [number, PressedModifiers]>,
): RowSelection =>
  presses.reduce<RowSelection>(
    (selection, [index, modifiers]) => selectRow(selection, index, modifiers),
    emptySelection,
  );

const chosen = (selection: RowSelection): ReadonlyArray<number> =>
  selection.chosen;

describe("selectRow", () => {
  it("replaces the set with the pressed record and anchors it", () => {
    const selection = after([[3, NO_MODIFIERS]]);
    expect(chosen(selection)).toEqual([3]);
    expect(selection.anchor).toEqual(Option.some(3));
  });

  it("extends a forward range from the anchor, not from the pressed row", () => {
    const selection = after([
      [3, NO_MODIFIERS],
      [6, withShift],
    ]);
    expect(chosen(selection)).toEqual([3, 4, 5, 6]);
    expect(selection.anchor).toEqual(Option.some(3));
  });

  it("re-ranges backwards from the same anchor", () => {
    const selection = after([
      [3, NO_MODIFIERS],
      [6, withShift],
      [1, withShift],
    ]);
    expect(chosen(selection)).toEqual([1, 2, 3]);
    expect(selection.anchor).toEqual(Option.some(3));
  });

  it("selects the pressed row alone when no anchor exists yet", () => {
    const selection = selectRow(emptySelection, 2, withShift);
    expect(chosen(selection)).toEqual([2]);
    expect(selection.anchor).toEqual(Option.none());
  });

  it("adds a record with cmd and moves the anchor to it", () => {
    const selection = after([
      [3, NO_MODIFIERS],
      [5, withCmd],
    ]);
    expect(chosen(selection)).toEqual([3, 5]);
    expect(selection.anchor).toEqual(Option.some(5));
  });

  it("removes a record cmd already chose, in either position", () => {
    const last = after([
      [3, NO_MODIFIERS],
      [5, withCmd],
    ]);
    const removed = selectRow(last, 5, withCmd);
    expect(chosen(removed)).toEqual([3]);
    const middle = after([
      [3, NO_MODIFIERS],
      [2, withCmd],
      [4, withCmd],
    ]);
    expect(chosen(selectRow(middle, 3, withCmd))).toEqual([2, 4]);
  });

  it("adds the range with cmd-shift and keeps the anchor", () => {
    const selection = after([
      [4, NO_MODIFIERS],
      [7, withShift],
      [2, withBoth],
    ]);
    expect(chosen(selection)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(selection.anchor).toEqual(Option.some(4));
  });

  it("treats a ctrl-or-alt-only press as plain, which is the rule a caller can extend", () => {
    const selection = after([
      [3, NO_MODIFIERS],
      [5, withCmd],
      [6, { ...NO_MODIFIERS, ctrl: true, alt: true }],
    ]);
    expect(chosen(selection)).toEqual([6]);
    expect(selection.anchor).toEqual(Option.some(6));
  });
});

describe("the readout", () => {
  it("prints the empty set and the absence of a press", () => {
    expect(selectionState(emptySelection, Option.none(), 0)).toBe(
      "selected=none anchor=none mods=none flags=none click=none presses=0",
    );
  });

  it("prints the chord and the four flags the payload carried", () => {
    expect(
      selectionState(
        after([
          [4, NO_MODIFIERS],
          [6, withBoth],
        ]),
        Option.some({ modifiers: withBoth, clickCount: 1 }),
        1,
      ),
    ).toBe(
      "selected=4,5,6 anchor=4 mods=cmd-shift flags=cmd:true,ctrl:false,alt:false,shift:true click=1 presses=1",
    );
  });

  it("prints a plain press as no chord but a full flag set", () => {
    expect(
      selectionState(
        selectRow(emptySelection, 1, NO_MODIFIERS),
        Option.some({ modifiers: NO_MODIFIERS, clickCount: 1 }),
        2,
      ),
    ).toContain("mods=none flags=cmd:false,ctrl:false,alt:false,shift:false");
  });
});

describe("the chord the payload names", () => {
  it("writes the held modifiers in the protocol's order", () => {
    expect(modifierLabel(NO_MODIFIERS)).toBe("none");
    expect(modifierLabel(withShift)).toBe("shift");
    expect(modifierLabel(withBoth)).toBe("cmd-shift");
    expect(
      modifierLabel({ cmd: true, ctrl: true, alt: true, shift: true }),
    ).toBe("cmd-ctrl-alt-shift");
  });

  it("prints every flag, so a probe cannot read only the chord", () => {
    expect(flagText(NO_MODIFIERS)).toBe(
      "cmd:false,ctrl:false,alt:false,shift:false",
    );
  });

  it("reads an absent modifier field as no modifiers rather than a crash", () => {
    // A click carries the set at the pinned release; an absent field is a
    // runtime change, and the readout prints the four flags so the probe
    // measures it instead of inheriting it.
    expect(pressedModifiers(undefined)).toEqual(NO_MODIFIERS);
  });
});

describe("the probe's documentation", () => {
  it("registers the probe the fixture names", () => {
    expect(
      liveRegistry.filter((probe) => probe.id === "modifier-select-lifecycle"),
    ).toEqual([
      {
        id: "modifier-select-lifecycle",
        title: expect.stringContaining("shift ranges from the anchor"),
        capability: "table",
      },
    ]);
    expect(readme).toContain(
      "### `modifier-select-lifecycle` — measured on 0.11.0 here",
    );
  });

  it("presses with a chord, now that the host can hold one", () => {
    // The whole finding is that a modified press reaches a row; a probe that
    // fell back to plain `click` would still select rows and read green.
    expect((steps.match(/ctx\.host\.clickWith\(/g) ?? []).length).toBe(8);
  });

  it("prints the check count the probe actually asserts", () => {
    const asserted =
      (steps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0) +
      (steps.match(/paintedBox\(/g)?.length ?? 0);
    expect(asserted).toBeGreaterThan(15);
    expect(printedCheckCount()).toBe(asserted);
  });

  it("states the anchor rule and the double-press limit", () => {
    expect(steps).toContain(
      "a range after a plain press starts at that press, not at the last toggle",
    );
    expect(steps).toContain(
      "a second press on the same row still reports one click",
    );
    expect(readme).toContain("**The anchor is the rule.**");
    expect(readme).toContain("**A double press is not synthesizable.**");
    expect(MODIFIER_SELECT_IDS.row(0)).toBe("modifier-select-row-0");
  });
});
