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

/**
 * The switch preview's settings arithmetic and its slide.
 *
 * The rule a drawing cannot show is the dependent setting: a switch that can no
 * longer act is disabled **and** cleared, so an off master never leaves
 * "metered syncing" reading as on — and turning the master back on does not
 * guess it back on. The slide is the timing the component declares: `Switch.tsx`
 * asks the table for a level and a phase, and the preview's duration and curve
 * are resolved through the same table here, so a preview that paints a
 * different slide from the shipped knob fails this file before a reader sees it.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

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

/** The table's levels and phases, read by name so the declaration stays the source. */
const levelMs: Readonly<Record<string, number>> = motionLevels;
const phaseEase: Readonly<Record<string, MotionEasingName>> = motionEasings;

/**
 * The slide the component's `THUMB_SLIDE` names, resolved through the table it
 * reads — the level's milliseconds and the phase's curve, not a retyped number.
 */
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

/** A curve name in the spelling a CSS `transition` takes. */
const cssEaseOf = (ease: string): string =>
  ease.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe("the switch preview", () => {
  it("starts with a live master and the dependent off", () => {
    // The panel opens where a reader's own settings usually sit: syncing, but
    // not over a metered connection.
    expect(initialSync).toEqual({
      enabled: true,
      metered: false,
      reducedMotion: false,
    });
  });

  it("clears the dependent setting when the master stops syncing", () => {
    // The bug this guards: a dependent left on under an off master. It is still
    // painted (disabled), but it reads as an instruction the app is not
    // following.
    const on = { ...initialSync, metered: true };

    expect(setEnabled(on, false)).toEqual({
      enabled: false,
      metered: false,
      reducedMotion: false,
    });
  });

  it("refuses a dependent press while the master is off", () => {
    // The control is disabled, so the UI cannot send this — but the model must
    // not depend on the UI to keep its invariant.
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
    // The two settings are independent: the master is about syncing, not about
    // how the panel animates.
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
    // A preview is a picture of the shipped component, so its duration and curve
    // are resolved from the declaration rather than copied: changing the knob's
    // timing in the primitive must fail here until the page and its CSS follow.
    // The bug this guards is the drift it found — the component moved the thumb
    // onto the timing table's `standard` phase (160 ms `easeInOut`) while the
    // preview and its style sheet still painted 150 ms `easeOut`.
    const slide = declaredSlide();

    expect(slide.ms).toBe(THUMB_SLIDE_MS);
    expect(cssEaseOf(slide.ease)).toBe(THUMB_SLIDE_CSS_EASE);
    expect(slideMs(false)).toBe(THUMB_SLIDE_MS);
    expect(slideMs(true)).toBe(0);
    expect(css).toContain(
      `transition: left ${THUMB_SLIDE_MS}ms ${THUMB_SLIDE_CSS_EASE}`,
    );
    // The curated page is the only live Switch page (the package's twin
    // redirects to it), so the movement a reader cannot see in a still drawing
    // has to be stated there, in the page's own numbers.
    expect(page).toContain("`reducedMotion`");
    expect(page).toContain(`${slide.ms} ms`);
    expect(page).toContain("`standard` curve");
    // The landing path and the rest-first paint are the two decisions the page
    // teaches, so the source has to keep them.
    expect(source).toContain("stillTransition(THUMB_SLIDE, reducedMotion)");
    expect(source).toContain("initial={false}");
    expect(source).toContain("animate={{ left }}");
  });
});
