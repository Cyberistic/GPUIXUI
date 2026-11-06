import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Str from "effect/String";

export type KeyName = string;

export type KeyPhase = "down" | "up";

export const ENTER_KEY = "enter";
export const SPACE_KEY = "space";

export const swallowKeyDefault = (key: KeyName, phase: KeyPhase): boolean =>
  key === SPACE_KEY && phase === "down";

export interface KeyChord {
  readonly shift?: boolean;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly cmd?: boolean;
}

export const isPlainKey = (chord: KeyChord | undefined): boolean =>
  chord?.ctrl !== true && chord?.alt !== true && chord?.cmd !== true;

export const decideActivation = (
  key: KeyName,
  phase: KeyPhase,
  held: boolean,
): boolean => {
  if (held) return false;
  if (key === ENTER_KEY) return phase === "down";
  if (key === SPACE_KEY) return phase === "up";
  return false;
};

export const decideToggle = (current: boolean): boolean => !current;

const ARROW_KEYS = {
  vertical: { forward: "down", backward: "up" },
  horizontal: { forward: "right", backward: "left" },
} as const;

export type Orientation = keyof typeof ARROW_KEYS;

const ORIENTATION_NAMES: ReadonlyArray<string> = R.keys(ARROW_KEYS);

export const isOrientation = (value: unknown): value is Orientation =>
  P.isString(value) && Arr.contains(ORIENTATION_NAMES, value);

export const orientationOf = (
  value: unknown,
  fallback: Orientation,
): Orientation => (isOrientation(value) ? value : fallback);

export const decideMove = (
  index: number,
  count: number,
  key: KeyName,
  orientation: Orientation,
  isDisabled: (index: number) => boolean = () => false,
): Option.Option<number> => {
  if (count <= 1 || !isOrientation(orientation)) return Option.none();
  const { forward, backward } = ARROW_KEYS[orientation];
  if (key !== forward && key !== backward) return Option.none();
  const step = key === forward ? 1 : -1;
  const candidates = Arr.map(
    Arr.range(1, count - 1),
    (offset) => (((index + step * offset) % count) + count) % count,
  );
  return Arr.findFirst(candidates, (candidate) => !isDisabled(candidate));
};

export const decideAbsolute = (
  count: number,
  key: KeyName,
  isDisabled: (index: number) => boolean = () => false,
): Option.Option<number> => {
  if (count <= 0) return Option.none();
  const indexes = Arr.range(0, count - 1);
  if (key === "home")
    return Arr.findFirst(indexes, (index) => !isDisabled(index));
  if (key === "end")
    return Arr.findFirst(Arr.reverse(indexes), (index) => !isDisabled(index));
  return Option.none();
};

export const decidePage = (
  index: number,
  count: number,
  key: KeyName,
  pageSize: number,
): Option.Option<number> => {
  if (count <= 0 || pageSize <= 0) return Option.none();
  if (key !== "pageup" && key !== "pagedown") return Option.none();
  const target = key === "pagedown" ? index + pageSize : index - pageSize;
  return Option.some(Math.max(0, Math.min(count - 1, target)));
};

export const TYPE_AHEAD_RESET_MS = 500;

export const isTypeAheadKey = (key: KeyName): boolean => key.length === 1;

export const decideTypeAhead = (
  labels: ReadonlyArray<string>,
  from: number,
  buffer: string,
  isDisabled: (index: number) => boolean = () => false,
): Option.Option<number> => {
  const count = labels.length;
  if (count <= 0 || buffer.length === 0) return Option.none();
  const search = (wanted: string): Option.Option<number> => {
    const order = Arr.map(
      Arr.range(1, count),
      (offset) => (((from + offset) % count) + count) % count,
    );
    return Arr.findFirst(
      order,
      (index) =>
        !isDisabled(index) &&
        Str.startsWith(wanted)(Str.toLowerCase(labels[index] ?? "")),
    );
  };
  const wanted = Str.toLowerCase(buffer);
  return Option.match(search(wanted), {
    onSome: Option.some,
    onNone: () =>
      wanted.length > 1 ? search(Str.takeRight(1)(wanted)) : Option.none(),
  });
};
