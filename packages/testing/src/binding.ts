/**
 * Which native binding a run is evidence for.
 *
 * A GPUix binding built from `main` is indistinguishable from the published
 * release at runtime: same package version, same JS, same API surface. It is
 * not the same Rust code — plan `529` measured a 3,330-line delta and a set of
 * capabilities (`registerFont`, `focusVisible`, the display-link frame wake)
 * that the released 0.10.0 binary does not contain.
 *
 * So the suite pins the source it was built from and fingerprints the binary
 * before it claims anything. `MAIN_ONLY_MARKERS` is a release fingerprint, not
 * a permanent ban: it only applies to the pin it was measured against.
 */
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** The source a native binding was built from. */
export class BindingPin extends Schema.Class<BindingPin>("BindingPin")({
  package: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  gpuix: Schema.NonEmptyString,
  zed: Schema.NonEmptyString,
  shaders: Schema.Literals(["runtime", "build-time"]),
}) {}

const ABBREVIATED = 8;

const short = (commit: string): string => Str.slice(0, ABBREVIATED)(commit);

/** A one-line provenance label for a report's `host` field. */
export const describeBinding = (pin: BindingPin): string =>
  `${pin.package} ${pin.version} (gpuix ${short(pin.gpuix)}, zed ${short(pin.zed)}, ${pin.shaders} shaders)`;

/**
 * Names that are compiled into a binding built from GPUix `main` and are
 * absent from the published 0.10.0 binaries. Measured by plan `529` §1.1 with
 * `strings` on both artifacts; each is a serde field name, so the compiler
 * keeps it in the binary.
 */
export const MAIN_ONLY_MARKERS: ReadonlyArray<string> = [
  "focusVisible",
  "keyboardFocusDim",
  "outlineWidth",
  "registerFont",
  "setFrameWakeCallback",
  "scrollbarColor",
  "borderStyle",
  "aspectRatio",
  "keystrokeId",
  "scrollX",
  "scrollY",
];

const MARKER_VERSION = "0.10.0";

/** Latin-1 decodes one byte to one character, so a marker is a plain substring. */
const asText = (binary: Uint8Array): string =>
  new TextDecoder("latin1").decode(binary);

const hasMarker = (text: string, marker: string): boolean =>
  Str.includes(marker)(text);

const firstMarker = (text: string): Option.Option<string> =>
  Option.fromNullishOr(
    MAIN_ONLY_MARKERS.find((marker) => hasMarker(text, marker)),
  );

/**
 * `Some(message)` when `binary` carries a capability the pinned release does
 * not have, i.e. it was built from a newer source than the one it claims.
 */
export const fingerprintIssue = (
  binary: Uint8Array,
  pin: BindingPin,
): Option.Option<string> => {
  if (pin.version !== MARKER_VERSION) return Option.none();
  return Option.map(
    firstMarker(asText(binary)),
    (marker) =>
      `${pin.package} ${pin.version} cannot contain ${marker}: this binding was built from a newer GPUix source than the release`,
  );
};
