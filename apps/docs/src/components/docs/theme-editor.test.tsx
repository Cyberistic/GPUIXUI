import { themes } from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { platformThemes } from "../../lib/platform";
import { ThemeEditor, ThemeEditorSurface } from "./theme-editor";
import { editableRoles } from "./theme-editor-logic";

/**
 * The readout under the preview is the only place a reader learns an edit broke
 * the theme contract. `theme-editor-logic.test.ts` holds the audit itself;
 * this holds the editor to mounting it, because a correct report that nothing
 * renders tells the reader nothing.
 *
 * The surface takes its base as a prop, so the second render below is the same
 * editor over the Windows style. That is the behaviour the platform switch
 * promises: a reader who chose Windows sees Windows's roles, not the identity's.
 */

const builtIn = renderToStaticMarkup(<ThemeEditor />);
const windows = renderToStaticMarkup(
  <ThemeEditorSurface bases={platformThemes("win32")} />,
);

const inputValue = (hex: string): string => `value="${hex}"`;

describe("the theme editor", () => {
  it("renders the audit readout as a live status region", () => {
    expect(builtIn).toContain('role="status"');
    expect(builtIn).toContain('aria-live="polite"');
    expect(builtIn).toContain("gx-te-audit");
  });

  it("says the built-in themes pass the whole audit, not only contrast", () => {
    expect(builtIn).toContain("every role paints");
    expect(builtIn).toContain("every shadow level paints its colour");
    expect(builtIn).toContain("every number lays out");
    expect(builtIn).toContain("every decorative surface stays visible");
    expect(builtIn).toContain(
      "every data-series colour separates from its plot and from its neighbours under every colour-vision deficiency",
    );
    expect(builtIn).toContain("every selection wash stays visible");
    expect(builtIn).toContain(
      "every indicator mark is findable on the strip it is drawn on",
    );
    expect(builtIn).toContain("every disabled control keeps its faded label");
  });

  it("renders one control per editable role", () => {
    expect(builtIn.split('type="color"').length - 1).toBe(editableRoles.length);
  });

  it("starts from the base theme it is handed, not a copy of the identity", () => {
    // What the switch resolves has to reach the colour inputs. A surface that
    // ignored `bases` would print the identity's roles under every platform.
    const winBackground = platformThemes("win32").light.colors.background;
    expect(winBackground).not.toBe(themes.light.colors.background);

    expect(builtIn).toContain(inputValue(themes.light.colors.background));
    expect(windows).toContain(inputValue(winBackground));
    expect(windows).not.toContain(inputValue(themes.light.colors.background));
  });

  it("audits the base it paints, so a platform style is measured too", () => {
    expect(windows).toContain("every role paints");
    expect(windows).toContain("Passes the library audit");
  });
});
