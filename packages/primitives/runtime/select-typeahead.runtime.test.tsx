/**
 * Type-ahead on a closed `Select`, in the real GPUix runtime.
 *
 * The contract this guards (plan `731`): a focused select answers a typed
 * prefix by committing the next enabled option whose text starts with it, the
 * way a desktop select does. The bug classes are the ones a single-key test
 * cannot see:
 *
 * 1. a repeated letter must advance to the next match, not select the first
 *    one again (a user typing "e" twice expects Europe then Estonia);
 * 2. a two-letter prefix ("u", "g") must match `Uganda`, so the 500 ms buffer
 *    is shared between keystrokes;
 * 3. a disabled option and a letter with no match report nothing, and a miss
 *    must not poison the next letter;
 * 4. a modifier chord and a held key are not typing (the application owns the
 *    chord, and a held key repeats natively);
 * 5. the caller's `onKeyDown` still receives every key — the wrapper composes
 *    its rule instead of replacing the caller's handler.
 *
 * Measured on the pinned release build: a simulated printable key arrives as
 * `{ key: "e", keyChar: undefined }`, so the rule's fallback to `key` is what
 * makes these cases possible (plan `731` §1).
 */

import { expect, it } from "vitest";
import type { EventPayload } from "@gpuix/react";
import { Select } from "../src/components/Select.js";
import { Surface, openWindow } from "./fixture.js";

const OPTIONS = [
  { value: "eu", label: "Europe" },
  { value: "ee", label: "Estonia" },
  { value: "us", label: "United States" },
  { value: "ug", label: "Uganda" },
  { value: "gr", label: "Greece" },
  { value: "b", label: "Beta", disabled: true },
] as const;

interface Scene {
  readonly runtime: Awaited<ReturnType<typeof openWindow>>;
  readonly values: ReadonlyArray<string>;
  readonly keys: ReadonlyArray<string>;
}

/** A closed select, its reported values and the keys its caller saw. */
const scene = async (): Promise<Scene> => {
  const runtime = await openWindow();
  const values: string[] = [];
  const keys: string[] = [];
  runtime.render(
    <Surface>
      <Select
        testId="s"
        label="Country"
        placeholder="Pick a country"
        options={OPTIONS}
        onValueChange={(value) => values.push(value)}
        onKeyDown={(event: EventPayload) => keys.push(event.key ?? "")}
      />
    </Surface>,
  );
  return { runtime, values, keys };
};

/** Type one key and let the value reach the paint before the next one. */
const type = (scene: Scene, key: string, held = false): void => {
  scene.runtime.keyDown("s-trigger", key, held);
  scene.runtime.flush();
};

it("commits the first option whose label starts with the typed letter", async () => {
  const current = await scene();
  type(current, "e");
  expect(current.values).toEqual(["eu"]);
});

it("advances to the next match when the same letter is typed again", async () => {
  const current = await scene();
  type(current, "e");
  type(current, "e");
  expect(current.values).toEqual(["eu", "ee"]);
});

it("matches a two-letter prefix from consecutive keystrokes", async () => {
  const current = await scene();
  type(current, "u");
  type(current, "g");
  expect(current.values).toEqual(["us", "ug"]);
});

it("reports nothing for a disabled option", async () => {
  const current = await scene();
  type(current, "b");
  expect(current.values).toEqual([]);
});

it("recovers from a miss, so the next letter still matches", async () => {
  const current = await scene();
  type(current, "z");
  type(current, "e");
  expect(current.values).toEqual(["eu"]);
});

it("refuses a modifier chord but still calls the caller's handler", async () => {
  const current = await scene();
  current.runtime.keyDown("s-trigger", "cmd-e");
  current.runtime.flush();
  expect(current.values).toEqual([]);
  expect(current.keys).toEqual(["e"]);
});

it("refuses a held key, which repeats natively", async () => {
  const current = await scene();
  type(current, "e", true);
  expect(current.values).toEqual([]);
});

it("calls the caller's handler for every key the wrapper reads", async () => {
  const current = await scene();
  type(current, "e");
  type(current, "u");
  type(current, "g");
  expect(current.keys).toEqual(["e", "u", "g"]);
});
