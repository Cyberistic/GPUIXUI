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
