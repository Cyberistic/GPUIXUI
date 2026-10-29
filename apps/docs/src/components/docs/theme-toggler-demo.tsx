/**
 * Browser preview for the Theme toggler page.
 *
 * The native icon control flips the application between its light and dark
 * theme. The preview paints the same classic crossover the component does: a
 * sun that shrinks into the centre while it fades and a crescent that grows out
 * of it, on one button, over the motion table's `slow` level.
 *
 * The readout reserves the width of both labels in one grid cell, because a
 * caption that changes width would move the button beside it — the layout shift
 * the component's fixed glyph box avoids.
 */

import { useState } from "react";
import { BrowserIcon } from "./browser-icon";

export function ThemeTogglerDemo() {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  return (
    <div className="gx-themetoggler">
      <button
        aria-label={
          mode === "dark" ? "Switch to light theme" : "Switch to dark theme"
        }
        className="gx-themetoggler-btn"
        data-mode={mode}
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        type="button"
      >
        <span aria-hidden="true" className="gx-themetoggler-glyph">
          <BrowserIcon className="gx-themetoggler-sun" name="sun" />
          <BrowserIcon className="gx-themetoggler-moon" name="moon" />
        </span>
      </button>
      <p className="gx-themetoggler-readout">
        <span>{mode === "dark" ? "Dark theme" : "Light theme"}</span>
        <span aria-hidden="true" className="gx-themetoggler-reserve">
          {mode === "dark" ? "Light theme" : "Dark theme"}
        </span>
      </p>
    </div>
  );
}

export const themeTogglerDemoSource = `import { useState } from "react";
import { ThemeToggler } from "@gpuixui/components/theme-toggler";

const [mode, setMode] = useState<"light" | "dark">("dark");

<ThemeToggler mode={mode} onChange={setMode} />;`;
