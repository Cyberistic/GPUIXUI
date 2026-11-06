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
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import { capture, type Take, virtualTime } from "./take.js";

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
const rest: Take = {
  ...press,
  pointer: [{ frame: 0, aim: { testId: "switch" } }],
};

const shoot = async (take: Take = press): Promise<ReadonlyArray<Buffer>> => {
  const dir = mkdtempSync(join(tmpdir(), "take-"));
  await capture(take, dir);
  return Array.from({ length: take.frames }, (_, frame) =>
    readFileSync(join(dir, `${String(frame).padStart(4, "0")}.png`)),
  );
};

describe("capture", async () => {
  const first = await shoot();

  it("is repeatable frame for frame", async () => {
    const second = await shoot();
    first.forEach((frame, index) =>
      expect(frame.equals(second[index]!)).toBe(true),
    );
  });

  it("shows the press from its frame on, not before", async () => {
    const control = await shoot(rest);
    expect(first[2]!.equals(control[2]!)).toBe(true);
    expect(first[7]!.equals(control[7]!)).toBe(false);
  });
});

/**
 * Guards: the capture loop is synchronous, so an animation on `setTimeout` and
 * `performance.now` never ran and every chart was captured with its marks at zero.
 */
describe("virtualTime", () => {
  it("runs due timers in order, on the clock they asked for", () => {
    const time = virtualTime();
    const start = performance.now();
    const ran: Array<readonly [string, number]> = [];
    setTimeout(() => ran.push(["late", performance.now() - start]), 40);
    setTimeout(() => ran.push(["early", performance.now() - start]), 10);
    time.advance(20);
    const afterTwenty = ran.length;
    time.advance(30);
    time.restore();
    expect(afterTwenty).toBe(1);
    expect(ran).toEqual([
      ["early", 10],
      ["late", 40],
    ]);
  });

  it("drives a timer that re-arms itself, and a cancel holds", () => {
    const time = virtualTime();
    let ticks = 0;
    const tick = () => {
      ticks += 1;
      setTimeout(tick, 16);
    };
    setTimeout(tick, 16);
    const cancelled = setTimeout(() => {
      ticks = -100;
    }, 8);
    clearTimeout(cancelled);
    time.advance(50);
    time.restore();
    expect(ticks).toBe(3);
  });
});

/** Guards: Effect-driven state (a sidebar, a toast) never arrived in a synchronous capture. */
describe("a capture", () => {
  it("delivers a change that arrives on the event loop", async () => {
    const dir = mkdtempSync(join(tmpdir(), "take-"));
    const Late = () => {
      const [on, setOn] = useState(false);
      useEffect(() => {
        void Promise.resolve().then(() => setOn(true));
      }, []);
      return (
        <div
          style={{
            width: 100,
            height: 100,
            backgroundColor: on ? "#FF0000" : "#0000FF",
          }}
        />
      );
    };
    await capture(
      { width: 100, height: 100, frames: 3, view: () => <Late /> },
      dir,
    );
    const painted = join(mkdtempSync(join(tmpdir(), "take-")));
    await capture(
      {
        width: 100,
        height: 100,
        frames: 1,
        view: () => (
          <div
            style={{ width: 100, height: 100, backgroundColor: "#FF0000" }}
          />
        ),
      },
      painted,
    );
    // Byte for byte the static red: the blue only survives if the change never came.
    expect(
      readFileSync(join(dir, "0002.png")).equals(
        readFileSync(join(painted, "0000.png")),
      ),
    ).toBe(true);
  });
});
