import { readFileSync } from "node:fs";
import {
  motionEasings,
  motionLevels,
  type MotionEasingName,
} from "../../../../../packages/motion/src/timing.js";
import { describe, expect, it } from "vitest";
import {
  describeSync,
  initialSync,
  meteredAvailable,
  setEnabled,
  setMetered,
  setReducedMotion,
  slideMs,
  THUMB_SLIDE_CSS_EASE,
  THUMB_SLIDE_MS,
} from "./switch-preview";

const source = readFileSync(
  new URL(
    "../../../../../packages/primitives/src/components/Switch.tsx",
    import.meta.url,
  ),
  "utf8",
);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const page = readFileSync(
  new URL("../../../content/docs/components/switch.mdx", import.meta.url),
  "utf8",
);

const levelMs: Readonly<Record<string, number>> = motionLevels;
const phaseEase: Readonly<Record<string, MotionEasingName>> = motionEasings;

const declaredSlide = (): { readonly ms: number; readonly ease: string } => {
  const declared =
    /const THUMB_SLIDE: MotionTransition = motionTiming(?:<MotionLevel>)?\(\s*"(\w+)",\s*\{\s*phase: "(\w+)",?\s*\}\);/.exec(
      source,
    );

  expect(declared, "Switch.tsx no longer declares THUMB_SLIDE").not.toBeNull();

  const level = declared?.[1] ?? "";
  const phase = declared?.[2] ?? "";
  const ms = levelMs[level];
  const ease = phaseEase[phase];

  expect(ms, `the timing table does not name the level ${level}`).toBeDefined();
  expect(
    ease,
    `the timing table does not name the phase ${phase}`,
  ).toBeDefined();

  return { ms: ms ?? 0, ease: ease ?? "" };
};

const cssEaseOf = (ease: string): string =>
  ease.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe("the switch preview", () => {
  it("starts with a live master and the dependent off", () => {
    expect(initialSync).toEqual({
      enabled: true,
      metered: false,
      reducedMotion: false,
    });
  });

  it("clears the dependent setting when the master stops syncing", () => {
    const on = { ...initialSync, metered: true };

    expect(setEnabled(on, false)).toEqual({
      enabled: false,
      metered: false,
      reducedMotion: false,
    });
  });

  it("refuses a dependent press while the master is off", () => {
    const off = setEnabled(initialSync, false);

    expect(setMetered(off, true)).toEqual(off);
  });

  it("turns the master back on without restoring the dependent", () => {
    const off = setEnabled({ ...initialSync, metered: true }, false);
    const backOn = setEnabled(off, true);

    expect(backOn.enabled).toBe(true);
    expect(backOn.metered).toBe(false);
  });

  it("keeps the motion preference when sync is turned off", () => {
    const reduced = setReducedMotion(initialSync, true);

    expect(setEnabled(reduced, false).reducedMotion).toBe(true);
  });

  it("makes the dependent available exactly while the master is on", () => {
    expect(meteredAvailable(initialSync)).toBe(true);
    expect(meteredAvailable(setEnabled(initialSync, false))).toBe(false);
  });

  it("prints the sync state the settings describe", () => {
    expect(describeSync(setEnabled(initialSync, false))).toBe(
      "Sync is off. Nothing leaves this machine.",
    );
    expect(describeSync(initialSync)).toBe(
      "Syncing on unmetered networks only.",
    );
    expect(describeSync(setMetered(initialSync, true))).toBe(
      "Syncing on any network, metered ones included.",
    );
  });

  it("takes the slide from the component's own timing", () => {
    const slide = declaredSlide();

    expect(slide.ms).toBe(THUMB_SLIDE_MS);
    expect(cssEaseOf(slide.ease)).toBe(THUMB_SLIDE_CSS_EASE);
    expect(slideMs(false)).toBe(THUMB_SLIDE_MS);
    expect(slideMs(true)).toBe(0);
    expect(css).toContain(
      `transition: left ${THUMB_SLIDE_MS}ms ${THUMB_SLIDE_CSS_EASE}`,
    );

    expect(page).toContain("`reducedMotion`");
    expect(page).toContain(`${slide.ms} ms`);
    expect(page).toContain("`standard` curve");

    expect(source).toContain("stillTransition(THUMB_SLIDE, reducedMotion)");
    expect(source).toContain("initial={false}");
    expect(source).toContain("animate={{ left }}");
  });
});
