/**
 * Accessible names and help.
 *
 * The runtime publishes whatever string reaches `aria-label`, including `""` —
 * and an empty name is not the same as no name: a label a caller left blank must
 * be absent so the control falls back to its content or stays honestly unnamed,
 * rather than announcing an empty string. The same rule holds for the help a
 * field announces after its name.
 */

import * as Option from "effect/Option";
import * as Str from "effect/String";

/** A name worth publishing, or `undefined` for a blank/whitespace label. */
export const accessibleName = (label: string | undefined): string | undefined =>
  Option.getOrUndefined(
    Option.filter(
      Option.map(Option.fromNullishOr(label), Str.trim),
      Str.isNonEmpty,
    ),
  );

/**
 * The words a caller's formatter supplies, or the component's own when it says nothing.
 *
 * A component that announces a measurement asks its caller for the sentence — a
 * locale, a unit, a buffered share — and that answer is interface copy like a
 * name: a formatter handed a key it does not know, or a locale table with a
 * missing row, answers `""`, which reaches `aria-valuetext` as an announcement
 * of **nothing** while the bar still has a value to report. A blank answer is
 * absence, so the component's own words stand — the rule `accessibleName`
 * already applies to a name, and `fieldHelp` to a description.
 */
export const spokenText = (
  words: Option.Option<string>,
  fallback: string,
): string =>
  Option.getOrElse(
    Option.flatMap(words, (word) => Option.fromNullishOr(accessibleName(word))),
    () => fallback,
  );

/**
 * The help a text field announces after its name.
 *
 * A field's `description` is its permanent help and wins. A `placeholder` is the
 * empty-state hint, and a field publishes it through this same channel **while
 * the box is empty**, because it cannot use the runtime's own: the host's
 * placeholder is shaped in a fixed grey that no theme reaches (see
 * `components/hint.tsx`), so the field paints the hint and hands the host none —
 * and the runtime's `aria_placeholder` leaves with the prop. Without this a
 * reader focused an empty field and heard no format hint at all.
 *
 * A blank string is not help on either side, so a caller who clears the
 * description keeps the hint rather than announcing `""`.
 */
export const fieldHelp = (
  props: { readonly description?: string; readonly placeholder?: string },
  value: string,
): string | undefined =>
  Option.match(Option.fromNullishOr(accessibleName(props.description)), {
    onSome: (help) => help,
    onNone: () =>
      value.length === 0 ? accessibleName(props.placeholder) : undefined,
  });
