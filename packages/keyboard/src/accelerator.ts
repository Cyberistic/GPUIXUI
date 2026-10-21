/**
 * The accelerator grammar: `"mod+shift+z"` in, canonical text and keycap glyphs
 * out.
 *
 * One grammar serves the keymap, the recorder and the cheat sheet, so the three
 * cannot drift. `parse` is strict — an unknown token or a malformed chord is a
 * typed {@link AcceleratorParseError}, never a thrown string. `mod` adapts to
 * the platform (Cmd/⌘ on macOS, Ctrl elsewhere); `cmd` and `ctrl` stay distinct
 * on every platform, so a macOS `ctrl+…` binding never aliases a `cmd+…` one.
 */

import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import type { EventPayload } from "@gpuix/react";

/** A platform the accelerator resolves `mod` against. */
export type Platform = "darwin" | "linux" | "win32" | "default";

/** A canonical modifier, after aliases (`meta`→`cmd`, `option`→`alt`, …) fold. */
export const Modifier = Schema.Literals(["mod", "cmd", "ctrl", "alt", "shift"]);

/** See {@link Modifier}. */
export type Modifier = typeof Modifier.Type;

/** The named keys the grammar recognises; any other single character is a key. */
const NamedKey = Schema.Literals([
  "enter",
  "space",
  "tab",
  "escape",
  "backspace",
  "delete",
  "up",
  "down",
  "left",
  "right",
  "pageup",
  "pagedown",
  "home",
  "end",
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "f10",
  "f11",
  "f12",
]);

/** One printable character that is not the `+` separator or whitespace. */
const PrintableKey = Schema.String.check(
  Schema.makeFilter(
    (value) =>
      value.length === 1 && value !== " " && value !== "\t" && value !== "+",
    {
      identifier: "PrintableKeyCheck",
      title: "Printable key",
      description:
        "A single printable character, excluding the `+` separator and whitespace.",
      message: "expected one printable character",
    },
  ),
);

/** A single key token: a named key or one printable character, lower-cased. */
export const Key = Schema.Union([NamedKey, PrintableKey]).pipe(
  Schema.brand("Key"),
);

/** See {@link Key}. */
export type Key = typeof Key.Type;

/** Narrows a string to a {@link Key}. */
const isKey = Schema.is(Key);

/** A parsed accelerator: modifiers in canonical order plus one key. */
export class Accelerator extends Schema.Class<Accelerator>("Accelerator")(
  {
    modifiers: Schema.Array(Modifier),
    key: Key,
  },
  { description: "A keyboard accelerator: ordered modifiers and one key." },
) {}

const ACCEPTED_FORM =
  'a modifier (Mod, Cmd/Meta, Ctrl/Control, Alt/Option, Shift) then one key, e.g. "Mod+K"';

/** Why an accelerator string failed to parse. */
export type AcceleratorParseErrorReason =
  | "empty"
  | "unknown-token"
  | "duplicate-modifier"
  | "missing-key"
  | "multiple-keys";

/** A malformed accelerator. `token` names the offending segment, if any. */
export class AcceleratorParseError extends Schema.TaggedError<AcceleratorParseError>()(
  "AcceleratorParseError",
  {
    token: Schema.String,
    reason: Schema.Literals([
      "empty",
      "unknown-token",
      "duplicate-modifier",
      "missing-key",
      "multiple-keys",
    ]),
  },
  { description: "An accelerator string that does not parse." },
) {
  override get message(): string {
    const named = this.token === "" ? "" : ` "${this.token}"`;
    const why = Match.value(this.reason).pipe(
      Match.when("empty", () => "is empty"),
      Match.when("unknown-token", () => "is not a modifier or a key"),
      Match.when("duplicate-modifier", () => "is a repeated modifier"),
      Match.when("missing-key", () => "names modifiers but no key"),
      Match.when("multiple-keys", () => "is a second key"),
      Match.exhaustive,
    );
    return `Invalid accelerator${named} ${why}; expected ${ACCEPTED_FORM}`;
  }
}

const isDarwin = (platform: Platform): boolean => platform === "darwin";

/** `mod` resolves to the platform's primary modifier. */
const primaryModifier = (platform: Platform): "cmd" | "ctrl" =>
  isDarwin(platform) ? "cmd" : "ctrl";

/** A modifier after `mod` resolves: the four bits a key event carries. */
export type ConcreteModifier = "cmd" | "ctrl" | "alt" | "shift";

/** Canonical display order for the concrete modifiers. */
const CONCRETE_ORDER: ReadonlyArray<ConcreteModifier> = [
  "cmd",
  "ctrl",
  "alt",
  "shift",
];

/** Canonical order for the abstract modifiers, before `mod` resolves. */
const MODIFIER_ORDER: ReadonlyArray<Modifier> = [
  "mod",
  "cmd",
  "ctrl",
  "alt",
  "shift",
];

/** Every modifier alias, folded to its canonical token. */
const MODIFIER_ALIASES: Readonly<Record<string, Modifier>> = {
  mod: "mod",
  cmd: "cmd",
  meta: "cmd",
  command: "cmd",
  super: "cmd",
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  shift: "shift",
};

/** The runtime key names that are modifiers on their own, never a chord key. */
const MODIFIER_KEYS: ReadonlyArray<string> = [
  "shift",
  "ctrl",
  "control",
  "alt",
  "option",
  "meta",
  "cmd",
  "command",
  "super",
];

/** A concrete modifier set, `mod` resolved and ordered canonically. */
export const resolveConcrete = (
  modifiers: ReadonlyArray<Modifier>,
  platform: Platform,
): ReadonlyArray<ConcreteModifier> => {
  const primary = primaryModifier(platform);
  const concrete = Arr.map(modifiers, (m) => (m === "mod" ? primary : m));
  return Arr.filter(CONCRETE_ORDER, (c) => Arr.contains(concrete, c));
};

/** The grammar's key for a runtime key name, or `None` for a non-key. */
const normalizeKey = (raw: string): Option.Option<Key> => {
  const lower = Str.toLowerCase(raw);
  const token = lower === "return" ? "enter" : lower === " " ? "space" : lower;
  return isKey(token) ? Option.some(token) : Option.none();
};

interface ParsedState {
  readonly modifiers: ReadonlyArray<Modifier>;
  readonly key: Option.Option<Key>;
}

const emptyState: ParsedState = { modifiers: [], key: Option.none() };

const parseResult = (
  accelerator: string,
): Result.Result<Accelerator, AcceleratorParseError> => {
  const segments = Arr.filterMap(Str.split("+")(accelerator), (segment) => {
    const trimmed = Str.trim(segment);
    return Str.isNonEmpty(trimmed)
      ? Result.succeed(Str.toLowerCase(trimmed))
      : Result.failVoid;
  });

  if (Arr.length(segments) === 0) {
    return Result.fail(
      new AcceleratorParseError({ token: "", reason: "empty" }),
    );
  }

  const initial: Result.Result<ParsedState, AcceleratorParseError> =
    Result.succeed(emptyState);

  const state = Arr.reduce(segments, initial, (acc, segment) => {
    if (Result.isFailure(acc)) return acc;
    const { modifiers, key } = acc.success;
    const canonical = R.get(MODIFIER_ALIASES, segment);
    if (Option.isSome(canonical)) {
      if (Arr.contains(modifiers, canonical.value)) {
        return Result.fail(
          new AcceleratorParseError({
            token: segment,
            reason: "duplicate-modifier",
          }),
        );
      }
      return Result.succeed({
        modifiers: Arr.append(modifiers, canonical.value),
        key,
      });
    }
    if (isKey(segment)) {
      if (Option.isSome(key)) {
        return Result.fail(
          new AcceleratorParseError({
            token: segment,
            reason: "multiple-keys",
          }),
        );
      }
      return Result.succeed({ modifiers, key: Option.some(segment) });
    }
    return Result.fail(
      new AcceleratorParseError({ token: segment, reason: "unknown-token" }),
    );
  });

  return Result.flatMap(state, ({ modifiers, key }) =>
    Option.match(key, {
      onNone: () =>
        Result.fail(
          new AcceleratorParseError({ token: "", reason: "missing-key" }),
        ),
      onSome: (k) =>
        Result.succeed(
          new Accelerator({
            modifiers: Arr.filter(MODIFIER_ORDER, (m) =>
              Arr.contains(modifiers, m),
            ),
            key: k,
          }),
        ),
    }),
  );
};

/** Parse an accelerator string; a malformed chord fails with a typed error. */
export const parse = (
  accelerator: string,
): Result.Result<Accelerator, AcceleratorParseError> =>
  parseResult(accelerator);

/** Canonical text for a concrete modifier. */
const CONCRETE_TEXT: Readonly<Record<ConcreteModifier, string>> = {
  cmd: "Cmd",
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
};

/** Keys whose title-case differs from the canonical text form. */
const KEY_TEXT: Readonly<Record<string, string>> = {
  pageup: "PageUp",
  pagedown: "PageDown",
};

/** Title-case a token: `home`→`Home`, `f5`→`F5`, one char→upper. */
const titleToken = (token: string): string =>
  token.length === 1
    ? Str.toUpperCase(token)
    : `${Str.toUpperCase(Str.slice(0, 1)(token))}${Str.slice(1)(token)}`;

const textKey = (key: string): string =>
  Option.match(R.get(KEY_TEXT, key), {
    onNone: () => titleToken(key),
    onSome: (text) => text,
  });

/** The non-empty, trimmed, lower-cased tokens of a chord. */
const tokenize = (accelerator: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(Str.split("+")(accelerator), (segment) =>
      Str.isNonEmpty(Str.trim(segment)),
    ),
    (segment) => Str.toLowerCase(Str.trim(segment)),
  );

/** The chord's modifiers, canonical order, aliases folded. */
const chordModifiers = (
  tokens: ReadonlyArray<string>,
): ReadonlyArray<Modifier> =>
  Arr.filter(MODIFIER_ORDER, (modifier) =>
    Arr.some(tokens, (token) =>
      Option.exists(R.get(MODIFIER_ALIASES, token), (m) => m === modifier),
    ),
  );

/** The chord's non-modifier tokens: the key, plus any unknown token. */
const chordKeys = (tokens: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.filter(tokens, (token) => Option.isNone(R.get(MODIFIER_ALIASES, token)));

/** The canonical text form: `"Cmd+K"`, `"Ctrl+Shift+Z"`, `"Alt+Shift+F"`. */
export const format = (accelerator: string, platform: Platform): string => {
  const tokens = tokenize(accelerator);
  return Arr.join(
    [
      ...Arr.map(
        resolveConcrete(chordModifiers(tokens), platform),
        (m) => CONCRETE_TEXT[m],
      ),
      ...Arr.map(chordKeys(tokens), textKey),
    ],
    "+",
  );
};

/** Keycap glyphs for the concrete modifiers. */
const MODIFIER_GLYPH: Readonly<
  Record<ConcreteModifier, (apple: boolean) => string>
> = {
  cmd: () => "⌘",
  ctrl: () => "Ctrl",
  alt: (apple) => (apple ? "⌥" : "Alt"),
  shift: (apple) => (apple ? "⇧" : "Shift"),
};

/** Keycap glyphs for the named keys that do not title-case to their glyph. */
const KEY_GLYPH: Readonly<Record<string, (apple: boolean) => string>> = {
  enter: (apple) => (apple ? "↵" : "Enter"),
  escape: () => "Esc",
  space: () => "Space",
  tab: () => "Tab",
  backspace: (apple) => (apple ? "⌫" : "Backspace"),
  delete: (apple) => (apple ? "⌦" : "Del"),
  up: (apple) => (apple ? "↑" : "Up"),
  down: (apple) => (apple ? "↓" : "Down"),
  left: (apple) => (apple ? "←" : "Left"),
  right: (apple) => (apple ? "→" : "Right"),
  pageup: () => "PgUp",
  pagedown: () => "PgDn",
};

const glyphKey = (key: string, apple: boolean): string =>
  Option.match(R.get(KEY_GLYPH, key), {
    onNone: () => titleToken(key),
    onSome: (render) => render(apple),
  });

/** The keycap glyphs, in canonical order. */
export const formatSymbols = (
  accelerator: string,
  platform: Platform,
): ReadonlyArray<string> => {
  const tokens = tokenize(accelerator);
  const apple = isDarwin(platform);
  return [
    ...Arr.map(resolveConcrete(chordModifiers(tokens), platform), (m) =>
      MODIFIER_GLYPH[m](apple),
    ),
    ...Arr.map(chordKeys(tokens), (key) => glyphKey(key, apple)),
  ];
};

/** The canonical grammar form, `mod` unresolved: `"mod+shift+z"`. */
export const serialize = (accelerator: Accelerator): string =>
  Arr.join([...accelerator.modifiers, accelerator.key], "+");

const modifiersFromEvent = (
  event: EventPayload,
  platform: Platform,
): ReadonlyArray<Modifier> => {
  const primary = primaryModifier(platform);
  const secondary = primary === "cmd" ? "ctrl" : "cmd";
  const candidates: ReadonlyArray<readonly [ConcreteModifier, Modifier]> = [
    [primary, "mod"],
    [secondary, secondary],
    ["alt", "alt"],
    ["shift", "shift"],
  ];
  const collected = Arr.filterMap(candidates, ([modifier, token]) =>
    event.modifiers?.[modifier] === true
      ? Result.succeed(token)
      : Result.failVoid,
  );
  return Arr.filter(MODIFIER_ORDER, (m) => Arr.contains(collected, m));
};

/**
 * The accelerator a key event captures, or `None` for a modifier-only press.
 *
 * `mod` is the platform's primary modifier; a deliberate secondary modifier
 * keeps its own token (`ctrl` on macOS, `cmd` elsewhere).
 */
export const fromEvent = (
  event: EventPayload,
  platform: Platform,
): Option.Option<Accelerator> =>
  Option.flatMap(Option.fromNullishOr(event.key), (rawKey) => {
    if (Arr.contains(MODIFIER_KEYS, Str.toLowerCase(rawKey))) {
      return Option.none();
    }
    return Option.map(
      normalizeKey(rawKey),
      (key) =>
        new Accelerator({
          modifiers: modifiersFromEvent(event, platform),
          key,
        }),
    );
  });

/** Whether two accelerators bind the same chord on a platform (after `mod`). */
export const sameAccelerator = (
  a: Accelerator,
  b: Accelerator,
  platform: Platform,
): boolean =>
  a.key === b.key &&
  Arr.join(resolveConcrete(a.modifiers, platform), "+") ===
    Arr.join(resolveConcrete(b.modifiers, platform), "+");
