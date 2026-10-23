import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CommandCentreRender,
  applyCommandKey,
  commandEntries,
  highlightFor,
  initialCommandState,
  matchCommands,
  moveHighlight,
  runLine,
  typeQuery,
} from "./command-centre";

/**
 * The command centre block.
 *
 * The panel is open in the preview, so every part a reader is told to look for
 * has to reach the markup: the issue chip, the filter field with its caret and
 * hint, all six actions with their keycaps, and exactly one highlighted row.
 * The filter, the arrow keys, `Enter` and `Escape` are the panel's state rules;
 * a rendering cannot be typed into, so they are held here.
 */

const markup = renderToStaticMarkup(<CommandCentreRender />);

const count = (source: string, pattern: RegExp): number =>
  (source.match(pattern) ?? []).length;

describe("the command centre", () => {
  it("prints the dimmed desktop, the chip and the search field", () => {
    expect(markup).toContain("gx-cmd-scene");
    expect(markup).toContain("gx-cmd-wall");
    expect(markup).toContain("gx-cmd-backdrop");
    expect(markup).toContain("Issue - LIN-1615 Changelog");
    expect(markup).toContain('aria-label="Type a command or search"');
    expect(markup).toContain("gx-cmd-caret");
    expect(markup).toContain('data-visible="true"');
    expect(markup).toContain("Type a command or search...");
  });

  it("frames the palette as an OS-level scene with a decorative dock", () => {
    expect(markup).toContain('aria-hidden="true" class="gx-cmd-dock"');
    expect(count(markup, /class="gx-cmd-dock-tile"/g)).toBe(7);
    expect(markup).toContain('class="gx-cmd-dock-sep"');
    // The app outline behind the palette is decoration too.
    expect(markup).toContain('aria-hidden="true" class="gx-cmd-page"');
  });

  it("prints every action, its icon and its keycaps", () => {
    for (const entry of commandEntries) {
      expect(markup).toContain(entry.label);
    }
    // Six rows, and the estimate action carries two caps.
    expect(count(markup, /class="gx-keycap"/g)).toBe(7);
    expect(count(markup, /class="gx-cmd-row"/g)).toBe(commandEntries.length);
    expect(markup).toContain(">⌘<");
    expect(markup).toContain(">E<");
  });

  it("opens with exactly one highlighted row, the assign-to-me action", () => {
    expect(count(markup, /data-highlighted="true"/g)).toBe(1);
    const highlighted = markup.indexOf('data-highlighted="true"');
    expect(markup.indexOf("Assign to me")).toBeGreaterThan(highlighted);
    expect(markup.indexOf("Set status as…")).toBeGreaterThan(highlighted);
  });

  it("reserves the footer for the run line", () => {
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('class="gx-cmd-foot"');
    expect(markup).not.toContain("Ran:");
  });

  it("filters the list as a query is typed", () => {
    expect(matchCommands("").map((entry) => entry.id)).toEqual(
      commandEntries.map((entry) => entry.id),
    );
    expect(matchCommands("assign").map((entry) => entry.id)).toEqual([
      "assign",
      "assign-me",
    ]);
    expect(matchCommands("est").map((entry) => entry.id)).toEqual([
      "status",
      "estimate",
    ]);
    expect(matchCommands("zzz")).toEqual([]);
  });

  it("moves the highlight with the arrow keys and wraps", () => {
    expect(moveHighlight(commandEntries, "assign-me", 1)).toBe("status");
    expect(moveHighlight(commandEntries, "assign-me", -1)).toBe("assign");
    expect(moveHighlight(commandEntries, "label", 1)).toBe("assign");
    expect(moveHighlight(commandEntries, "assign", -1)).toBe("label");
    expect(applyCommandKey(initialCommandState, "ArrowDown")).toEqual({
      ...initialCommandState,
      active: "status",
    });
  });

  it("keeps the highlight on a surviving row and falls back to the first", () => {
    const typed = typeQuery(initialCommandState, "assign");
    expect(typed.query).toBe("assign");
    expect(typed.active).toBe("assign-me");
    // The assign-to-me row is filtered out by `label`, so the first match
    // becomes the highlight.
    const label = typeQuery(initialCommandState, "label");
    expect(highlightFor(matchCommands(label.query), label.active)).toBe(
      "label",
    );
    // One surviving row wraps onto itself.
    expect(applyCommandKey(label, "ArrowDown")).toEqual({
      ...label,
      active: "label",
    });
  });

  it("runs the highlighted row on Enter and clears the query on Escape", () => {
    const assignMe = commandEntries.find((entry) => entry.id === "assign-me");
    expect(assignMe).toBeDefined();
    if (assignMe === undefined) return;

    expect(applyCommandKey(initialCommandState, "Enter").ran).toBe(
      runLine(assignMe),
    );
    const typed = typeQuery(initialCommandState, "label");
    expect(applyCommandKey(typed, "Enter").ran).toBe("Ran: Add label…");

    const ran = applyCommandKey(initialCommandState, "Enter");
    const cleared = applyCommandKey(typed, "Escape");
    expect(cleared.query).toBe("");
    expect(cleared.ran).toBeUndefined();
    expect(cleared).toEqual(initialCommandState);
    expect(ran.ran).toBe("Ran: Assign to me");
  });
});
