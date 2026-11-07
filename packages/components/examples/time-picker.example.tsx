/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import {
  TimePicker,
  TimePickerClear,
  TimePickerSegment,
  TimePickerSeparator,
} from "../src/time-picker.js";

export const TimePickerExample = () => {
  const theme = useTheme();
  const [standup, setStandup] = useState<string | null>("09:30");

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Team rhythm</CardTitle>
        <CardDescription>Daily standup: {standup ?? "not set"}</CardDescription>
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
            Standup time
          </text>
          <TimePicker
            label="Standup time"
            value={standup}
            onValueChange={setStandup}
            minuteStep={15}
            clearable
          >
            <TimePickerSegment segment="hours" />
            <TimePickerSeparator />
            <TimePickerSegment segment="minutes" />
            <TimePickerClear />
          </TimePicker>
        </div>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Type the hour, then the minutes. Arrow keys move by 15 minutes and
          wrap across midnight; Clear returns the field to not set.
        </text>
      </div>
    </Card>
  );
};
