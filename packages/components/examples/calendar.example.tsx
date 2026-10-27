/** @jsxImportSource @gpuix/react */
/**
 * Calendar example: a two-month range picker with a summary.
 *
 * The app owns the ISO span; the calendar owns the grid, its roving focus, the
 * keyboard and the paint. `09:00` and weekends are refused by the matchers, and
 * the summary is derived from the value the calendar reports.
 */

import { useState } from "react";
import { Calendar } from "../src/calendar.js";
import { formatRangeLabel, type DayRange } from "../src/calendar/logic.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** A two-month booking calendar with a live summary. */
export const CalendarExample = () => {
  const theme = useTheme();
  const [range, setRange] = useState<DayRange | null>({
    from: "2026-10-19",
    to: "2026-10-23",
  });

  return (
    <Card style={{ maxWidth: 560 }}>
      <CardHeader>
        <CardTitle>Release window</CardTitle>
        <CardDescription>
          {range === null ? "No window chosen" : formatRangeLabel(range)}
        </CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          paddingTop: 0,
        }}
      >
        <Calendar
          mode="range"
          numberOfMonths={2}
          today="2026-10-17"
          selected={range}
          onSelect={setRange}
          disabled={{ weekdays: [0, 6] }}
        />
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Weekends are refused: the arrows step over them. Two months are painted
          side by side, and Escape is the owner's to handle.
        </text>
      </div>
    </Card>
  );
};
