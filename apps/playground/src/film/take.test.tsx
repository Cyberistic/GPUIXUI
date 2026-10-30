/**
 * The film's take runner. The bugs it guards: a capture that differs run to run
 * (an unpaused clock), and scripted input that never reached the tree (a press
 * that changed nothing, or changed it before the frame it was scripted on).
 */
import { Switch } from "@gpuixui/primitives";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { capture, type Take } from "./take.js";

const press: Take = {
  width: 200,
  height: 100,
  frames: 8,
  view: () => (
    <ThemeProvider theme={lightTheme}>
      <Switch testId="switch" label="Wi-Fi" />
    </ThemeProvider>
  ),
  pointer: [
    { frame: 0, aim: { testId: "switch" } },
    { frame: 3, aim: { testId: "switch" }, down: true },
    { frame: 4, aim: { testId: "switch" } },
  ],
};

/** The same take with the pointer resting on the switch and never pressing. */
const rest: Take = { ...press, pointer: [{ frame: 0, aim: { testId: "switch" } }] };

const shoot = (take: Take = press): ReadonlyArray<Buffer> => {
  const dir = mkdtempSync(join(tmpdir(), "take-"));
  capture(take, dir);
  return Array.from({ length: take.frames }, (_, frame) =>
    readFileSync(join(dir, `${String(frame).padStart(4, "0")}.png`)),
  );
};

describe("capture", () => {
  const first = shoot();

  it("is repeatable frame for frame", () => {
    const second = shoot();
    first.forEach((frame, index) => expect(frame.equals(second[index]!)).toBe(true));
  });

  it("shows the press from its frame on, not before", () => {
    const control = shoot(rest);
    expect(first[2]!.equals(control[2]!)).toBe(true);
    expect(first[7]!.equals(control[7]!)).toBe(false);
  });
});
