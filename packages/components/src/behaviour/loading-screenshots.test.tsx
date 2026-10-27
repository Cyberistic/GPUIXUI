/**
 * The loading surfaces' evidence frames, through the native test renderer.
 *
 * The five states a reviewer reads: a card skeleton, a list skeleton, the three
 * spinner sizes, the button row that carries the busy mark, and the confirmation
 * dialog mid-write. Each case proves the surface painted before the frame is
 * written (a blank window is not evidence).
 *
 * The files land under `apps/playground/.artifacts/live/`, which is gitignored:
 * local evidence for the run, never repository content.
 */

import { mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "../internal/button.js";
import {
  requireBounds,
  settle,
  settleMotion,
} from "../internal/interaction.js";
import { nodesWithRole } from "../internal/a11y.js";
import { renderComponent } from "../internal/test-root.js";
import { useTheme } from "../internal/theme.js";
import { Skeleton } from "../skeleton.js";
import { Spinner } from "../spinner.js";
import { ConfirmDialog } from "../confirm-dialog.js";

const directory = fileURLToPath(
  new URL("../../../../apps/playground/.artifacts/live/", import.meta.url),
);

const frame = (name: string): string => {
  mkdirSync(directory, { recursive: true });
  return `${directory}${name}.png`;
};

const capture = (
  root: ReturnType<typeof renderComponent>,
  path: string,
): number => {
  root.renderer.captureScreenshot(path);
  return statSync(path).size;
};

/** A card whose heading and body have not arrived. */
const SkeletonCard = () => {
  const theme = useTheme();
  return (
    <div
      testId="loading-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 320,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
      }}
    >
      <Skeleton width="55%" height={20} />
      <Skeleton height={12} />
      <Skeleton width="80%" height={12} />
      <Skeleton height={72} radius="md" />
    </div>
  );
};

/** Three list rows: an avatar placeholder beside two lines each. */
const SkeletonList = () => {
  const theme = useTheme();
  return (
    <div
      testId="loading-list"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        width: 360,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.lg,
      }}
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
          }}
        >
          <Skeleton circle width={32} height={32} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.xs,
              flexGrow: 1,
            }}
          >
            <Skeleton width="45%" height={12} />
            <Skeleton width="70%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
};

/** The three sizes, and the action that carries the mark. */
const LoadingRow = () => {
  const theme = useTheme();
  return (
    <div
      testId="loading-row"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        width: 380,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xl,
        }}
      >
        <Spinner size="sm" label="Loading, small" testId="loading-sm" />
        <Spinner size="md" label="Loading, medium" testId="loading-md" />
        <Spinner size="lg" label="Loading, large" testId="loading-lg" />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.sm,
        }}
      >
        <Button testId="loading-primary" variant="primary" loading>
          Save changes
        </Button>
        <Button testId="loading-secondary" loading loadingLabel="Refreshing">
          Refresh
        </Button>
        <Button
          testId="loading-danger"
          variant="danger"
          loading
          disabled
          loadingLabel="Deleting"
        >
          Delete
        </Button>
      </div>
    </div>
  );
};

/** The confirmation dialog while its action is in flight. */
const ConfirmFrame = () => {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete workspace"
      description="The workspace and its 42 files are removed permanently."
      confirmLabel="Delete workspace"
      tone="danger"
      loading
      onConfirm={() => undefined}
    />
  );
};

describe.skipIf(process.platform !== "darwin")("Loading frames", () => {
  it("captures the card skeleton", () => {
    const root = renderComponent(<SkeletonCard />, "dark", {
      width: 520,
      height: 360,
    });
    settle(root);
    expect(requireBounds(root, "loading-card").width).toBe(320);
    expect(capture(root, frame("loading-skeleton-card"))).toBeGreaterThan(0);
    root.unmount();
  });

  it("captures the list skeleton", () => {
    const root = renderComponent(<SkeletonList />, "dark", {
      width: 520,
      height: 360,
    });
    settle(root);
    expect(requireBounds(root, "loading-list").height).toBeGreaterThan(80);
    expect(capture(root, frame("loading-skeleton-list"))).toBeGreaterThan(0);
    root.unmount();
  });

  it("captures the sizes and the busy action row", () => {
    const root = renderComponent(<LoadingRow />, "light", {
      width: 520,
      height: 240,
    });
    settle(root);

    expect(nodesWithRole(root.renderer, "status")).toHaveLength(6);
    expect(root.renderer.getAllText()).toEqual(
      expect.arrayContaining(["Save changes", "Refresh", "Delete"]),
    );
    expect(capture(root, frame("loading-spinner-and-buttons"))).toBeGreaterThan(
      0,
    );
    root.unmount();
  });

  it("captures the confirmation dialog mid-write", () => {
    const root = renderComponent(<ConfirmFrame />, "dark", {
      width: 520,
      height: 360,
    });
    // The dialog enters with a fade; the frame shows where it rests.
    settleMotion(root);

    expect(nodesWithRole(root.renderer, "status").map((n) => n.name)).toEqual([
      "In progress",
    ]);
    expect(root.renderer.getAllText()).toContain("Delete workspace");
    expect(capture(root, frame("loading-confirm-dialog"))).toBeGreaterThan(0);
    root.unmount();
  });
});
