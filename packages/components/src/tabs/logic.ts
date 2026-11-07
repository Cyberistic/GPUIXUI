import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const TabsOrientations = Schema.Literals(["horizontal", "vertical"]);

export type TabsOrientation = typeof TabsOrientations.Type;

export const orientationOf = (value: unknown): TabsOrientation =>
  Schema.is(TabsOrientations)(value) ? value : "horizontal";

export const TabsActivations = Schema.Literals(["automatic", "manual"]);

export type TabsActivation = typeof TabsActivations.Type;

export const activationOf = (value: unknown): TabsActivation =>
  Schema.is(TabsActivations)(value) ? value : "automatic";

export const selectsOnFocus = (activation: TabsActivation): boolean =>
  activation === "automatic";

export interface MoveAnchors {
  readonly keyOrigin: Option.Option<string>;

  readonly active: Option.Option<string>;

  readonly selected: string;
}

export const moveOrigin = (
  { keyOrigin, active, selected }: MoveAnchors,
  indexOf: (value: string) => Option.Option<number>,
): Option.Option<number> =>
  pipe(
    keyOrigin,
    Option.flatMap(indexOf),
    Option.orElse(() => Option.flatMap(active, indexOf)),
    Option.orElse(() => indexOf(selected)),
  );
