/**
 * The blank-string rule, shared by paint and by the row models.
 *
 * A caption, description or group heading is often computed
 * (`description={row.help}`, `label={group.name}`), and a string that trims to
 * nothing is **absence**, not a value: it must not paint an empty line, split a
 * rule, or create a heading the list height counts (plans 026, 577, 579). The
 * accessibility helpers apply the same test before writing an `aria-*` value,
 * so the paint and the tree agree.
 */

import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The trimmed string, or `None` when it says nothing. */
export const usableText = (value: string | undefined): Option.Option<string> =>
  Option.filter(
    Option.map(Option.fromNullishOr(value), Str.trim),
    Str.isNonEmpty,
  );

/** Whether a string says something: non-blank after trimming. */
export const hasText = (value: string | undefined): boolean =>
  Option.isSome(usableText(value));

/**
 * The text a data option paints and announces.
 *
 * An option's `label` is often computed and can trim to nothing; its `value`
 * is the only other name the caller supplied, so a blank label falls back to
 * it instead of painting an empty row and publishing an unnamed focus stop
 * (plan 589). A real label is returned verbatim: padding is the caller's.
 */
export const optionText = (label: string, value: string): string =>
  hasText(label) ? label : Str.trim(value);
