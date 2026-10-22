import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  describeSync,
  initialSync,
  meteredAvailable,
  setEnabled,
  setMetered,
  setReducedMotion,
  slideMs,
  THUMB_SLIDE_MS,
} from "./switch-preview";

/**
 * The switch preview's settings arithmetic and its slide.
 *
 * The rule a drawing cannot show is the dependent setting: a switch that can no
 * longer act is disabled **and** cleared, so an off master never leaves
 * "metered syncing" reading as on — and turning the master back on does not
 * guess it back on. The slide is the component's 150 ms `easeOut`, read from
 * `Switch.tsx` rather than trusted, because a preview that paints a different
 * duration shows a slide the shipped knob does not perform.
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

  it("takes the slide from the component's own transition", () => {
    // A preview is a picture of the shipped component, so its duration is read
    // from the declaration rather than copied: changing the knob's slide in the
    // primitive must fail here until the page and its CSS follow.
    const declared =
      /const THUMB_SLIDE: MotionTransition = \{\s*duration: ([\d.]+),\s*ease: "easeOut",?\s*\};/.exec(
        source,
      );

    expect(
      declared,
      "Switch.tsx no longer declares THUMB_SLIDE",
    ).not.toBeNull();
    expect(Number(declared?.[1]) * 1000).toBe(THUMB_SLIDE_MS);
    expect(slideMs(false)).toBe(THUMB_SLIDE_MS);
    expect(slideMs(true)).toBe(0);
    // The landing path and the rest-first paint are the two decisions the page
    // teaches, so the source has to keep them.
    expect(source).toContain("stillTransition(THUMB_SLIDE, reducedMotion)");
    expect(source).toContain("initial={false}");
    expect(source).toContain("animate={{ left }}");
  });
});
