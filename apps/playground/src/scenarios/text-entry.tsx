/**
 * `text-entry` — the native editor contract inside a field.
 *
 * `input-edit` proves keystrokes reach `onChange`; it says nothing about what
 * the editor does *within* the value. A search box, an inline edit, a tag
 * input, a date field and every masked-entry question depend on caret
 * movement, selection replacement, deletion, `readOnly`, the placeholder's
 * paint, textarea autosize and whether the typed text is exposed in clear.
 *
 * The uncontrolled fields are deliberate: the accessibility dump then reports
 * the **native editor's** value, not React's echo, so the caret and selection
 * facts are the editor's own. Measured facts: plan `188` §9.
 */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { textStyle } from "@gpuixui/tokens";
import type { Smoke } from "@gpuixui/testing";
import { nodeFor } from "../a11y.js";
import { Readout } from "../ui.js";
import { focusedId, read, readoutNumber, text, treeOf } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const READOUT = "entry-readout";
const PLACEHOLDER = "enter name";

/** The accessibility node authored as `aria-id`, or a labelled failure. */
const aria = (ctx: Smoke.SmokeContext, authorId: string) =>
  Effect.gen(function* () {
    const tree = yield* treeOf(ctx);
    return yield* ctx.expectSome(
      `node ${authorId} is exposed`,
      nodeFor(tree, authorId),
    );
  });

/**
 * What the editor holds, read from the accessibility dump.
 *
 * AccessKit omits `value` for an empty field, so an absent value reads as the
 * empty string: an input always has text, and every non-empty observation below
 * is a separate check.
 */
const editorValue = (ctx: Smoke.SmokeContext, authorId: string) =>
  Effect.map(aria(ctx, authorId), (node) =>
    Option.getOrElse(node.value, () => ""),
  );

/** Every painted string, so a placeholder can be asserted without a style channel. */
const painted = (ctx: Smoke.SmokeContext): string =>
  Arr.join(ctx.host.paintedText(), "\n");

const TextEntryProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [native, setNative] = useState("");
  const [events, setEvents] = useState(0);
  const [plain, setPlain] = useState("");
  const [lockedEdits, setLockedEdits] = useState(0);
  const [secret, setSecret] = useState("");
  const [wide, setWide] = useState("");
  const [note, setNote] = useState("");
  const [areaHeight, setAreaHeight] = useState(0);
  const areaId = useRef<Option.Option<number>>(Option.none());

  const areaRef = useCallback((instance: PublicInstance | null) => {
    areaId.current = Option.map(
      Option.fromNullishOr(instance),
      (element) => element.id,
    );
  }, []);

  // The growth is read from the runtime, not computed: the field is the thing
  // under test, so its painted height is the only honest evidence.
  useLayoutEffect(() => {
    Option.match(areaId.current, {
      onNone: () => {},
      onSome: (id) => {
        const bounds = Option.fromNullishOr(renderer?.getElementBounds?.(id));
        Option.match(bounds, {
          onNone: () => {},
          onSome: (box) => setAreaHeight(Math.round(box.height)),
        });
      },
    });
  }, [note, renderer]);

  const surface: StyleDesc = {
    width: 240,
    padding: 6,
    color: theme.colors.inputForeground,
    backgroundColor: theme.colors.input,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 560,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        native editor
      </text>
      <input
        testId="entry-native"
        aria-id="entry-native"
        placeholder={PLACEHOLDER}
        value={native}
        onChange={(event) => {
          setNative(event.value ?? "");
          setEvents((count) => count + 1);
        }}
        style={surface}
      />
      <input
        testId="entry-controlled"
        aria-id="entry-controlled"
        value={plain}
        onChange={(event) => setPlain(event.value ?? "")}
        style={surface}
      />
      <input
        testId="entry-readonly"
        aria-id="entry-readonly"
        value="locked"
        readOnly
        onChange={() => setLockedEdits((count) => count + 1)}
        style={surface}
      />
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        secret, with the only props the runtime has
      </text>
      <input
        testId="entry-secret"
        aria-id="entry-secret"
        placeholder="password"
        value={secret}
        onChange={(event) => setSecret(event.value ?? "")}
        style={surface}
      />
      <input
        testId="entry-wide"
        aria-id="entry-wide"
        value={wide}
        onChange={(event) => setWide(event.value ?? "")}
        style={{ ...surface, width: 160 }}
      />
      <textarea
        testId="entry-area"
        aria-id="entry-area"
        value={note}
        minRows={2}
        maxRows={6}
        onChange={(event) => setNote(event.value ?? "")}
        style={surface}
        ref={areaRef}
      />
      <Readout testId={READOUT}>
        {`native=${native} events=${events} plain=${plain} lockedEdits=${lockedEdits} secretLen=${secret.length} note=${Str.replaceAll("\n", "|")(note)} areaH=${areaHeight}`}
      </Readout>
    </div>
  );
};

/** Types `keys` as one space-separated native keystroke sequence. */
const type = (ctx: Smoke.SmokeContext, keys: ReadonlyArray<string>): void =>
  ctx.host.key(Arr.join(keys, " "));

const assertEditor = (
  ctx: Smoke.SmokeContext,
  label: string,
  authorId: string,
  expected: string,
) =>
  Effect.gen(function* () {
    const value = yield* editorValue(ctx, authorId);
    yield* ctx.expectEqual(label, value, expected);
  });

export const textEntryScenario: PlaygroundScenario = {
  id: "text-entry",
  title: "Text entry: caret, selection, masking, placeholder and autosize",
  capability: "input",
  view: () => <TextEntryProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const placeholder = yield* aria(ctx, "entry-native");
      yield* ctx.expectEqual(
        "the empty field exposes its placeholder",
        text(placeholder.placeholder),
        PLACEHOLDER,
      );
      yield* ctx.expectContains(
        "the placeholder is painted while the field is empty",
        painted(ctx),
        PLACEHOLDER,
      );

      ctx.host.click("entry-native");
      type(ctx, ["a", "b", "c"]);
      yield* assertEditor(
        ctx,
        "typing reaches the native editor",
        "entry-native",
        "abc",
      );
      yield* ctx.expectContains(
        "onChange reports the accumulated value",
        read(ctx, READOUT),
        "native=abc",
      );
      yield* ctx.expectEqual(
        "one change per character",
        Option.getOrElse(readoutNumber(ctx, READOUT, "events"), () => -1),
        3,
      );
      yield* ctx.expectEqual(
        "the placeholder stops painting once text exists",
        Str.includes(PLACEHOLDER)(painted(ctx)),
        false,
      );

      type(ctx, ["left", "left", "x"]);
      yield* assertEditor(
        ctx,
        "Left moves the caret, and typing inserts at it",
        "entry-native",
        "axbc",
      );

      type(ctx, ["home", "0"]);
      yield* assertEditor(
        ctx,
        "Home moves to the start",
        "entry-native",
        "0axbc",
      );

      type(ctx, ["end", "9"]);
      yield* assertEditor(
        ctx,
        "End moves to the end",
        "entry-native",
        "0axbc9",
      );

      type(ctx, ["backspace"]);
      yield* assertEditor(
        ctx,
        "Backspace deletes one character",
        "entry-native",
        "0axbc",
      );

      type(ctx, ["shift-left", "shift-left", "q"]);
      yield* assertEditor(
        ctx,
        "a selection replaced by typing removes exactly the selected run",
        "entry-native",
        "0axq",
      );

      type(ctx, ["cmd-a", "w"]);
      yield* assertEditor(
        ctx,
        "select-all then typing replaces the whole value",
        "entry-native",
        "w",
      );

      type(ctx, ["backspace", "backspace"]);
      yield* assertEditor(
        ctx,
        "deleting the last character leaves a working empty field",
        "entry-native",
        "",
      );

      ctx.host.click("entry-readonly");
      type(ctx, ["n", "o"]);
      yield* ctx.expectEqual(
        "a read-only field keeps focus",
        focusedId(ctx),
        "entry-readonly",
      );
      yield* assertEditor(
        ctx,
        "a read-only field keeps its value",
        "entry-readonly",
        "locked",
      );
      yield* ctx.expectEqual(
        "readOnly refuses the edit, so no change is reported",
        Option.getOrElse(readoutNumber(ctx, READOUT, "lockedEdits"), () => -1),
        0,
      );

      // The readout reports the length, never the value, so a painted `s3cr3t!`
      // below can only come from the field itself.
      ctx.host.click("entry-secret");
      type(ctx, ["s", "3", "c", "r", "3", "t", "9"]);
      yield* assertEditor(
        ctx,
        "the editor holds the typed secret in clear",
        "entry-secret",
        "s3cr3t9",
      );
      yield* ctx.expectEqual(
        "the change carried every character",
        Option.getOrElse(readoutNumber(ctx, READOUT, "secretLen"), () => -1),
        7,
      );
      yield* ctx.expectContains(
        "the secret is painted in clear",
        painted(ctx),
        "s3cr3t9",
      );

      const before = yield* ctx.expectSome(
        "the wide field is painted",
        Option.fromNullishOr(ctx.host.bounds("entry-wide")),
      );
      ctx.host.click("entry-wide");
      type(
        ctx,
        Arr.makeBy(40, () => "a"),
      );
      const after = yield* ctx.expectSome(
        "the wide field is still painted",
        Option.fromNullishOr(ctx.host.bounds("entry-wide")),
      );
      yield* assertEditor(
        ctx,
        "a long value reaches the editor",
        "entry-wide",
        Arr.join(
          Arr.makeBy(40, () => "a"),
          "",
        ),
      );
      yield* ctx.expectNear(
        "a fixed-width field clips a long value instead of growing",
        after.width,
        before.width,
        1,
      );

      const minHeight = yield* ctx.expectSome(
        "the textarea is painted",
        readoutNumber(ctx, READOUT, "areaH"),
      );
      ctx.host.click("entry-area");
      type(ctx, ["o", "n", "e"]);
      yield* ctx.expectEqual(
        "one line stays at the minRows height",
        Option.getOrElse(readoutNumber(ctx, READOUT, "areaH"), () => -1),
        minHeight,
      );

      type(ctx, [
        "enter",
        "t",
        "w",
        "o",
        "enter",
        "t",
        "h",
        "r",
        "e",
        "e",
        "enter",
        "f",
        "o",
        "u",
        "r",
      ]);
      const four = yield* ctx.expectSome(
        "four lines have a height",
        readoutNumber(ctx, READOUT, "areaH"),
      );
      yield* ctx.expectEqual(
        "the textarea grows with its content",
        four > minHeight,
        true,
      );

      type(ctx, ["enter", "f", "i", "v", "e", "enter", "s", "i", "x"]);
      const six = yield* ctx.expectSome(
        "six lines have a height",
        readoutNumber(ctx, READOUT, "areaH"),
      );
      yield* ctx.expectEqual(
        "the textarea keeps growing to maxRows",
        six > four,
        true,
      );

      type(ctx, ["enter", "s", "e", "v", "e", "n"]);
      const seven = yield* ctx.expectSome(
        "seven lines have a height",
        readoutNumber(ctx, READOUT, "areaH"),
      );
      yield* ctx.expectEqual(
        "the textarea stops growing at maxRows and scrolls",
        seven,
        six,
      );
      yield* ctx.expectContains(
        "every entered line is in the value",
        read(ctx, READOUT),
        "note=one|two|three|four|five|six|seven",
      );
    }),
};
