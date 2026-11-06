import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
