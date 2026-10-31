/**
 * Calendar — a week view (plan 729): calendars with switches in the sidebar,
 * ‹ Today › and a Day/Week/Month switch in the toolbar, and the week's events
 * placed in hourly rows, overlapping events side by side (`layoutDay`).
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
const ROW = 40;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

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
  const fill = (id: CalendarId) => {
    const tone = calendars.find((c) => c.id === id)?.tone ?? "primary";
    return tone === "primary"
      ? theme.colors.primary
      : statusTone(theme, tone).foreground;
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
        style={{ flexGrow: 1, paddingLeft: 48, paddingTop: 8 }}
      >
        {Arr.map(DAYS, (day, index) => (
          <div
            key={day}
            testId={`day-${index}`}
            style={{
              position: "relative",
              flexGrow: 1,
              flexBasis: 0,
              height: HOURS * ROW + 24,
              borderLeftWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
            }}
          >
            <Text tone="muted" style={{ paddingLeft: 6 }}>
              {day}
            </Text>
            {Arr.map(
              layoutDay(Arr.filter(shown, (event) => event.day === index)),
              ({ event, lane, lanes }) => (
                // The runtime takes `left` in points only, so a lane is one of
                // `lanes` equal flex cells across a full-width row.
                <div
                  key={event.id}
                  style={{
                    position: "absolute",
                    top: 24 + (event.start - FIRST_HOUR) * ROW,
                    height: (event.end - event.start) * ROW - 2,
                    left: 0,
                    width: "100%",
                    display: "flex",
                    flexDirection: "row",
                  }}
                >
                  {Arr.map(Arr.range(0, lanes - 1), (cell) =>
                    cell === lane ? (
                      <div
                        key={cell}
                        testId={`event-${event.id}`}
                        style={{
                          flexGrow: 1,
                          flexBasis: 0,
                          paddingLeft: 6,
                          borderLeftWidth: 3,
                          borderColor: fill(event.calendar),
                          backgroundColor: theme.colors.accent,
                          borderRadius: theme.radius.sm,
                          overflow: "hidden",
                        }}
                      >
                        <Text>{event.title}</Text>
                      </div>
                    ) : (
                      <div key={cell} style={{ flexGrow: 1, flexBasis: 0 }} />
                    ),
                  )}
                </div>
              ),
            )}
          </div>
        ))}
      </Stack>
    </Window>
  );
};
