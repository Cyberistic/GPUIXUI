import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./react.js";
import { darkTheme, lightTheme } from "./theme.js";

function Probe() {
  const theme = useTheme();
  return <>{theme.colors.background}</>;
}

describe("ThemeProvider", () => {
  it("supplies the given theme to descendants", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={darkTheme}>
        <Probe />
      </ThemeProvider>,
    );
    expect(html).toContain(darkTheme.colors.background);
    expect(html).not.toContain(lightTheme.colors.background);
  });

  it("falls back to the light theme without a provider", () => {
    expect(renderToStaticMarkup(<Probe />)).toContain(
      lightTheme.colors.background,
    );
  });

  it("lets a nested provider scope a theme", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={lightTheme}>
        <ThemeProvider theme={darkTheme}>
          <Probe />
        </ThemeProvider>
      </ThemeProvider>,
    );
    expect(html).toContain(darkTheme.colors.background);
  });
});
