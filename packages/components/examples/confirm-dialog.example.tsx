/**
 * ConfirmDialog example: a destructive action with the consequence named.
 *
 * The dialog does not close itself after confirming: the caller runs the work and
 * closes on success. Here that is a simulated archive; a real one would await a
 * service and leave the dialog open with the error if it failed.
 */

import { useEffect, useState } from "react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "../src/alert.js";
import { Button } from "../src/internal/button.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { ConfirmDialog } from "../src/confirm-dialog.js";
import { useTheme } from "../src/internal/theme.js";

/** A project row with an archive action behind a confirmation. */
export const ConfirmDialogExample = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archived, setArchived] = useState(false);

  useEffect(() => {
    if (!archiving) return;
    const timer = setTimeout(() => {
      setArchiving(false);
      setOpen(false);
      setArchived(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [archiving]);

  return (
    <Card style={{ maxWidth: 480 }}>
      <CardHeader>
        <CardTitle>Website redesign</CardTitle>
        <CardDescription>
          18 open tasks · archived projects can be restored for 30 days
        </CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: theme.spacing.xl,
          paddingTop: 0,
        }}
      >
        <Button
          testId="confirm-example-open"
          variant="danger"
          onClick={() => setOpen(true)}
        >
          Archive project
        </Button>
      </div>
      {archived ? (
        <div style={{ padding: theme.spacing.xl, paddingTop: 0 }}>
          <Alert tone="info">
            <AlertContent>
              <AlertTitle>Project archived</AlertTitle>
              <AlertDescription>
                Restore it from the archive within 30 days.
              </AlertDescription>
            </AlertContent>
          </Alert>
        </div>
      ) : null}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Archive this project?"
        description="The project moves out of everyone's sidebar. Its 18 open tasks stay attached and no files are deleted."
        confirmLabel="Archive project"
        tone="danger"
        loading={archiving}
        onConfirm={() => setArchiving(true)}
      />
    </Card>
  );
};
