/** @jsxImportSource @gpuix/react */
/**
 * The confirmation-flow pattern, as a live scene (plan 521).
 *
 * It is the composition `/docs/patterns` said it was waiting for:
 * `ConfirmDialog` guards a destructive action, a controlled `Input` requires
 * the workspace's name, and a success `Toast` reports the result. The real
 * packages are mounted; nothing here imitates them.
 *
 * The dialog starts open and the toast only appears after `onConfirm`, so the
 * smoke can prove the workflow: the success text is absent before the typed
 * name and the confirm click, and present after them.
 */
import { ConfirmDialog } from "@gpuixui/components/confirm-dialog";
import {
  ToastProvider,
  ToastViewport,
  useToast,
} from "@gpuixui/components/toast";
import { Input, Stack, Text } from "@gpuixui/primitives";
import { Duration } from "effect";
import { useState, type ReactElement } from "react";
import {
  CONFIRM_WORKSPACE,
  confirmsWorkspace,
} from "./confirmation-flow-logic";

const ConfirmationFlowSurface = (): ReactElement => {
  const toast = useToast();
  const [open, setOpen] = useState(true);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  const confirm = (): void => {
    if (!confirmsWorkspace(typed)) {
      setError(
        `The name does not match. Type ${CONFIRM_WORKSPACE} to confirm.`,
      );
      return;
    }
    setError("");
    setOpen(false);
    toast.push({
      title: "Workspace deleted",
      description: `${CONFIRM_WORKSPACE} and its 42 files are in the trash for 30 days.`,
      tone: "success",
      duration: Duration.infinity,
    });
  };

  return (
    <Stack direction="column" gap="lg">
      <Stack direction="column" gap="2xs">
        <Text role="h3">Remove a workspace</Text>
        <Text role="body" tone="muted">
          Deleting a workspace removes every file for every member, and there is
          no undo once the trash is emptied.
        </Text>
      </Stack>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this workspace?"
        description={`This removes ${CONFIRM_WORKSPACE} and its 42 files for everyone. It cannot be undone.`}
        confirmLabel="Delete workspace"
        tone="danger"
        onConfirm={confirm}
      >
        <Stack direction="column" gap="sm">
          <Text role="label">Type {CONFIRM_WORKSPACE} to confirm</Text>
          <Input
            testId="scene-confirm-name"
            value={typed}
            onChange={(value) => {
              setTyped(value);
              setError("");
            }}
            invalid={error !== ""}
            fullWidth
          />
          {error === "" ? null : (
            <Text role="caption" tone="destructive">
              {error}
            </Text>
          )}
        </Stack>
      </ConfirmDialog>
      <ToastViewport />
    </Stack>
  );
};

/** The scene the preview document mounts; the provider owns the toast store. */
export const ConfirmationFlow = (): ReactElement => (
  <ToastProvider>
    <ConfirmationFlowSurface />
  </ToastProvider>
);
