/**
 * Browser preview for the Theme toggler page.
 *
 * The native icon control flips the application between its light and dark
 * theme; the preview swaps the glyph and its name on each press.
 */

import { useState } from "react";

export function ThemeTogglerDemo() {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  return (
    <div className="gx-themetoggler">
      <button
        aria-label={
          mode === "dark" ? "Switch to light theme" : "Switch to dark theme"
        }
        className="gx-themetoggler-btn"
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        type="button"
      >
        <span aria-hidden="true" className="gx-themetoggler-glyph" key={mode}>
          {mode === "dark" ? "☀" : "☾"}
        </span>
      </button>
      <p className="gx-themetoggler-readout">
        {mode === "dark" ? "Dark" : "Light"} theme
      </p>
    </div>
  );
}

export const themeTogglerDemoSource = `import { useState } from "react";
import { ThemeToggler } from "@gpuixui/components/theme-toggler";

const [mode, setMode] = useState<"light" | "dark">("dark");

<ThemeToggler mode={mode} onChange={setMode} />;`;
