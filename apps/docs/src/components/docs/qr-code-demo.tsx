import {
  encodeQr,
  QrSymbol,
  qrPlacement,
  QR_QUIET_ZONE,
} from "@gpuixui/media/qr/encode";
import * as Option from "effect/Option";

export const QR_VALUE = "https://gpuixui.sudokw.com/media/qr-code";

export const QR_SIZE = 160;

export const QR_INK = "#111111";
export const QR_PAPER = "#FFFFFF";

export const QR_ZONE = QR_QUIET_ZONE;

export const previewSymbol = (): Option.Option<QrSymbol> => {
  const encoding = encodeQr(QR_VALUE);
  return encoding instanceof QrSymbol ? Option.some(encoding) : Option.none();
};

const zoneOf = (quiet: number): number =>
  Number.isFinite(quiet) && quiet >= 0 ? Math.floor(quiet) : QR_ZONE;

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
  value="https://gpuixui.sudokw.com/media/qr-code"
  label="The component documentation"
  size={160}
/>;`;
