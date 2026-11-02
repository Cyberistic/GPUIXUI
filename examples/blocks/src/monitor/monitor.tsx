/**
 * Monitor — a hardware monitor in the Mac look: two temperature cards with
 * their last minute as a sparkline, one bar per core, and memory as a ring.
 * The range control re-samples the window; nothing here polls.
 */
import { DonutChart, Sparkline } from "@gpuixui/data";
import * as Arr from "effect/Array";
import { Text } from "@gpuixui/primitives";
import { Window, WindowToolbar } from "@gpuixui/shell";
import { useTheme } from "@gpuixui/tokens/react";
import { useState } from "react";
import { cores, memory, ranges, sensors, type Range } from "./data.js";
import { nextRange, rangeLabel, samples } from "./logic.js";

const card = (theme: ReturnType<typeof useTheme>) => ({
  display: "flex" as const,
  flexDirection: "column" as const,
  gap: 6,
  padding: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: theme.colors.border,
  backgroundColor: theme.colors.card,
  flexGrow: 1,
});

export const Monitor = ({
  platform,
}: {
  readonly platform?: "darwin" | "win32" | "linux";
}) => {
  const theme = useTheme();
  const [range, setRange] = useState<Range>(1);
  const count = range * 12;

  return (
    <Window
      testId="monitor"
      {...(platform === undefined ? {} : { platform })}
      toolbar={
        <WindowToolbar
          title="Hardware Monitor"
          actions={
            <Text testId="monitor-range" role="caption" tone="muted">
              {rangeLabel(range)}
            </Text>
          }
        />
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", gap: 14 }}>
          {Arr.map(sensors, (sensor) => {
            const window = samples(sensor.seed, sensor.base, count);
            const last = Arr.last(window);
            return (
              <div key={sensor.id} style={card(theme)}>
                <Text role="caption" tone="muted">
                  {sensor.label}
                </Text>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 6,
                  }}
                >
                  <text
                    testId={`${sensor.id}-value`}
                    style={{
                      fontSize: 40,
                      fontWeight: 700,
                      lineHeight: 44,
                      color: theme.colors.foreground,
                    }}
                  >
                    {`${last._tag === "Some" ? last.value : sensor.base}°`}
                  </text>
                  <text
                    style={{
                      fontSize: 12,
                      paddingBottom: 8,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    C
                  </text>
                </div>
                <Sparkline values={window} width={280} height={64} />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <text
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {sensor.detail}
                  </text>
                  <text
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {rangeLabel(range)}
                  </text>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 14 }}>
          <div style={{ ...card(theme), width: 480, flexGrow: 0 }}>
            <Text role="caption" tone="muted">
              CORE LOAD
            </Text>
            {Arr.map(cores, (value, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <text
                  style={{
                    width: 42,
                    fontSize: 11,
                    color: theme.colors.mutedForeground,
                  }}
                >{`cpu${i}`}</text>
                <div
                  style={{
                    flexGrow: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.colors.border,
                  }}
                >
                  <div
                    style={{
                      width: `${value}%`,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        i % 2 === 0
                          ? theme.colors.accent
                          : theme.colors.mutedForeground,
                    }}
                  />
                </div>
                <text
                  style={{
                    width: 34,
                    textAlign: "right",
                    fontSize: 11,
                    color: theme.colors.foreground,
                  }}
                >
                  {`${value}%`}
                </text>
              </div>
            ))}
          </div>
          <div style={{ ...card(theme), alignItems: "center" }}>
            <Text role="caption" tone="muted">
              MEMORY
            </Text>
            <DonutChart data={memory.map((slot) => ({ ...slot }))} size={160} />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Text role="caption" tone="muted">
            Window
          </Text>
          {Arr.map(ranges, (option) => (
            <div
              key={option}
              testId={`range-${option}m`}
              onClick={() => setRange(nextRange(range, option))}
              style={{
                height: 26,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 7,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  option === range ? theme.colors.accent : theme.colors.muted,
              }}
            >
              <text
                style={{
                  fontSize: 12,
                  color:
                    option === range
                      ? (theme.colors.accentForeground ?? "#FFFFFF")
                      : theme.colors.mutedForeground,
                }}
              >
                {`${option} m`}
              </text>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
};
