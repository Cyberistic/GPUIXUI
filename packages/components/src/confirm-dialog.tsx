/**
 * ConfirmDialog: the safety workflow, not a styled box.
 *
 * It is the dialog the rest of the library uses when an action cannot be undone.
 * Two decisions make it safe rather than merely convenient:
 *
 * - **Cancel holds initial focus**, so Enter on an untouched dialog cancels. The
 *   ordering is deliberate: `DialogContent` focuses its surface, then this
 *   component's layout effect moves focus to Cancel (child effects run first).
 * - **Confirm does not close the dialog.** The caller owns the async work and
 *   closes through `open` when it succeeds, so a failed save can stay open with
 *   the error visible instead of vanishing mid-flight.
 */

import { Match } from "effect";
import { useRef, type ReactNode } from "react";
import type { PublicInstance } from "@gpuix/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog.js";
import { Button } from "./internal/button.js";
import { textStyle, useTheme } from "./internal/theme.js";

/** How much emphasis the confirm action carries. */
export type ConfirmTone = "default" | "danger";

/** {@link ConfirmDialog} props. */
export interface ConfirmDialogProps {
  /** The controlled open state. The caller owns it, including closing it. */
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The dialog's name; also its accessible label. */
  readonly title: string;
  /** What the action does, including what cannot be undone. */
  readonly description: string;
  /** Default `"Confirm"`. */
  readonly confirmLabel?: string;
  /** Default `"Cancel"`. */
  readonly cancelLabel?: string;
  /** Default `"default"`. `"danger"` paints the destructive button variant. */
  readonly tone?: ConfirmTone;
  /**
   * Disables both actions, marks the confirm button busy and suppresses Escape
   * and outside-press dismissal. The caller still decides when to close.
   */
  readonly loading?: boolean;
  readonly onConfirm: () => void;
  /** Extra dialog body between the description and the actions. */
  readonly children?: ReactNode;
}

/**
 * A modal that asks before an irreversible action. Cancel is focused first and
 * Escape is the same as cancelling; confirming only reports, it never closes.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) => {
  const theme = useTheme();
  const cancel = useRef<PublicInstance | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dismissible={!loading}>
      <DialogContent
        label={title}
        size="sm"
        showClose={false}
        initialFocus={() => cancel.current?.id ?? null}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button
            ref={cancel}
            testId="confirm-cancel"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            testId="confirm-accept"
            variant={Match.value(tone).pipe(
              Match.when("danger", () => "danger" as const),
              Match.orElse(() => "primary" as const),
            )}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <text
                aria-label="In progress"
                style={{ ...textStyle(theme, "label"), color: "inherit" }}
              >
                …
              </text>
            ) : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const confirmDialogMeta = {
  name: "Confirmation dialogs",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "shares the dialog's 0.10.0 gaps: no aria-modal, no aria-labelledby",
    "the busy indicator is a text glyph until a Spinner primitive exists",
    "confirm does not close the dialog by design: the caller owns the close after its work succeeds",
  ],
  docs: "docs/confirm-dialog.mdx",
  example: "examples/confirm-dialog.example.tsx",
  testFile: "src/behaviour/confirm-dialog.test.tsx",
} as const;
