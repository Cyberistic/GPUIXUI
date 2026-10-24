import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  LOG_LEVELS,
  parseLogLine,
  type LogLevel,
} from "@gpuixui/files/log/logic";
import {
  APPENDED_LINES,
  FOLLOW_ROWS,
  LOG_LINES,
  LogViewerFrame,
  appendLine,
  levelRole,
  tailRows,
  toggleLevel,
  visibleEntries,
} from "./log-viewer-demo";

/**
 * The Log viewers preview.
 *
 * `packages/files/docs/log-viewer.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts`. The registry guard sees the
 * demo; these cases hold the drawing to the package's own rules: the rows are
 * `parseLogLine`, the filter is `filterByLevel`, the tint is `levelTone`, and
 * the filter control's next set is the level order the package declares.
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

  it("tints a row with the status tone the package maps its level to", () => {
    expect(levelRole("error")).toBe("destructive");
    expect(levelRole("warn")).toBe("warning");
    expect(levelRole("info")).toBe("info");
    expect(levelRole("debug")).toBe("muted");
    expect(levelRole("trace")).toBe("muted");
    expect(markup(true)).toContain('data-role="destructive"');
  });

  it("paints the tail while it follows, and the whole list while it does not", () => {
    const entries = visibleEntries(LOG_LINES, LOG_LEVELS);
    const tail = tailRows(entries);

    expect(tail.length).toBe(Math.min(FOLLOW_ROWS, entries.length));
    expect(Option.getOrNull(Arr.last(tail))).toEqual(
      Option.getOrNull(Arr.last(entries)),
    );

    const rows = (html: string): number =>
      html.match(/class="gx-logviewer-row"/g)?.length ?? 0;

    expect(rows(markup(true))).toBe(FOLLOW_ROWS);
    expect(rows(markup(false))).toBe(entries.length);
    // Every level starts enabled and the follow toggle starts off in this
    // drawing, so the pressed set is the level list alone.
    expect(markup(false).match(/aria-pressed="true"/g)).toHaveLength(
      LOG_LEVELS.length,
    );
    expect(markup(true).match(/aria-pressed="true"/g)).toHaveLength(
      LOG_LEVELS.length + 1,
    );
    expect(rows(markup(false, ["error"]))).toBe(2);
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
    expect(source).toContain("LOG_LEVELS");
    // A second grammar would show up as a regex beside the package's parser.
    expect(source).not.toContain("RegExp");
    expect(source).not.toContain("/^");
    // The filter's set is the package's, never a locally sorted list.
    expect(source).not.toContain(".sort(");
  });
});
