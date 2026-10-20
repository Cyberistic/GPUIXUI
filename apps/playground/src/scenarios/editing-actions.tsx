/**
 * `editing-actions` — the native editor's clipboard and history.
 *
 * Typing, carets, selections and `readOnly` are proven by `text-entry`; the
 * chords a user actually presses on selected text were never sent. The native
 * editor binds `cmd-c`/`cmd-x`/`cmd-v`/`cmd-z`/`shift-cmd-z`, so a runtime that
 * dropped them, a cut that forgot to copy, or a paste that reported one change
 * per character would keep every existing check green.
 *
 * The two-line fixtures pin the one rule a component author must know: a paste
 * into a single-line `<input>` turns every newline into a space, while a
 * `<textarea>` keeps it. The OTP field closes the last unmeasured shipped
 * path: a six-character paste is one change, distributed over six cells.
 *
 * **This probe replaces the system clipboard.** On this host the offscreen
 * renderer and the real window both delegate clipboard reads and writes to the
 * platform (`VisualTestAppContext`, not `TestPlatform`), so the probe copies
 * from its own read-only fields before every paste and never depends on the
 * clipboard's prior contents.
 */
import { useState, type ReactNode } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  OTPField,
  ThemeProvider as PrimitiveThemeProvider,
} from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import { textStyle, type Theme } from "@gpuixui/tokens";
import type { StyleDesc } from "@gpuix/react";
import type { Smoke } from "@gpuixui/testing";
import { Readout } from "../ui.js";
import { ariaOf, focusedId, node, read, text, treeOf } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const READ_ONLY_SOURCE = "one two";
const CUT_SOURCE = "cut me";
const LOCKED = "locked";
const TWO_LINES = "a\nb";
const CODE = "123456";

/** A read-only string while the user copies from it. */
const sourceSurface = (theme: Theme): StyleDesc => ({
  width: 220,
  padding: 6,
  color: theme.colors.mutedForeground,
  backgroundColor: theme.colors.input,
  borderWidth: theme.borderWidth.thin,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.sm,
});

const Caption = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme();
  return (
    <text
      style={{
        ...textStyle(theme, "caption"),
        color: theme.colors.mutedForeground,
      }}
    >
      {children}
    </text>
  );
};

const EditingProbe = () => {
  const theme = useTheme();
  const [target, setTarget] = useState("");
  const [targetEvents, setTargetEvents] = useState(0);
  const [cut, setCut] = useState(CUT_SOURCE);
  const [cutEvents, setCutEvents] = useState(0);
  const [lockedEdits, setLockedEdits] = useState(0);
  const [area, setArea] = useState("");
  const [undo, setUndo] = useState("");
  const [code, setCode] = useState("");
  const [completes, setCompletes] = useState(0);

  const surface = sourceSurface(theme);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: theme.spacing.lg,
        width: 640,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          width: 240,
        }}
      >
        <Caption>copy sources (read-only)</Caption>
        <input
          testId="edit-source"
          aria-id="edit-source"
          aria-label="Copy source"
          value={READ_ONLY_SOURCE}
          readOnly
          style={surface}
        />
        <input
          testId="edit-otp-source"
          aria-id="edit-otp-source"
          aria-label="Code source"
          value={CODE}
          readOnly
          style={surface}
        />
        <textarea
          testId="edit-area-source"
          aria-id="edit-area-source"
          aria-label="Two-line source"
          value={TWO_LINES}
          readOnly
          minRows={2}
          maxRows={2}
          style={surface}
        />
        <Caption>a locked field</Caption>
        <input
          testId="edit-locked"
          aria-id="edit-locked"
          aria-label="Locked field"
          value={LOCKED}
          readOnly
          onChange={() => setLockedEdits((count) => count + 1)}
          style={surface}
        />
        <Readout testId="edit-locked-events">{`${lockedEdits}`}</Readout>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          width: 360,
        }}
      >
        <Caption>paste target</Caption>
        <input
          testId="edit-target"
          aria-id="edit-target"
          aria-label="Paste target"
          value={target}
          onChange={(event) => {
            setTarget(event.value ?? "");
            setTargetEvents((count) => count + 1);
          }}
          style={surface}
        />
        <Readout testId="edit-target-value">{`t=${target}`}</Readout>
        <Readout testId="edit-target-events">{`${targetEvents}`}</Readout>

        <Caption>cut</Caption>
        <input
          testId="edit-cut"
          aria-id="edit-cut"
          aria-label="Cut source"
          value={cut}
          onChange={(event) => {
            setCut(event.value ?? "");
            setCutEvents((count) => count + 1);
          }}
          style={surface}
        />
        <Readout testId="edit-cut-value">{`c=${cut}`}</Readout>
        <Readout testId="edit-cut-events">{`${cutEvents}`}</Readout>

        <Caption>undo history</Caption>
        <input
          testId="edit-undo"
          aria-id="edit-undo"
          aria-label="Undo field"
          value={undo}
          onChange={(event) => setUndo(event.value ?? "")}
          style={surface}
        />
        <Readout testId="edit-undo-value">{`u=${undo}`}</Readout>

        <Caption>multi-line</Caption>
        <textarea
          testId="edit-area"
          aria-id="edit-area"
          aria-label="Multi-line target"
          value={area}
          minRows={2}
          maxRows={2}
          onChange={(event) => setArea(event.value ?? "")}
          style={surface}
        />
        <Readout testId="edit-area-value">{`a=${Str.replaceAll("\n", "|")(area)}`}</Readout>

        <Caption>one-time code</Caption>
        <PrimitiveThemeProvider theme={theme}>
          <OTPField
            testId="edit-otp"
            label="Code"
            length={6}
            value={code}
            onChange={setCode}
            onComplete={() => setCompletes((count) => count + 1)}
          />
        </PrimitiveThemeProvider>
        <Readout testId="edit-otp-value">{`o=${code}`}</Readout>
        <Readout testId="edit-otp-completes">{`${completes}`}</Readout>
      </div>
    </div>
  );
};

/** The native editor's value, read from the accessibility node (headless only). */
const nativeValue = (ctx: Smoke.SmokeContext, authorId: string) =>
  Effect.gen(function* () {
    const entry = yield* ctx.expectSome(
      `node ${authorId} is exposed`,
      ariaOf(ctx, authorId),
    );
    return Option.getOrElse(entry.value, () => "");
  });

/** Types one space-separated native keystroke sequence. */
const key = (ctx: Smoke.SmokeContext, sequence: string): void =>
  ctx.host.key(sequence);

export const editingActionsScenario: PlaygroundScenario = {
  id: "editing-actions",
  title: "Editing actions: copy, cut, paste, undo and redo",
  capability: "input",
  view: () => <EditingProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // 1. Copy a known run out of a read-only field.
      ctx.host.click("edit-source");
      key(ctx, "cmd-a");
      key(ctx, "cmd-c");
      yield* ctx.expectEqual(
        "the copy source exposes its run",
        yield* nativeValue(ctx, "edit-source"),
        READ_ONLY_SOURCE,
      );

      // 2. One paste is one change.
      ctx.host.click("edit-target");
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "paste writes the copied run",
        read(ctx, "edit-target-value"),
        `t=${READ_ONLY_SOURCE}`,
      );
      yield* ctx.expectEqual(
        "the native editor holds the pasted run",
        yield* nativeValue(ctx, "edit-target"),
        READ_ONLY_SOURCE,
      );
      yield* ctx.expectEqual(
        "a paste reports one change, not one per character",
        read(ctx, "edit-target-events"),
        "1",
      );
      yield* ctx.expectEqual(
        "paste keeps focus in the field",
        focusedId(ctx),
        "edit-target",
      );

      // 3. Paste over a selection replaces it, still in one change.
      key(ctx, "cmd-a");
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "paste replaces the whole selection with the same run",
        read(ctx, "edit-target-value"),
        `t=${READ_ONLY_SOURCE}`,
      );
      yield* ctx.expectEqual(
        "a replacing paste is still one change",
        read(ctx, "edit-target-events"),
        "2",
      );

      // 4. Cut copies and deletes.
      ctx.host.click("edit-cut");
      key(ctx, "cmd-a");
      key(ctx, "cmd-x");
      yield* ctx.expectEqual(
        "cut deletes the selected run",
        read(ctx, "edit-cut-value"),
        "c=",
      );
      yield* ctx.expectEqual(
        "the native editor is empty after the cut",
        yield* nativeValue(ctx, "edit-cut"),
        "",
      );
      yield* ctx.expectEqual(
        "cut reports one change",
        read(ctx, "edit-cut-events"),
        "1",
      );

      // 5. The cut run is on the clipboard.
      ctx.host.click("edit-target");
      key(ctx, "cmd-a");
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "the cut run pastes elsewhere",
        read(ctx, "edit-target-value"),
        `t=${CUT_SOURCE}`,
      );
      yield* ctx.expectEqual(
        "that paste is one more change",
        read(ctx, "edit-target-events"),
        "3",
      );

      // 6. Copy a two-line run and paste it into a single-line field.
      ctx.host.click("edit-area-source");
      key(ctx, "cmd-a");
      key(ctx, "cmd-c");
      ctx.host.click("edit-target");
      key(ctx, "cmd-a");
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "a single-line field turns a pasted newline into a space",
        read(ctx, "edit-target-value"),
        "t=a b",
      );
      yield* ctx.expectEqual(
        "the native single-line value has the space too",
        yield* nativeValue(ctx, "edit-target"),
        "a b",
      );
      yield* ctx.expectEqual(
        "the normalized paste is one change",
        read(ctx, "edit-target-events"),
        "4",
      );

      // 7. A textarea keeps the newline.
      ctx.host.click("edit-area");
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "a textarea keeps the pasted newline",
        read(ctx, "edit-area-value"),
        "a=a|b",
      );
      yield* ctx.expectEqual(
        "the native textarea holds the newline",
        yield* nativeValue(ctx, "edit-area"),
        TWO_LINES,
      );

      // 8. The paste was one history step.
      key(ctx, "cmd-z");
      yield* ctx.expectEqual(
        "one undo reverses a whole paste in a textarea",
        read(ctx, "edit-area-value"),
        "a=",
      );

      // 9. readOnly refuses paste.
      ctx.host.click("edit-locked");
      key(ctx, "cmd-a");
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "a read-only field keeps focus",
        focusedId(ctx),
        "edit-locked",
      );
      yield* ctx.expectEqual(
        "a read-only field refuses the paste",
        yield* nativeValue(ctx, "edit-locked"),
        LOCKED,
      );
      yield* ctx.expectEqual(
        "the refused paste reports no change",
        read(ctx, "edit-locked-events"),
        "0",
      );

      // 10. readOnly refuses cut, and the refused cut leaves the clipboard.
      key(ctx, "cmd-a");
      key(ctx, "cmd-x");
      yield* ctx.expectEqual(
        "a read-only field refuses the cut",
        yield* nativeValue(ctx, "edit-locked"),
        LOCKED,
      );
      yield* ctx.expectEqual(
        "the refused cut reports no change",
        read(ctx, "edit-locked-events"),
        "0",
      );

      // 11. A no-selection copy writes nothing, so the two-line run survives.
      ctx.host.click("edit-target");
      key(ctx, "cmd-c");
      ctx.host.click("edit-area");
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "a refused cut and an empty copy leave the clipboard alone",
        read(ctx, "edit-area-value"),
        "a=a|b",
      );
      key(ctx, "cmd-z");

      // 12. Contiguous typing is one undo step; redo restores it.
      ctx.host.click("edit-undo");
      key(ctx, "a b c");
      yield* ctx.expectEqual(
        "three keys build a run",
        read(ctx, "edit-undo-value"),
        "u=abc",
      );
      key(ctx, "cmd-z");
      yield* ctx.expectEqual(
        "one undo reverses the whole coalesced run",
        read(ctx, "edit-undo-value"),
        "u=",
      );
      key(ctx, "shift-cmd-z");
      yield* ctx.expectEqual(
        "redo restores the run",
        read(ctx, "edit-undo-value"),
        "u=abc",
      );
      key(ctx, "d");
      yield* ctx.expectEqual(
        "typing after redo extends the run",
        read(ctx, "edit-undo-value"),
        "u=abcd",
      );
      key(ctx, "cmd-z");
      yield* ctx.expectEqual(
        "undo removes the new edit",
        read(ctx, "edit-undo-value"),
        "u=abc",
      );

      // 13. A paste is its own history step, not a per-character run.
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "the two-line run pastes after the restored text",
        read(ctx, "edit-undo-value"),
        "u=abca b",
      );
      key(ctx, "cmd-z");
      yield* ctx.expectEqual(
        "one undo reverses the paste and keeps the typed run",
        read(ctx, "edit-undo-value"),
        "u=abc",
      );

      // 14. The OTP field's paste path: one change over six cells.
      ctx.host.click("edit-otp-source");
      key(ctx, "cmd-a");
      key(ctx, "cmd-c");
      ctx.host.click("edit-otp-cell-1");
      key(ctx, "cmd-v");
      yield* ctx.expectEqual(
        "a pasted code fills the field",
        read(ctx, "edit-otp-value"),
        `o=${CODE}`,
      );
      yield* ctx.expectEqual(
        "the pasted code completes once",
        read(ctx, "edit-otp-completes"),
        "1",
      );
      yield* ctx.expectEqual(
        "focus lands on the last pasted cell",
        focusedId(ctx),
        "edit-otp-cell-6",
      );
      const tree = yield* treeOf(ctx);
      const first = yield* node(ctx, tree, "TextInput", "Code digit 1");
      const last = yield* node(ctx, tree, "TextInput", "Code digit 6");
      yield* ctx.expectEqual(
        "the first cell holds its digit",
        text(first.value),
        "1",
      );
      yield* ctx.expectEqual(
        "the last cell holds its digit",
        text(last.value),
        "6",
      );
    }),
};
