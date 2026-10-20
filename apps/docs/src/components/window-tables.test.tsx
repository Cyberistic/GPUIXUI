import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  layerShellFields,
  pathPromptFields,
  windowAbsences,
  windowFamilies,
  windowInsets,
  windowRendererMethods,
} from "@/lib/window-surface";
import {
  LayerShellTable,
  PathPromptTable,
  WindowAbsences,
  WindowInsetsTable,
  WindowMethodsTable,
  WindowOptionsTable,
} from "./window-tables";

/**
 * Guards the window tables (plan 625). The rows are rendered React, so the page
 * index cannot see them: a table that silently drops a field the module
 * documents, or prints an empty meaning, would leave the page naming an option
 * it never explains. Every expectation derives from the module, so a row cannot
 * be added without appearing.
 */
const optionFields = windowFamilies.flatMap((family) => family.fields);

const names = (html: string, attribute: string): ReadonlyArray<string> =>
  [...html.matchAll(new RegExp(`${attribute}="([^"]*)"`, "g"))].map(
    (match) => match[1] ?? "",
  );

const html = {
  options: renderToStaticMarkup(<WindowOptionsTable />),
  layer: renderToStaticMarkup(<LayerShellTable />),
  insets: renderToStaticMarkup(<WindowInsetsTable />),
  path: renderToStaticMarkup(<PathPromptTable />),
  methods: renderToStaticMarkup(<WindowMethodsTable />),
  absences: renderToStaticMarkup(<WindowAbsences />),
};

describe("window tables", () => {
  it("renders one row per window option", () => {
    expect(names(html.options, "data-field")).toHaveLength(optionFields.length);
    expect(
      optionFields.filter(
        (field) => !html.options.includes(`data-field="${field.name}"`),
      ),
    ).toEqual([]);
  });

  it("groups the options and names each family", () => {
    expect(names(html.options, "data-window-family")).toEqual(
      windowFamilies.map((family) => family.id),
    );
    windowFamilies.forEach((family) => {
      expect(html.options).toContain(family.title);
    });
  });

  it("renders the layer-shell, inset and path-prompt fields", () => {
    expect(names(html.layer, "data-field")).toEqual(
      layerShellFields.map((field) => field.name),
    );
    expect(names(html.insets, "data-field")).toEqual(
      windowInsets.map((field) => field.name),
    );
    expect(names(html.path, "data-field")).toEqual(
      pathPromptFields.map((field) => field.name),
    );
  });

  it("renders one row per renderer method and absence", () => {
    expect(names(html.methods, "data-window-method")).toEqual(
      windowRendererMethods.map((method) => method.name),
    );
    expect(names(html.absences, "data-window-absence")).toEqual(
      windowAbsences.map((absence) => absence.subject),
    );
  });

  it("never renders an empty meaning cell", () => {
    const empty = Object.entries(html).filter(([, markup]) =>
      />\s*<\/td>/u.test(markup),
    );
    expect(empty).toEqual([]);
  });

  it("renders a meaning, not the raw field name twice", () => {
    expect(html.options).toContain(
      "so a custom title bar can leave room for them",
    );
    expect(html.methods).toContain(
      "how a window opened with `show: false` or `focus: false` is revealed",
    );
    expect(html.absences).toContain("belongs to the host application");
  });
});
