/**
 * ConfirmDialog behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: focusing the destructive action instead of Cancel (so
 * Enter destroys something); a cancel that confirms; a confirm that closes the
 * dialog itself (a failed save would vanish); a loading state that still accepts
 * a click or lets Escape dismiss the dialog mid-write; and a danger tone that
 * does not paint the destructive role.
 */

import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../confirm-dialog.js";
import { darkTheme } from "../internal/theme.js";
import {
  clickCentreOf,
  finishMotion,
  focusedTestId,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** A caller that owns the open state, exactly as the API requires. */
const Harness = ({
  onConfirm,
  loading = false,
  tone = "default",
}: {
  readonly onConfirm: () => void;
  readonly loading?: boolean;
  readonly tone?: "default" | "danger";
}) => {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete workspace"
      description="The workspace and its 42 files are removed permanently."
      onConfirm={onConfirm}
      loading={loading}
      tone={tone}
    />
  );
};

describe("ConfirmDialog", () => {
  it("opens with focus on Cancel, not on Confirm", () => {
    const confirm = renderComponent(<Harness onConfirm={vi.fn()} />);

    expect(focusedTestId(confirm)).toEqual(Option.some("confirm-cancel"));

    confirm.unmount();
  });

  it("cancels on Enter without confirming", () => {
    const onConfirm = vi.fn();
    const confirm = renderComponent(<Harness onConfirm={onConfirm} />);

    expect(confirm.renderer.getAllText()).toContain(
      "The workspace and its 42 files are removed permanently.",
    );

    confirm.renderer.simulateKeystrokes("enter");
    finishMotion(confirm);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(confirm.renderer.findByTestId("confirm-cancel")).toBeUndefined();

    confirm.unmount();
  });

  it("reports the confirm action once and leaves closing to the caller", () => {
    const onConfirm = vi.fn();
    const confirm = renderComponent(<Harness onConfirm={onConfirm} />);

    clickCentreOf(confirm, "confirm-accept");

    expect(onConfirm).toHaveBeenCalledTimes(1);
    // The harness keeps `open` true, so a dialog that closed itself would fail
    // here — the guarantee is that the caller owns the close.
    expect(confirm.renderer.findByTestId("confirm-accept")).toBeDefined();

    confirm.unmount();
  });

  it("refuses both actions and Escape while loading", () => {
    const onConfirm = vi.fn();
    const confirm = renderComponent(<Harness onConfirm={onConfirm} loading />);

    expect(confirm.renderer.getAllText()).toContain("…");

    clickCentreOf(confirm, "confirm-accept");
    clickCentreOf(confirm, "confirm-cancel");
    confirm.renderer.simulateKeystrokes("escape");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(confirm.renderer.findByTestId("confirm-accept")).toBeDefined();

    confirm.unmount();
  });

  it("paints the destructive roles for a danger confirmation", () => {
    const confirm = renderComponent(
      <Harness onConfirm={vi.fn()} tone="danger" />,
    );

    const accept = confirm.renderer.findByTestId("confirm-accept");
    expect(accept?.style.backgroundColor).toBe(darkTheme.colors.destructive);
    expect(accept?.style.color).toBe(darkTheme.colors.destructiveForeground);

    confirm.unmount();
  });
});
