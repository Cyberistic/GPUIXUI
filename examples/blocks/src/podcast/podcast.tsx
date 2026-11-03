/** @jsxImportSource @gpuix/react */
/**
 * Podcast — an episode player in the Mac look: the show's artwork, the episode
 * and its waveform, the transport, and the rest of the season under it.
 * Pressing a row plays it; the transport toggles play.
 *
 * The artwork is the caller's, because cover art is not ours to ship; the
 * waveform is seeded from the episode, so a render is always the same shape.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { Button, Text } from "@gpuixui/primitives";
import { Window, WindowToolbar } from "@gpuixui/shell";
import { useTheme } from "@gpuixui/tokens/react";
import { useState } from "react";
import { episodes, type Episode } from "./data.js";
import { clock, episodeOf, transport, waveform } from "./logic.js";

/** A two-stop fill, for the placeholder a caller without art gets. */
const gradient = (from: string, to: string) => ({
  type: "linear-gradient" as const,
  angle: 150,
  stops: [
    { color: from, position: 0 },
    { color: to, position: 1 },
  ] as [
    { readonly color: string; readonly position: number },
    { readonly color: string; readonly position: number },
  ],
});

/** The artwork: the caller's cover, or a drawn field in the theme's own inks. */
const Artwork = ({
  cover,
  size,
}: {
  readonly cover: string | undefined;
  readonly size: number;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        overflow: "hidden",
        pointerEvents: "none",
        background: gradient(theme.colors.primary, theme.colors.background),
        boxShadow: {
          offsetX: 0,
          offsetY: 12,
          blurRadius: 30,
          spreadRadius: -12,
          color: "#1A103066",
        },
      }}
    >
      {cover === undefined ? null : (
        <img alt="" src={cover} style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
};

export const Podcast = ({
  platform,
  cover,
}: {
  readonly platform?: "darwin" | "win32" | "linux";
  /** The show's artwork; the block draws a field in its own inks without one. */
  readonly cover?: string;
}) => {
  const theme = useTheme();
  const [id, setId] = useState(episodes[0]?.id ?? "");
  const [playing, setPlaying] = useState(true);
  const episode: Episode | undefined =
    Option.getOrUndefined(episodeOf(episodes, id)) ?? episodes[0];
  if (episode === undefined) return null;
  const queue = Arr.filter(episodes, (row) => row.id !== episode.id);

  return (
    <Window
      testId="podcast"
      {...(platform === undefined ? {} : { platform })}
      toolbar={
        <WindowToolbar
          title="Podcast"
          actions={
            <Icon
              name="volume-2"
              size={14}
              color={theme.colors.mutedForeground}
            />
          }
        />
      }
    >
      <div
        style={{ display: "flex", flexDirection: "row", gap: 24, padding: 24 }}
      >
        <Artwork cover={cover} size={232} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flexGrow: 1,
          }}
        >
          <Text role="caption" tone="muted">
            NOW PLAYING
          </Text>
          <text
            testId="now-title"
            style={{
              fontSize: 27,
              fontWeight: 700,
              color: theme.colors.foreground,
            }}
          >
            {episode.title}
          </text>
          <text style={{ fontSize: 14, color: theme.colors.mutedForeground }}>
            {`${episode.show} · Episode ${String(
              Arr.findFirstIndex(episodes, (row) => row.id === episode.id).pipe(
                Option.getOrElse(() => 0),
              ) + 1,
            )}`}
          </text>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              height: 34,
              gap: 2,
              paddingTop: 10,
            }}
          >
            {Arr.map(waveform(episode.seed, 84), (height, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: Math.round(height * 0.7),
                  borderRadius: 2,
                  backgroundColor:
                    i < 34 ? theme.colors.accent : theme.colors.mutedForeground,
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
              24:10
            </text>
            <div
              style={{
                flexGrow: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: theme.colors.border,
              }}
            >
              <div
                style={{
                  width: "44%",
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: theme.colors.accent,
                }}
              />
            </div>
            <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
              {clock(episode.seconds)}
            </text>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 22,
              paddingTop: 6,
            }}
          >
            <Icon
              name="refresh"
              size={16}
              color={theme.colors.mutedForeground}
            />
            <Icon
              name="chevron-left"
              size={20}
              color={theme.colors.foreground}
            />
            <Button
              testId="transport"
              variant="primary"
              onActivate={() => setPlaying(transport)}
              style={{ width: 46, height: 46, borderRadius: 23, padding: 0 }}
            >
              <Icon
                name={playing ? "pause" : "play"}
                size={18}
                color={theme.colors.primaryForeground}
              />
            </Button>
            <Icon
              name="chevron-right"
              size={20}
              color={theme.colors.foreground}
            />
            <Icon name="list" size={16} color={theme.colors.mutedForeground} />
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 18,
          gap: 2,
        }}
      >
        <Text role="caption" tone="muted">
          THIS SEASON
        </Text>
        {Arr.map(queue, (row) => (
          <div
            key={row.id}
            testId={`episode-${row.id}`}
            onClick={() => setId(row.id)}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              height: 50,
              paddingLeft: 8,
              paddingRight: 8,
              borderRadius: 8,
              backgroundColor: "#00000000",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                overflow: "hidden",
                pointerEvents: "none",
                background: gradient(
                  theme.colors.secondary,
                  theme.colors.muted,
                ),
              }}
            >
              {cover === undefined ? null : (
                <img
                  alt=""
                  src={cover}
                  style={{ width: "100%", height: "100%", opacity: 0.9 }}
                />
              )}
            </div>
            <div
              style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
            >
              <text style={{ fontSize: 13, color: theme.colors.foreground }}>
                {row.title}
              </text>
              <text
                style={{ fontSize: 11, color: theme.colors.mutedForeground }}
              >
                {row.show}
              </text>
            </div>
            <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
              {clock(row.seconds)}
            </text>
          </div>
        ))}
      </div>
    </Window>
  );
};
