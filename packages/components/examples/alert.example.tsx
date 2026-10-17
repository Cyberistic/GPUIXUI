/**
 * Alert example: an updater banner you can dismiss, and a failure with a retry.
 *
 * The banner keeps its own dismissal state, which is what a real screen does, and
 * the failure alert puts a real control in its description — an alert is in the
 * flow, so the action belongs with it rather than in a floating surface.
 */

import { useState } from "react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertDismiss,
  AlertTitle,
} from "../src/alert.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** Four alerts: a dismissable notice, two statuses, and a failure with an action. */
export const AlertExample = () => {
  const theme = useTheme();
  const [dismissed, setDismissed] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        maxWidth: 560,
      }}
    >
      {dismissed ? (
        <Button onClick={() => setDismissed(false)}>
          Show the update notice again
        </Button>
      ) : (
        <Alert tone="info">
          <AlertContent>
            <AlertTitle>Update available</AlertTitle>
            <AlertDescription>
              0.11.0 is ready. Installing restarts the app.
            </AlertDescription>
          </AlertContent>
          <AlertDismiss onDismiss={() => setDismissed(true)} />
        </Alert>
      )}
      <Alert tone="success">
        <AlertContent>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            All 12 files were written to the workspace.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <Alert tone="warning">
        <AlertContent>
          <AlertTitle>3 tokens are missing</AlertTitle>
          <AlertDescription>
            The platform themes fall back to the default palette.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <Alert tone="danger">
        <AlertContent>
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.md,
                alignItems: "flex-start",
              }}
            >
              <text style={{ ...textStyle(theme, "body") }}>
                The network was unreachable after 30 seconds.
              </text>
              <Button onClick={() => undefined}>Try again</Button>
            </div>
          </AlertDescription>
        </AlertContent>
      </Alert>
    </div>
  );
};
