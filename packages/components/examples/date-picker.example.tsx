/**
 * DatePicker example: a booking window with a summary.
 *
 * The app owns the ISO day; the picker owns the popover, the month grid, its
 * keyboard and the bounds. `min`/`max` make out-of-window days unchosen, and
 * `clearable` returns the field to "no date" without a second control. The
 * second field is the same parts with the caller's compact display labels.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
  type CalendarLabels,
} from "../src/date-picker.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** Abbreviated headings, supplied by the app rather than looked up. */
const COMPACT: Partial<CalendarLabels> = {
  months: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
};

/** One labelled date field over the picker parts. */
const DateField = ({
  label,
  value,
  onChange,
  labels,
}: {
  readonly label: string;
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly labels?: Partial<CalendarLabels>;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs,
      }}
    >
      <text
        style={{ ...textStyle(theme, "label"), color: theme.colors.foreground }}
      >
        {label}
      </text>
      <DatePicker
        value={value}
        onValueChange={onChange}
        today="2026-10-17"
        min="2026-10-17"
        max="2026-12-31"
        clearable
        labels={labels}
      >
        <DatePickerTrigger label={label} />
        <DatePickerContent>
          <DatePickerCalendar />
        </DatePickerContent>
      </DatePicker>
    </div>
  );
};

/** Two fields over one booking window, the second with compact labels. */
export const DatePickerExample = () => {
  const theme = useTheme();
  const [due, setDue] = useState<string | null>("2026-10-30");
  const [review, setReview] = useState<string | null>(null);

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Project settings</CardTitle>
        <CardDescription>
          Due date: {due ?? "not set"} · Review: {review ?? "not set"}
        </CardDescription>
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
        <DateField label="Due date" value={due} onChange={setDue} />
        <DateField
          label="Review date"
          value={review}
          onChange={setReview}
          labels={COMPACT}
        />
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Only 17 October–31 December 2026 is selectable; arrows clamp to the
          window. Enter selects, Clear returns the field to no date. The second
          field takes its month and weekday headings from the app.
        </text>
      </div>
    </Card>
  );
};
