import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeProvider, useTheme, useThemePresence } from "./react.js";
import { darkTheme, lightTheme } from "./theme.js";

function Probe() {
  const theme = useTheme();
  return <>{theme.colors.background}</>;
}

function PresenceProbe() {
  const provided = useThemePresence();
  const theme = useTheme();
  return <>{`${provided ? "provided" : "none"}:${theme.mode}`}</>;
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

describe("theme presence", () => {
  it("reports no provider above a component that has none", () => {
    expect(renderToStaticMarkup(<PresenceProbe />)).toContain(
      `none:${lightTheme.mode}`,
    );
  });

  it("reports a provider even when it passes the fallback theme", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={lightTheme}>
        <PresenceProbe />
      </ThemeProvider>,
    );
    expect(html).toContain(`provided:${lightTheme.mode}`);
    expect(html).not.toContain("none:");
  });

  it("keeps reporting a provider through a nested subtree", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={lightTheme}>
        <ThemeProvider theme={darkTheme}>
          <PresenceProbe />
        </ThemeProvider>
      </ThemeProvider>,
    );
    expect(html).toContain(`provided:${darkTheme.mode}`);
  });
});
