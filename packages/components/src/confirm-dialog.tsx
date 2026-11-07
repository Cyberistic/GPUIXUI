/** @jsxImportSource @gpuix/react */
import { Match } from "effect";
import { useRef } from "react";
import type { PublicInstance } from "@gpuix/react";
import { accessibleName } from "@gpuixui/primitives/core";
import { AutoHeight } from "./auto-height.js";
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
import { useMoveTiming } from "./internal/presence.js";
import { textOf } from "./internal/text.js";
import { useTheme } from "./internal/theme.js";

const DEFAULT_CONFIRM_LABEL = "Confirm";
const DEFAULT_CANCEL_LABEL = "Cancel";

export type ConfirmTone = "default" | "danger";

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;

  readonly title: string;

  readonly description: string;

  readonly confirmLabel?: string;

  readonly cancelLabel?: string;

  readonly tone?: ConfirmTone;

  readonly loading?: boolean;
  readonly onConfirm: () => void;

  readonly children?: PartChildren;
}

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
  const confirmWord =
    accessibleName(textOf(confirmLabel)) ?? DEFAULT_CONFIRM_LABEL;
  const cancelWord =
    accessibleName(textOf(cancelLabel)) ?? DEFAULT_CANCEL_LABEL;
  const theme = useTheme();
  const cancel = useRef<PublicInstance | null>(null);

  const gap = theme.spacing["2xl"];
  const hasBody = children !== undefined && children !== null;
  const body = useRef(children);
  if (hasBody) body.current = children;
  const move = useMoveTiming("normal");
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
        style={{ gap: 0 }}
      >
        <DialogHeader style={{ marginBottom: gap }}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <AutoHeight
          open={hasBody}
          testId="confirm-body"
          timing={{ enter: move, exit: move }}
        >
          <div style={{ paddingBottom: gap }}>{body.current}</div>
        </AutoHeight>
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
