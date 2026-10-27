/** @jsxImportSource @gpuix/react */
/**
 * Spinner example: the three sizes beside a busy action.
 *
 * The mark is a travelling lit dot, not a rotating arc — 0.11.0 has no
 * transform. The last row shows the action that reads it: a `Button` whose
 * `loading` spinner stands where its leading icon would, with the label kept.
 */

import * as Arr from "effect/Array";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { Spinner, type SpinnerSize } from "../src/spinner.js";

const sizes: ReadonlyArray<SpinnerSize> = ["sm", "md", "lg"];

/** A sync card with every size, and a busy primary action. */
export const SpinnerExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 440 }}>
      <CardHeader>
        <CardTitle>Syncing workspace</CardTitle>
        <CardDescription>24 files changed · 3 still uploading</CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
          paddingTop: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xl,
          }}
        >
          {Arr.map(sizes, (size) => (
            <div
              key={size}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
              }}
            >
              <Spinner size={size} label={`Loading, ${size}`} />
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {size}
              </text>
            </div>
          ))}
        </div>
        <Button
          testId="spinner-example-save"
          variant="primary"
          loading
          loadingLabel="Saving changes"
        >
          Save changes
        </Button>
      </div>
    </Card>
  );
};
