import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { getTheme } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { statusToneOf, toneForeground } from "@/lib/shell-logic";
import {
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

const markup = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node);

const theme = getTheme("dark");

const bar = (
  left: ReadonlyArray<StatusBarItem>,
  right: ReadonlyArray<StatusBarItem>,
): string =>
  markup(
    <StatusBarFrame
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
    const html = bar(STATUS_BAR_LEFT, STATUS_BAR_RIGHT);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Editor status"');
    // Three items on the left and two on the right: a hairline between each
    // group and none before its first item.
    expect(html.match(/gx-shell-separator/g)).toHaveLength(3);
    const order = [...html.matchAll(/data-item="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(order).toEqual(["branch", "position", "file", "encoding", "errors"]);
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
