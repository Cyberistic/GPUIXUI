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

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

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

    expect(toneForeground(theme, "destructive")).toBe(
      theme.colors.destructiveSoftForeground,
    );
    expect(html).toContain(`color:${theme.colors.destructiveSoftForeground}`);
    expect(html).toContain('data-tone="destructive"');

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

    expect(html.match(/gx-shell-separator/g)).toHaveLength(2);
    const order = [...html.matchAll(/data-item="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(order).toEqual(["branch", "position", "file", "encoding", "errors"]);
  });

  it("paints a full-width strip and keeps the tone control outside it", () => {
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

    expect(block(css, ".gx-status-demo")).toContain("max-width: none;");

    const tone = demo.indexOf('aria-label="Item tone"');
    const stripMount = demo.indexOf('label="Editor status"');
    expect(tone).toBeGreaterThan(-1);
    expect(stripMount).toBeGreaterThan(tone);

    expect(bar(STATUS_BAR_LEFT, STATUS_BAR_RIGHT)).not.toContain("gx-tgroup");
    expect(bar(STATUS_BAR_LEFT, STATUS_BAR_RIGHT)).not.toContain("<button");
  });

  it("runs the package's tone rule instead of restating it", () => {
    const demo = read("apps/docs/src/components/docs/status-bar-demo.tsx");

    expect(demo).toContain('from "@/lib/shell-logic"');
    expect(demo).toContain("toneForeground");
    expect(demo).toContain("statusToneOf");

    expect(demo).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});
