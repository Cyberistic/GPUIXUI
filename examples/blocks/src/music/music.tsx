/** @jsxImportSource @gpuix/react */
/**
 * Music — a player in the Mac look, after Apple Music's now-playing panel: the
 * cover, the track and artist, the transport with its scrubber, and the queue
 * with a cover per row. Pressing a row plays it; the transport toggles play.
 *
 * The art is drawn per track (a two-stop gradient with a soft light), because
 * album artwork is not ours to ship; the waveform is seeded from the track, so a
 * render of a track is always the same shape.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { Button, Text } from "@gpuixui/primitives";
import { Window, WindowToolbar } from "@gpuixui/shell";
import { useTheme } from "@gpuixui/tokens/react";
import { useState } from "react";
import { tracks, type Track } from "./data.js";
import { clock, trackOf, transport, waveform } from "./logic.js";

const ART: Readonly<Record<string, readonly [string, string]>> = {
  snowfall: ["#8C7BF0", "#2B1B57"],
  cosmic: ["#F08C7B", "#5B1B3A"],
  cobalt: ["#4C9BF0", "#12203F"],
  drift: ["#3ED2C4", "#123F3B"],
};

const gradient = (from: string, to: string, angle = 150) => ({
  type: "linear-gradient" as const,
  angle,
  stops: [
    { color: from, position: 0 },
    { color: to, position: 1 },
  ] as [
    { readonly color: string; readonly position: number },
    { readonly color: string; readonly position: number },
  ],
});

/** The cover: the track's own gradient, with one soft light over it. */
const Cover = ({
  track,
  size,
}: {
  readonly track: Track;
  readonly size: number;
}) => {
  const art = ART[track.id] ?? ["#8C7BF0", "#2B1B57"];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        overflow: "hidden",
        background: gradient(art[0], art[1]),
        pointerEvents: "none",
        boxShadow: {
          offsetX: 0,
          offsetY: 10,
          blurRadius: 28,
          spreadRadius: -12,
          color: "#1A103066",
        },
      }}
    >
      <div
        style={{
          position: "absolute",
          left: size * 0.12,
          top: -size * 0.35,
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: size * 0.45,
          background: gradient("#FFFFFF4D", "#FFFFFF00", 180),
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export const Music = ({
  platform,
}: {
  readonly platform?: "darwin" | "win32" | "linux";
}) => {
  const theme = useTheme();
  const [id, setId] = useState(tracks[0]?.id ?? "");
  const [playing, setPlaying] = useState(true);
  const track = Option.getOrUndefined(trackOf(tracks, id)) ?? tracks[0];
  if (track === undefined) return null;
  const queue = Arr.filter(tracks, (row) => row.id !== track.id);

  return (
    <Window
      testId="music"
      {...(platform === undefined ? {} : { platform })}
      toolbar={
        <WindowToolbar
          title="Music"
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
        style={{ display: "flex", flexDirection: "row", gap: 22, padding: 22 }}
      >
        <Cover track={track} size={196} />
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
              fontSize: 26,
              fontWeight: 700,
              color: theme.colors.foreground,
            }}
          >
            {track.title}
          </text>
          <text style={{ fontSize: 14, color: theme.colors.mutedForeground }}>
            {track.artist}
          </text>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              height: 34,
              gap: 2,
              paddingTop: 8,
            }}
          >
            {Arr.map(waveform(track.seed, 84), (height, i) => (
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
              1:24
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
              {clock(track.seconds)}
            </text>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 22,
              paddingTop: 4,
            }}
          >
            <Icon
              name="sparkles"
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
            <Icon
              name="refresh"
              size={16}
              color={theme.colors.mutedForeground}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          paddingLeft: 22,
          paddingRight: 22,
          paddingBottom: 16,
          gap: 2,
        }}
      >
        <Text role="caption" tone="muted">
          UP NEXT
        </Text>
        {Arr.map(queue, (row) => (
          <div
            key={row.id}
            testId={`track-${row.id}`}
            onClick={() => setId(row.id)}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              height: 48,
              paddingLeft: 8,
              paddingRight: 8,
              borderRadius: 8,
              backgroundColor: "#00000000",
            }}
          >
            <Cover track={row} size={34} />
            <div
              style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
            >
              <text style={{ fontSize: 13, color: theme.colors.foreground }}>
                {row.title}
              </text>
              <text
                style={{ fontSize: 11, color: theme.colors.mutedForeground }}
              >
                {row.artist}
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
