/**
 * The window frame the film draws around a block. An offscreen capture has no
 * OS chrome, so the title bar each platform's window manager would paint is
 * drawn here: macOS's traffic lights, Windows 11's caption buttons, GNOME's
 * header bar. It is the frame, not a GPUIxUI component.
 */
import {
  elevationShadow,
  type PlatformName,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";

/** The film's ground (SPEC): the macOS look's own page, so the macro takes,
 * painted on it, meet the composition without a seam. */
export const GROUND = "#F2F2F7";

interface Chrome {
  readonly height: number;
  readonly radius: number;
  readonly bar: (theme: Theme, title: string) => ReactNode;
}

const label = (theme: Theme, title: string, weight: number) => (
  <text
    style={{ fontSize: 13, fontWeight: weight, color: theme.colors.foreground }}
  >
    {title}
  </text>
);

const light = (color: string) => (
  <div
    key={color}
    style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }}
  />
);

const glyph = (theme: Theme, mark: string) => (
  <div
    key={mark}
    style={{
      width: 46,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      display: "flex",
    }}
  >
    <text style={{ fontSize: 13, color: theme.colors.foreground }}>{mark}</text>
  </div>
);

const chromes: Readonly<Record<PlatformName, Chrome>> = {
  darwin: {
    height: 32,
    radius: 12,
    bar: () => (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 8,
          paddingLeft: 14,
          alignItems: "center",
          height: 32,
        }}
      >
        {Arr.map(["#FF5F57", "#FEBC2E", "#28C840"], light)}
      </div>
    ),
  },
  win32: {
    height: 32,
    radius: 8,
    bar: (theme, title) => (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          height: 32,
          paddingLeft: 14,
        }}
      >
        <div style={{ flexGrow: 1 }}>{label(theme, title, 400)}</div>
        {Arr.map(["–", "□", "✕"], (mark) => glyph(theme, mark))}
      </div>
    ),
  },
  linux: {
    height: 46,
    radius: 12,
    bar: (theme, title) => (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          height: 46,
        }}
      >
        {label(theme, title, 700)}
        <div
          style={{
            position: "absolute",
            right: 12,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.muted,
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
          }}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            ✕
          </text>
        </div>
      </div>
    ),
  },
  default: { height: 0, radius: 8, bar: () => null },
};

export interface WindowProps {
  readonly theme: Theme;
  readonly platform: PlatformName;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly children: ReactNode;
}

/** A window of `width`×`height` (frame included) in `platform`'s chrome. */
export const Window = ({
  theme,
  platform,
  title,
  width,
  height,
  children,
}: WindowProps) => {
  const chrome = chromes[platform];
  return (
    <ThemeProvider theme={theme}>
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          borderRadius: chrome.radius,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
          boxShadow: elevationShadow(theme, "lg"),
        }}
      >
        <div
          style={{ height: chrome.height, backgroundColor: theme.colors.muted }}
        >
          {chrome.bar(theme, title)}
        </div>
        <div style={{ flexGrow: 1, display: "flex", minHeight: 0 }}>
          {children}
        </div>
      </div>
    </ThemeProvider>
  );
};
