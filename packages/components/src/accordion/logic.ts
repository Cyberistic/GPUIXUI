/**
 * Which sections of an accordion are open.
 *
 * The two shapes are genuinely different — one optional value for `single`, an
 * ordered set for `multiple` — so they are modelled as a tagged union rather
 * than a list plus a boolean.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { Match } from "effect";

/** Open sections for a single- or multi-open accordion. */
export type AccordionState =
  | {
      readonly type: "single";
      readonly open: Option.Option<string>;
      readonly collapsible: boolean;
    }
  | { readonly type: "multiple"; readonly open: ReadonlyArray<string> };

/** Configuration the component passes once. */
export interface AccordionConfig {
  readonly type: "single" | "multiple";
  /** Single-mode only: whether the open section may be closed again. */
  readonly collapsible?: boolean;
  readonly defaultValue?: string | ReadonlyArray<string>;
}

const singleDefault = (
  value: AccordionConfig["defaultValue"],
): Option.Option<string> =>
  Option.fromNullishOr(typeof value === "string" ? value : undefined);

/**
 * The sections a saved open set carries: its text entries, or absence.
 *
 * Which sections are open is saved with the workspace — a panel's state
 * restored on the next launch — so a stored `null` reaches the root, and
 * `Arr.contains` over it threw out of the first render. Only a list is a list;
 * an entry that is not a section id is dropped, so a hole cannot hide the open
 * sections beside it. Anything else is **absence**, which is the uncontrolled
 * accordion the prop already documents for `undefined`.
 */
export const openSectionsOf = (
  value: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Arr.isArray(value) ? Option.some(Arr.filter(value, P.isString)) : Option.none();

const multipleDefault = (
  value: AccordionConfig["defaultValue"],
): ReadonlyArray<string> =>
  Arr.dedupe(
    Option.getOrElse(
      P.isString(value) ? Option.some([value]) : openSectionsOf(value),
      Arr.empty,
    ),
  );

/** The starting state for a configuration. */
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

/**
 * Toggle one section.
 *
 * Single, not collapsible: opening a second section closes the first, and
 * toggling the open one is a no-op so a form cannot end up with nothing shown.
 * Single, collapsible: toggling the open one closes it.
 * Multiple: toggle membership, keeping the order sections were opened in.
 */
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

/** Whether a section is open. */
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
