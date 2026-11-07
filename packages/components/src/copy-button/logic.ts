import { pipe } from "effect";
import * as Option from "effect/Option";
import { nameOf } from "../internal/text.js";

const DEFAULT_LABEL = "Copy";

const DEFAULT_COPIED_LABEL = "Copied";

export const COPY_ACKNOWLEDGEMENT_MS = 1_200;

const named = (value: unknown, fallback: string): string =>
  Option.getOrElse(Option.fromNullishOr(nameOf(value)), () => fallback);

export interface CopyButtonLabels {
  readonly label?: unknown;

  readonly copiedLabel?: unknown;
}

export const copyButtonLabel = (
  acknowledged: boolean,
  labels: CopyButtonLabels = {},
): string =>
  acknowledged
    ? named(labels.copiedLabel, DEFAULT_COPIED_LABEL)
    : named(labels.label, DEFAULT_LABEL);

export const copyButtonIcon = (acknowledged: boolean): "copy" | "check" =>
  acknowledged ? "check" : "copy";

export const acknowledgementWindow = (milliseconds?: number): number =>
  pipe(
    Option.fromNullishOr(milliseconds),
    Option.filter((value) => Number.isFinite(value) && value > 0),
    Option.getOrElse(() => COPY_ACKNOWLEDGEMENT_MS),
  );
