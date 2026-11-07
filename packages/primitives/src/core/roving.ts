import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const rovingIndex = (
  count: number,
  preferred: Option.Option<number>,
  isDisabled: (index: number) => boolean,
): Option.Option<number> => {
  if (count <= 0) return Option.none();
  const usable = (index: number): boolean =>
    index >= 0 && index < count && !isDisabled(index);
  return Option.match(Option.filter(preferred, usable), {
    onSome: Option.some,
    onNone: () => Arr.findFirst(Arr.range(0, count - 1), usable),
  });
};
