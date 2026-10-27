/** @jsxImportSource @gpuix/react */
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
 *
 * While `loading`, the confirm action paints the package's spinner beside its
 * label and refuses activation: the package's busy mark is the three-dot
 * indicator, because 0.11.0 has no transform and nothing rotates.
 */

import { Match } from "effect";
import { useRef } from "react";
import type { PublicInstance } from "@gpuix/react";
import { accessibleName } from "@gpuixui/primitives/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog.js";
import type { PartChildren } from "./internal/parts.js";
import { Button } from "./internal/button.js";
import { textOf } from "./internal/text.js";

/** The words a blank action label falls back to. */
const DEFAULT_CONFIRM_LABEL = "Confirm";
const DEFAULT_CANCEL_LABEL = "Cancel";

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
  /** Default `"Confirm"`; a blank label reads as the default. */
  readonly confirmLabel?: string;
  /** Default `"Cancel"`; a blank label reads as the default. */
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
  readonly children?: PartChildren;
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
  confirmLabel,
  cancelLabel,
  tone = "default",
  loading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) => {
  // A default covers only an absent prop, so a label table's missing key would
  // paint both actions nameless — including the one that cannot be undone.
  const confirmWord =
    accessibleName(textOf(confirmLabel)) ?? DEFAULT_CONFIRM_LABEL;
  const cancelWord =
    accessibleName(textOf(cancelLabel)) ?? DEFAULT_CANCEL_LABEL;
  const cancel = useRef<PublicInstance | null>(null);
  const variant = Match.value(tone).pipe(
    Match.when("danger", () => "danger" as const),
    Match.orElse(() => "primary" as const),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dismissible={!loading}>
      <DialogContent
        label={title}
        role="alertdialog"
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
            {cancelWord}
          </Button>
          <Button
            testId="confirm-accept"
            variant={variant}
            disabled={loading}
            loading={loading}
            loadingLabel="In progress"
            onClick={onConfirm}
          >
            {confirmWord}
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
    "shares the dialog's 0.11.0 gaps: no aria-modal, no aria-labelledby",
    "the busy mark is the three-dot spinner and it does not rotate: 0.11.0 has no transform, so a stepped mark is the honest alternative",
    "confirm does not close the dialog by design: the caller owns the close after its work succeeds",
  ],
  docs: "docs/confirm-dialog.mdx",
  example: "examples/confirm-dialog.example.tsx",
  testFile: "src/behaviour/confirm-dialog.test.tsx",
} as const;
