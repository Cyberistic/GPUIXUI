/**
 * What a copy action decides before the renderer runs.
 *
 * `@gpuix/native@0.11.0` publishes no clipboard API (measured; see
 * `docs/gpuix-capabilities.md`), so a press is a **request** the caller
 * fulfils: this package knows the reader asked, never that a write finished.
 * Three decisions are still the component's — the name a reader hears (an
 * icon-only control has no visible text), the glyph that agrees with it, and the
 * window the acknowledgement stays on screen. A blank name would announce an
 * unnamed button, and a window that is not a positive finite number would either
 * fire immediately or never, so both fall back instead of reaching the runtime.
 */

import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The name the action carries at rest. */
const DEFAULT_LABEL = "Copy";

/** The name it carries right after a press. */
const DEFAULT_COPIED_LABEL = "Copied";

/** How long the acknowledgement stays, in milliseconds. */
export const COPY_ACKNOWLEDGEMENT_MS = 1_200;

/** A caller's name, or the fallback when it is absent or blank. */
const named = (value: string | undefined, fallback: string): string =>
  pipe(
    Option.fromNullishOr(value),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
    Option.getOrElse(() => fallback),
  );

/** {@link copyButtonLabel} input: the two names a caller may override. */
export interface CopyButtonLabels {
  /** The name at rest. Default `"Copy"`. */
  readonly label?: string;
  /** The name after a press. Default `"Copied"`. */
  readonly copiedLabel?: string;
}

/** The name a reader hears, from the acknowledgement state. */
export const copyButtonLabel = (
  acknowledged: boolean,
  labels: CopyButtonLabels = {},
): string =>
  acknowledged
    ? named(labels.copiedLabel, DEFAULT_COPIED_LABEL)
    : named(labels.label, DEFAULT_LABEL);

/** The glyph the action paints: the acknowledgement swaps the mark it shows. */
export const copyButtonIcon = (acknowledged: boolean): "copy" | "check" =>
  acknowledged ? "check" : "copy";

/**
 * How long a press is acknowledged.
 *
 * A copy that paints its confirmation forever is indistinguishable from one that
 * never returns, and a zero or `NaN` window would clear it in the press frame.
 * Only a positive finite number is used; anything else is the house window.
 */
export const acknowledgementWindow = (milliseconds?: number): number =>
  pipe(
    Option.fromNullishOr(milliseconds),
    Option.filter((value) => Number.isFinite(value) && value > 0),
    Option.getOrElse(() => COPY_ACKNOWLEDGEMENT_MS),
  );
