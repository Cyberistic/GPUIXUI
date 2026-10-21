/**
 * Accessible names.
 *
 * The runtime publishes whatever string reaches `aria-label`, including `""` —
 * and an empty name is not the same as no name: a label a caller left blank must
 * be absent so the control falls back to its content or stays honestly unnamed,
 * rather than announcing an empty string.
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
