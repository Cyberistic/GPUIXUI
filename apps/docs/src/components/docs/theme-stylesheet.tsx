import { useState } from "react";
import {
  roleVariables,
  shadcnStylesheet,
  themes,
  type Theme,
  type ThemeMode,
} from "@gpuixui/tokens";
import { HighlightedCode } from "@/components/highlighted-code";
import { writeClipboard } from "../../lib/clipboard";
import { platformThemes } from "../../lib/platform";
import { usePlatformOptional } from "./platform-toggle";

const CHARTS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

/** The shadcn `styles.css` a project pastes to wear this library's themes. */
export const stylesheetOf = (
  resolved: Readonly<Record<ThemeMode, Theme>>,
): string =>
  [
    '@import "tailwindcss";',
    "@custom-variant dark (&:is(.dark *));",
    "",
    shadcnStylesheet(resolved.light, resolved.dark),
    "@theme inline {",
    ...[...Object.keys(roleVariables()), ...CHARTS].map(
      (name) => `  --color-${name}: var(--${name});`,
    ),
    "}",
    "",
  ].join("\n");

const label = {
  idle: "Copy styles.css",
  copied: "Copied",
  error: "Copy failed",
} as const;

export function ThemeStylesheet() {
  const platform = usePlatformOptional();
  const [state, setState] = useState<keyof typeof label>("idle");
  const resolved =
    platform === null
      ? themes
      : platformThemes(platform.platform, platform.look);

  return (
    <div className="gx-stylesheet">
      <button
        aria-label="Copy styles.css"
        className="gx-copy-button"
        onClick={() =>
          void writeClipboard(stylesheetOf(resolved)).then((copied) =>
            setState(copied ? "copied" : "error"),
          )
        }
        type="button"
      >
        {label[state]}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "styles.css copied to the clipboard." : ""}
      </span>
      <HighlightedCode lang="css" code={stylesheetOf(resolved)} />
    </div>
  );
}
