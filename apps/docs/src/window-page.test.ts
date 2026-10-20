import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { search } from "./lib/search";
import { source } from "./lib/source";

/**
 * Guards the application-window page (plan 625). The bug being prevented is a
 * runtime surface with no owner: measured 2026-10-20, `fullscreen`, `minimize`,
 * `wayland` and `devtools` returned nothing, `traffic lights` reached the Values
 * API and `system tray` reached Dark mode.
 *
 * These cases fail when the page loses a table, a section, an absence block or
 * the summary words search ranks; and the query table fails when an alias stops
 * reaching the page or a shorter word is stolen from its existing owner.
 */

const page = readFileSync(
  fileURLToPath(new URL("../content/docs/window.mdx", import.meta.url)),
  "utf8",
);

const meta = readFileSync(
  fileURLToPath(new URL("../content/docs/meta.json", import.meta.url)),
  "utf8",
);

const TABLES = [
  "<WindowOptionsTable />",
  "<WindowMethodsTable />",
  "<WindowInsetsTable />",
  "<LayerShellTable />",
  "<PathPromptTable />",
  "<WindowAbsences />",
] as const;

const SECTIONS = [
  "## Opening the window",
  "## Options",
  "## Window methods",
  "## Size and insets",
  "## Custom window chrome",
  "## Wayland layer shell",
  "## Native file picker",
  "## The frame overlay",
  "## What the window does not provide",
  "## Related",
] as const;

describe("window page", () => {
  it("is a served page in the sidebar after Workspace", () => {
    expect(source.getPages().map((entry) => entry.url)).toContain(
      "/docs/window",
    );
    expect(meta.indexOf('"workspace"')).toBeLessThan(meta.indexOf('"window"'));
    expect(meta.indexOf('"window"')).toBeLessThan(
      meta.indexOf('"data-display"'),
    );
  });

  it("titles itself for the window subject and names it in the summary", () => {
    expect(page).toContain("title: Application window");
    [
      "traffic lights",
      "insets",
      "fullscreen",
      "Wayland",
      "file picker",
      "overlay",
    ].forEach((word) => {
      expect(page.toLowerCase()).toContain(word.toLowerCase());
    });
  });

  it("renders each generated table exactly once", () => {
    TABLES.forEach((table) => {
      expect(page.split(table)).toHaveLength(2);
    });
  });

  it("keeps the sections a reader needs", () => {
    SECTIONS.forEach((section) => {
      expect(page).toContain(section);
    });
  });

  it("links the pages that own the surrounding subjects", () => {
    ["/docs/patterns/app-shell", "/docs/performance", "/docs/styling"].forEach(
      (link) => {
        expect(page).toContain(link);
      },
    );
  });
});

const owned = [
  ["traffic lights", "/docs/window"],
  ["fullscreen", "/docs/window"],
  ["wayland", "/docs/window"],
  ["system tray", "/docs/window"],
  ["devtools", "/docs/window"],
  ["file dialog", "/docs/window"],
  ["window insets", "/docs/window"],
  ["safe area", "/docs/window"],
  ["minimize", "/docs/window"],
  ["set window title", "/docs/window"],
  ["layer shell", "/docs/window"],
  ["debug frame overlay", "/docs/window"],
] as const;

const regressions = [
  ["title bar", "/docs/patterns/app-shell"],
  ["dialog", "/docs/components/dialog"],
  ["menu bar", "/docs/components/navigation-menu"],
  ["window size", "/docs/styling"],
] as const;

describe("window page search", { timeout: 120_000 }, () => {
  it.each(owned)("%s → %s", async (query, url) => {
    const [first] = await search(query);
    expect(first?.url).toBe(url);
  });

  it.each(regressions)("%s keeps %s", async (query, url) => {
    const [first] = await search(query);
    expect(first?.url).toBe(url);
  });
});
