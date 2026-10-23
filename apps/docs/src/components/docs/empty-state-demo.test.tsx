import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyStateDemo, emptyStateDemoSource } from "./empty-state-demo";

/**
 * The Empty state preview, as it renders, and the sample under its Code tab.
 *
 * The drawing is the only place a reader sees the three shapes a caller
 * reaches, and the Code tab is what they copy: it named an `Icon` it never
 * imported, with no colour and a name the icon registry does not paint, so the
 * snippet could not compile. The cases hold the markup to the three panels and
 * the sample to the imports, the icon's colour and a real icon name.
 */

const markup = renderToStaticMarkup(<EmptyStateDemo />);

describe("the empty state preview", () => {
  it("draws the three shapes a caller reaches", () => {
    expect(markup.match(/class="gx-empty-state"/g)).toHaveLength(3);
    expect(markup).toContain("No projects yet");
    expect(markup).toContain("Nothing here");
    expect(markup).toContain("The folder is empty");
    expect(markup).toContain("Loading…");
  });

  it("names the caller's surface and the panel's fixed measure", () => {
    expect(markup.match(/class="gx-empty-card"/g)).toHaveLength(3);
    expect(markup).toContain("A panel, not a surface");
    expect(markup).toContain("fixed 360px");
  });

  it("prints a code sample that imports what it paints", () => {
    expect(emptyStateDemoSource).toContain(
      'from "@gpuixui/components/empty-state"',
    );
    expect(emptyStateDemoSource).toContain('from "@gpuixui/primitives"');
    expect(emptyStateDemoSource).toContain('from "@gpuixui/icons"');
    expect(emptyStateDemoSource).toContain(
      'import { useTheme } from "@gpuixui/components"',
    );
    expect(emptyStateDemoSource).toContain("const theme = useTheme()");
    expect(emptyStateDemoSource).toContain(
      "color={theme.colors.mutedForeground}",
    );
    // The named glyph is one the registry paints, not a guessed inbox.
    expect(emptyStateDemoSource).toContain('name="folder-open"');
    expect(emptyStateDemoSource).not.toContain('name="inbox"');
  });
});
