import { describe, expect, it } from "vitest";
import { promotedNameRank } from "./generated-search";
import { GPUixVersion, nativePlatforms } from "./native-platforms";
import { platformSearchEntry } from "./platform-search";

/**
 * Guards plan 584: the native-binding table is rendered React, so its rows
 * never reach the Fumadocs page index. This document carries every platform,
 * target and the published state into search, and promotes the reader phrases
 * that name the table.
 *
 * The bug being guarded is a table that exists on the page but is invisible to
 * ⌘K: `platform support` returned Theming's platform-style heading, and the
 * Rust target strings returned nothing. A single plain word must not promote
 * the document, or it would steal `platform` from Theming.
 */
describe("platform support search entry", () => {
  it("points at the native-bindings section", () => {
    expect(platformSearchEntry.index.url).toBe(
      "/docs/installation#native-bindings",
    );
    expect(platformSearchEntry.index.breadcrumbs).toEqual(["Installation"]);
  });

  it("carries every platform, target and published state", () => {
    const content = platformSearchEntry.index.content;
    expect(content).toContain(GPUixVersion);
    nativePlatforms.forEach((platform) => {
      expect(content).toContain(platform.label);
      expect(content).toContain(platform.target);
    });
    expect(content.match(/no published binary/g) ?? []).toHaveLength(
      nativePlatforms.filter((platform) => !platform.published).length,
    );
  });

  it("promotes the reader phrases exactly and leaves a plain word alone", () => {
    expect(promotedNameRank(platformSearchEntry, "platform support")).toBe(0);
    expect(promotedNameRank(platformSearchEntry, "native bindings")).toBe(0);
    expect(
      promotedNameRank(platformSearchEntry, "native binding targets"),
    ).toBeUndefined();
    expect(promotedNameRank(platformSearchEntry, "platform")).toBeUndefined();
    expect(promotedNameRank(platformSearchEntry, "binding")).toBeUndefined();
  });

  it("does not promote a single-word name", () => {
    platformSearchEntry.names.forEach((name) => {
      expect(name.trim().includes(" ")).toBe(true);
    });
  });
});
