import * as Arr from "effect/Array";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { editableRoles } from "@/lib/theme-editor";
import { ThemeEditor } from "./theme-editor";

/**
 * Guards plan 595's page contract before hydration: the editor renders one
 * labelled control per role, the two preview surfaces on the edited theme, the
 * reset and copy controls, and the generated module. A dropped role, a missing
 * preview or an empty source block is a page that cannot do what it claims.
 */
const html = renderToStaticMarkup(<ThemeEditor />);

describe("theme editor", () => {
  it("renders one labelled colour input per editable role", () => {
    const inputs = html.match(/data-theme-color="/g) ?? [];
    expect(inputs.length).toBe(editableRoles.length);
    const labels = Arr.filter(
      editableRoles,
      (role) => !html.includes(`id="theme-color-${role}"`),
    );
    expect(labels).toEqual([]);
  });

  it("renders the base and density groups as fieldsets", () => {
    expect(html).toContain("Start from");
    expect(html).toContain("Density");
    expect(html).toContain('name="theme-base"');
    expect(html).toContain('name="theme-density"');
  });

  it("paints the library's preview surfaces on the edited theme", () => {
    expect(html).toContain("data-theme-preview");
    const surfaces = html.match(/data-theme-editor-surface=""/g) ?? [];
    expect(surfaces.length).toBe(2);
    expect(html).not.toContain("data-preview-surface");
  });

  it("renders the generated module and both controls", () => {
    expect(html).toContain("data-theme-source");
    expect(html).toContain("extendTheme");
    expect(html).toContain("data-theme-editor-reset");
    expect(html).toContain("data-theme-editor-copy");
    expect(html).toContain("Reset to defaults");
    expect(html).toContain("Copy theme");
  });
});
