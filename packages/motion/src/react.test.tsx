/**
 * The React entry's first published frame.
 *
 * The bug this guards: `options.initial` is a number the caller computed — a
 * measured height, a count that has not arrived — and the hook published it
 * verbatim, so a value it could not read (`NaN`) reached the caller as the
 * frame the runtime paints: the runtime draws a `NaN` inset as nothing, and a
 * consumer that formats the number paints the word `NaN`. The retained
 * `MotionValue` repaired the same value to `0`, so the hook and the value it
 * drives could disagree about the first frame.
 *
 * `renderToStaticMarkup` renders the **first** frame and runs no effect, which
 * is the frame the defect lives in: the effect that samples the retained value
 * lands after it.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { tween } from "./motion.js";
import { useMotion, useTransition } from "./react.js";

/** The frame a hook publishes, as the runtime would read it. */
const Frame = ({
  target,
  initial,
}: {
  readonly target: number;
  readonly initial?: number;
}) => {
  const { value } = useMotion(target, tween(300), { initial });
  return <>{String(value)}</>;
};

/** The frame a tween hook publishes, as the runtime would read it. */
const TWEENFrame = ({
  target,
  initial,
}: {
  readonly target: number;
  readonly initial?: number;
}) => {
  const { value } = useTransition(target, { durationMs: 300 }, { initial });
  return <>{String(value)}</>;
};

describe("the first published frame", () => {
  it("is the value the caller asked for", () => {
    expect(renderToStaticMarkup(<Frame target={100} initial={0} />)).toBe("0");
    expect(renderToStaticMarkup(<Frame target={100} initial={40} />)).toBe(
      "40",
    );
  });

  it("is the target when no initial is given", () => {
    // The documented default: a hook mounted at rest paints without an entry
    // run, so the first frame is the target itself.
    expect(renderToStaticMarkup(<Frame target={100} />)).toBe("100");
  });

  it("is a number the runtime can paint when the initial cannot be read", () => {
    // The defect: `NaN` reached the caller as the first frame.
    expect(
      renderToStaticMarkup(<Frame target={100} initial={Number.NaN} />),
    ).toBe("100");
  });

  it("is a number the runtime can paint when the target cannot be read", () => {
    expect(renderToStaticMarkup(<Frame target={Number.NaN} />)).not.toContain(
      "NaN",
    );
  });

  it("is the same for the tween hook", () => {
    expect(renderToStaticMarkup(<TWEENFrame target={100} initial={0} />)).toBe(
      "0",
    );
    expect(
      renderToStaticMarkup(<TWEENFrame target={100} initial={Number.NaN} />),
    ).toBe("100");
  });
});
