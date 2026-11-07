import { useState } from "react";
import {
  isPlatformName,
  platformStyles,
  roleVariables,
  shadcnStylesheet,
  themes,
  type PlatformName,
  type Theme,
  type ThemeMode,
} from "@gpuixui/tokens";
import { HighlightedCode } from "@/components/highlighted-code";
import { writeClipboard } from "../../lib/clipboard";
import { platformThemes } from "../../lib/platform";
import { usePlatformOptional } from "./platform-toggle";

const CHARTS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

const CHOICES: ReadonlyArray<PlatformName> = [
  "default",
  "darwin",
  "win32",
  "linux",
];

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
  const [chosen, setChosen] = useState<PlatformName>("default");
  const [state, setState] = useState<keyof typeof label>("idle");
  const resolved =
    platform === null ? themes : platformThemes(chosen, platform.look);
  const css = stylesheetOf(resolved);

  return (
    <div className="gx-stylesheet not-prose">
      <div className="gx-stylesheet-bar">
        <select
          aria-label="Theme"
          className="gx-stylesheet-select"
          onChange={(event) => {
            const next = event.target.value;
            if (isPlatformName(next)) setChosen(next);
          }}
          value={chosen}
        >
          {CHOICES.map((name) => (
            <option key={name} value={name}>
              {platformStyles[name].label}
            </option>
          ))}
        </select>
        <button
          aria-label="Copy styles.css"
          className="gx-copy-button"
          onClick={() =>
            void writeClipboard(css).then((copied) =>
              setState(copied ? "copied" : "error"),
            )
          }
          type="button"
        >
          {label[state]}
        </button>
      </div>
      <p className="gx-stylesheet-note">
        Explore more in{" "}
        <a
          href="https://ui.shadcn.com/themes"
          rel="noopener noreferrer"
          target="_blank"
        >
          shadcn&apos;s builder
        </a>{" "}
        and{" "}
        <a href="https://tweakcn.com" rel="noopener noreferrer" target="_blank">
          tweakcn
        </a>
        .
      </p>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "styles.css copied to the clipboard." : ""}
      </span>
      <HighlightedCode lang="css" code={css} />
    </div>
  );
}
