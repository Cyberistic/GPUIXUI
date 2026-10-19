/**
 * `selection-signal` — the window's selection-change event and a copy action.
 *
 * A copy affordance needs to know *when* the selection changed and *what* it
 * became. GPUix publishes `onSelectionChange` on the root options (and
 * `observeSelectedText`), but the suite had only ever proven that a drag selects
 * (`text-selection`) — never that the runtime notifies a view. This probe owns
 * that gap: the view never calls `getSelectedText`, so its readout can only
 * change if the native event reaches `useSelectionChange`.
 *
 * The measured trap the probe guards: a click on the affordance **clears the
 * native selection** — headless before `onClick` (`D S(-) C`), live after it
 * (`D C S(-)`) — so a click handler that reads component state copies nothing
 * headless. The copy captures the text at pointer-down and the click copies
 * that snapshot, which is the same code path in both harnesses.
 *
 * Measured facts: plan `615` §8.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useRef, useState } from "react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";
import { useSelectionChange } from "../selection.js";

/** Collapses the newlines a multi-line drag joins with, for one-line compares. */
const flat = (text: string): string =>
  Option.getOrElse(
    Option.fromNullishOr(Str.replaceAll("\n", " ")(text)),
    () => "",
  );

/** A one-token summary of a selection: `t` for text, `-` for empty. */
const token = (text: string): string => (text === "" ? "-" : "t");

const SelectionSignalProbe = () => {
  const theme = useTheme();
  const [changes, setChanges] = useState(0);
  const [selected, setSelected] = useState("");
  const [copied, setCopied] = useState("");
  const [log, setLog] = useState("");
  /** The text the last event delivered; a pointer-down snapshot source. */
  const last = useRef("");
  /** The text captured before a click's selection-clear can replace it. */
  const pending = useRef("");

  useSelectionChange((text) => {
    last.current = text;
    setChanges((count) => count + 1);
    setSelected(text);
    setLog((previous) => `${previous}S(${token(text)}) `);
  });

  const copy = (): void => {
    const text = pending.current;
    setLog((previous) => `${previous}C(${token(text)}) `);
    if (text !== "") setCopied(text);
  };

  const label = { color: theme.colors.foreground };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        padding: 8,
        width: 520,
        backgroundColor: theme.colors.background,
      }}
    >
      <text testId="sig-line-1" style={label}>
        sig one
      </text>
      <text testId="sig-line-2" style={label}>
        sig two
      </text>
      <text testId="sig-line-3" style={label}>
        sig three
      </text>
      <text testId="sig-changes" style={label}>
        {`changes=${changes}`}
      </text>
      <text testId="sig-mode" style={label}>
        {selected === "" ? "selected=<none>" : "selected=text"}
      </text>
      <text testId="sig-echo" style={label}>
        {selected === "" ? "<none>" : selected}
      </text>
      <text testId="sig-copied" style={label}>
        {copied === "" ? "<none>" : copied}
      </text>
      <text testId="sig-log" style={label}>
        {log === "" ? "<none>" : log}
      </text>
      <div
        style={{
          padding: 6,
          borderRadius: 4,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          testId="sig-copy"
          onMouseDown={() => {
            pending.current = last.current;
            setLog((previous) => `${previous}D(${token(pending.current)}) `);
          }}
          onClick={copy}
          style={label}
        >
          copy selection
        </text>
      </div>
    </div>
  );
};

/** The selected text, treating `null` as empty. */
const selection = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.selectedText()), () => "");

/** Selects `from` to `to` and returns the renderer's selection. */
const select = (ctx: Smoke.SmokeContext, from: string, to: string): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.selectText(from, to)),
    () => "",
  );

/** The text of `testId`, or the empty string. */
const textOf = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

/** The change count the view reports. */
const countOf = (ctx: Smoke.SmokeContext): number =>
  Number(Str.replace("changes=", "")(textOf(ctx, "sig-changes")));

export const selectionSignalScenario: PlaygroundScenario = {
  id: "selection-signal",
  title: "Selection signal: the event, the text and a copy affordance",
  capability: "selection",
  view: () => <SelectionSignalProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const dragged = select(ctx, "sig-line-1", "sig-line-3");
      yield* ctx.expectContains(
        "the drag selects the first line",
        dragged,
        "sig one",
      );
      yield* ctx.expectContains(
        "the drag selects the last line",
        dragged,
        "sig three",
      );

      ctx.host.advance(0);
      const first = countOf(ctx);
      yield* ctx.expectEqual("the drag reported a change", first >= 1, true);
      yield* ctx.expectContains(
        "the event delivered the selected text",
        textOf(ctx, "sig-echo"),
        "sig one",
      );
      yield* ctx.expectEqual(
        "the event and the renderer agree",
        flat(textOf(ctx, "sig-echo")),
        flat(selection(ctx)),
      );

      select(ctx, "sig-line-2", "sig-line-2");
      ctx.host.advance(0);
      const second = countOf(ctx);
      yield* ctx.expectEqual(
        "a second drag reports another change",
        second > first,
        true,
      );
      yield* ctx.expectContains(
        "a second drag replaces the selected text",
        textOf(ctx, "sig-echo"),
        "sig two",
      );
      yield* ctx.expectEqual(
        "the earlier text is gone",
        Str.includes("sig one")(textOf(ctx, "sig-echo")),
        false,
      );

      ctx.host.clearSelection();
      ctx.host.advance(0);
      const cleared = countOf(ctx);
      yield* ctx.expectEqual(
        "a cleared selection is notified",
        cleared > second,
        true,
      );
      yield* ctx.expectEqual(
        "the cleared selection is empty",
        textOf(ctx, "sig-echo"),
        "<none>",
      );
      yield* ctx.expectEqual(
        "the mode follows the clear",
        textOf(ctx, "sig-mode"),
        "selected=<none>",
      );

      select(ctx, "sig-line-1", "sig-line-3");
      ctx.host.advance(0);
      const restored = countOf(ctx);
      yield* ctx.expectEqual(
        "a new drag reports another change",
        restored > cleared,
        true,
      );

      ctx.host.click("sig-copy");
      ctx.host.advance(0);
      const copied = countOf(ctx);
      yield* ctx.expectContains(
        "the pointer-down captures the selection",
        textOf(ctx, "sig-log"),
        "D(t)",
      );
      yield* ctx.expectContains(
        "the copy action uses the event's text",
        textOf(ctx, "sig-copied"),
        "sig one",
      );
      yield* ctx.expectEqual(
        "the click clears the native selection",
        textOf(ctx, "sig-echo"),
        "<none>",
      );
      yield* ctx.expectEqual(
        "a click on the affordance does not select",
        selection(ctx),
        "",
      );
      yield* ctx.expectEqual(
        "the click's clear is notified",
        copied > restored,
        true,
      );

      ctx.host.click("sig-copy");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "a copy with no selection keeps the previous text",
        textOf(ctx, "sig-copied"),
        "sig one",
      );
      yield* ctx.expectContains(
        "the second copy captured nothing",
        textOf(ctx, "sig-log"),
        "D(-) C(-)",
      );
    }),
};
