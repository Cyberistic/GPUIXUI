/**
 * The name rule for role-bearing parts (plan 391).
 *
 * The bug these guard: GPUix 0.10.0 reports no name for a `div role="button"`
 * whose text is a child, so a control that does not supply `aria-label` is
 * anonymous to assistive technology. `controlName` must read only plain text,
 * never an element's own label, and never overwrite the caller's name.
 */

import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { controlName, plainText } from "./name.js";

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
