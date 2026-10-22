/**
 * Holds the premise the `otp-keys-lifecycle` probe is read against.
 *
 * The field's header states the window contract this probe measures: the native
 * text editor consumes Left/Right/Home/End/Backspace on key **down**, so the
 * field's own navigation runs on key **up**, and a Backspace whose native edit
 * already emptied a cell must not clear the cell before it too. Nothing pinned
 * the readout that makes those visible, the cell ids the window presses, or the
 * README's check count — so a probe could quietly stop asserting the guard.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own probe and prose, not a runtime path.
 */

import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  OTP_KEYS_CHANNELS,
  OTP_KEYS_FIELD,
  OTP_KEYS_LENGTH,
  OTP_KEYS_READOUT,
  otpKeysCellId,
  otpKeysChannels,
  otpKeysReadout,
} from "./otp-keys.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `otpKeysSteps` effect, bounded to the next top-level declaration. */
const otpKeysSteps = (() => {
  const start = scenarios.indexOf("const otpKeysSteps");
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

const state = (
  value: string,
  down: ReadonlyArray<string> = [],
  up: ReadonlyArray<string> = [],
) => ({
  value,
  completes: 0,
  edits: 0,
  down,
  up,
});

describe("the OTP key fixture", () => {
  it("prints one cell per character and the counters", () => {
    expect(otpKeysReadout(state(""))).toBe(
      "value= cells=,,,,, completes=0 edits=0",
    );
    expect(otpKeysReadout(state("12"))).toBe(
      "value=12 cells=1,2,,,, completes=0 edits=0",
    );
    // A value the field should never report is still visible as a seventh
    // character beside the six cells the field paints.
    expect(otpKeysReadout(state("1234567"))).toBe(
      "value=1234567 cells=1,2,3,4,5,6 completes=0 edits=0",
    );
  });

  it("keeps every key in order, so a doubled press is visible", () => {
    // The probe must be able to see the same arrow twice: a field that moved
    // the focus twice for one press would otherwise log exactly one entry.
    expect(otpKeysChannels(state("", ["left", "left"], ["left"]))).toBe(
      "down=left,left up=left",
    );
    expect(otpKeysChannels(state(""))).toBe("down= up=");
  });

  it("names the cells the field itself derives from its test id", () => {
    expect(otpKeysCellId(0)).toBe(`${OTP_KEYS_FIELD}-cell-1`);
    expect(otpKeysCellId(OTP_KEYS_LENGTH - 1)).toBe(`${OTP_KEYS_FIELD}-cell-6`);
  });

  it("addresses itself with readouts no other probe owns", () => {
    expect([OTP_KEYS_READOUT, OTP_KEYS_CHANNELS, OTP_KEYS_FIELD]).toEqual([
      "otp-keys-readout",
      "otp-keys-channels",
      "otp-keys-field",
    ]);
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "otp-keys-lifecycle"),
    ).toEqual([
      {
        id: "otp-keys-lifecycle",
        title: expect.stringContaining("key up"),
        capability: "input",
      },
    ]);
  });

  it("documents the probe and prints the check count it asserts", () => {
    expect(readme).toContain(
      "### `otp-keys-lifecycle` — measured on 0.11.0 here",
    );
    const asserted = otpKeysSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(1);
    const printed = Number(
      /(\d+) checks, `--only otp-keys-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("asserts the key-up contract and the single-cell Backspace", () => {
    expect(otpKeysSteps).toContain(
      "an arrow that is only pressed leaves the focus where it was",
    );
    expect(otpKeysSteps).toContain(
      "releasing the arrow moves the focus one cell left",
    );
    expect(otpKeysSteps).toContain(
      "the key-up of a filled cell deletes nothing",
    );
    expect(otpKeysSteps).toContain(
      "Backspace in an empty cell clears the cell before it",
    );
  });
});
