/** @jsxImportSource @gpuix/react */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../src/dialog.js";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "../src/alert.js";
import { Button } from "../src/internal/button.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

export const DialogExample = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (!deleting) return;
    const timer = setTimeout(() => {
      setDeleting(false);
      setOpen(false);
      setDeleted(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [deleting]);

  return (
    <Card style={{ maxWidth: 480 }} variant="elevated">
      <CardHeader>
        <CardTitle>GPUIXUI workspace</CardTitle>
        <CardDescription>
          ~/GPUIXUI · 42 files · shared with 3 people
        </CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: theme.spacing.md,
          padding: theme.spacing.xl,
          paddingTop: 0,
        }}
      >
        <Dialog open={open} onOpenChange={setOpen} dismissible={!deleting}>
          <DialogTrigger testId="dialog-example-open" variant="danger">
            Delete workspace
          </DialogTrigger>
          <DialogContent
            label="Delete workspace"
            testId="dialog-example-content"
            size="md"
          >
            <DialogHeader>
              <DialogTitle>Delete this workspace?</DialogTitle>
              <DialogDescription>
                The workspace and its 42 files are removed for everyone. This
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >
              Members keep their personal copies of anything they exported.
            </text>
            <DialogFooter>
              <DialogClose testId="dialog-example-cancel" disabled={deleting}>
                Cancel
              </DialogClose>
              <Button
                testId="dialog-example-confirm"
                variant="danger"
                disabled={deleting}
                onClick={() => setDeleting(true)}
              >
                {deleting ? "Deleting…" : "Delete workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {deleted ? (
        <div style={{ padding: theme.spacing.xl, paddingTop: 0 }}>
          <Alert tone="success">
            <AlertContent>
              <AlertTitle>Workspace deleted</AlertTitle>
              <AlertDescription>
                Every member has been notified.
              </AlertDescription>
            </AlertContent>
          </Alert>
        </div>
      ) : null}
    </Card>
  );
};
