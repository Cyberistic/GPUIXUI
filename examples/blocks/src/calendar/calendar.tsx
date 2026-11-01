/**
 * Calendar — a week view (plan 729): calendars with switches in the sidebar,
 * ‹ Today › and a Day/Week/Month switch in the toolbar, and the week's events
 * placed on an hour grid. Overlapping events cascade as Calendar.app draws
 * them: a later lane starts part-way in and lies over the earlier one, so every
 * event keeps most of the column instead of an equal sliver (`layoutDay`).
 */
import { SegmentedControl } from "@gpuixui/components/segmented-control";
import { Button, Stack, Switch, Text } from "@gpuixui/primitives";
import { Window, WindowToolbar } from "@gpuixui/shell";
import { statusTone, type PlatformName } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useState } from "react";
import { calendars, events, firstMonday, type CalendarId } from "./data.js";
import { layoutDay, visible, weekStart } from "./logic.js";

const FIRST_HOUR = 8;
const HOURS = 11;
const ROW = 48;
const GUTTER = 48;
const HEADER = 24;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** `9.5` → `9:30`. */
const hourLabel = (hour: number): string =>
  `${Math.floor(hour)}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;

export const CalendarBlock = ({
  platform,
}: {
  readonly platform?: PlatformName;
}) => {
  const theme = useTheme();
  const [week, setWeek] = useState(0);
  const [mode, setMode] = useState("week");
  const [on, setOn] = useState<ReadonlyArray<CalendarId>>(
    Arr.map(calendars, (c) => c.id),
  );
  const shown = visible(events, on);
  // The bar, the wash and the ink of a calendar's events: its tone's family,
  // or the accent's for the primary calendar.
  const paint = (id: CalendarId) => {
    const tone = calendars.find((c) => c.id === id)?.tone ?? "primary";
    if (tone === "primary") {
      return {
        bar: theme.colors.primary,
        wash: theme.colors.accent,
        ink: theme.colors.accentForeground,
      };
    }
    const family = statusTone(theme, tone);
    return {
      bar: family.foreground,
      wash: family.background,
      ink: family.foreground,
    };
  };

  return (
    <Window
      testId="calendar"
      {...(platform === undefined ? {} : { platform })}
      sidebar={
        <Stack
          direction="column"
          gap="sm"
          style={{ paddingLeft: 14, paddingRight: 14 }}
        >
          <Text tone="muted">Calendars</Text>
          {Arr.map(calendars, (calendar) => (
            <Stack
              key={calendar.id}
              direction="row"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Text>{calendar.label}</Text>
              <Switch
                label={calendar.label}
                testId={`calendar-${calendar.id}`}
                checked={on.includes(calendar.id)}
                onCheckedChange={(checked) =>
                  setOn(
                    checked
                      ? Arr.append(on, calendar.id)
                      : Arr.filter(on, (id) => id !== calendar.id),
                  )
                }
              />
            </Stack>
          ))}
        </Stack>
      }
      toolbar={
        <WindowToolbar
          title={`Week of ${weekStart(firstMonday, week)}`}
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                testId="previous"
                onActivate={() => setWeek(week - 1)}
              >
                ‹
              </Button>
              <Button variant="ghost" size="sm" onActivate={() => setWeek(0)}>
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                testId="next"
                onActivate={() => setWeek(week + 1)}
              >
                ›
              </Button>
              <SegmentedControl
                label="Range"
                value={mode}
                onValueChange={setMode}
                items={[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ]}
              />
            </>
          }
        />
      }
    >
      <Stack
        direction="row"
        style={{ flexGrow: 1, paddingTop: 8, position: "relative" }}
      >
        {Arr.map(Arr.range(0, HOURS - 1), (hour) => (
          <div
            key={hour}
            style={{
              position: "absolute",
              top: 8 + HEADER + hour * ROW,
              left: 0,
              right: 0,
              height: ROW,
              paddingLeft: 6,
              borderTopWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              pointerEvents: "none",
            }}
          >
            <Text role="caption" tone="muted">
              {hourLabel(FIRST_HOUR + hour)}
            </Text>
          </div>
        ))}
        <div style={{ width: GUTTER, flexShrink: 0 }} />
        {Arr.map(DAYS, (day, index) => (
          <div
            key={day}
            testId={`day-${index}`}
            style={{
              position: "relative",
              flexGrow: 1,
              flexBasis: 0,
              height: HOURS * ROW + HEADER,
              borderLeftWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
            }}
          >
            <Text tone="muted" style={{ paddingLeft: 6, height: HEADER }}>
              {day}
            </Text>
            {Arr.map(
              layoutDay(Arr.filter(shown, (event) => event.day === index)),
              ({ event, lane, lanes }) => {
                const { bar, wash, ink } = paint(event.calendar);
                // The runtime takes `left` in points only, so the cascade is
                // flex: `lane` parts of inset, then `lanes` parts of event.
                return (
                  <div
                    key={event.id}
                    style={{
                      position: "absolute",
                      top: HEADER + (event.start - FIRST_HOUR) * ROW + 1,
                      height: (event.end - event.start) * ROW - 2,
                      left: 0,
                      width: "100%",
                      display: "flex",
                      flexDirection: "row",
                    }}
                  >
                    <div style={{ flexGrow: lane, flexBasis: 0 }} />
                    <div
                      style={{
                        display: "flex",
                        flexGrow: lanes,
                        flexBasis: 0,
                        minWidth: 0,
                        marginRight: 2,
                        // A later lane lies over an earlier one; a hairline of the
                        // window's own colour keeps their edges apart.
                        ...(lane === 0
                          ? {}
                          : {
                              padding: 1,
                              borderRadius: theme.radius.sm,
                              backgroundColor: theme.colors.background,
                            }),
                      }}
                    >
                      <div
                        testId={`event-${event.id}`}
                        style={{
                          flexGrow: 1,
                          minWidth: 0,
                          paddingLeft: 6,
                          paddingRight: 4,
                          paddingTop: 2,
                          borderLeftWidth: 3,
                          borderColor: bar,
                          backgroundColor: wash,
                          borderRadius: theme.radius.sm,
                          overflow: "hidden",
                        }}
                      >
                        <Text role="caption" style={{ color: ink }}>
                          {hourLabel(event.start)}
                        </Text>
                        <Text
                          role="caption"
                          clamp={2}
                          style={{ color: ink, fontWeight: 600 }}
                        >
                          {event.title}
                        </Text>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        ))}
      </Stack>
    </Window>
  );
};
