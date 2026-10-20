/**
 * The name rules for role-bearing parts (plans 391, 772).
 *
 * The bug these guard: GPUix 0.10.0 reports no name for a `div role="button"`
 * whose text is a child, so a control that does not supply `aria-label` is
 * anonymous to assistive technology. `controlName` must read only plain text,
 * never an element's own label, and never overwrite the caller's name.
 * `composedName` names a part whose visible content is several strings — a
 * shortcut row's label and its chord — with the same precedence.
 */

import { createElement, Fragment } from "react";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  composedName,
  controlName,
  controlNameFrom,
  plainText,
} from "./name.js";

describe("plainText", () => {
  it("reads a string child", () => {
    expect(plainText("Save")).toBe("Save");
  });

  it("reads strings inside a fragment", () => {
    expect(plainText(createElement(Fragment, null, "Save", " draft"))).toBe(
      "Save draft",
    );
  });

  it("reads array children in order", () => {
    expect(plainText(["Save", " draft"])).toBe("Save draft");
  });

  it("skips elements, including ones that carry their own label", () => {
    expect(
      plainText([
        createElement("span", { key: "icon", "aria-label": "floppy" }, "x"),
        "Save",
      ]),
    ).toBe("Save");
  });

  it("reads numbers as text", () => {
    expect(plainText(42)).toBe("42");
  });
});

describe("controlName", () => {
  it("keeps the caller's aria-label over the child text", () => {
    expect(controlName("Save changes", "Save")).toBe("Save changes");
  });

  it("uses trimmed child text when no label was authored", () => {
    expect(controlName(undefined, "  Save  ")).toBe("Save");
  });

  it("rejects whitespace-only children", () => {
    expect(controlName(undefined, "   ")).toBeUndefined();
  });

  it("rejects children with no plain text", () => {
    expect(
      controlName(undefined, createElement("span", { "aria-label": "icon" })),
    ).toBeUndefined();
  });
});

describe("controlNameFrom", () => {
  it("keeps the caller's trimmed aria-label over every source", () => {
    expect(controlNameFrom(" Save ", ["Placeholder"])).toBe("Save");
  });

  it("takes the first non-empty source in order", () => {
    expect(
      controlNameFrom(undefined, ["  ", "Field label", "Placeholder"]),
    ).toBe("Field label");
  });

  it("has no name when the caller and every source are blank", () => {
    expect(controlNameFrom("  ", [undefined, "   "])).toBeUndefined();
  });
});

describe("composedName", () => {
  it("keeps the caller's aria-label over the composed parts", () => {
    expect(
      Option.getOrNull(composedName("Save the document", ["Save", "⌘ S"])),
    ).toBe("Save the document");
  });

  it("joins the parts with a comma and a space", () => {
    expect(Option.getOrNull(composedName(undefined, ["Save", "⌘ S"]))).toBe(
      "Save, ⌘ S",
    );
  });

  it("drops empty parts instead of leaving a separator behind", () => {
    expect(Option.getOrNull(composedName(undefined, ["Rename", "  "]))).toBe(
      "Rename",
    );
  });

  it("falls back to the parts when the authored label is blank", () => {
    expect(Option.getOrNull(composedName("   ", ["Undo", "⌘ Z"]))).toBe(
      "Undo, ⌘ Z",
    );
  });

  it("has no name when neither the caller nor the parts supply one", () => {
    expect(Option.isNone(composedName(undefined, ["", "  "]))).toBe(true);
  });
});
