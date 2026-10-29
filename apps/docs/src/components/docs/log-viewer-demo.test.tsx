import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  LEVEL_COLUMN_WIDTH,
  LOG_LEVELS,
  parseLogLine,
  type LogLevel,
} from "@gpuixui/files/log/logic";
import {
  APPENDED_LINES,
  LOG_FRAME_HEIGHT,
  LOG_LINES,
  LogViewerDemo,
  LogViewerFrame,
  appendLine,
  levelRole,
  toggleLevel,
  visibleEntries,
} from "./log-viewer-demo";

/**
 * The Log viewers preview.
 *
 * `packages/files/docs/log-viewer.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts`. The registry guard sees the
 * demo; these cases hold the drawing to the package's own rules: the rows are
 * `parseLogLine`, the filter is `filterByLevel`, the tint is `levelTone`, the
 * gutter is `LEVEL_COLUMN_WIDTH`, a row is the density's `rowHeight`, and the
 * frame is the height the page's usage passes. The bug guarded is the drawing
 * that painted a 200px list of 17px lines under a hand-rolled toolbar, leaving
 * an empty band under eight rows and no aligned level column.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = (
  follow: boolean,
  enabled: ReadonlyArray<LogLevel> = LOG_LEVELS,
): string =>
  renderToStaticMarkup(
    <LogViewerFrame
      enabled={enabled}
      follow={follow}
      lines={LOG_LINES}
      onEnabledChange={() => undefined}
      onFollowChange={() => undefined}
    />,
  );

/** One rule body from the drawing's style sheet, without its selector. */
const rule = (selector: string): string => {
  const css = read("apps/docs/src/styles/demos.css");
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("}", start);
  return start === -1 || end === -1 ? "" : css.slice(start, end);
};

/** The level of every painted row, in paint order. */
const paintedLevels = (html: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.fromIterable(
      html.matchAll(/class="gx-logviewer-row" data-level="([^"]+)"/g),
    ),
    (match) => match[1] ?? "",
  );

describe("the LogViewer preview", () => {
  it("paints the rows the package parses and filters, and no others", () => {
    const all = visibleEntries(LOG_LINES, LOG_LEVELS);

    expect(all.length).toBe(LOG_LINES.length);
    expect(all.map((entry) => entry.level)).toContain("error");
    // The parser strips the level token; the message is what is left.
    expect(all[0]).toEqual({
      level: "info",
      message: "dev server started on :5173",
    });

    const quiet = visibleEntries(LOG_LINES, ["error", "warn"]);
    const errors = Arr.filter(all, (entry) => entry.level === "error");
    expect(quiet.length).toBe(errors.length + 2);
    // `warning` is the same severity as `warn`; the parser reads the alias.
    expect(
      Arr.some(quiet, (entry) => entry.message.includes("legacyProxy")),
    ).toBe(true);
  });

  it("holds the level filter to the package's own levels, in their order", () => {
    const withoutError = toggleLevel(LOG_LEVELS, "error");

    expect(withoutError).toEqual(["warn", "info", "debug", "trace"]);
    expect(toggleLevel(withoutError, "error")).toEqual([...LOG_LEVELS]);
    expect(toggleLevel(["debug"], "warn")).toEqual(["warn", "debug"]);
  });

  it("selects exactly the level a filter names", () => {
    Arr.forEach(LOG_LEVELS, (level) => {
      const entries = visibleEntries(LOG_LINES, [level]);
      const painted = paintedLevels(markup(false, [level]));

      expect(entries.length).toBeGreaterThan(0);
      expect(Arr.every(entries, (entry) => entry.level === level)).toBe(true);
      expect(painted).toEqual(entries.map((entry) => entry.level));
      // No level but the chosen one reaches the list.
      expect(Arr.every(painted, (paintedLevel) => paintedLevel === level)).toBe(
        true,
      );
    });
  });

  it("tints a row with the status tone the package maps its level to", () => {
    expect(levelRole("error")).toBe("destructive");
    expect(levelRole("warn")).toBe("warning");
    expect(levelRole("info")).toBe("info");
    expect(levelRole("debug")).toBe("muted");
    expect(levelRole("trace")).toBe("muted");
    expect(markup(true)).toContain('data-role="destructive"');
  });

  it("paints the level gutter, row height and frame height of the component", () => {
    const html = markup(true);
    const page = read("packages/files/docs/log-viewer.mdx");

    // The gutter is the package's own column width, on every row.
    expect(LEVEL_COLUMN_WIDTH).toBe(56);
    expect(
      html.match(new RegExp(`width:${LEVEL_COLUMN_WIDTH}px`, "g")),
    ).toHaveLength(visibleEntries(LOG_LINES, LOG_LEVELS).length);
    // A row is the density's row, not a line-height the drawing invented.
    expect(rule(".gx-logviewer-row")).toContain("height: var(--row-height);");
    expect(rule(".gx-logviewer-list")).not.toContain("height:");
    // The frame is the viewport the component's page documents.
    expect(LOG_FRAME_HEIGHT).toBe(240);
    expect(page).toContain(`height={${LOG_FRAME_HEIGHT}}`);
    expect(html).toContain(`style="height:${LOG_FRAME_HEIGHT}px"`);
  });

  it("fills the frame with every filtered row", () => {
    const entries = visibleEntries(LOG_LINES, LOG_LEVELS);

    // Follow mode anchors the scroller; it does not truncate the rows, which
    // is what left the old 200px frame empty under eight 17px lines.
    expect(paintedLevels(markup(true))).toHaveLength(entries.length);
    expect(paintedLevels(markup(false))).toHaveLength(entries.length);
    expect(paintedLevels(markup(true, ["error"]))).toHaveLength(
      Arr.filter(entries, (entry) => entry.level === "error").length,
    );
  });

  it("wears the toggle group's controls, not a second toolbar", () => {
    const html = markup(true);
    const demo = renderToStaticMarkup(<LogViewerDemo />);

    expect(html).toContain('class="gx-tgroup"');
    expect(html).toContain("gx-btn gx-btn-sm gx-toggle");
    expect(html).toContain(">Follow tail<");
    expect(demo).toContain(">Append a line<");
    expect(html).toContain(">Error<");
    // The readout is a caption under the frame, never inside it.
    expect(html).toContain('</div></div><p class="gx-demo-readout">');
  });

  it("announces the list as a log, named by what it holds", () => {
    expect(markup(true)).toContain('role="log"');
    expect(markup(true)).toContain('aria-label="Build log"');
  });

  it("appends one line, because the caller owns the lines", () => {
    const one = appendLine(LOG_LINES);
    const two = appendLine(one);

    expect(one.length).toBe(LOG_LINES.length + 1);
    expect(two.length).toBe(LOG_LINES.length + 2);
    expect(one).not.toEqual(two);
    // The appended line is the next of the preview's own queue, and it parses
    // like any other line, so follow mode paints it.
    expect(Option.getOrNull(Arr.last(one))).toBe(
      APPENDED_LINES[LOG_LINES.length % APPENDED_LINES.length],
    );
    expect(visibleEntries(one, LOG_LEVELS).length).toBe(one.length);
    expect(LOG_LEVELS).toContain(
      parseLogLine(Option.getOrNull(Arr.last(two)) ?? "").level,
    );
  });

  it("runs the package's parser, filter and tones instead of restating them", () => {
    const source = read("apps/docs/src/components/docs/log-viewer-demo.tsx");

    expect(source).toContain('from "@gpuixui/files/log/logic"');
    expect(source).toContain("parseLogLine");
    expect(source).toContain("filterByLevel");
    expect(source).toContain("levelTone");
    expect(source).toContain("LEVEL_COLUMN_WIDTH");
    expect(source).toContain("LOG_LEVELS");
    // A second grammar would show up as a regex beside the package's parser.
    expect(source).not.toContain("RegExp");
    expect(source).not.toContain("/^");
    // The filter's set is the package's, never a locally sorted list.
    expect(source).not.toContain(".sort(");
  });
});
