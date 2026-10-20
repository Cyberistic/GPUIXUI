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
 *    its rule instead of replacing the caller's handler;
 * 6. the search starts after the **last match**, not the accepted value — the
 *    rule every roving composite follows (plan `359`). A controlled parent that
 *    defers or rejects a report must not trap a repeated letter on one option,
 *    and a value that changes between keystrokes must move the cursor with it
 *    (plan `732`).
 * 7. that carry-over belongs to one prefix: a letter typed after the 500 ms
 *    window begins a new prefix and searches from the current value, not from
 *    where the last prefix ended (plan `756`).
 *
 * Measured on the pinned release build: a simulated printable key arrives as
 * `{ key: "e", keyChar: undefined }`, so the rule's fallback to `key` is what
 * makes these cases possible (plan `731` §1).
 */

import { expect, it } from "vitest";
import { Duration } from "effect";
import type { EventPayload } from "@gpuix/react";
import { Select } from "../src/components/Select.js";
import { TYPEAHEAD_WINDOW } from "../src/core/typeahead.js";
import { Surface, openWindow, sleep } from "./fixture.js";

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

/**
 * A controlled parent that records every report and never applies one.
 *
 * This is the plan-`359` scene for the keyboard cursor: the value the component
 * reads stays where the parent put it, so a rule that searches from the value
 * repeats one match forever.
 */
const deferring = async (
  value: string,
  options: ReadonlyArray<{ readonly value: string; readonly label: string }>,
): Promise<{
  readonly runtime: Awaited<ReturnType<typeof openWindow>>;
  readonly values: ReadonlyArray<string>;
  readonly show: (next: string) => void;
}> => {
  const runtime = await openWindow();
  const values: string[] = [];
  const show = (next: string): void => {
    runtime.render(
      <Surface>
        <Select
          testId="s"
          label="Country"
          options={options}
          value={next}
          onValueChange={(reported) => values.push(reported)}
        />
      </Surface>,
    );
  };
  show(value);
  return { runtime, values, show };
};

it("advances from the last match when a controlled parent defers the value", async () => {
  // `us` is not an `e` match, so every match differs from the pinned value and
  // each one is reported; the pinned value never moves, which is the defect.
  const current = await deferring("us", OPTIONS);
  const press = (): void => {
    current.runtime.keyDown("s-trigger", "e");
    current.runtime.flush();
  };
  press();
  press();
  press();
  press();
  // Europe(0) → Estonia(1) → wrap Europe(0) → Estonia(1). Searching from the
  // unapplied value would report Europe every time.
  expect(current.values).toEqual(["eu", "ee", "eu", "ee"]);
});

it("moves the cursor when the value changes between keystrokes", async () => {
  const options = [
    { value: "eu", label: "Europe" },
    { value: "ee", label: "Estonia" },
    { value: "ec", label: "Ecuador" },
  ] as const;
  const current = await deferring("eu", options);
  const press = (): void => {
    current.runtime.keyDown("s-trigger", "e");
    current.runtime.flush();
  };
  press();
  // The parent moved the value without reporting: the cursor follows it to
  // Ecuador (2), so the next prefix wraps to Europe instead of landing on
  // Ecuador again from Estonia's stale position.
  current.show("ec");
  current.runtime.flush();
  press();
  expect(current.values).toEqual(["ee", "eu"]);
});

it("starts a new prefix from the current value after the window", async () => {
  // The pinned value is Estonia. A pause ends the prefix, so the third key
  // begins a new session and searches from Estonia — Ecuador. Carrying the
  // last match (Europe) forward landed on the value already shown instead, and
  // the key reported nothing (measured, plan `756`).
  const options = [
    { value: "eu", label: "Europe" },
    { value: "ee", label: "Estonia" },
    { value: "ec", label: "Ecuador" },
  ] as const;
  const current = await deferring("ee", options);
  const press = (): void => {
    current.runtime.keyDown("s-trigger", "e");
    current.runtime.flush();
  };
  press();
  press();
  await sleep(Duration.toMillis(TYPEAHEAD_WINDOW) + 150);
  press();
  expect(current.values).toEqual(["ec", "eu", "ec"]);
});
