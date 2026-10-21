/**
 * Command registry resolution over real key events.
 *
 * The bugs these guard: a registry that ignores the scope stack, one that runs
 * a handler instead of resolving, and one that resolves an unbound chord.
 */

import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type { KeyEvent } from "@gpuix/react";
import { Accelerator, parse } from "./accelerator.js";
import { commandRegistry, type Command } from "./registry.js";

const parsed = (input: string): Accelerator => {
  const result = parse(input);
  if (Result.isFailure(result)) {
    throw new Error(
      `parse(${JSON.stringify(input)}) failed: ${result.failure.message}`,
    );
  }
  return result.success;
};

const keyEvent = (
  name: string,
  modifiers: Partial<{
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    cmd: boolean;
  }> = {},
): KeyEvent => ({
  elementId: 1,
  eventType: "keyDown",
  key: name,
  modifiers: {
    shift: false,
    ctrl: false,
    alt: false,
    cmd: false,
    ...modifiers,
  },
  defaultPrevented: false,
  preventDefault: () => undefined,
  stopPropagation: () => undefined,
});

const command = (
  id: string,
  title: string,
  scope: string,
  accelerator: string,
): Command => ({
  id,
  title,
  scope,
  accelerator: parsed(accelerator),
  handler: Effect.void,
});

const registry = commandRegistry([
  command("global.save", "Save", "global", "mod+s"),
  command("dialog.save", "Save in dialog", "dialog", "mod+s"),
]);

describe("CommandRegistry.resolve", () => {
  it("resolves the scoped command for a chord", () => {
    const resolved = registry.resolve(
      keyEvent("s", { cmd: true }),
      ["dialog", "global"],
      "darwin",
    );
    expect(Option.map(resolved, (command) => command.id)).toEqual(
      Option.some("dialog.save"),
    );
  });

  it("restores the global command when the scope is popped", () => {
    const resolved = registry.resolve(
      keyEvent("s", { cmd: true }),
      ["global"],
      "darwin",
    );
    expect(Option.map(resolved, (command) => command.id)).toEqual(
      Option.some("global.save"),
    );
  });

  it("resolves nothing for an unbound chord", () => {
    expect(
      registry.resolve(
        keyEvent("z", { cmd: true }),
        ["dialog", "global"],
        "darwin",
      ),
    ).toEqual(Option.none());
  });
});
