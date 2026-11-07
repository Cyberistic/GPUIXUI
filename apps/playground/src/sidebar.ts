import { Match } from "effect";
import * as Option from "effect/Option";
import * as Number from "effect/Number";

export const sidebarCursor = (
  key: string | undefined,
  cursor: number,
  count: number,
): Option.Option<number> => {
  if (count <= 0) return Option.none();
  const step: (index: number) => number = Number.clamp({
    minimum: 0,
    maximum: count - 1,
  });
  return Match.value(key).pipe(
    Match.when("down", () => Option.some(step(cursor + 1))),
    Match.when("up", () => Option.some(step(cursor - 1))),
    Match.when("home", () => Option.some(step(0))),
    Match.when("end", () => Option.some(step(count - 1))),
    Match.orElse(() => Option.none()),
  );
};
