/**
 * The hex dialect the measurement contracts read.
 *
 * The renderer paints a wider grammar — a CSS named colour and every colour
 * function (`isPaintableColor`) — but a contrast ratio, a blend or an OKLab
 * distance needs channels, not a name. Hex is the part of that grammar that
 * resolves to channels without a parser, so the contracts read it in every
 * length the runtime accepts: shorthand `#fff`/`#fff8` (the form a hand-written
 * brand reaches for), the full `#ffffff`/`#ffffff80`, and the bare forms the
 * parser also reads. Anything outside it is reported unmeasurable rather than
 * guessed.
 */

/** A colour as the contracts read it: six-digit channels and an optional share. */
export interface MeasuredHex {
  /** The channels, as `#RRGGBB` in upper case. */
  readonly rgb: string;
  /** The alpha byte, when the value carried one. */
  readonly alpha?: string;
}

const hexDigits = /^#?([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/** A shorthand digit names a byte: `f` is `ff`. */
const widen = (digits: string): string =>
  digits.length > 4
    ? digits
    : digits
        .split("")
        .map((digit) => `${digit}${digit}`)
        .join("");

/**
 * A colour's channels and share, or `undefined` when the value is not hex.
 *
 * @example
 * ```ts
 * measuredHex("#fff"); // { rgb: "#FFFFFF" }
 * measuredHex("ffffff80"); // { rgb: "#FFFFFF", alpha: "80" }
 * measuredHex("rebeccapurple"); // undefined — a name has no channels here
 * ```
 */
export const measuredHex = (value: string): MeasuredHex | undefined => {
  const digits = hexDigits.exec(value)?.[1];
  if (digits === undefined) {
    return undefined;
  }
  const channels = widen(digits).toUpperCase();
  return {
    rgb: `#${channels.slice(0, 6)}`,
    alpha: channels.length === 8 ? channels.slice(6) : undefined,
  };
};

/**
 * The channels of an opaque hex colour, or `undefined` for a translucent one —
 * whose contrast depends on the surface behind it, so a single ratio would be a
 * guess.
 *
 * @example
 * ```ts
 * opaqueRgb("#fff"); // "#FFFFFF"
 * opaqueRgb("#ffffff80"); // undefined
 * ```
 */
export const opaqueRgb = (value: string): string | undefined => {
  const measured = measuredHex(value);
  return measured !== undefined && measured.alpha === undefined
    ? measured.rgb
    : undefined;
};
