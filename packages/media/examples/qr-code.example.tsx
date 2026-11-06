/** @jsxImportSource @gpuix/react */
import { QrCode } from "../src/qr-code.js";

export const QrCodeExample = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
    <QrCode
      value="https://gpuixui.dev/components/qr-code"
      label="The component documentation"
      size={132}
    />
    <QrCode
      value="https://gpuixui.dev/components/qr-code"
      label="The same address with a stronger level"
      level="H"
      size={132}
    />
    <QrCode
      value="https://gpuixui.dev/components/qr-code?platform=windows&level=Q"
      label="A longer address at a bigger symbol"
      level="Q"
      size={132}
    />
  </div>
);
