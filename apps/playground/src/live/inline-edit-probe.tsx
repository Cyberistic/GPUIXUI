import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";
import { textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import { useState, type ReactNode } from "react";
import { InlineEdit } from "@gpuixui/components";
import { Readout } from "../ui.js";
import { settleUntil } from "./settle.js";
import {
  INLINE_EDIT_CAPTION,
  INLINE_EDIT_IDS,
  INLINE_EDIT_PLACEHOLDER,
  INLINE_EDIT_VALUE,
  inlineEditReadout,
  type InlineEditMarks,
} from "./inline-edit.js";

const SETTLE = Duration.millis(40);

const useMarks = (value: string) => {
  const [marks, setMarks] = useState<InlineEditMarks>({
    value,
    draft: value,
    commits: 0,
    edits: 0,
    editing: false,
  });
  const commit = (next: string): void =>
    setMarks((current) => ({
      ...current,
      value: next,
      commits: current.commits + 1,
    }));
  const edit = (editing: boolean): void =>
    setMarks((current) => ({
      ...current,
      editing,
      edits: current.edits + (editing ? 1 : 0),
    }));
  const change = (next: string): void =>
    setMarks((current) => ({ ...current, draft: next }));
  return { marks, commit, edit, change };
};

export const InlineEditProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const named = useMarks(INLINE_EDIT_VALUE);
  const disabled = useMarks("");
  const empty = useMarks("");

  return (
    <div
      testId={INLINE_EDIT_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {INLINE_EDIT_CAPTION}
      </text>
      <Readout testId={INLINE_EDIT_IDS.readout}>
        {inlineEditReadout(named.marks)}
      </Readout>
      <InlineEdit
        testId={INLINE_EDIT_IDS.field}
        label="Workspace name"
        value={named.marks.value}
        onCommit={named.commit}
        onEditingChange={named.edit}
        onChange={(event) => named.change(event.value ?? "")}
        style={{ width: 280 }}
      />
      <Readout testId={INLINE_EDIT_IDS.disabledReadout}>
        {inlineEditReadout(disabled.marks)}
      </Readout>
      <InlineEdit
        testId={INLINE_EDIT_IDS.disabled}
        label="Policy-controlled name"
        disabled
        value={disabled.marks.value}
        onCommit={disabled.commit}
        onEditingChange={disabled.edit}
        onChange={(event) => disabled.change(event.value ?? "")}
        style={{ width: 280 }}
      />
      <Readout testId={INLINE_EDIT_IDS.emptyReadout}>
        {inlineEditReadout(empty.marks)}
      </Readout>
      <InlineEdit
        testId={INLINE_EDIT_IDS.empty}
        label="Project name"
        placeholder={INLINE_EDIT_PLACEHOLDER}
        value={empty.marks.value}
        onCommit={empty.commit}
        onEditingChange={empty.edit}
        onChange={(event) => empty.change(event.value ?? "")}
        style={{ width: 280 }}
      />
    </div>
  );
};

export const inlineEditSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(INLINE_EDIT_IDS.probe);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(INLINE_EDIT_IDS.readout);
    const focused = () =>
      Effect.map(ctx.host.focused(), (id) =>
        Option.getOrElse(Option.fromNullishOr(id), () => "none"),
      );
    const settled = (marks: InlineEditMarks) =>
      settleUntil(readout(), (value) => value === inlineEditReadout(marks));

    const atRest = {
      value: INLINE_EDIT_VALUE,
      draft: INLINE_EDIT_VALUE,
      commits: 0,
      edits: 0,
      editing: false,
    } as const;
    yield* ctx.expectEqual(
      "the control opens on the caller's value with no edit",
      yield* readout(),
      inlineEditReadout(atRest),
    );
    yield* ctx.expectContains(
      "the display paints the committed value",
      yield* ctx.host.text(INLINE_EDIT_IDS.field),
      INLINE_EDIT_VALUE,
    );
    yield* ctx.host.capture("inline-edit-rest");

    yield* ctx.host.click(INLINE_EDIT_IDS.field);
    yield* Effect.sleep(SETTLE);
    const opened = { ...atRest, edits: 1, editing: true } as const;
    yield* ctx.expectEqual(
      "a press reports one edit and no commit",
      yield* readout(),
      inlineEditReadout(opened),
    );
    yield* ctx.expectEqual(
      "the window focuses the editor the swap mounted",
      yield* focused(),
      INLINE_EDIT_IDS.field,
    );
    yield* ctx.host.capture("inline-edit-editing");

    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("x");
    yield* Effect.sleep(SETTLE);
    const typed = { ...opened, draft: "x" } as const;
    yield* ctx.expectEqual(
      "a typed key reaches the editor's draft",
      yield* readout(),
      inlineEditReadout(typed),
    );
    yield* ctx.expectEqual(
      "an edit is a draft: the caller's value has not moved",
      yield* ctx.host.text(INLINE_EDIT_IDS.field),
      "",
    );
    yield* ctx.host.key("enter");
    const committed = {
      value: "x",
      draft: "x",
      commits: 1,
      edits: 1,
      editing: false,
    } as const;
    yield* settled(committed);
    yield* ctx.expectEqual(
      "Enter commits the draft once and closes the editor",
      yield* readout(),
      inlineEditReadout(committed),
    );
    yield* ctx.expectEqual(
      "the display paints the committed value",
      yield* ctx.host.text(INLINE_EDIT_IDS.field),
      committed.value,
    );
    yield* ctx.expectEqual(
      "the commit returns the focus to the display",
      yield* focused(),
      INLINE_EDIT_IDS.field,
    );
    yield* ctx.host.capture("inline-edit-committed");

    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter on the focused display opens the editor again",
      yield* readout(),
      inlineEditReadout({ ...committed, edits: 2, editing: true }),
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an unchanged draft closes the editor without a commit",
      yield* readout(),
      inlineEditReadout({ ...committed, edits: 2 }),
    );

    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("y");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the discarded draft reached the caller's onChange",
      yield* readout(),
      inlineEditReadout({ ...committed, draft: "y", edits: 3, editing: true }),
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape keeps the committed value and closes the editor",
      yield* readout(),
      inlineEditReadout({ ...committed, draft: "y", edits: 3 }),
    );
    yield* ctx.expectEqual(
      "the display paints the value Escape kept",
      yield* ctx.host.text(INLINE_EDIT_IDS.field),
      committed.value,
    );
    yield* ctx.expectEqual(
      "a cancelled edit returns the focus too",
      yield* focused(),
      INLINE_EDIT_IDS.field,
    );

    const closedEmpty = {
      value: "",
      draft: "",
      commits: 0,
      edits: 0,
      editing: false,
    } as const;
    yield* ctx.host.click(INLINE_EDIT_IDS.disabled);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled control reports no edit and no commit",
      yield* ctx.host.text(INLINE_EDIT_IDS.disabledReadout),
      inlineEditReadout(closedEmpty),
    );

    yield* ctx.expectEqual(
      "a press on a disabled control still gives it the focus",
      yield* focused(),
      INLINE_EDIT_IDS.disabled,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled control refuses the key that opens an editor",
      yield* ctx.host.text(INLINE_EDIT_IDS.disabledReadout),
      inlineEditReadout(closedEmpty),
    );

    yield* ctx.expectEqual(
      "an empty control paints its placeholder",
      yield* ctx.host.text(INLINE_EDIT_IDS.empty),
      INLINE_EDIT_PLACEHOLDER,
    );
    yield* ctx.host.click(INLINE_EDIT_IDS.empty);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "submitting an unchanged empty draft commits nothing",
      yield* ctx.host.text(INLINE_EDIT_IDS.emptyReadout),
      inlineEditReadout({ ...closedEmpty, edits: 1 }),
    );
    yield* ctx.host.click(INLINE_EDIT_IDS.empty);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("p");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a value typed into an empty control is committed",
      yield* ctx.host.text(INLINE_EDIT_IDS.emptyReadout),
      inlineEditReadout({
        value: "p",
        draft: "p",
        commits: 1,
        edits: 2,
        editing: false,
      }),
    );
    yield* ctx.expectEqual(
      "the placeholder is replaced by the committed value",
      yield* ctx.host.text(INLINE_EDIT_IDS.empty),
      "p",
    );
    yield* ctx.host.capture("inline-edit-empty-committed");
  });
