/**
 * Capturing a chord from a runtime key event.
 *
 * The display grammar is `shortcut/accelerator.ts`; this module only turns an
 * `EventPayload` into the accelerator string that grammar reads. Pure, so the
 * capture rules are tested without a renderer.
 */

import type { EventPayload } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import type { PlatformName } from "../internal/theme.js";

/** Keys that are modifiers on their own and never form a chord by themselves. */
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

/** The grammar's name for a runtime key. */
const keyToken = (key: string): string => {
  const lower = Str.toLowerCase(key);
  if (lower === "return") return "enter";
  if (lower === " ") return "space";
  return lower;
};

/**
 * The chord a key event captures, or `None` for a modifier-only press or an
 * event without a key.
 *
 * `mod` is the platform's primary modifier: Command on macOS, Control elsewhere.
 * A Control press on macOS (or a Command press elsewhere) keeps its own token,
 * so a deliberate secondary-modifier chord is not silently rewritten.
 */
export const acceleratorOf = (
  event: EventPayload,
  platform: PlatformName,
): Option.Option<string> =>
  Option.flatMap(Option.fromNullishOr(event.key), (key) => {
    const token = keyToken(key);
    if (Arr.contains(MODIFIER_KEYS, Str.toLowerCase(key))) return Option.none();

    const apple = platform === "darwin";
    const mod = apple
      ? event.modifiers?.cmd === true
      : event.modifiers?.ctrl === true;
    const secondary = apple
      ? event.modifiers?.ctrl === true
      : event.modifiers?.cmd === true;
    const shift = event.modifiers?.shift === true;
    const alt = event.modifiers?.alt === true;

    const modifiers = Arr.filterMap(
      [
        { on: mod, token: "mod" },
        { on: secondary, token: apple ? "ctrl" : "cmd" },
        { on: shift, token: "shift" },
        { on: alt, token: "alt" },
      ],
      (entry) => (entry.on ? Result.succeed(entry.token) : Result.failVoid),
    );

    return Option.some(Arr.join([...modifiers, token], "+"));
  });
