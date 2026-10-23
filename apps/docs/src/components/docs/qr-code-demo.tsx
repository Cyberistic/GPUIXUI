import {
  encodeQr,
  QrSymbol,
  qrPlacement,
  QR_QUIET_ZONE,
} from "@gpuixui/media/qr/encode";
import * as Option from "effect/Option";

/**
 * Browser preview for the QrCode page.
 *
 * A QR symbol is arithmetic, not a paint capability: the preview runs the
 * package's own encoder (`qr/encode`) on the value the page documents, so the
 * modules a reader can scan here are the ones `QrCode` would paint. The ink and
 * paper are the component's own scanner-safe pair — a symbol is read by a
 * camera, so they are deliberately not theme roles.
 */

/** The value the preview encodes: this page's own address. */
export const QR_VALUE = "https://gpuixui.sudokw.com/docs/media/qr-code";

/** The square the page asks for, in points. */
export const QR_SIZE = 160;

/** The component's scanner-safe pair (`packages/media/src/qr-code.tsx`). */
export const QR_INK = "#111111";
export const QR_PAPER = "#FFFFFF";

/** The quiet zone the component paints, in modules. */
export const QR_ZONE = QR_QUIET_ZONE;

/** The symbol the page's value encodes; `None` when the value cannot fit. */
export const previewSymbol = (): Option.Option<QrSymbol> => {
  const encoding = encodeQr(QR_VALUE);
  return encoding instanceof QrSymbol ? Option.some(encoding) : Option.none();
};

/** The quiet zone in whole modules, the way the component reads it. */
const zoneOf = (quiet: number): number =>
  Number.isFinite(quiet) && quiet >= 0 ? Math.floor(quiet) : QR_ZONE;

/** One path holding every dark module, in module units, quiet zone included. */
export const modulePath = (symbol: QrSymbol, quiet: number): string => {
  const offset = zoneOf(quiet);
  return Array.from({ length: symbol.modules }, (_row, row) => row)
    .flatMap((row) =>
      Array.from({ length: symbol.modules }, (_col, col) => col).flatMap(
        (col) =>
          symbol.isDark(row, col)
            ? [`M${col + offset} ${row + offset}h1v1h-1z`]
            : [],
      ),
    )
    .join("");
};

export const QrCodeDemo = () =>
  Option.match(previewSymbol(), {
    onNone: () => null,
    onSome: (symbol) => {
      const placement = qrPlacement(symbol, QR_SIZE, QR_ZONE);
      return (
        <div className="gx-qr">
          <svg
            aria-label="The component documentation"
            height={placement.side}
            role="img"
            viewBox={`0 0 ${placement.cells} ${placement.cells}`}
            width={placement.side}
          >
            <rect
              fill={QR_PAPER}
              height={placement.cells}
              width={placement.cells}
            />
            <path d={modulePath(symbol, placement.quiet)} fill={QR_INK} />
          </svg>
          <p className="gx-qr-meta">
            {`version ${symbol.version} · level ${symbol.level} · ${placement.side} points`}
          </p>
        </div>
      );
    },
  });

export const qrCodeDemoSource = `import { QrCode } from "@gpuixui/media";

<QrCode
  value="https://gpuixui.sudokw.com/docs/media/qr-code"
  label="The component documentation"
  size={160}
/>;`;
