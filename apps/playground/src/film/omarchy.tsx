/**
 * The film's Omarchy desktop: two blocks tiled the way Hyprland tiles them, on
 * the theme's own wallpaper, under a Waybar-style strip. The wallpaper, strip
 * and borders are the desktop, drawn here; the blocks are GPUIxUI.
 *
 * Each look is a real Omarchy theme: its `colors.toml` (MIT, basecamp/omarchy)
 * decoded by `decodeOmarchyPalette` and turned into a theme by
 * `paletteToTokens` — the same path an app takes when the desktop's theme file
 * changes.
 */
import {
  decodeOmarchyPalette,
  paletteToTokens,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import { Inbox } from "@gpuixui/blocks/inbox";
import { Kanban } from "@gpuixui/blocks/kanban";

export const omarchyLooks = [
  "tokyo-night",
  "catppuccin",
  "kanagawa",
  "rose-pine",
] as const;
export type OmarchyLook = (typeof omarchyLooks)[number];

const source = (name: OmarchyLook) =>
  readFileSync(
    fileURLToPath(
      new URL(`../../src/film/omarchy/${name}.toml`, import.meta.url),
    ),
    "utf8",
  );

const wallpaper = (name: OmarchyLook) =>
  fileURLToPath(
    new URL(
      `../../../../media/launch/assets/omarchy/${name}.png`,
      import.meta.url,
    ),
  );

/** A look's theme, decoded from its real `colors.toml`. */
export const omarchyTheme = (name: OmarchyLook): Theme =>
  paletteToTokens(decodeOmarchyPalette(source(name)).palette);

/** Hyprland's gaps: between tiles, and around the screen's edge. */
const GAP = 12;
const EDGE = 26;
const BAR = 28;
const BORDER = 2;

const Tile = ({
  theme,
  flex,
  children,
}: {
  theme: Theme;
  flex: number;
  children: ReactNode;
}) => (
  <div
    style={{
      flexGrow: flex,
      flexBasis: 0,
      display: "flex",
      borderWidth: BORDER,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);

const Bar = ({ theme }: { theme: Theme }) => (
  <div
    style={{
      height: BAR,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 14,
      paddingRight: 14,
      backgroundColor: theme.colors.background,
    }}
  >
    <div
      style={{ flexGrow: 1, display: "flex", flexDirection: "row", gap: 12 }}
    >
      {Arr.map(["1", "2", "3"], (n) => (
        <text
          key={n}
          style={{
            fontSize: 12,
            color:
              n === "1" ? theme.colors.primary : theme.colors.mutedForeground,
          }}
        >
          {n}
        </text>
      ))}
    </div>
    <text style={{ fontSize: 12, color: theme.colors.foreground }}>
      Friday 09:41
    </text>
    <div style={{ flexGrow: 1 }} />
  </div>
);

/** The desktop at 1280×720 in `look`. */
export const OmarchyDesktop = ({ look }: { look: OmarchyLook }) => {
  const theme = omarchyTheme(look);
  return (
    <ThemeProvider theme={theme}>
      <div
        style={{
          width: 1280,
          height: 720,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <img
          src={wallpaper(look)}
          objectFit="cover"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1280,
            height: 720,
          }}
        />
        <Bar theme={theme} />
        <div
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "row",
            gap: GAP,
            padding: EDGE,
            minHeight: 0,
          }}
        >
          <Tile theme={theme} flex={3}>
            <Kanban />
          </Tile>
          <Tile theme={theme} flex={2}>
            <Inbox />
          </Tile>
        </div>
      </div>
    </ThemeProvider>
  );
};
