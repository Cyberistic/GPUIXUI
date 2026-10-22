/**
 * Holds the selection-event record to the terms the window probe reads.
 *
 * The probe's checks parse `fires=N last=…` out of a painted line, so the
 * wording and the arithmetic are the evidence's contract: a reducer that keeps
 * the previous run through a clear, or a parser that reads the wrong number,
 * would let the probe assert a state the window never reported.
 */
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  firesOf,
  initialSelectionLog,
  recordSelection,
  SELECTION_EVENT_CHROME,
  SELECTION_EVENT_LINE,
  SELECTION_EVENT_TAIL,
  selectionReadout,
} from "./selection-event.js";

describe("the window selection record", () => {
  it("counts every change, including one that carries no run", () => {
    const once = recordSelection(initialSelectionLog, "picked");
    const cleared = recordSelection(once, undefined);
    expect(cleared.fires).toBe(2);
    expect(selectionReadout(cleared)).toBe("fires=2 last=none");
  });

  it("keeps the run the payload carried", () => {
    const log = recordSelection(initialSelectionLog, "ection world");
    expect(Option.getOrNull(log.last)).toBe("ection world");
    expect(selectionReadout(log)).toBe("fires=1 last=ection world");
  });

  it("reads the count back out of the painted line, and refuses a line that is not one", () => {
    expect(
      Option.getOrNull(
        firesOf(selectionReadout({ fires: 3, last: Option.none() })),
      ),
    ).toBe(3);
    expect(Option.isNone(firesOf("last=3"))).toBe(true);
    expect(Option.isNone(firesOf("fires=x last="))).toBe(true);
  });

  it("draws the two lines a drag has to tell apart", () => {
    // The checks assert the tail the drag reaches, and the negative control is a
    // drag over the second line: a chrome line carrying the same words would make
    // the control ambiguous, and a tail the selectable line does not end with
    // would make the positive check unsatisfiable.
    expect(SELECTION_EVENT_LINE.endsWith(SELECTION_EVENT_TAIL)).toBe(true);
    expect(SELECTION_EVENT_CHROME.includes(SELECTION_EVENT_TAIL)).toBe(false);
  });
});
