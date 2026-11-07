/** @jsxImportSource @gpuix/react */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { Window, WindowToolbar } from "@gpuixui/shell";
import { useTheme } from "@gpuixui/tokens/react";
import { useState } from "react";
import { episodes, type Episode } from "./data.js";
import { clock, episodeOf, transport, waveform } from "./logic.js";

const INK = "#FFFFFF";
const DIM = "#FFFFFFB8";
const FAINT = "#FFFFFF4D";
const PANEL = "#00000066";

/** The two-stop fills the runtime accepts, as the typed tuple it reads. */
const fill = (from: string, to: string, angle = 0) => ({
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

export const Podcast = ({
  platform,
  cover,
}: {
  readonly platform?: "darwin" | "win32" | "linux";
  /** The show's artwork: it fills the window. */
  readonly cover?: string;
}) => {
  const theme = useTheme();
  const [id, setId] = useState(episodes[0]?.id ?? "");
  const [playing, setPlaying] = useState(true);
  const episode: Episode | undefined =
    Option.getOrUndefined(episodeOf(episodes, id)) ?? episodes[0];
  if (episode === undefined) return null;
  const queue = Arr.filter(episodes, (row) => row.id !== episode.id);
  const index =
    Arr.findFirstIndex(episodes, (row) => row.id === episode.id).pipe(
      Option.getOrElse(() => 0),
    ) + 1;

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
      <div style={{ position: "relative", flexGrow: 1, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            background: fill(theme.colors.secondary, theme.colors.background),
          }}
        />
        {cover === undefined ? null : (
          <img
            alt=""
            src={cover}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "#0A0C1247",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: 430,
            background: fill("#0A0C12F2", "#0A0C1200", 180),
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            height: "100%",
            padding: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <text
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: DIM,
              }}
            >
              WHALE ISLAND RADIO
            </text>
            <text style={{ fontSize: 40, fontWeight: 700, color: INK }}>
              Hunter × Hunter
            </text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <text
              testId="now-title"
              style={{ fontSize: 24, fontWeight: 700, color: INK }}
            >
              {episode.title}
            </text>
            <text style={{ fontSize: 13, color: DIM }}>
              {`Episode ${String(index)} · ${clock(episode.seconds)}`}
            </text>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              height: 34,
              gap: 2,
            }}
          >
            {Arr.map(waveform(episode.seed, 84), (height, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: Math.round(height * 0.7),
                  borderRadius: 2,
                  backgroundColor: i < 34 ? INK : FAINT,
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
            <text style={{ fontSize: 11, color: DIM }}>24:10</text>
            <div
              style={{
                flexGrow: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: FAINT,
              }}
            >
              <div
                style={{
                  width: "44%",
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: INK,
                }}
              />
            </div>
            <text style={{ fontSize: 11, color: DIM }}>
              {clock(episode.seconds)}
            </text>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 22,
            }}
          >
            <Icon name="refresh" size={16} color={DIM} />
            <Icon name="chevron-left" size={20} color={INK} />
            <div
              testId="transport"
              onClick={() => setPlaying(transport)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: INK,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={playing ? "pause" : "play"}
                size={20}
                color="#0A0C12"
              />
            </div>
            <Icon name="chevron-right" size={20} color={INK} />
            <Icon name="list" size={16} color={DIM} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              marginTop: 4,
              padding: 6,
              borderRadius: 12,
              backgroundColor: PANEL,
            }}
          >
            <text
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: DIM,
                paddingLeft: 8,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              THIS SEASON
            </text>
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
                  height: 38,
                  paddingLeft: 8,
                  paddingRight: 8,
                  borderRadius: 8,
                  backgroundColor: "#00000000",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: FAINT,
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="play" size={11} color={INK} />
                </div>
                <text style={{ flexGrow: 1, fontSize: 13, color: INK }}>
                  {row.title}
                </text>
                <text style={{ fontSize: 11, color: DIM }}>
                  {clock(row.seconds)}
                </text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Window>
  );
};
