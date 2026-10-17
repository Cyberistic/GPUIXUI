/**
 * Popover example: choosing which columns a table shows.
 *
 * The popover holds its own open state (uncontrolled) and the *page* owns the
 * selection, so applying a filter is one state update in one place. Each row is a
 * toggle button rather than a checkbox because `packages/primitives` has no
 * checkbox yet; `aria-pressed` is what makes it a toggle to assistive technology.
 */

import * as Arr from "effect/Array";
import { useState } from "react";
import { Badge } from "../src/badge.js";
import { Button, type ButtonVariant } from "../src/internal/button.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { Popover, PopoverContent, PopoverTrigger } from "../src/popover.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** The columns the table can show. */
const columns: ReadonlyArray<string> = ["Name", "Owner", "Status", "Updated"];

/** A column list compressed into a one-line summary. */
const summarise = (visible: ReadonlyArray<string>): string =>
  Arr.match(visible, {
    onEmpty: () => "No columns",
    onNonEmpty: (values) =>
      `${values.length} of ${columns.length} columns: ${Arr.join(values, ", ")}`,
  });

/** A table header whose column visibility is chosen in a popover. */
export const PopoverExample = () => {
  const theme = useTheme();
  const [visible, setVisible] = useState<ReadonlyArray<string>>([
    "Name",
    "Status",
  ]);

  const toggle = (column: string): void => {
    setVisible((current) =>
      Arr.contains(current, column)
        ? Arr.filter(current, (candidate) => candidate !== column)
        : Arr.append(current, column),
    );
  };

  return (
    <Card style={{ maxWidth: 480 }}>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>{summarise(visible)}</CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          padding: theme.spacing.xl,
          paddingTop: 0,
        }}
      >
        <Badge variant="neutral">{visible.length} shown</Badge>
        <Popover>
          <PopoverTrigger testId="popover-example-trigger" variant="secondary">
            Columns
          </PopoverTrigger>
          <PopoverContent
            testId="popover-example-panel"
            side="bottom"
            align="end"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.sm,
              }}
            >
              {Arr.map(columns, (column) => {
                const shown = Arr.contains(visible, column);
                const variant: ButtonVariant = shown ? "primary" : "ghost";
                return (
                  <Button
                    key={column}
                    testId={`popover-example-${column}`}
                    variant={variant}
                    aria-pressed={shown}
                    onClick={() => toggle(column)}
                  >
                    <text
                      style={{
                        ...textStyle(theme, "label"),
                        color: "inherit",
                        flexGrow: 1,
                        textAlign: "left",
                      }}
                    >
                      {column}
                    </text>
                    <text
                      style={{
                        ...textStyle(theme, "caption"),
                        color: "inherit",
                      }}
                    >
                      {shown ? "✓" : "·"}
                    </text>
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
};
