/** @jsxImportSource @gpuix/react */
/**
 * Toast example: the stack, an action, and a promise that settles in place.
 *
 * The provider owns one store and one runtime; the viewport is the last child so
 * it paints above the card. A caller only sees `useToast()`.
 */

import { Duration } from "effect";
import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { Button } from "../src/internal/button.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { ToastProvider, ToastViewport, useToast } from "../src/toast.js";

/** Resolves after `ms`, so the promise toast shows its loading state. */
const after = <Value,>(ms: number, value: Value): Promise<Value> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

/** The panel inside the provider. */
const SavePanel = () => {
  const theme = useTheme();
  const toast = useToast();
  const [saved, setSaved] = useState(0);

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Publish changes</CardTitle>
        <CardDescription>Saved {saved} times this session</CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          paddingTop: 0,
        }}
      >
        <Button
          variant="primary"
          onClick={() => {
            setSaved((count) => count + 1);
            toast.push({
              title: "Changes published",
              description: "The site rebuilds in about a minute.",
              tone: "success",
            });
          }}
        >
          Publish
        </Button>
        <Button
          onClick={() =>
            toast.push(
              {
                title: "Draft restored",
                description: "The previous copy is in the editor.",
                tone: "info",
                duration: Duration.seconds(6),
                action: { label: "Undo" },
              },
              {
                onAction: () =>
                  toast.push({ title: "Restore undone", tone: "success" }),
              },
            )
          }
        >
          Restore draft
        </Button>
        <Button
          onClick={() =>
            void toast
              .promise(after(900, 12), {
                loading: {
                  title: "Importing rows",
                  description: "Reading the file…",
                },
                success: (rows) => ({
                  title: `Imported ${rows} rows`,
                  description: "The table is up to date.",
                  tone: "success",
                }),
                error: (cause) => ({
                  title: "Import failed",
                  description: String(cause),
                  tone: "danger",
                }),
              })
              .catch(() => undefined)
          }
        >
          Import rows
        </Button>
        <Button
          variant="danger"
          onClick={() =>
            toast.push({
              title: "Publish failed",
              description: "The remote returned 503.",
              tone: "danger",
            })
          }
        >
          Simulate failure
        </Button>
      </div>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
          paddingLeft: theme.spacing.lg,
          paddingBottom: theme.spacing.lg,
        }}
      >
        Hover the stack to unfold it; drag a card sideways to dismiss it. The ✕
        closes one early, and Undo runs before its toast closes.
      </text>
    </Card>
  );
};

/** The toast demo, with its own provider and viewport. */
export const ToastExample = () => (
  <div style={{ width: 900, height: 520 }}>
    <ToastProvider>
      <SavePanel />
      <ToastViewport />
    </ToastProvider>
  </div>
);
