/**
 * Guards the provider's behaviour and the packaging fact that makes the entry
 * portable: the component packages compile workspace source with
 * `jsxImportSource: "@gpuix/react"`, so without the pragma this file's JSX asks
 * for `@gpuix/react/jsx-runtime` from a package that does not depend on it and
 * the components program fails with TS2875. Deleting the pragma fails here.
 */

import { readFileSync } from "node:fs";
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

describe("the React entry's JSX runtime", () => {
  it("pins React, so a consumer's jsxImportSource cannot capture the file", () => {
    const source = readFileSync(
      new URL("./react.tsx", import.meta.url),
      "utf8",
    );

    expect(source.startsWith("/** @jsxImportSource react */")).toBe(true);
  });
});
