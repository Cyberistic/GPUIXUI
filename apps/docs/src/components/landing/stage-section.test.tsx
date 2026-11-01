import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Stage } from "./stage";

/**
 * The stage that replaced the management console.
 *
 * The console was the whole product shrunk into a card: every row real, the
 * action nowhere. The stage keeps one action — deploy — and the states it
 * changes, which is the crop a homepage can read. This holds the crop: one
 * window, three services, one button, a toast, and none of the retired console.
 */

const markup = renderToStaticMarkup(<Stage />);
const source = readFileSync(
  fileURLToPath(new URL("./stage.tsx", import.meta.url)),
  "utf8",
);

const count = (pattern: RegExp): number => markup.match(pattern)?.length ?? 0;

describe("the landing's stage", () => {
  it("shows one window and the action it answers", () => {
    expect(count(/class="landing-stage-window"/g)).toBe(1);
    expect(markup).toContain("Deploy</button>");
    expect(markup).toContain('class="landing-stage-progress"');
    expect(count(/class="landing-stage-row"/g)).toBe(3);
    for (const service of ["api", "web", "workers"]) {
      expect(markup).toContain(`>${service}<`);
    }
  });

  it("ends with a toast, not a screenshot of a console", () => {
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Deployed");
    expect(markup).not.toContain("Every deploy, one screen.");
    expect(markup).not.toContain("Browser preview of the native composition");
    expect(markup).not.toContain('class="gx-mgmt"');
  });

  it("loops through the deploy beats and rests still for reduced motion", () => {
    expect(source).toContain("const BEATS");
    expect(source).toContain("usePrefersReducedMotion");
    expect(source).toContain("setBeat((index) => (index + 1) % BEATS.length)");
    // The reduced path has a last frame to land on, so it never animates.
    expect(source).toContain("if (reduced) return undefined;");
  });

  it("lets the reader press Deploy again", () => {
    expect(markup).toContain(
      'class="landing-btn landing-btn-primary landing-stage-button"',
    );
    expect(source).toContain("const restart = () =>");
    expect(source).toMatch(/onClick=\{restart\}/);
  });
});
