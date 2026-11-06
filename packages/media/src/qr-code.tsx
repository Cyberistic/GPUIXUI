/** @jsxImportSource @gpuix/react */
import type { Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { textStyle } from "@gpuixui/tokens";
import type { ReactElement } from "react";
import { recipeStyle, useTheme, type Theme } from "./internal.js";
import { accessibleName } from "./name.js";
import {
  encodeQr,
  levelOf,
  QrEncoding,
  QrSymbol,
  qrPlacement,
  qrSvgSource,
  QR_QUIET_ZONE,
  type QrLevel,
  type QrMode,
} from "./qr/encode.js";

export const QR_INK = "#111111";

export const QR_PAPER = "#FFFFFF";

export interface QrCodeProps extends Omit<Props, "children"> {
  readonly value: string;

  readonly level?: QrLevel;

  readonly size?: number;

  readonly quietZone?: number;

  readonly ink?: string;

  readonly paper?: string;

  readonly label?: string;
  readonly className?: string;
}

const DEFAULT_SIZE = 160;
const DEFAULT_LABEL = "QR code";

const frameSide = (size: number): number =>
  Number.isFinite(size) && size > 0 ? size : DEFAULT_SIZE;

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

const OVERFLOW_UNITS: Readonly<Record<QrMode, string>> = {
  numeric: "digits",
  alphanumeric: "characters",
  byte: "bytes",
};

export const qrOverflowMessage = (
  mode: QrMode,
  length: number,
  capacity: number,
): string =>
  `A QR code holds ${capacity} ${OVERFLOW_UNITS[mode]} at this level; the value is ${length}.`;

export const renderQrCode = (
  props: QrCodeProps,
  theme: Theme,
): ReactElement => {
  const {
    value,
    level: levelProp = "M",
    size = DEFAULT_SIZE,
    quietZone = QR_QUIET_ZONE,
    ink = QR_INK,
    paper = QR_PAPER,
    label,
    className,
    style,
    ...rest
  } = props;

  const level = levelOf(levelProp);

  const inkPaint = accessibleName(ink, QR_INK);
  const paperPaint = accessibleName(paper, QR_PAPER);
  const encoding = encodeQr(value, { level });

  return QrEncoding.match(encoding, {
    overflow: (overflow) => (
      <div
        {...rest}
        testId={rest.testId ?? "qr-code-overflow"}
        role="alert"
        style={mergeStyles(
          mergeStyles(
            mergeStyles(
              recipeStyle(cn("rounded-sm", className), theme),
              errorStyle(theme),
            ),
            { minWidth: frameSide(size), minHeight: frameSide(size) },
          ),
          style,
        )}
      >
        <text style={errorText(theme)}>
          {qrOverflowMessage(overflow.mode, overflow.length, overflow.capacity)}
        </text>
      </div>
    ),
    symbol: (symbol: QrSymbol) => {
      const placement = qrPlacement(symbol, size, quietZone);
      return (
        <div
          {...rest}
          role="img"
          aria-label={accessibleName(label, DEFAULT_LABEL)}
          style={mergeStyles(
            mergeStyles(recipeStyle(cn("rounded-sm", className), theme), {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: placement.side,
              height: placement.side,
              backgroundColor: paperPaint,
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
              color: inkPaint,
            }}
          />
        </div>
      );
    },
  });
};

export const QrCode = (props: QrCodeProps): ReactElement => {
  const theme = useTheme();
  return renderQrCode(props, theme);
};
