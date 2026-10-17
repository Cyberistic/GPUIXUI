/**
 * DatePicker example: a due date with a summary and a clear control.
 *
 * The app owns the ISO day; the picker owns the popover, the month grid and its
 * keyboard. Clearing sets `null`, which is the "no due date" state.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { DatePicker } from "../src/date-picker.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** A due-date field. */
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
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
            }}
          >
            <DatePicker
              label="Due date"
              value={due}
              onValueChange={setDue}
              today="2026-10-17"
            />
            <Button
              variant="ghost"
              disabled={due === null}
              onClick={() => setDue(null)}
            >
              Clear
            </Button>
          </div>
        </div>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Arrow keys move by day; PageUp/PageDown browse months; Enter selects.
        </text>
      </div>
    </Card>
  );
};
