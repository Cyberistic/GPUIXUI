import type { EventPayload } from "@gpuix/react";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useCallback, useRef } from "react";
import { monotonicNanos } from "./internal/clock.js";

export interface TypeaheadBuffer {
  readonly text: string;
  readonly at: number;
}

export const idleTypeahead: TypeaheadBuffer = { text: "", at: 0 };

export const typeaheadWindow: Duration.Duration = Duration.millis(500);

export const typeaheadWindowMs: number = Duration.toMillis(typeaheadWindow);

export const typeaheadNowMs = (): number =>
  Number(monotonicNanos() / 1_000_000n);

export const typeaheadPress = (
  buffer: TypeaheadBuffer,
  char: string,
  now: number,
): TypeaheadBuffer => {
  const letter = Str.toLowerCase(char);
  if (
    buffer.text === "" ||
    !Number.isFinite(now) ||
    now - buffer.at > typeaheadWindowMs
  ) {
    return { text: letter, at: Number.isFinite(now) ? now : 0 };
  }
  const repeating = pipe(
    Str.split("")(buffer.text),
    Arr.every((seen) => seen === letter),
  );
  return repeating
    ? { text: buffer.text, at: now }
    : { text: `${buffer.text}${letter}`, at: now };
};

export interface TypeaheadItem {
  readonly label: string;
  readonly disabled: boolean;
}

const normalise = (value: string): string => Str.toLowerCase(Str.trim(value));

export const typeaheadMatchIndex = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<number> => {
  const needle = normalise(prefix);
  if (Str.isEmpty(needle)) return Option.none();

  const fromIndex = Option.getOrElse(from, () => -1);

  return pipe(
    items,
    Arr.map((item, index) => ({ index, item, label: normalise(item.label) })),
    Arr.filter(
      (candidate) =>
        !candidate.item.disabled &&
        Str.isNonEmpty(candidate.label) &&
        Str.startsWith(needle)(candidate.label),
    ),
    (candidates) =>
      pipe(
        Arr.findFirst(candidates, (candidate) => candidate.index > fromIndex),
        Option.orElse(() => Arr.head(candidates)),
        Option.map((candidate) => candidate.index),
      ),
  );
};

export const typeaheadMatch = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<Item> =>
  Option.flatMap(typeaheadMatchIndex(items, from, prefix), (index) =>
    Arr.get(items, index),
  );

export const typedChar = (event: EventPayload): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(event.keyChar),
    Option.filter(
      (char) =>
        char.length === 1 &&
        char !== " " &&
        Option.exists(
          Option.fromNullishOr(event.key),
          (key) =>
            key.length === 1 &&
            event.modifiers?.cmd !== true &&
            event.modifiers?.ctrl !== true &&
            event.modifiers?.alt !== true,
        ),
    ),
  );

export const useTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  onMatch: (item: Item) => void,
): ((char: string) => void) => {
  const buffer = useRef<TypeaheadBuffer>(idleTypeahead);
  return useCallback(
    (char: string) => {
      const next = typeaheadPress(buffer.current, char, typeaheadNowMs());
      Option.match(typeaheadMatch(items, from, next.text), {
        onNone: () => {
          buffer.current = idleTypeahead;
        },
        onSome: (item) => {
          buffer.current = next;
          onMatch(item);
        },
      });
    },
    [from, items, onMatch],
  );
};
