/**
 * ConfirmDialog behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: focusing the destructive action instead of Cancel (so
 * Enter destroys something); a cancel that confirms; a confirm that closes the
 * dialog itself (a failed save would vanish); a loading state that still accepts
 * a click or lets Escape dismiss the dialog mid-write; a danger tone that
 * does not paint the destructive role; and a busy state whose mark was a text
 * glyph — the one chrome mark in the package that was not a vector icon.
 */

import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../confirm-dialog.js";
import { nodesWithRole } from "../internal/a11y.js";
import { darkTheme } from "../internal/theme.js";
import {
  clickCentreOf,
  waitFor,
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

  it("cancels on Enter without confirming", async () => {
    const onConfirm = vi.fn();
    const confirm = renderComponent(<Harness onConfirm={onConfirm} />);

    expect(confirm.renderer.getAllText()).toContain(
      "The workspace and its 42 files are removed permanently.",
    );

    confirm.renderer.simulateKeystrokes("enter");

    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(confirm.renderer.findByTestId("confirm-cancel")).toBeUndefined(),
    );

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

    clickCentreOf(confirm, "confirm-accept");
    clickCentreOf(confirm, "confirm-cancel");
    confirm.renderer.simulateKeystrokes("escape");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(confirm.renderer.findByTestId("confirm-accept")).toBeDefined();

    confirm.unmount();
  });

  it("paints the busy mark as the loader icon, not a text glyph", () => {
    const confirm = renderComponent(<Harness onConfirm={vi.fn()} loading />);

    try {
      // The chrome marks are vector icons; a painted `…` would be the one text
      // stand-in left in the package.
      expect(confirm.renderer.getAllText()).not.toContain("…");
      expect(confirm.renderer.findByTestId("confirm-busy")).toBeDefined();
      expect(confirm.renderer.findByType("svg")).toHaveLength(1);

      // The mark sits on the action's own fill, so it takes the label's role.
      expect(confirm.renderer.findByTestId("confirm-busy")?.style.color).toBe(
        darkTheme.colors.primaryForeground,
      );

      // And it is named, so a screen reader hears the state rather than a mark.
      expect(
        nodesWithRole(confirm.renderer, "image").map((node) => node.name),
      ).toContain("In progress");
    } finally {
      confirm.unmount();
    }
  });

  it("paints the busy mark in the destructive tone's own label role", () => {
    const confirm = renderComponent(
      <Harness onConfirm={vi.fn()} loading tone="danger" />,
    );

    try {
      expect(confirm.renderer.findByTestId("confirm-busy")?.style.color).toBe(
        darkTheme.colors.destructiveForeground,
      );
    } finally {
      confirm.unmount();
    }
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
