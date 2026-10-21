/**
 * Keymap resolution with scope precedence.
 *
 * The bug these guard: a resolver that scans bindings instead of the scope
 * stack, so a dialog's binding for a chord would not shadow the global one, or a
 * popped scope would not restore it.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { Accelerator, parse } from "./accelerator.js";
import { resolve, type KeyBinding, type Keymap } from "./keymap.js";

const parsed = (input: string): Accelerator => {
  const result = parse(input);
  if (Result.isFailure(result)) {
    throw new Error(
      `parse(${JSON.stringify(input)}) failed: ${result.failure.message}`,
    );
  }
  return result.success;
};

const binding = (
  accelerator: string,
  commandId: string,
  scope: string,
): KeyBinding => ({
  accelerator: parsed(accelerator),
  commandId,
  scope,
});

const keymap: Keymap = {
  bindings: [
    binding("mod+k", "global.save", "global"),
    binding("mod+k", "dialog.save", "dialog"),
    binding("mod+j", "global.jump", "global"),
  ],
};

describe("resolve", () => {
  it("lets a dialog binding shadow the global one for the same chord", () => {
    expect(
      resolve(keymap, ["dialog", "global"], parsed("mod+k"), "darwin"),
    ).toEqual(Option.some("dialog.save"));
  });

  it("restores the global binding once the scope is popped", () => {
    expect(resolve(keymap, ["global"], parsed("mod+k"), "darwin")).toEqual(
      Option.some("global.save"),
    );
  });

  it("resolves a chord with no scoped shadow", () => {
    expect(
      resolve(keymap, ["dialog", "global"], parsed("mod+j"), "darwin"),
    ).toEqual(Option.some("global.jump"));
  });

  it("returns None for an unmatched chord", () => {
    expect(
      resolve(keymap, ["dialog", "global"], parsed("mod+z"), "darwin"),
    ).toEqual(Option.none());
  });

  it("honours the stack order: a reversed stack restores the global binding", () => {
    expect(
      resolve(keymap, ["global", "dialog"], parsed("mod+k"), "darwin"),
    ).toEqual(Option.some("global.save"));
  });
});
