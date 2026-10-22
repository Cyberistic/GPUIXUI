import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  activates,
  channels,
  describeGroup,
  editableChannels,
  groupState,
  parentPaint,
  toggleAll,
  toggleChannel,
} from "./checkbox-preview";

/**
 * The checkbox preview's group arithmetic and keyboard edges.
 *
 * Two rules a drawing cannot show are the reason this model exists: the parent
 * is **indeterminate while some** editable channels are on, and pressing that
 * parent **selects all** (the box's underlying boolean was false, so the next
 * report is `true`) rather than clearing. The keyboard edge is the runtime's —
 * Enter on key down, Space on key up, no repeat — and is read from
 * `core/keyboard.ts` rather than trusted, because the wrong edge double-toggles.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const keyboard = readFileSync(
  new URL(
    "../../../../../packages/primitives/src/core/keyboard.ts",
    import.meta.url,
  ),
  "utf8",
);

const managed = channels.filter((channel) => channel.managed === true);

const stateOf = (chosen: ReadonlyArray<string>) => groupState(chosen);

describe("the checkbox preview", () => {
  it("reads the two activation edges off the runtime's key decisions", () => {
    // The source is the contract: the preview may spell the browser's key
    // names, but which edge fires has to be the component's rule.
    expect(keyboard).toContain('ENTER_KEY = "enter"');
    expect(keyboard).toContain('SPACE_KEY = "space"');
    expect(keyboard).toContain(
      'if (key === ENTER_KEY) return phase === "down"',
    );
    expect(keyboard).toContain('if (key === SPACE_KEY) return phase === "up"');
    expect(keyboard).toContain("if (held) return false");

    expect(activates("Enter", "down")).toBe(true);
    expect(activates("Enter", "up")).toBe(false);
    expect(activates(" ", "up")).toBe(true);
    expect(activates(" ", "down")).toBe(false);
  });

  it("ignores a held key and every key that is not an activation", () => {
    expect(activates("Enter", "down", true)).toBe(false);
    expect(activates(" ", "up", true)).toBe(false);
    expect(activates("a", "down")).toBe(false);
    expect(activates("Tab", "up")).toBe(false);
  });

  it("counts the parent over the editable channels only", () => {
    expect(managed).toHaveLength(1);
    const editable = editableChannels().map((channel) => channel.value);
    expect(editable).toEqual(["email", "desktop", "mobile"]);

    expect(stateOf(editable)).toBe("all");
    expect(stateOf(["email", "desktop"])).toBe("some");
    expect(stateOf([])).toBe("none");
    // A managed row is never what makes the parent whole or partial: it can be
    // off while every channel the reader owns is on.
    expect(stateOf(editable)).toBe("all");
  });

  it("paints the parent indeterminate rather than checking the box", () => {
    expect(parentPaint("all")).toEqual({ checked: true, indeterminate: false });
    expect(parentPaint("some")).toEqual({
      checked: false,
      indeterminate: true,
    });
    expect(parentPaint("none")).toEqual({
      checked: false,
      indeterminate: false,
    });
  });

  it("selects every editable channel from an indeterminate parent", () => {
    // The box's `checked` is false while indeterminate, so activation reports
    // `true`. A preview that cleared here would teach the opposite of the
    // component's documented behaviour.
    expect(toggleAll(["email"])).toEqual(["email", "desktop", "mobile"]);
    expect(toggleAll([])).toEqual(["email", "desktop", "mobile"]);
  });

  it("clears the editable channels from a checked parent and keeps the managed one", () => {
    expect(toggleAll(["email", "desktop", "mobile", "push"])).toEqual(["push"]);
    // The managed selection survives: the reader never set it, so a group
    // "off" cannot silently rewrite it.
    expect(toggleAll(["push"])).toEqual(["email", "desktop", "mobile", "push"]);
  });

  it("toggles one row in the order it was chosen, and refuses a managed one", () => {
    expect(toggleChannel(["email"], "mobile")).toEqual(["email", "mobile"]);
    expect(toggleChannel(["email", "mobile"], "email")).toEqual(["mobile"]);
    // The managed row is shown with its state; a press changes nothing.
    const withManaged = ["email", "push"] as const;
    expect(toggleChannel(withManaged, "push")).toBe(withManaged);
    expect(toggleChannel(["email"], "unknown")).toEqual(["email"]);
  });

  it("words the readout from the same arithmetic the parent paints", () => {
    expect(describeGroup("all", ["email", "desktop", "mobile"])).toBe(
      "All 3 editable channels are on. One channel is managed.",
    );
    expect(describeGroup("some", ["email"])).toBe(
      "1 of 3 editable channels are on. One channel is managed.",
    );
    expect(describeGroup("none", [])).toBe(
      "No editable channel is on. One channel is managed.",
    );
  });
});
