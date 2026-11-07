/** @jsxImportSource @gpuix/react */
import type { KeyEvent } from "@gpuix/react";
import { DonutChart, Sparkline } from "@gpuixui/data";
import { Icon } from "@gpuixui/icons";
import { Stack, Text } from "@gpuixui/primitives";
import { platformTheme, seriesColors, type Theme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState, type ReactNode } from "react";
import { Settings } from "../settings/settings.js";
import {
  commits,
  cores,
  memory,
  system,
  type PaletteName,
  type TileId,
} from "./data.js";
import { nextFocus, paletteTheme, titleOf } from "./logic.js";

export type { PaletteName } from "./data.js";

export interface TilingDesktopProps {
  readonly palette?: PaletteName;
  readonly focus?: TileId;
  /** A wallpaper image behind the tiles; the palette's ground is the default. */
  readonly wallpaper?: string;
  /** The band of wallpaper around the tiles, in pixels. Default `8`. */
  readonly inset?: number;
}

const Bar = ({
  theme,
  title,
}: {
  readonly theme: Theme;
  readonly title: string;
}) => {
  const text = {
    fontFamily: theme.typography.mono,
    fontSize: theme.typography.code.fontSize,
    color: theme.colors.foreground,
  };
  return (
    <div
      testId="tiling-bar"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: theme.spacing["2xl"],
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.md,
        backgroundColor: theme.colors.card,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xs,
          flexBasis: 0,
          flexGrow: 1,
        }}
      >
        {Arr.map([1, 2, 3, 4, 5], (workspace) => (
          <div
            key={workspace}
            style={{
              paddingLeft: theme.spacing.sm,
              paddingRight: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              backgroundColor:
                workspace === 1 ? theme.colors.primary : undefined,
            }}
          >
            <text
              style={{
                ...text,
                color:
                  workspace === 1
                    ? theme.colors.primaryForeground
                    : theme.colors.mutedForeground,
              }}
            >
              {String(workspace)}
            </text>
          </div>
        ))}
      </div>
      <text style={text}>{title}</text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.md,
          flexBasis: 0,
          flexGrow: 1,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <text style={{ ...text, color: theme.colors.mutedForeground }}>
          cpu 23%
        </text>
        <text style={{ ...text, color: theme.colors.mutedForeground }}>
          mem 19%
        </text>
        <Icon name="clock" size="xs" color={theme.colors.foreground} />
        <text style={text}>09:41</text>
      </div>
    </div>
  );
};

const Tile = ({
  id,
  theme,
  focused,
  grow,
  onFocus,
  children,
}: {
  readonly id: TileId;
  readonly theme: Theme;
  readonly focused: boolean;
  readonly grow: number;
  readonly onFocus: (id: TileId) => void;
  readonly children: ReactNode;
}) => (
  <div
    testId={`tile-${id}`}
    onMouseDown={() => onFocus(id)}
    style={{
      display: "flex",
      flexDirection: "column",
      flexGrow: grow,
      flexBasis: 0,
      minWidth: 0,
      minHeight: 0,
      overflow: "hidden",
      borderRadius: theme.radius.md,
      borderWidth: theme.borderWidth.strong,
      borderColor: focused ? theme.colors.primary : theme.colors.border,
      backgroundColor: theme.colors.background,
    }}
  >
    {children}
  </div>
);

const Terminal = ({
  theme,
  palette,
}: {
  readonly theme: Theme;
  readonly palette: PaletteName;
}) => {
  const mono = {
    fontFamily: theme.typography.mono,
    fontSize: theme.typography.codeBlock.fontSize,
    lineHeight: theme.typography.codeBlock.lineHeight,
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
      }}
    >
      <text style={{ ...mono, color: theme.colors.primary }}>
        ~ ❯ fastfetch
      </text>
      {Arr.map(system(palette), ([key, value]) => (
        <div key={key} style={{ display: "flex", flexDirection: "row" }}>
          <text
            style={{
              ...mono,
              width: theme.spacing["2xl"] * 3,
              color: theme.colors.primary,
            }}
          >
            {key}
          </text>
          <text style={{ ...mono, color: theme.colors.foreground }}>
            {value}
          </text>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xs,
          paddingTop: theme.spacing.xs,
        }}
      >
        {Arr.map(seriesColors(theme), (swatch) => (
          <div
            key={swatch}
            style={{
              width: theme.spacing.lg,
              height: theme.spacing.md,
              backgroundColor: swatch,
            }}
          />
        ))}
      </div>
      <text style={{ ...mono, color: theme.colors.primary }}>
        ~ ❯ git log --oneline -3
      </text>
      {Arr.map(commits, ([hash, subject]) => (
        <div
          key={hash}
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.sm,
          }}
        >
          <text style={{ ...mono, color: theme.colors.warning }}>{hash}</text>
          <text style={{ ...mono, color: theme.colors.foreground }}>
            {subject}
          </text>
        </div>
      ))}
      <text style={{ ...mono, color: theme.colors.primary }}>~ ❯ ▌</text>
    </div>
  );
};

const Monitor = ({ theme }: { readonly theme: Theme }) => {
  const swatches = seriesColors(theme);
  const mono = {
    fontFamily: theme.typography.mono,
    fontSize: theme.typography.code.fontSize,
    color: theme.colors.foreground,
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: theme.spacing.lg,
        padding: theme.spacing.md,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          flexGrow: 1,
        }}
      >
        {Arr.map(cores, (load, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
            }}
          >
            <text
              style={{
                ...mono,
                width: theme.spacing["2xl"] * 2,
                color: theme.colors.mutedForeground,
              }}
            >{`cpu${index}`}</text>
            <Sparkline
              values={load}
              width={220}
              height={30}
              color={swatches[index % swatches.length]}
              aria-label={`cpu${index}`}
            />
            <text style={mono}>{`${load[load.length - 1] ?? 0}%`}</text>
          </div>
        ))}
      </div>
      <Stack direction="column" gap="xs" align="center">
        <DonutChart
          data={[
            { key: "used", label: "Used", value: memory.used },
            { key: "free", label: "Free", value: memory.total - memory.used },
          ]}
          size={96}
          legend={false}
        />
        <Text
          role="caption"
          tone="muted"
        >{`mem ${memory.used} / ${memory.total} GiB`}</Text>
      </Stack>
    </div>
  );
};

export const TilingDesktop = ({
  palette = "tokyo-night",
  focus,
  wallpaper,
  inset = 8,
}: TilingDesktopProps) => {
  const theme = paletteTheme(palette);
  const [own, setOwn] = useState<TileId>("settings");
  const focused = focus ?? own;
  const [look, setLook] = useState<"linux" | "darwin" | "win32">("linux");
  const [dark, setDark] = useState(theme.mode === "dark");
  const onKeyDown = (event: KeyEvent) => {
    if (event.modifiers?.cmd !== true) return;
    if (event.key === "right" || event.key === "left") {
      event.preventDefault();
      setOwn(nextFocus(focused, event.key === "right" ? 1 : -1));
    }
  };
  const gap = theme.spacing.md;
  return (
    <ThemeProvider theme={theme}>
      <div
        testId="tiling"
        tabIndex={0}
        autoFocus
        onKeyDown={onKeyDown}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: theme.colors.background,
        }}
      >
        {wallpaper === undefined ? null : (
          <img
            alt=""
            src={wallpaper}
            objectFit="cover"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
            }}
          />
        )}
        <Bar theme={theme} title={titleOf(focused)} />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexGrow: 1,
            minHeight: 0,
            gap,
            padding: inset,
          }}
        >
          <Tile
            id="settings"
            theme={theme}
            focused={focused === "settings"}
            grow={1.25}
            onFocus={setOwn}
          >
            {/* The platform look shapes the controls; the desktop's palette still colours them. */}
            <ThemeProvider
              theme={{ ...platformTheme(theme, look), colors: theme.colors }}
            >
              <Settings
                look={look}
                onLookChange={setLook}
                dark={dark}
                onDarkChange={setDark}
              />
            </ThemeProvider>
          </Tile>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 0,
              gap,
            }}
          >
            <Tile
              id="terminal"
              theme={theme}
              focused={focused === "terminal"}
              grow={1.1}
              onFocus={setOwn}
            >
              <Terminal theme={theme} palette={palette} />
            </Tile>
            <Tile
              id="monitor"
              theme={theme}
              focused={focused === "monitor"}
              grow={1}
              onFocus={setOwn}
            >
              <Monitor theme={theme} />
            </Tile>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};
