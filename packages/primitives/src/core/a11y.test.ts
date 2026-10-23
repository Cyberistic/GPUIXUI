/**
 * Accessible names and help.
 *
 * The bug guarded: a blank `label` reached the runtime as `aria-label=""`,
 * which is an empty name rather than no name — a control announced as "" is
 * not falled back to its content. The help half guards a second: a field paints
 * its own hint (the runtime's placeholder is a fixed grey), so the hint has to
 * be announced as the field's description or an empty box names no format.
 *
 * `visibleCopy` is the same decision on the **paint** side: a blank string is
 * absence there too, because a run of spaces lays out a whole line even though
 * an empty one measures nothing.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { accessibleName, fieldHelp, spokenText, visibleCopy } from "./a11y.js";

describe("accessibleName", () => {
  it("publishes a real name, trimmed", () => {
    expect(accessibleName("Save")).toBe("Save");
    expect(accessibleName("  Save  ")).toBe("Save");
  });

  it("omits a blank name so the control can fall back", () => {
    expect(accessibleName("")).toBeUndefined();
    expect(accessibleName(" \t ")).toBeUndefined();
    expect(accessibleName(undefined)).toBeUndefined();
  });
});

describe("visibleCopy", () => {
  it("paints the caller's own text as written", () => {
    expect(visibleCopy("Save")).toBe("Save");
    expect(visibleCopy("  Shown on invitations.  ")).toBe(
      "  Shown on invitations.  ",
    );
  });

  it("treats a run of spaces as nothing, not as a line of copy", () => {
    // The bug guarded: a help string that arrived from data blank painted a
    // blank line under the label — an empty `<text>` measures 0px but a run of
    // spaces lays out a full line (16px on 0.11.0) — while the control
    // announced nothing, because the description channel drops it.
    expect(visibleCopy("")).toBeUndefined();
    expect(visibleCopy("   ")).toBeUndefined();
    expect(visibleCopy("\t\n")).toBeUndefined();
    expect(visibleCopy(undefined)).toBeUndefined();
  });

  it("agrees with the name rule about which strings say nothing", () => {
    // One decision, two consumers: the painter keeps the caller's spacing while
    // the announcer trims, so the two can only drift in **which** strings are
    // absence. They must not.
    const samples = ["", " ", "   ", "\t", "a", " a ", "0", "…", undefined];
    expect(
      samples.filter(
        (sample) =>
          (visibleCopy(sample) === undefined) !==
          (accessibleName(sample) === undefined),
      ),
    ).toEqual([]);
  });
});

describe("spokenText", () => {
  it("says the caller's words, trimmed", () => {
    expect(spokenText(Option.some("42% uploaded"), "42%")).toBe("42% uploaded");
    expect(spokenText(Option.some("  62 GB "), "62")).toBe("62 GB");
  });

  it("keeps the component's words for an answer that says nothing", () => {
    // The bug guarded: a caller's formatter was published as it arrived, so an
    // answer of `""` — a locale table with no row for this bar — reached
    // `aria-valuetext` as an announcement of nothing while the bar still had a
    // value to report. A blank answer is absence, the rule a name already keeps.
    expect(spokenText(Option.some(""), "42%")).toBe("42%");
    expect(spokenText(Option.some("  "), "42%")).toBe("42%");
    expect(spokenText(Option.none(), "42%")).toBe("42%");
  });
});

describe("fieldHelp", () => {
  it("announces the painted hint while the box is empty", () => {
    expect(fieldHelp({ placeholder: "you@example.com" }, "")).toBe(
      "you@example.com",
    );
    expect(fieldHelp({ placeholder: "  Search projects  " }, "")).toBe(
      "Search projects",
    );
  });

  it("keeps a caller's own description, which is the field's permanent help", () => {
    expect(
      fieldHelp(
        {
          description: "Where notifications go.",
          placeholder: "you@example.com",
        },
        "",
      ),
    ).toBe("Where notifications go.");
    expect(
      fieldHelp(
        {
          description: "Where notifications go.",
          placeholder: "you@example.com",
        },
        "ada@example.com",
      ),
    ).toBe("Where notifications go.");
  });

  it("says nothing once the hint is no longer painted", () => {
    expect(
      fieldHelp({ placeholder: "you@example.com" }, "ada@example.com"),
    ).toBe(undefined);
    expect(fieldHelp({}, "")).toBeUndefined();
  });

  it("treats a blank string as no help on either side", () => {
    expect(fieldHelp({ placeholder: "" }, "")).toBeUndefined();
    expect(fieldHelp({ description: "   ", placeholder: "Search" }, "")).toBe(
      "Search",
    );
    expect(fieldHelp({ description: "   " }, "")).toBeUndefined();
  });
});
