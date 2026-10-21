import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeEditor } from "./theme-editor";
import { editableRoles } from "./theme-editor-logic";

/**
 * The readout under the preview is the only place a reader learns an edit broke
 * the theme contract. `theme-editor-logic.test.ts` holds the audit itself;
 * this holds the editor to mounting it, because a correct report that nothing
 * renders tells the reader nothing.
 */

const markup = renderToStaticMarkup(<ThemeEditor />);

describe("the theme editor", () => {
  it("renders the audit readout as a live status region", () => {
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("gx-te-audit");
  });

  it("says the built-in themes pass the whole audit, not only contrast", () => {
    expect(markup).toContain("every role paints");
    expect(markup).toContain("every decorative surface stays visible");
  });

  it("renders one control per editable role", () => {
    expect(markup.split('type="color"').length - 1).toBe(editableRoles.length);
  });
});
