/**
 * DatePicker example: a booking window with a summary.
 *
 * The app owns the ISO day; the picker owns the popover, the month grid, its
 * keyboard and the bounds. `min`/`max` make out-of-window days unchosen, and
 * `clearable` returns the field to "no date" without a second control.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { DatePicker } from "../src/date-picker.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** A due-date field with a booking window. */
export const DatePickerExample = () => {
  const theme = useTheme();
  const [due, setDue] = useState<string | null>("2026-10-30");

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Project settings</CardTitle>
        <CardDescription>Due date: {due ?? "not set"}</CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
          paddingTop: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Due date
          </text>
          <DatePicker
            label="Due date"
            value={due}
            onValueChange={setDue}
            today="2026-10-17"
            min="2026-10-17"
            max="2026-12-31"
            clearable
          />
        </div>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Only 17 October–31 December 2026 is selectable; arrows clamp to the
          window. Enter selects, Clear returns the field to no date.
        </text>
      </div>
    </Card>
  );
};
