/**
 * The one change callback a value control calls.
 *
 * `docs/component-api.md` §2 names `onValueChange` for a value part and
 * `onCheckedChange` for a boolean one; `onChange` is the deprecated alias kept
 * for one release. The bug this guards is a control that quietly keeps calling
 * only the alias, so a caller who migrates stops being notified.
 *
 * The helper's precedence is pinned directly, and every value control is held to
 * routing its props through it — a component that reads `props.onChange` itself
 * would pass its own tests and fail here.
 *
 * `node:fs` is used only because this is a test-time repository check, the same
 * boundary `docs.test.ts` and `inventory.test.ts` use; the package's runtime
 * source stays on Effect's platform services.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { valueChange } from "./internal.js";

/** A component whose value is a callback, not a boolean. */
const VALUE_CONTROLS = [
  "Input.tsx",
  "NumberField.tsx",
  "OTPField.tsx",
  "RadioGroup.tsx",
  "Rating.tsx",
  "Select.tsx",
  "Slider.tsx",
] as const;

const read = (name: string): string =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");

describe("valueChange", () => {
  it("runs the new callback name and not the deprecated alias", () => {
    let next = 0;
    let alias = 0;
    valueChange({
      onValueChange: () => {
        next += 1;
      },
      onChange: () => {
        alias += 1;
      },
    })?.(1);
    expect([next, alias]).toStrictEqual([1, 0]);
  });

  it("still calls the alias when it is the only one", () => {
    let alias = 0;
    valueChange({
      onChange: () => {
        alias += 1;
      },
    })?.("x");
    expect(alias).toBe(1);
  });

  it("has no callback when neither name is given", () => {
    expect(valueChange({})).toBeUndefined();
  });
});

describe("value controls", () => {
  it("resolve their callback through valueChange, not the raw prop", () => {
    expect(
      Arr.filter(
        VALUE_CONTROLS,
        (name) =>
          !Str.includes("valueChange(")(read(name)) ||
          Str.includes("props.onChange")(read(name)),
      ),
    ).toStrictEqual([]);
  });

  it("type their props with the shared change contract", () => {
    // A floor, so a rename that stops matching cannot pass silently.
    expect(Arr.length(VALUE_CONTROLS)).toBeGreaterThan(5);
    expect(
      Arr.filter(
        VALUE_CONTROLS,
        (name) => !Str.includes("ValueChangeProps<")(read(name)),
      ),
    ).toStrictEqual([]);
  });
});
