import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The confirmation drawing's failure block.
 *
 * The bug these guard: the tone block appeared at its full height in one frame,
 * so the dialog jumped between the pending and failed frames, and a retry
 * unmounted it before it could collapse. The drawing now grows the block on the
 * toast's move curve, keeps the last failure painted while it closes, and snaps
 * under the reduced preference.
 */

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const css = read("../../styles/demos.css").replace(/\/\*[\s\S]*?\*\//g, "");
const drawing = read("./demos.tsx");

/** The declarations of the first `selector { … }` block. */
const block = (selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) =>
      (selectors ?? "").split(",").some((one) => one.trim() === selector),
    )
    .map(([, , body]) => body ?? "")[0] ?? "";

describe("the confirmation drawing's failure block", () => {
  it("grows and collapses on the toast's move curve", () => {
    const closed = block(".gx-confirm-error");
    expect(closed).toContain("grid-template-rows: 0fr");
    expect(closed).toContain("opacity: 0");
    expect(closed).toContain("260ms cubic-bezier(0.22, 1, 0.36, 1)");

    expect(block('.gx-confirm-error[data-open="true"]')).toContain(
      "grid-template-rows: 1fr",
    );
    expect(block('.gx-confirm-error[data-open="true"]')).toContain(
      "opacity: 1",
    );
  });

  it("keeps the last failure painted while the block closes", () => {
    // The slot is always rendered so the collapse has a box; the last error is
    // the content it closes over.
    expect(drawing).toContain("data-open={error !== undefined}");
    expect(drawing).toContain("failure.current");
    expect(drawing).toContain("gx-confirm-error-inner");
  });

  it("paints the settled frame at once under the reduced preference", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.gx-confirm-error,[\s\S]*?transition: none;/,
    );
  });
});
