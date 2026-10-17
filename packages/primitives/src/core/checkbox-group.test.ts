/**
 * The checkbox group's selection rules.
 *
 * The bugs to guard are the ones hand-written parents produce: a select-all
 * that looks checked while an option is off, a clear that silently drops a
 * value the user could not toggle, and an `onValueChange` fired for a press that
 * changed nothing.
 */

import { describe, expect, it } from "vitest";
import {
  enabledValues,
  groupParentState,
  isGroupSelected,
  toggleGroupAll,
  toggleGroupValue,
  type CheckboxGroupOption,
} from "./checkbox-group.js";

const options: ReadonlyArray<CheckboxGroupOption> = [
  { value: "email", label: "Email" },
  { value: "push", label: "Push" },
  { value: "sms", label: "SMS", disabled: true },
];

describe("toggleGroupValue", () => {
  it("appends a value that is not selected", () => {
    expect(toggleGroupValue(["email"], "push")).toStrictEqual([
      "email",
      "push",
    ]);
  });

  it("removes exactly the value that is selected", () => {
    expect(toggleGroupValue(["email", "push"], "email")).toStrictEqual([
      "push",
    ]);
  });

  it("does not disturb a value the options do not contain", () => {
    expect(toggleGroupValue(["external"], "push")).toStrictEqual([
      "external",
      "push",
    ]);
    expect(toggleGroupValue(["external"], "external")).toStrictEqual([]);
  });
});

describe("groupParentState", () => {
  it("is unchecked when nothing is selected", () => {
    expect(groupParentState([], options)).toBe("unchecked");
  });

  it("is indeterminate while some enabled options are selected", () => {
    expect(groupParentState(["email"], options)).toBe("indeterminate");
  });

  it("is checked when every enabled option is selected", () => {
    expect(groupParentState(["email", "push"], options)).toBe("checked");
  });

  it("ignores a disabled option's value in both directions", () => {
    expect(groupParentState(["email", "push", "sms"], options)).toBe("checked");
    expect(groupParentState(["sms"], options)).toBe("unchecked");
  });

  it("is unchecked when no option can be selected", () => {
    expect(
      groupParentState(
        ["sms"],
        [{ value: "sms", label: "SMS", disabled: true }],
      ),
    ).toBe("unchecked");
  });

  it("lists only the enabled values, in option order", () => {
    expect(enabledValues(options)).toStrictEqual(["email", "push"]);
  });
});

describe("toggleGroupAll", () => {
  it("selects every enabled value and leaves disabled ones alone", () => {
    expect(toggleGroupAll(["sms"], options)).toStrictEqual([
      "sms",
      "email",
      "push",
    ]);
  });

  it("clears the enabled values only", () => {
    expect(toggleGroupAll(["email", "push", "sms"], options)).toStrictEqual([
      "sms",
    ]);
  });

  it("keeps the same array when there is nothing to toggle", () => {
    const current = ["sms"] as const;
    expect(
      toggleGroupAll(current, [{ value: "sms", label: "SMS", disabled: true }]),
    ).toBe(current);
  });

  it("reports membership for one value", () => {
    expect(isGroupSelected(["email"], "email")).toBe(true);
    expect(isGroupSelected(["email"], "push")).toBe(false);
  });
});
