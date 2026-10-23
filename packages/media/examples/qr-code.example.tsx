/**
 * QrCode example: one URL at three sizes and a value the symbol refuses.
 *
 * The symbol's ink and paper stay scanner-safe, so the frames read the same in
 * either theme; the quiet zone is part of the mask, which is why the smallest
 * frame is still a whole module grid.
 */

import { QrCode } from "../src/qr-code.js";

export const QrCodeExample = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
    <QrCode
      value="https://gpuixui.dev/docs/components/qr-code"
      label="The component documentation"
      size={132}
    />
    <QrCode
      value="https://gpuixui.dev/docs/components/qr-code"
      label="The same address with a stronger level"
      level="H"
      size={132}
    />
    <QrCode
      value="https://gpuixui.dev/docs/components/qr-code?platform=windows&level=Q"
      label="A longer address at a bigger symbol"
      level="Q"
      size={132}
    />
  </div>
);
