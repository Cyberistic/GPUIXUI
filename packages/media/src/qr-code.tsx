/**
 * `QrCode`: a QR symbol painted from the package's own encoder.
 *
 * The symbol is one tinted `<svg>` mask — the route the playground's
 * `qr-matrix` probe measured in a window — with the four-module quiet zone
 * inside the mask's viewBox, because a scanner needs the light ring as much as
 * it needs the modules. A grid of `div`s also paints (the probe measured both),
 * but one element is the cheaper and crisper of the two for a symbol that can
 * hold a thousand modules.
 *
 * The two colours are **not theme roles**: a symbol is read by a camera, so its
 * ink and paper stay a scanner-safe near-black on white even in a dark theme.
 * A caller may override either, and owns what a low-contrast pair costs.
 */

import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { textStyle } from "@gpuixui/tokens";
import type { ReactElement } from "react";
import { recipeStyle, useTheme, type Theme } from "./internal.js";
import {
  encodeQr,
  QrEncoding,
  QrSymbol,
  qrPlacement,
  qrSvgSource,
  QR_QUIET_ZONE,
  type QrLevel,
} from "./qr/encode.js";

/** The ink a symbol paints: near-black, as a scanner expects. */
export const QR_INK = "#111111";

/** The paper a symbol paints: white, so the quiet zone is truly light. */
export const QR_PAPER = "#FFFFFF";

/** {@link QrCode} props. */
export interface QrCodeProps extends Omit<Props, "children"> {
  /** The text or URL the symbol carries. */
  readonly value: string;
  /** The error correction level. Default `"M"`. */
  readonly level?: QrLevel;
  /** The painted side in points, quiet zone included. Default `160`. */
  readonly size?: number;
  /** The quiet zone in modules. Default `4`. */
  readonly quietZone?: number;
  /** The modules' colour. Default {@link QR_INK}. */
  readonly ink?: string;
  /** The background and quiet zone's colour. Default {@link QR_PAPER}. */
  readonly paper?: string;
  /** The symbol's accessible name. Default `"QR code"`. */
  readonly label?: string;
  readonly className?: string;
}

const DEFAULT_SIZE = 160;

const errorStyle = (theme: Theme): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing.sm,
  borderWidth: theme.borderWidth.thin,
  borderStyle: "solid",
  borderColor: theme.colors.destructive,
  borderRadius: theme.radius.sm,
});

const errorText = (theme: Theme): StyleDesc => ({
  ...textStyle(theme, "caption"),
  color: theme.colors.destructive,
});

/** The capacity message an over-long value paints. */
export const qrOverflowMessage = (bytes: number, capacity: number): string =>
  `A QR code holds ${capacity} bytes at this level; the value is ${bytes}.`;

/** The element `QrCode` renders. Pure in its arguments. */
export const renderQrCode = (
  props: QrCodeProps,
  theme: Theme,
): ReactElement => {
  const {
    value,
    level = "M",
    size = DEFAULT_SIZE,
    quietZone = QR_QUIET_ZONE,
    ink = QR_INK,
    paper = QR_PAPER,
    label = "QR code",
    className,
    style,
    ...rest
  } = props;
  const encoding = encodeQr(value, { level });

  return QrEncoding.match(encoding, {
    overflow: (overflow) => (
      <div
        {...rest}
        testId={rest.testId ?? "qr-code-overflow"}
        role="img"
        aria-label={label}
        style={mergeStyles(
          recipeStyle(cn("rounded-sm", className), theme),
          errorStyle(theme),
        )}
      >
        <text style={errorText(theme)}>
          {qrOverflowMessage(overflow.bytes, overflow.capacity)}
        </text>
      </div>
    ),
    symbol: (symbol: QrSymbol) => {
      const placement = qrPlacement(symbol, size, quietZone);
      return (
        <div
          {...rest}
          role="img"
          aria-label={label}
          style={mergeStyles(
            mergeStyles(recipeStyle(cn("rounded-sm", className), theme), {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: placement.side,
              height: placement.side,
              backgroundColor: paper,
            }),
            style,
          )}
        >
          <svg
            testId="qr-code-svg"
            source={qrSvgSource(symbol, placement.quiet)}
            style={{
              width: placement.side,
              height: placement.side,
              color: ink,
            }}
          />
        </div>
      );
    },
  });
};

/** A QR symbol for a value, composed from one tinted `<svg>` mask. */
export const QrCode = (props: QrCodeProps): ReactElement => {
  const theme = useTheme();
  return renderQrCode(props, theme);
};
