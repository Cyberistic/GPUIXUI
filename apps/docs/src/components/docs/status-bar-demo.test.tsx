import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { getTheme } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { statusToneOf, toneForeground } from "@/lib/shell-logic";
import {
  STATUS_BAR_CENTER,
  STATUS_BAR_LEFT,
  STATUS_BAR_RIGHT,
  StatusBarFrame,
  toneRole,
  type StatusBarItem,
} from "./status-bar-demo";

/**
 * The Status bar preview.
 *
 * `packages/shell/docs/status-bar.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts` and the page itself carries no
 * `<ComponentPreview>`. These cases hold the bar to `@gpuixui/shell`'s
 * `statusToneOf` and `toneForeground`: a named tone paints the tone's readable
 * role, and the bar's own tone keeps the bar's foreground.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The declarations of the first `selector { … }` block in a style sheet. */
const block = (css: string, selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  const end = css.indexOf("}", start);
  return end === -1 ? "" : css.slice(start, end);
};

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

const theme = getTheme("dark");

const bar = (
  left: ReadonlyArray<StatusBarItem>,
  right: ReadonlyArray<StatusBarItem>,
  center: ReadonlyArray<StatusBarItem> = [],
): string =>
  markup(
    <StatusBarFrame
      center={center}
      label="Editor status"
      left={left}
      right={right}
      theme={theme}
    />,
  );

describe("the Status bar preview", () => {
  it("paints a named tone in the role the package's rule names", () => {
    const html = bar(
      [{ id: "plain", label: "main" }],
      [{ id: "errors", label: "3 errors", tone: "destructive" }],
    );

    // The package's rule: `toneForeground` answers the tone's readable role.
    expect(toneForeground(theme, "destructive")).toBe(
      theme.colors.destructiveSoftForeground,
    );
    expect(html).toContain(`color:${theme.colors.destructiveSoftForeground}`);
    expect(html).toContain('data-tone="destructive"');
    // The bar's own tone keeps the bar's foreground.
    expect(toneForeground(theme, "default")).toBe(theme.colors.foreground);
    expect(html).toContain(`color:${theme.colors.foreground}`);
  });

  it("names the tone a bar tone stands for", () => {
    expect(statusToneOf("default")).toEqual(Option.none());
    expect(statusToneOf("success")).toEqual(Option.some("success"));

    expect(toneRole("default")).toBe("the bar's own foreground");
    expect(toneRole("warning")).toBe("the warning tone's readable role");
  });

  it("keeps the caller's groups, their order and their hairlines", () => {
    const html = bar(STATUS_BAR_LEFT, STATUS_BAR_RIGHT, STATUS_BAR_CENTER);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Editor status"');
    // Two items on the left, one in the centre and two on the right: a
    // hairline inside each group and none before its first item.
    expect(html.match(/gx-shell-separator/g)).toHaveLength(2);
    const order = [...html.matchAll(/data-item="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(order).toEqual(["branch", "position", "file", "encoding", "errors"]);
  });

  it("paints a full-width strip and keeps the tone control outside it", () => {
    // Guarded bugs: the bar painted as a 640px rounded pill with a border on
    // all four sides and sans text, and the demo's tone chips sat in a second
    // row *inside* the same frame — so the chrome read as a card on the page
    // rather than the window's bottom edge.
    const css = read("apps/docs/src/styles/demos.css");
    const demo = read("apps/docs/src/components/docs/status-bar-demo.tsx");
    const strip = block(css, ".gx-shell-status");

    expect(strip).toContain("width: 100%;");
    expect(strip).toContain("border-top: 1px solid var(--input);");
    expect(strip).toContain("border-radius: 0;");
    expect(strip).toContain("background: var(--muted);");
    expect(strip).toContain("font-family: var(--font-mono);");
    expect(strip).toContain("font-size: 12px;");
    expect(strip).not.toContain("border: 1px solid");
    // The frame the demo sits in no longer caps the strip at 640px.
    expect(block(css, ".gx-status-demo")).toContain("max-width: none;");

    // The tone selector is the demo's own control, above the strip.
    const tone = demo.indexOf('aria-label="Item tone"');
    const stripMount = demo.indexOf('label="Editor status"');
    expect(tone).toBeGreaterThan(-1);
    expect(stripMount).toBeGreaterThan(tone);
    // The strip itself paints no control.
    expect(bar(STATUS_BAR_LEFT, STATUS_BAR_RIGHT)).not.toContain("gx-tgroup");
    expect(bar(STATUS_BAR_LEFT, STATUS_BAR_RIGHT)).not.toContain("<button");
  });

  it("runs the package's tone rule instead of restating it", () => {
    const demo = read("apps/docs/src/components/docs/status-bar-demo.tsx");

    expect(demo).toContain('from "@/lib/shell-logic"');
    expect(demo).toContain("toneForeground");
    expect(demo).toContain("statusToneOf");
    // A hand-mixed colour would be a literal in the drawing.
    expect(demo).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});
