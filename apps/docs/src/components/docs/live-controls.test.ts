import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Three controls that claimed an effect and had none.
 *
 * Guarded bugs:
 *
 * - the copy button's preview flipped to "Copied" and wrote nothing to the
 *   clipboard — the one thing a copy button may not do;
 * - the countdown preview printed two still frames, so a page about a clock
 *   showed time that never moved;
 * - the alert's action was rendered inside the description paragraph, so "Try
 *   again" sat on the text's baseline instead of in a row under it.
 */

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("the copy button's preview", () => {
  const source = read("./copy-button-demo.tsx");

  it("writes the text before it acknowledges the press", () => {
    expect(source).toContain("if (!(await writeClipboard(token))) return;");
    expect(source.indexOf("writeClipboard(token)")).toBeLessThan(
      source.indexOf("setCopied(true)"),
    );
  });
});

describe("the countdown's preview", () => {
  const source = read("./countdown-demo.tsx");

  it("re-reads its deadline once a second", () => {
    expect(source).toContain("setInterval");
    expect(source).toContain("TICK_MS");
    expect(source).toContain("clearInterval");
  });

  it("prints the package's own clock text", () => {
    // One formatter: the drawing must not carry a second copy of the arithmetic.
    expect(source).toContain("formatCountdown(");
    expect(source).toContain('"@gpuixui/components/countdown/logic"');
  });
});

describe("the alert's preview", () => {
  const source = read("./demos.tsx");

  it("keeps the action out of the description", () => {
    expect(source).toContain('<p className="gx-alert-desc">{description}</p>');
    expect(source).toContain('<div className="gx-alert-action">{action}</div>');
  });
});
