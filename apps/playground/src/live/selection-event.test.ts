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
    expect(SELECTION_EVENT_LINE.endsWith(SELECTION_EVENT_TAIL)).toBe(true);
    expect(SELECTION_EVENT_CHROME.includes(SELECTION_EVENT_TAIL)).toBe(false);
  });
});
