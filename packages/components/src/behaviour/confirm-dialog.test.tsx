import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../confirm-dialog.js";
import { nodesWithRole } from "../internal/a11y.js";
import { darkTheme } from "../internal/theme.js";
import {
  after,
  boundsOf,
  clickCentreOf,
  focusedTestId,
  requireBounds,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { MotionProvider } from "../motion.js";
import { renderComponent } from "../internal/test-root.js";

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

const FAILURE_HEIGHT = 40;

const SLOT_HEIGHT = FAILURE_HEIGHT + darkTheme.spacing["2xl"];

const Failing = ({ reduced = false }: { readonly reduced?: boolean }) => {
  const [error, setError] = useState<string>();

  const dialog = (
    <ConfirmDialog
      open
      onOpenChange={() => undefined}
      title="Delete workspace"
      description="The workspace and its 42 files are removed permanently."
      onConfirm={() =>
        setError(
          error === undefined ? "The workspace service timed out." : undefined,
        )
      }
    >
      {error === undefined ? null : (
        <div style={{ height: FAILURE_HEIGHT }} testId="failure">
          <text>{error}</text>
        </div>
      )}
    </ConfirmDialog>
  );

  return reduced ? (
    <MotionProvider preference="reduced">{dialog}</MotionProvider>
  ) : (
    dialog
  );
};

const slotHeight = (root: ReturnType<typeof renderComponent>): number =>
  Option.getOrElse(
    Option.map(boundsOf(root, "confirm-body"), (box) => box.height),
    () => -1,
  );

describe("ConfirmDialog", () => {
  it("publishes the alertdialog role, and the plain dialog keeps its own", () => {
    const confirm = renderComponent(<Harness onConfirm={vi.fn()} />);

    expect(nodesWithRole(confirm.renderer, "alertdialog")).toHaveLength(1);
    expect(nodesWithRole(confirm.renderer, "dialog")).toEqual([]);

    confirm.unmount();
  });

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

  it("paints the busy spinner, not a glyph, and keeps the action's label", () => {
    const confirm = renderComponent(<Harness onConfirm={vi.fn()} loading />);

    try {
      expect(confirm.renderer.getAllText()).toContain("Confirm");
      expect(confirm.renderer.getAllText()).not.toContain("…");
      expect(confirm.renderer.findByType("svg")).toHaveLength(0);

      expect(
        nodesWithRole(confirm.renderer, "status").map((node) => node.name),
      ).toEqual(["In progress"]);
    } finally {
      confirm.unmount();
    }
  });

  it("paints the busy mark in the action's own label role", () => {
    const confirm = renderComponent(
      <Harness onConfirm={vi.fn()} loading tone="danger" />,
    );

    try {
      const action = confirm.renderer.findByTestId("confirm-accept");
      const mark = confirm.renderer
        .findByType("div")
        .find((element) => element.customProps?.role === "status");
      const dots = (mark?.children ?? []).map((id) =>
        confirm.renderer.getElement(id),
      );

      expect(dots).toHaveLength(12);
      expect(dots.map((dot) => dot?.style.backgroundColor)).toEqual(
        Array.from({ length: 12 }, () => action?.style.color),
      );
    } finally {
      confirm.unmount();
    }
  });

  it("reads a blank action label as the default, never an unnamed action", () => {
    const confirm = renderComponent(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Delete workspace"
        description="The workspace and its 42 files are removed permanently."
        confirmLabel="  "
        cancelLabel=""
        onConfirm={vi.fn()}
      />,
    );

    try {
      const names = nodesWithRole(confirm.renderer, "button").map(
        (node) => node.name,
      );
      expect(names).toEqual(expect.arrayContaining(["Cancel", "Confirm"]));
    } finally {
      confirm.unmount();
    }
  });

  it("reads a stored action label that is not text as the default", () => {
    const confirm = renderComponent(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Delete workspace"
        description="The workspace and its 42 files are removed permanently."
        // @ts-expect-error — the labels a stored dialog config wrote.
        confirmLabel={42}
        // @ts-expect-error — the labels a stored dialog config wrote.
        cancelLabel={{ text: "Cancel" }}
        onConfirm={vi.fn()}
      />,
    );

    try {
      const names = nodesWithRole(confirm.renderer, "button").map(
        (node) => node.name,
      );
      expect(names).toEqual(expect.arrayContaining(["Cancel", "Confirm"]));
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

  it("grows the failure slot, and collapses it on a retry", async () => {
    const confirm = renderComponent(<Failing />);
    try {
      settleMotion(confirm);
      const pending = requireBounds(confirm, "dialog-content").height;

      confirm.renderer.clockPause();
      clickCentreOf(confirm, "confirm-accept");
      await after(30);

      expect(slotHeight(confirm)).toBe(0);
      expect(requireBounds(confirm, "dialog-content").height).toBe(pending);

      confirm.renderer.clockFastForward(400);
      await after(30);
      const failed = requireBounds(confirm, "dialog-content");
      expect(slotHeight(confirm)).toBe(SLOT_HEIGHT);
      expect(failed.height).toBeGreaterThan(pending);
      expect(failed.height - pending).toBe(SLOT_HEIGHT);

      clickCentreOf(confirm, "confirm-accept");
      await after(30);
      expect(confirm.renderer.findByTestId("confirm-body")).toBeDefined();

      await waitFor(() =>
        expect(confirm.renderer.findByTestId("confirm-body")).toBeUndefined(),
      );
    } finally {
      confirm.unmount();
    }
  });

  it("paints the failed frame at once under the reduced preference", async () => {
    const confirm = renderComponent(<Failing reduced />);
    try {
      settleMotion(confirm);
      const pending = requireBounds(confirm, "dialog-content").height;

      clickCentreOf(confirm, "confirm-accept");
      await after(30);

      expect(slotHeight(confirm)).toBe(SLOT_HEIGHT);
      expect(requireBounds(confirm, "dialog-content").height).toBe(
        pending + SLOT_HEIGHT,
      );
    } finally {
      confirm.unmount();
    }
  });
});
