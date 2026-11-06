import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyStateDemo, emptyStateDemoSource } from "./empty-state-demo";

const markup = renderToStaticMarkup(<EmptyStateDemo />);

describe("the empty state preview", () => {
  it("draws the three shapes a caller reaches", () => {
    expect(markup.match(/class="gx-empty-state"/g)).toHaveLength(3);
    expect(markup).toContain("No projects yet");
    expect(markup).toContain("Nothing here");
    expect(markup).toContain("The folder is empty");
    expect(markup).toContain("Loading…");
  });

  it("sets the three panels on the caller's surface", () => {
    expect(markup.match(/class="gx-empty-card"/g)).toHaveLength(3);
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

    expect(emptyStateDemoSource).toContain('name="folder-open"');
    expect(emptyStateDemoSource).not.toContain('name="inbox"');
  });
});
