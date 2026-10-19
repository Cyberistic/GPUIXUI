/**
 * The data behind a `Select`: flat options and named groups.
 *
 * GPUix's SelectItem order is one flat run, so a group is a **presentation**
 * decision — a heading before a run of options — not a second keyboard scope.
 * These helpers are what keeps the renderer, the trigger's label lookup and the
 * placement estimate reading the same order.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { hasText, usableText } from "./text.js";

/** One selectable choice. */
export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** A named run of options. The heading itself is not selectable. */
export interface SelectOptionGroup {
  readonly label: string;
  readonly options: ReadonlyArray<SelectOption>;
}

/** One entry in `Select`'s `options`: a choice, or a group of them. */
export type SelectEntry = SelectOption | SelectOptionGroup;

/** Whether an entry is a group. */
export const isSelectGroup = (entry: SelectEntry): entry is SelectOptionGroup =>
  "options" in entry;

/**
 * Every selectable option, in list order.
 *
 * This is what the trigger reads for its label and what goes into GPUix's flat
 * `items` prop, so a group can never reorder the values the keyboard visits.
 */
export const selectOptions = (
  entries: ReadonlyArray<SelectEntry>,
): ReadonlyArray<SelectOption> =>
  Arr.flatMap(entries, (entry) =>
    isSelectGroup(entry) ? entry.options : [entry],
  );

/** How many painted rows a list has: selectable options and non-empty headings. */
export interface SelectRowCounts {
  readonly options: number;
  readonly headings: number;
}

/**
 * What the combobox announces as its value.
 *
 * GPUix has no `aria-valuenow`, so a select's chosen text rides on
 * `aria-valuetext`. That text is an announcement, not paint: it follows the
 * package's blank-string rule (`usableText`) — trimmed, and absent when it says
 * nothing — so the trigger cannot announce padding the option row trims, or a
 * computed blank placeholder as a whitespace value (plans `026`, `580`, `589`).
 * The placeholder is the fallback for no selection (and for a stale value that
 * is not in `options`, which GPUix also paints as the placeholder).
 */
export const selectValueText = (
  selectedLabel: string | undefined,
  placeholder: string | undefined,
): string | undefined =>
  Option.getOrUndefined(
    Option.orElse(usableText(selectedLabel), () => usableText(placeholder)),
  );

/** Whether the select paints its list.
 *
 * A disabled select is closed even when its controlled `open` still says
 * otherwise: the runtime refuses every choice and dismissal path once disabled,
 * so a painted list would be a dead menu (measured, plan 346). The wrapper's
 * effect asks a controlled parent to agree, but paint does not wait for it.
 */
export const selectOpen = (
  requestedOpen: boolean,
  disabled: boolean,
): boolean => requestedOpen && !disabled;

/**
 * The row counts the height estimate needs.
 *
 * An empty group paints no heading, so it counts as nothing rather than leaving
 * a section title over blank space; a group whose name says nothing paints no
 * heading either, so it counts as a flat run of options (plans 363, 579).
 */
export const selectRowCounts = (
  entries: ReadonlyArray<SelectEntry>,
): SelectRowCounts =>
  Arr.reduce(entries, { options: 0, headings: 0 }, (counts, entry) =>
    isSelectGroup(entry)
      ? Arr.match(entry.options, {
          onEmpty: () => counts,
          onNonEmpty: (options) => ({
            options: counts.options + options.length,
            headings: counts.headings + (hasText(entry.label) ? 1 : 0),
          }),
        })
      : { ...counts, options: counts.options + 1 },
  );
