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
import { ThemeProvider, useTheme, useThemePresence } from "./react.js";
import { darkTheme, lightTheme } from "./theme.js";

function Probe() {
  const theme = useTheme();
  return <>{theme.colors.background}</>;
}

/**
 * A primitive's fail-loud seam: it needs to know whether a caller supplied a
 * theme, and the light-theme fallback hides that. A `Theme | undefined` context
 * is the boundary React gives us — `Option` would have to be unwrapped by every
 * consumer — so the hook reports the presence as a boolean.
 */
function PresenceProbe() {
  const provided = useThemePresence();
  const theme = useTheme();
  return (
    <>
      {`${provided ? "provided" : "none"}:${theme.mode}`}
    </>
  );
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

/**
 * Guards the presence signal a fail-loud consumer needs. `@gpuixui/primitives`
 * refuses to paint a default palette, and it read the token theme's fallback as
 * a caller's choice because the context's default *was* the light theme — a
 * provider passing `lightTheme` and no provider at all rendered identically.
 * The hook answers what the fallback cannot.
 */
describe("theme presence", () => {
  it("reports no provider above a component that has none", () => {
    expect(renderToStaticMarkup(<PresenceProbe />)).toContain(
      `none:${lightTheme.mode}`,
    );
  });

  it("reports a provider even when it passes the fallback theme", () => {
    // The case the context's old default hid: `useTheme()` returns the light
    // theme either way, so only the presence signal distinguishes them.
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

describe("the React entry's JSX runtime", () => {
  it("pins React, so a consumer's jsxImportSource cannot capture the file", () => {
    const source = readFileSync(
      new URL("./react.tsx", import.meta.url),
      "utf8",
    );

    expect(source.startsWith("/** @jsxImportSource react */")).toBe(true);
  });
});
