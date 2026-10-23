import { readFileSync } from "node:fs";
import { alphaOf, getTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  omarchyAudit,
  omarchyFile,
  omarchySample,
  omarchyTheme,
} from "./system-palette";

/**
 * `/docs/theming` teaches following a desktop palette, and three things on it
 * can drift: the sample the page prints, the roles the page says the mapper
 * fills, and the window measurement the page cites.
 *
 * The page renders the mapping from `system-palette.ts`, which runs the shipped
 * `decodeOmarchyPalette` and `paletteToTokens`, but a Markdown fence and a
 * table's prose are still hand-written: a colour edited in the fence would paint
 * a palette the decoder never saw, and a claim copied from an earlier probe run
 * would outlive the measurement. This file holds both to the source.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/theming.mdx");

/** A `### ` section, up to the next heading of the same or a higher level. */
const section = (body: string, heading: string): string => {
  const start = body.indexOf(`### ${heading}`);
  const end = body.indexOf("\n## ", start + 1);
  return start === -1 ? "" : body.slice(start, end === -1 ? undefined : end);
};

/** The one `toml` fence a section prints. */
const tomlFence = (body: string): string => {
  const start = body.indexOf("```toml");
  const end = body.indexOf("```", start + "```toml".length);
  return start === -1 || end === -1
    ? ""
    : body.slice(body.indexOf("\n", start) + 1, end).trim();
};

const follow = section(page, "Follow the desktop's palette");

describe("the system palette section", () => {
  it("prints the palette it decodes", () => {
    expect(tomlFence(follow)).toBe(omarchySample);
    expect(omarchyFile.problems).toEqual([]);
    expect(omarchyFile.palette.mode).toBe("dark");
  });

  it("maps the roles the file names and keeps the base elsewhere", () => {
    const base = getTheme("dark");

    expect(omarchyTheme.colors.background).toBe("#1a1b26");
    expect(omarchyTheme.colors.foreground).toBe("#a9b1d6");
    expect(omarchyTheme.colors.primary).toBe("#7aa2f7");
    expect(omarchyTheme.colors.destructive).toBe("#f7768e");
    // Omarchy's one quiet colour is both the strip and the rule.
    expect(omarchyTheme.colors.muted).toBe("#414868");
    expect(omarchyTheme.colors.border).toBe("#414868");
    // A role the file does not name stays the base's.
    expect(omarchyTheme.colors.card).toBe(base.colors.card);
    expect(omarchyTheme.colors.popover).toBe(base.colors.popover);
    expect(omarchyTheme.colors.ring).toBe(base.colors.ring);
    // The desktop hands over a highlight; the role is a wash at the base's share.
    expect(omarchyTheme.colors.selection).not.toBe("#292e42");
    expect(alphaOf(omarchyTheme.colors.selection)).toBe(
      alphaOf(base.colors.selection),
    );
  });

  it("renders every mapped role from the mapper, not a copy", () => {
    for (const role of [
      "background",
      "foreground",
      "primary",
      "muted",
      "destructive",
      "selection",
    ]) {
      expect(follow).toContain(`{omarchyTheme.colors.${role}}`);
    }
    expect(follow).toContain("{omarchyFile.problems.length}");
    expect(follow).toContain("`problems` is empty");
  });

  it("prints the gate's verdict on the mix, not a promise", () => {
    expect(omarchyAudit.passed).toBe(false);
    expect(omarchyAudit.contrast.length).toBeGreaterThan(0);
    expect(omarchyAudit.decorative.length).toBeGreaterThan(0);
    expect(omarchyAudit.selection.length).toBeGreaterThan(0);
    // The two causes the page names are the two the gate returns.
    expect(
      omarchyAudit.decorative.some((entry) => entry.surface === "divider"),
    ).toBe(true);
    expect(
      omarchyAudit.contrast.some(
        (entry) => entry.foreground === "foreground" && entry.background === "muted",
      ),
    ).toBe(true);
    expect(follow).toContain("{omarchyAudit.contrast.length}");
    expect(follow).toContain("{omarchyAudit.decorative.length}");
    expect(follow).toContain("{omarchyAudit.selection.length}");
    expect(follow).not.toContain("passes every report");
  });

  it("teaches the poll the runtime supports", () => {
    expect(follow).toContain("watchSystemTheme");
    expect(follow).toContain("paletteToTokens");
    expect(follow).toContain("`every`");
    expect(follow).toContain("no file watcher");
    expect(follow).toContain("baseFor");
    expect(follow).toContain("paletteMode");
    expect(follow).toContain("`undefined` is not an error");
    expect(follow).toContain("returns the stop function");
  });

  it("cites the states the window measured", () => {
    const probe = read("apps/playground/README.md").split(
      "### `system-theme-follow`",
    )[1];
    const record = probe?.split("\n### ")[0] ?? "";

    expect(record).toContain("mounts=1");
    for (const value of [
      "#1B1B1F",
      "#B49CFF",
      "#F4F1EA",
      "#6A45F0",
      "#11141A",
      "#A7A9FF",
    ]) {
      expect(record).toContain(value);
      expect(follow).toContain(value);
    }
    expect(follow).toContain("system-theme-follow");
    expect(follow).toContain("mounts=1");
  });

  it("credits the format and dates the reader", () => {
    expect(follow).toContain("Omarchy");
    expect(follow).toContain("(MIT)");
    expect(follow).toContain(
      "~/.local/state/omarchy/current/theme/colors.toml",
    );
    expect(follow).toContain("on-disk `colors.toml`");
  });

  it("does not pretend the browser preview shows a desktop change", () => {
    expect(follow).toContain("cannot show a desktop palette change");
    expect(follow).toContain("native window");
    // GPUix exposes no OS appearance query, so the follow is the seam.
    expect(follow).not.toContain("prefers-color-scheme");
  });

  it("is reachable from the dark-mode page without contradicting it", () => {
    const dark = read("apps/docs/content/docs/dark-mode.mdx");

    expect(dark).toContain("watchSystemTheme");
    expect(dark).toContain(
      "/docs/theming#follow-the-desktops-palette",
    );
    // The library still never queries the OS; the host owns the follow.
    expect(dark).toContain("never queries the OS on its own");
  });
});
