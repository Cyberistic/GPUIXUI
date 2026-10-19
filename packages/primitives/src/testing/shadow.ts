/**
 * Telling a focus ring from elevation in a painted frame.
 *
 * GPUix paints one `boxShadow` per element, and the field family carries the
 * recipe's `shadow-xs` at rest (plan `585`), so "this element painted a shadow"
 * is not "this element is focused". Every ring this package paints is a
 * zero-offset, zero-blur shadow with a positive spread (`focusRing`, and the
 * recipe's 3 px focus ring); every elevation level spreads `0` or less.
 *
 * The value arrives from the renderer as `unknown`, so it is decoded at this
 * boundary; anything that is not a shadow is not a ring.
 *
 * Test-only, like the adapter beside it: the package root does not re-export
 * this module, and the runtime suites import it from
 * `@gpuixui/primitives/testing`.
 */

import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const PaintedShadow = Schema.Struct({ spreadRadius: Schema.Number });

/** Whether a painted shadow is a focus ring rather than elevation. */
export const isFocusRing = (shadow: unknown): boolean =>
  Option.match(Schema.decodeUnknownOption(PaintedShadow)(shadow), {
    onNone: () => false,
    onSome: (painted) => painted.spreadRadius > 0,
  });
