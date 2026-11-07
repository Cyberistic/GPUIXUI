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
