/**
 * Music — a player in the Mac look: the album art, the track and artist, the
 * waveform, the transport and the queue. Pressing a row plays it; the transport
 * toggles play and pause. The art is a gradient per track, drawn here.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { Button, Text } from "@gpuixui/primitives";
import { Window, WindowToolbar } from "@gpuixui/shell";
import { useTheme } from "@gpuixui/tokens/react";
import { useState } from "react";
import { tracks } from "./data.js";
import { clock, trackOf, transport, waveform } from "./logic.js";

const ART: Readonly<Record<string, readonly [string, string]>> = {
  snowfall: ["#7C5CE0", "#2B1B57"],
  cosmic: ["#E0655C", "#5B1B57"],
  cobalt: ["#3B82F6", "#12203F"],
  drift: ["#2FB4A8", "#123F3B"],
};

const BAR = 34;

export const Music = ({
  platform,
}: {
  readonly platform?: "darwin" | "win32" | "linux";
}) => {
  const theme = useTheme();
  const [id, setId] = useState(tracks[0]?.id ?? "");
  const [playing, setPlaying] = useState(true);
  const track = Option.getOrUndefined(trackOf(tracks, id)) ?? tracks[0];
  const art = ART[track?.id ?? ""] ?? ["#7C5CE0", "#2B1B57"];

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
        style={{ display: "flex", flexDirection: "row", gap: 24, padding: 24 }}
      >
        <div
          style={{
            width: 248,
            height: 248,
            borderRadius: 16,
            background: {
              type: "linear-gradient",
              angle: 150,
              stops: [
                { color: art[0], position: 0 },
                { color: art[1], position: 1 },
              ],
            },
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            gap: 10,
          }}
        >
          <text
            testId="now-title"
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: theme.colors.foreground,
            }}
          >
            {track?.title}
          </text>
          <Text role="label" tone="muted">
            {track?.artist}
          </Text>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              height: BAR,
              gap: 3,
              paddingTop: 8,
            }}
          >
            {Arr.map(waveform(track?.seed ?? 0, 56), (height, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height,
                  borderRadius: 2,
                  backgroundColor:
                    i < 22 ? theme.colors.accent : theme.colors.mutedForeground,
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
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border,
              }}
            >
              <div
                style={{
                  width: "44%",
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.accent,
                }}
              />
            </div>
            <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
              {clock(track?.seconds ?? 0)}
            </text>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 26,
              paddingTop: 6,
            }}
          >
            <Icon
              name="sparkles"
              size={18}
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
              style={{ width: 52, height: 52, borderRadius: 26, padding: 0 }}
            >
              <Icon
                name={playing ? "pause" : "play"}
                size={20}
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
              size={18}
              color={theme.colors.mutedForeground}
            />
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
        }}
      >
        <Text role="caption" tone="muted">
          UP NEXT
        </Text>
        {Arr.map(tracks, (row) => (
          <div
            key={row.id}
            testId={`track-${row.id}`}
            onClick={() => setId(row.id)}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              height: 44,
              paddingLeft: 10,
              paddingRight: 10,
              borderRadius: 8,
              backgroundColor:
                row.id === track?.id ? theme.colors.accent + "1F" : "#00000000",
            }}
          >
            <text
              style={{
                width: 18,
                fontSize: 12,
                color: theme.colors.mutedForeground,
              }}
            >
              {row.id === track?.id ? "▶" : ""}
            </text>
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
