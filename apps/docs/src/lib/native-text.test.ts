import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { interfaceFieldsIn } from "./native-elements";
import {
  mappedFields,
  metricFields,
  nativeTextAbsences,
  nativeTextThemeKeys,
  nativeTextViolations,
  syntaxFields,
  themeElements,
  themeFields,
  unmappedFields,
} from "./native-text";

/**
 * Guards plan 629: the runtime's native text theme had no owner. `GpuixTheme`,
 * `SyntaxTheme` and `GpuixMetrics` returned nothing from ⌘K, `syntax colors`
 * returned the colour picker and `code metrics` returned Theming's scale table,
 * although the library already maps its tokens onto that theme through
 * `nativeTextTheme`.
 *
 * The tests fail if the installed declarations gain or lose a field, if the
 * helper stops setting a field the page calls mapped, if the page explains a
 * field the runtime does not declare, if an interface starts accepting `theme`
 * without an element row, or if the reconciler starts forwarding `theme` to
 * `div`/`text` (which would falsify the layout-box absence).
 *
 * `node:fs` is deliberate at this vitest boundary, as in
 * `native-testing.test.ts`; `apps/docs` imports no Effect runtime.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url));

const read = (relative: string): string =>
  readFileSync(join(root, relative), "utf8");

const declarations = read(
  "apps/docs/node_modules/@gpuix/native/dist/host.d.ts",
);
const mutations = read(
  "apps/docs/node_modules/@gpuix/native/dist/mutations.js",
);
const helperSource = read("packages/primitives/src/core/style.ts");

const realViolations = () =>
  nativeTextViolations({
    declarations,
    mutations,
    helperSource,
    theme: themeFields,
    syntax: syntaxFields,
    metrics: metricFields,
    elements: themeElements,
    mapped: mappedFields,
    unmapped: unmappedFields,
    absences: nativeTextAbsences,
  });

const withTheme = (
  rows: typeof themeFields,
): ReturnType<typeof realViolations> =>
  nativeTextViolations({
    declarations,
    mutations,
    helperSource,
    theme: rows,
    syntax: syntaxFields,
    metrics: metricFields,
    elements: themeElements,
    mapped: mappedFields,
    unmapped: unmappedFields,
    absences: nativeTextAbsences,
  });

describe("the native text theme", () => {
  it("agrees with the installed declarations and the real helper", () => {
    expect(realViolations()).toEqual([]);
  });

  it("reads 18 theme, 24 syntax and 29 metric fields", () => {
    expect(interfaceFieldsIn(declarations, "GpuixTheme")).toHaveLength(18);
    expect(interfaceFieldsIn(declarations, "SyntaxTheme")).toHaveLength(24);
    expect(interfaceFieldsIn(declarations, "GpuixMetrics")).toHaveLength(29);
    expect(themeFields).toHaveLength(18);
    expect(syntaxFields).toHaveLength(24);
    expect(metricFields).toHaveLength(29);
  });

  it("reads the nine fields nativeTextTheme sets, in source order", () => {
    expect(nativeTextThemeKeys(helperSource)).toEqual([
      "appearance",
      "bg",
      "text",
      "textMuted",
      "textFaint",
      "accent",
      "caret",
      "fontSans",
      "fontMono",
    ]);
  });

  it("fails when a declared field is undocumented", () => {
    const rows = themeFields.filter((row) => row.name !== "textFaint");
    expect(withTheme(rows)).toContain(
      "GpuixTheme: textFaint is declared but undocumented",
    );
  });

  it("fails when a documented field is not declared", () => {
    expect(
      withTheme([
        ...themeFields,
        { name: "syntaxHighlight", group: "Children", summary: "Invented." },
      ]),
    ).toContain("GpuixTheme: syntaxHighlight is documented but not declared");
  });

  it("fails when the helper stops setting a mapped field", () => {
    const withoutCaret = helperSource.replace(
      "  caret: theme.colors.primary,\n",
      "",
    );
    expect(
      nativeTextViolations({
        declarations,
        mutations,
        helperSource: withoutCaret,
        theme: themeFields,
        syntax: syntaxFields,
        metrics: metricFields,
        elements: themeElements,
        mapped: mappedFields,
        unmapped: unmappedFields,
        absences: nativeTextAbsences,
      }),
    ).toContain("nativeTextTheme: caret is documented as mapped but not set");
  });

  it("fails when an element row names an interface that does not take a theme", () => {
    expect(
      nativeTextViolations({
        declarations,
        mutations,
        helperSource,
        theme: themeFields,
        syntax: syntaxFields,
        metrics: metricFields,
        elements: [
          ...themeElements,
          {
            tag: "div",
            interfaceName: "HostProps",
            what: "Invented.",
            usedBy: [],
          },
        ],
        mapped: mappedFields,
        unmapped: unmappedFields,
        absences: nativeTextAbsences,
      }),
    ).toContain("div: HostProps does not declare theme");
  });

  it("fails when the reconciler forwards theme to a built-in element", () => {
    const universal = mutations.replace(
      '"aria-level",',
      '"aria-level",\n    "theme",',
    );
    expect(
      nativeTextViolations({
        declarations,
        mutations: universal,
        helperSource,
        theme: themeFields,
        syntax: syntaxFields,
        metrics: metricFields,
        elements: themeElements,
        mapped: mappedFields,
        unmapped: unmappedFields,
        absences: nativeTextAbsences,
      }),
    ).toContain(
      "theme is now a universal prop, so the layout-box absence is false",
    );
  });

  it("fails when an absence the page states gains its symbol", () => {
    const withSetter = `${declarations}\nsetTheme(mode: string): void;`;
    expect(
      nativeTextViolations({
        declarations: withSetter,
        mutations,
        helperSource,
        theme: themeFields,
        syntax: syntaxFields,
        metrics: metricFields,
        elements: themeElements,
        mapped: mappedFields,
        unmapped: unmappedFields,
        absences: nativeTextAbsences,
      }),
    ).toContain(
      "Global theme setter is claimed absent but its symbol is declared",
    );
  });
});
