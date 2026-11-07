import { describe, expect, it } from "vitest";
import { Badge } from "../badge.js";
import { Card, CardContent } from "../card.js";
import { ThemeProvider, darkTheme, lightTheme } from "../index.js";
import { renderComponent } from "../internal/test-root.js";

const tree = (theme: typeof darkTheme): React.ReactElement => (
  <ThemeProvider theme={theme}>
    <Card testId="card">
      <CardContent>
        <Badge testId="badge">New</Badge>
      </CardContent>
    </Card>
  </ThemeProvider>
);

describe("the published theme provider", () => {
  it("paints a component in the theme the provider carries", () => {
    const root = renderComponent(tree(darkTheme));

    try {
      expect(root.renderer.findByTestId("card")?.style.backgroundColor).toBe(
        darkTheme.colors.card,
      );
      expect(root.renderer.findByTestId("badge")?.style.backgroundColor).toBe(
        darkTheme.colors.muted,
      );
    } finally {
      root.unmount();
    }
  });

  it("repaints a mounted component when the theme changes", () => {
    const root = renderComponent(tree(darkTheme));

    try {
      root.rerender(tree(lightTheme));

      expect(root.renderer.findByTestId("card")?.style.backgroundColor).toBe(
        lightTheme.colors.card,
      );
      expect(root.renderer.findByTestId("badge")?.style.backgroundColor).toBe(
        lightTheme.colors.muted,
      );
    } finally {
      root.unmount();
    }
  });
});
