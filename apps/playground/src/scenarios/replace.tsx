/**
 * `replace-contract` — the replace half of the find-bar contract (plan `333`).
 *
 * `search-highlights` proved that a wash paints and that `onHighlight` counts.
 * This probe asks the three questions a find-and-replace UI adds:
 *
 * 1. does an `<input>`'s own `highlight` wash/report its editor text?
 * 2. does a controlled value the component sets (not the user typing) repaint?
 * 3. where is the caret after that programmatic change?
 *
 * The runtime exposes no `setSelection`, so a component cannot select a match.
 * `ctrl-r` on the editor runs a replace without moving focus, which is the only
 * way to observe the caret the native editor kept across the value change.
 *
 * Measured facts: plan `333` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { replaceAll, replaceFirst } from "./replace-core.js";

const SOURCE = "The error handler logs an error.";
const QUERY = "error";
/** Longer than `error`, so a kept caret index lands inside the new word. */
const LONGER = "warning";

const ReplaceProbe = () => {
  const theme = useTheme();
  const [text, setText] = useState(SOURCE);
  const [replaces, setReplaces] = useState(0);
  const [last, setLast] = useState("none");
  const [docMatches, setDocMatches] = useState("none");
  const [editorMatches, setEditorMatches] = useState("none");

  const apply = (next: { readonly text: string; readonly count: number }) => {
    setText(next.text);
    setReplaces((total) => total + next.count);
    setLast(next.count === 0 ? "noop" : "replace");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 520,
        marginLeft: 40,
        marginTop: 30,
      }}
    >
      <input
        testId="replace-editor"
        value={text}
        highlight={{ query: QUERY }}
        onHighlight={(event) =>
          setEditorMatches(`editor=${event.matchCount ?? -1}`)
        }
        onChange={(event) => setText(event.value ?? "")}
        onKeyDown={(event) => {
          if (event.key === "r" && event.modifiers?.ctrl === true) {
            apply(replaceFirst(text, QUERY, LONGER));
          }
        }}
        style={{
          color: theme.colors.inputForeground,
          backgroundColor: theme.colors.input,
          padding: 8,
        }}
      />

      <div
        testId="replace-preview"
        highlight={{ query: QUERY }}
        onHighlight={(event) => setDocMatches(`doc=${event.matchCount ?? -1}`)}
        style={{ backgroundColor: theme.colors.background }}
      >
        <text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: theme.colors.foreground,
          }}
        >
          {text}
        </text>
      </div>

      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        <Pressable
          testId="replace-one"
          onClick={() => apply(replaceFirst(text, QUERY, LONGER))}
        >
          <text>Replace</text>
        </Pressable>
        <Pressable
          testId="replace-all"
          onClick={() => apply(replaceAll(text, QUERY, LONGER))}
        >
          <text>Replace all</text>
        </Pressable>
        <Pressable
          testId="replace-undo"
          onClick={() => {
            setText(SOURCE);
            setReplaces(0);
            setLast("undo");
          }}
        >
          <text>Undo</text>
        </Pressable>
      </div>

      <Readout testId="replace-counts">{`${docMatches} ${editorMatches}`}</Readout>
      <Readout testId="replace-state">
        {`value=${Str.replaceAll(" ", "|")(text)} replaces=${replaces} last=${last} len=${Str.length(text)}`}
      </Readout>
    </div>
  );
};

/** How many painted runs contain `needle` — the editor and the preview. */
const paintedCount = (ctx: Smoke.SmokeContext, needle: string): number =>
  Arr.length(
    Arr.filter(ctx.host.paintedText(), (run) => Str.includes(needle)(run)),
  );

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

const countWashes = (
  washes: ReadonlyArray<Smoke.HighlightMatch>,
  line: string,
): number => Arr.length(Arr.filter(washes, (match) => match.text === line));

export const replaceScenario: PlaygroundScenario = {
  id: "replace-contract",
  title: "Replace: the controlled editor, its caret and the preview washes",
  capability: "replace",
  view: () => <ReplaceProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // `onHighlight` is a native event: `mount` does not drain it (plan 171).
      ctx.host.advance(0);

      yield* ctx.expectContains(
        "the preview counts the document's matches",
        readout(ctx, "replace-counts"),
        "doc=2",
      );
      yield* ctx.expectContains(
        "the editor reports zero highlight matches",
        readout(ctx, "replace-counts"),
        "editor=0",
      );
      yield* ctx.expectEqual(
        "the editor and the preview both paint the source text",
        paintedCount(ctx, SOURCE),
        2,
      );
      yield* ctx.expectEqual(
        "the preview paints one wash per match",
        countWashes(ctx.host.highlights(), SOURCE),
        2,
      );

      ctx.host.click("replace-one");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "replace-one rewrites the controlled value",
        readout(ctx, "replace-state"),
        `value=${Str.replaceAll(" ", "|")(`The ${LONGER} handler logs an error.`)} replaces=1 last=replace`,
      );
      yield* ctx.expectEqual(
        "the edited editor repaints without the replaced word",
        paintedCount(ctx, `The ${LONGER} handler logs an error.`),
        2,
      );
      yield* ctx.expectEqual(
        "the old sentence is gone from the paint",
        paintedCount(ctx, SOURCE),
        0,
      );
      yield* ctx.expectEqual(
        "the preview drops to one wash",
        countWashes(
          ctx.host.highlights(),
          `The ${LONGER} handler logs an error.`,
        ),
        1,
      );

      // The caret across a programmatic change: End, then a replace that keeps
      // focus in the editor, then one typed character. If the runtime keeps the
      // old index, `z` lands before the final period; if it jumps to the start,
      // it lands at index 0; if it jumps to the end, after the period.
      ctx.host.click("replace-editor");
      ctx.host.key("end");
      ctx.host.key("ctrl-r");
      ctx.host.key("z");
      const caret = readout(ctx, "replace-state");
      yield* ctx.expectContains(
        "the caret kept its absolute index across the programmatic value",
        caret,
        "value=The|warning|handler|logs|an|warning.z",
      );
      yield* ctx.expectContains(
        "the keyboard replace counted its occurrence",
        caret,
        "replaces=2",
      );

      ctx.host.click("replace-undo");
      yield* ctx.expectContains(
        "undo restores the source text",
        readout(ctx, "replace-state"),
        "last=undo",
      );

      ctx.host.click("replace-all");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "replace-all clears every match",
        readout(ctx, "replace-counts"),
        "doc=0",
      );
      yield* ctx.expectContains(
        "replace-all counts only the occurrences it changed",
        readout(ctx, "replace-state"),
        "replaces=2",
      );

      ctx.host.click("replace-all");
      ctx.host.advance(0);
      yield* ctx.expectContains(
        "a second replace-all is inert",
        readout(ctx, "replace-state"),
        "last=noop",
      );

      ctx.host.click("replace-undo");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the restored document paints two washes again",
        countWashes(ctx.host.highlights(), SOURCE),
        2,
      );
    }),
};
