import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { Match } from "effect";

export type AccordionState =
  | {
      readonly type: "single";
      readonly open: Option.Option<string>;
      readonly collapsible: boolean;
    }
  | { readonly type: "multiple"; readonly open: ReadonlyArray<string> };

export interface AccordionConfig {
  readonly type: "single" | "multiple";

  readonly collapsible?: boolean;
  readonly defaultValue?: string | ReadonlyArray<string>;
}

const singleDefault = (
  value: AccordionConfig["defaultValue"],
): Option.Option<string> =>
  Option.fromNullishOr(typeof value === "string" ? value : undefined);

export const openSectionsOf = (
  value: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Arr.isArray(value)
    ? Option.some(Arr.filter(value, P.isString))
    : Option.none();

const multipleDefault = (
  value: AccordionConfig["defaultValue"],
): ReadonlyArray<string> =>
  Arr.dedupe(
    Option.getOrElse(
      P.isString(value) ? Option.some([value]) : openSectionsOf(value),
      Arr.empty,
    ),
  );

export const initial = (config: AccordionConfig): AccordionState =>
  config.type === "single"
    ? {
        type: "single",
        open: singleDefault(config.defaultValue),
        collapsible: config.collapsible ?? false,
      }
    : {
        type: "multiple",
        open: multipleDefault(config.defaultValue),
      };

export const toggle = (state: AccordionState, item: string): AccordionState =>
  Match.value(state).pipe(
    Match.when({ type: "single" }, (single) =>
      Option.contains(single.open, item)
        ? single.collapsible
          ? { ...single, open: Option.none() }
          : single
        : { ...single, open: Option.some(item) },
    ),
    Match.when({ type: "multiple" }, (multiple) => ({
      ...multiple,
      open: Arr.contains(multiple.open, item)
        ? Arr.filter(multiple.open, (value) => value !== item)
        : Arr.append(multiple.open, item),
    })),
    Match.exhaustive,
  );

export const isOpen = (state: AccordionState, item: string): boolean =>
  Match.value(state).pipe(
    Match.when({ type: "single" }, (single) =>
      Option.contains(single.open, item),
    ),
    Match.when({ type: "multiple" }, (multiple) =>
      Arr.contains(multiple.open, item),
    ),
    Match.exhaustive,
  );
