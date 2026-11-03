/** @jsxImportSource @gpuix/react */
/**
 * Monitor — a hardware monitor in the dark Mac look, after the reference the
 * owner sent: a ring per processor with its load, temperature, clock and fan
 * beside it; RAM, network and drives as cards; the busiest processes as a table.
 *
 * Every ring is `@gpuixui/data`'s `DonutChart` (the load against the rest of the
 * circle) and the window is the shell's, so the block is the library arranged —
 * not a drawing of one. The samples are the block's data: nothing polls.
 */
import { DonutChart, Sparkline } from "@gpuixui/data";
import * as Arr from "effect/Array";
import { Icon } from "@gpuixui/icons";
import { Text } from "@gpuixui/primitives";
import { Window, WindowToolbar } from "@gpuixui/shell";
import { darkTheme, extendTheme, type Theme } from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import { useState } from "react";
import {
  drives,
  memory,
  network,
  processes,
  ranges,
  sensors,
  type Range,
  type Sensor,
} from "./data.js";
import { nextRange, rangeLabel, ring, samples } from "./logic.js";

const CARD = 12;

/** A two-stop surface: the cards are lit from the top-left, not flat. */
const gradient = (from: string, to: string, angle = 160) => ({
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

const card = (_theme: Theme) => ({
  display: "flex" as const,
  flexDirection: "column" as const,
  gap: 10,
  padding: 16,
  borderRadius: CARD,
  borderWidth: 1,
  borderColor: "#2C3040",
  background: gradient("#1A1D26", "#0E0F14"),
  boxShadow: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 26,
    spreadRadius: 0,
    color: "rgba(10, 132, 255, 0.08)",
  },
});

const row = {
  display: "flex",
  flexDirection: "row" as const,
  alignItems: "center",
};

/** One processor: the load ring, then its three readings with their bars. */
const Processor = ({
  sensor,
  range,
}: {
  readonly sensor: Sensor;
  readonly range: Range;
}) => {
  const theme = useTheme();
  const window = samples(sensor.seed, sensor.temp, 40);
  const last = Arr.last(window);
  const readings = [
    ["Temperature", `${sensor.temp}°`, sensor.temp / 100],
    ["Clock", sensor.clock, 0.78],
    ["Fan", sensor.fan, 0.24],
  ] as const;
  return (
    <div style={{ ...card(theme), flexGrow: 1, flexBasis: 0 }}>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <text
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: theme.colors.foreground,
          }}
        >
          {sensor.label}
        </text>
        <Icon name="info" size={14} color={theme.colors.mutedForeground} />
      </div>
      <div style={{ ...row, gap: 20, alignItems: "flex-start" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <DonutChart
            data={ring(sensor.load)}
            size={124}
            legend={false}
            testId={`${sensor.id}-ring`}
          />
          <text
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: theme.colors.foreground,
            }}
          >{`${sensor.load}%`}</text>
          <text
            style={{
              fontSize: 10,
              color: theme.colors.mutedForeground,
            }}
          >
            LOAD
          </text>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexGrow: 1,
          }}
        >
          {Arr.map(readings, ([label, value, share]) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <div style={{ ...row, justifyContent: "space-between" }}>
                <text
                  style={{
                    fontSize: 11,
                    color: theme.colors.mutedForeground,
                  }}
                >
                  {label.toUpperCase()}
                </text>
                <text style={{ fontSize: 13, color: theme.colors.foreground }}>
                  {value}
                </text>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.border,
                }}
              >
                <div
                  style={{
                    width: `${Math.round(share * 100)}%`,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.foreground,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
        ▢ Minimal Load
      </text>
      <Sparkline values={window} width={280} height={28} />
      <text
        testId={`${sensor.id}-value`}
        style={{ fontSize: 11, color: theme.colors.mutedForeground }}
      >
        {`${last._tag === "Some" ? last.value : sensor.temp}° · ${rangeLabel(range)}`}
      </text>
    </div>
  );
};

/** A small card: a ring or a number, then its rows. */
const Panel = ({
  title,
  children,
  grow = 1,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly grow?: number;
}) => {
  const theme = useTheme();
  return (
    <div style={{ ...card(theme), flexGrow: grow, flexBasis: 0 }}>
      <text
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: theme.colors.foreground,
        }}
      >
        {title}
      </text>
      {children}
    </div>
  );
};

const Bar = ({ share }: { readonly share: number }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        height: 16,
        borderRadius: 3,
        backgroundColor: theme.colors.muted,
        flexGrow: 1,
      }}
    >
      <div
        style={{
          width: `${Math.round(share * 100)}%`,
          height: 16,
          borderRadius: 3,
          backgroundColor: theme.colors.mutedForeground,
        }}
      />
    </div>
  );
};

const Screen = ({
  range,
  onRange,
}: {
  readonly range: Range;
  readonly onRange: (r: Range) => void;
}) => {
  const theme = useTheme();
  return (
    <Window
      testId="monitor"
      toolbar={
        <WindowToolbar
          title="Hardware Monitor"
          actions={
            <div style={{ ...row, gap: 6 }}>
              <Text testId="monitor-range" role="caption" tone="muted">
                {rangeLabel(range)}
              </Text>
              {Arr.map(ranges, (option) => (
                <div
                  key={option}
                  testId={`range-${option}m`}
                  onClick={() => onRange(nextRange(range, option))}
                  style={{
                    display: "flex",
                    height: 24,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRadius: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      option === range
                        ? theme.colors.accent
                        : theme.colors.muted,
                  }}
                >
                  <text
                    style={{
                      fontSize: 12,
                      color:
                        option === range
                          ? theme.colors.accentForeground
                          : theme.colors.mutedForeground,
                      pointerEvents: "none",
                    }}
                  >
                    {`${option} m`}
                  </text>
                </div>
              ))}
            </div>
          }
        />
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
          <Processor sensor={sensors[0]!} range={range} />
          <Processor sensor={sensors[1]!} range={range} />
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
          <Panel title="RAM">
            <div style={{ ...row, gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <DonutChart
                  data={ring(memory.used)}
                  size={96}
                  legend={false}
                  testId="ram-ring"
                />
                <text
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: theme.colors.foreground,
                  }}
                >{`${memory.used}%`}</text>
              </div>
              <text
                style={{ fontSize: 12, color: theme.colors.mutedForeground }}
              >
                {memory.total}
              </text>
            </div>
          </Panel>
          <Panel title="Network">
            <div style={{ ...row, gap: 10, alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <text
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    color: theme.colors.foreground,
                  }}
                >
                  {network.up}
                </text>
                <text
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    color: theme.colors.foreground,
                  }}
                >
                  {network.down}
                </text>
              </div>
              <Icon
                name="arrow-up"
                size={16}
                color={theme.colors.mutedForeground}
              />
            </div>
            <div style={{ ...row, justifyContent: "space-between" }}>
              <text
                style={{ fontSize: 11, color: theme.colors.mutedForeground }}
              >{`▢ ${network.interface}`}</text>
              <text
                style={{ fontSize: 11, color: theme.colors.mutedForeground }}
              >
                {network.total}
              </text>
            </div>
          </Panel>
          <Panel title="Storage">
            {Arr.map(drives, (drive) => (
              <div key={drive.letter} style={{ ...row, gap: 10 }}>
                <text
                  style={{
                    width: 26,
                    fontSize: 14,
                    color: theme.colors.foreground,
                  }}
                >
                  {drive.letter}
                </text>
                <Bar share={drive.used} />
                <text
                  style={{
                    width: 108,
                    fontSize: 11,
                    textAlign: "right",
                    color: theme.colors.foreground,
                  }}
                >
                  {drive.label}
                </text>
              </div>
            ))}
          </Panel>
        </div>
        <div style={{ ...card(theme), padding: 0, overflow: "hidden" }}>
          <div
            style={{
              ...row,
              paddingLeft: 14,
              paddingRight: 14,
              paddingTop: 10,
              paddingBottom: 8,
            }}
          >
            <text
              style={{
                flexGrow: 1,
                fontSize: 15,
                fontWeight: 600,
                color: theme.colors.foreground,
              }}
            >
              Top Processes
            </text>
            {["CPU", "GPU", "RAM", "Download", "Upload"].map((column) => (
              <text
                key={column}
                style={{
                  width: 96,
                  fontSize: 12,
                  textAlign: "right",
                  color: theme.colors.mutedForeground,
                }}
              >
                {column}
              </text>
            ))}
          </div>
          <div style={{ height: 1, backgroundColor: theme.colors.border }} />
          {Arr.map(processes, (process) => (
            <div
              key={process.name}
              style={{ ...row, height: 30, paddingLeft: 14, paddingRight: 14 }}
            >
              <text
                style={{
                  flexGrow: 1,
                  fontSize: 13,
                  color: theme.colors.foreground,
                }}
              >
                {process.name}
              </text>
              {[
                process.cpu,
                process.gpu,
                process.ram,
                process.down,
                process.up,
              ].map((value, i) => (
                <text
                  key={i}
                  style={{
                    width: 96,
                    fontSize: 12,
                    textAlign: "right",
                    color: theme.colors.foreground,
                  }}
                >
                  {value}
                </text>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
};

/**
 * The monitor paints in the dark look the reference shows; the theme is the
 * library's dark theme with an opaque window, because the offscreen renderer has
 * no window server to blur through.
 */
export const Monitor = ({
  platform,
}: {
  readonly platform?: "darwin" | "win32" | "linux";
}) => {
  const theme = extendTheme(darkTheme, { window: "opaque" });
  const [range, setRange] = useState<Range>(1);
  void platform;
  return (
    <ThemeProvider theme={theme}>
      <Screen range={range} onRange={setRange} />
    </ThemeProvider>
  );
};
