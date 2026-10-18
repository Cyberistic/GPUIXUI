/**
 * `tier2-dialog` — the shipped `Dialog` and `ConfirmDialog` from
 * `@gpuixui/components`, mounted by a consumer and driven natively.
 *
 * The package's own suite proves the parts in isolation. This scenario proves
 * the consumer path the playground exists for: the published root import, the
 * shipped token theme, a controlled `open`, and the gestures a user makes.
 *
 * The mechanism was measured by `modal-focus-trap` (plan `155`); the assertions
 * here are the shipped component's contract, not a re-probe. Measured facts:
 * plan `330` §5.3.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import { useWindowSize } from "@gpuix/react";
// The package is source-first and its tsconfig maps the JSX runtime to a
// `.d.ts`, which `nub` cannot execute, so the consumer compiles it first
// (`tsconfig.vendor.json`, plan `330` §3). The relative path resolves to the
// same place from `src/` and from the emitted `dist/`.
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../vendor/packages/components/src/index.js";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { focusedId, node, read, treeOf } from "./probes.js";

const painted = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.fromNullishOr(ctx.host.bounds(testId));

/** Every element either dialog surface may focus; nothing else may hold it. */
const FOCUSABLE: ReadonlyArray<string> = [
  "dialog-content",
  "dialog-field",
  "dialog-field-2",
  "dialog-cancel",
  "dialog-save",
  "dialog-close",
  "confirm-cancel",
  "confirm-accept",
];

const focusInside = (testId: string): boolean =>
  Arr.contains(FOCUSABLE, testId);

/** A native control the probe owns: the scenario, not a component, decides. */
const Action = ({
  testId,
  label,
  onClick,
}: {
  readonly testId: string;
  readonly label: string;
  readonly onClick: () => void;
}) => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: 6,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.muted,
        cursor: "pointer",
      }}
    >
      <text style={{ color: theme.colors.foreground }}>{label}</text>
    </div>
  );
};

const DialogProbe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [open, setOpen] = useState(false);
  const [saves, setSaves] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirms, setConfirms] = useState(0);

  return (
    <div
      testId="tier2-dialog-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Body>shipped Tier 2 dialogs</Body>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger testId="dialog-open">Open editor</DialogTrigger>
        <DialogContent label="Edit project">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Changes apply to every workspace member.
            </DialogDescription>
          </DialogHeader>
          <input
            testId="dialog-field"
            placeholder="Project name"
            style={{
              padding: 6,
              color: theme.colors.inputForeground,
              backgroundColor: theme.colors.input,
            }}
          />
          <input
            testId="dialog-field-2"
            placeholder="Description"
            style={{
              padding: 6,
              color: theme.colors.inputForeground,
              backgroundColor: theme.colors.input,
            }}
          />
          <DialogFooter>
            <DialogClose testId="dialog-cancel">Cancel</DialogClose>
            <Action
              testId="dialog-save"
              label="Save"
              onClick={() => {
                setSaves((count) => count + 1);
                setOpen(false);
              }}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Action
        testId="confirm-open"
        label="Delete project"
        onClick={() => setConfirmOpen(true)}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete project"
        description="This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => setConfirms((count) => count + 1)}
      />
      <Readout testId="tier2-dialog-readout">
        {`open=${open} saves=${saves} confirm=${confirmOpen} confirms=${confirms}`}
      </Readout>
    </div>
  );
};

/** Walks `key` `times`, recording every id focus held. */
const walk = (
  ctx: Smoke.SmokeContext,
  key: string,
  times: number,
  label: string,
) =>
  Effect.gen(function* () {
    const seen = yield* Ref.make<ReadonlyArray<string>>([]);
    yield* Effect.forEach(
      Arr.range(1, times),
      () =>
        Effect.sync(() => {
          ctx.host.key(key);
          return focusedId(ctx);
        }).pipe(Effect.tap((id) => Ref.update(seen, (all) => [...all, id]))),
      { discard: true, concurrency: 1 },
    );
    const visited = yield* Ref.get(seen);
    const sequence = Arr.join(visited, ",");
    yield* ctx.expectEqual(
      `${label} moved focus [${sequence}]`,
      Arr.length(Arr.dedupe(visited)) > 1,
      true,
    );
    yield* ctx.expectEqual(
      `${label} stayed inside the dialog [${sequence}]`,
      Arr.every(visited, focusInside),
      true,
    );
  });

export const tier2DialogScenario: PlaygroundScenario = {
  id: "tier2-dialog",
  title: "Tier 2 Dialog and ConfirmDialog: open, trap, cancel and confirm",
  capability: "tier2",
  view: () => <DialogProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const frame = yield* ctx.expectSome(
        "the probe frame is painted",
        painted(ctx, "tier2-dialog-frame"),
      );
      yield* ctx.expectEqual(
        "no dialog is painted at rest",
        Option.isNone(painted(ctx, "dialog-content")),
        true,
      );

      ctx.host.click("dialog-open");
      yield* ctx.expectContains(
        "the trigger opened the dialog",
        read(ctx, "tier2-dialog-readout"),
        "open=true",
      );
      const content = yield* ctx.expectSome(
        "the dialog surface is painted",
        painted(ctx, "dialog-content"),
      );
      yield* ctx.expectNear(
        "the surface is centred horizontally",
        content.x + content.width / 2,
        frame.x + frame.width / 2,
        2,
      );
      yield* ctx.expectNear(
        "the surface is centred vertically",
        content.y + content.height / 2,
        frame.y + frame.height / 2,
        2,
      );
      yield* ctx.expectEqual(
        "focus entered the surface",
        focusedId(ctx),
        "dialog-content",
      );

      yield* walk(ctx, "tab", 6, "Tab");
      yield* walk(ctx, "shift-tab", 3, "Shift-Tab");

      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape closed the dialog",
        read(ctx, "tier2-dialog-readout"),
        "open=false",
      );
      yield* ctx.expectEqual(
        "the surface left the tree",
        Option.isNone(painted(ctx, "dialog-content")),
        true,
      );
      yield* ctx.expectEqual(
        "focus returned to the trigger",
        focusedId(ctx),
        "dialog-open",
      );

      // ConfirmDialog: Cancel holds initial focus, and Enter on it cancels.
      ctx.host.click("confirm-open");
      yield* ctx.expectSome(
        "the confirmation surface is painted",
        painted(ctx, "dialog-content"),
      );
      yield* ctx.expectEqual(
        "Cancel holds initial focus",
        focusedId(ctx),
        "confirm-cancel",
      );
      const tree = yield* treeOf(ctx);
      yield* node(ctx, tree, "Dialog", "Delete project");

      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter on Cancel closed the dialog",
        read(ctx, "tier2-dialog-readout"),
        "confirm=false",
      );
      yield* ctx.expectContains(
        "cancelling confirmed nothing",
        read(ctx, "tier2-dialog-readout"),
        "confirms=0",
      );

      ctx.host.click("confirm-open");
      ctx.host.click("confirm-accept");
      yield* ctx.expectContains(
        "confirm ran exactly once",
        read(ctx, "tier2-dialog-readout"),
        "confirms=1",
      );
      yield* ctx.expectContains(
        "confirm left the dialog open for the caller",
        read(ctx, "tier2-dialog-readout"),
        "confirm=true",
      );
      ctx.host.key("escape");
      yield* ctx.expectContains(
        "Escape closed the confirmed dialog",
        read(ctx, "tier2-dialog-readout"),
        "confirm=false",
      );
      yield* ctx.expectEqual(
        "focus returned to the confirmation trigger",
        focusedId(ctx),
        "confirm-open",
      );
    }),
};
