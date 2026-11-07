/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { CopyButton } from "../src/copy-button.js";
import { useTheme } from "../src/internal/theme.js";

const TOKEN = "gpx_live_7f3c9a2e51b84d0fa6c2";

export const CopyButtonExample = () => {
  const theme = useTheme();
  const [mirror, setMirror] = useState("");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.card,
        color: theme.colors.cardForeground,
      }}
    >
      <text style={{ color: theme.colors.cardForeground }}>API token</text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <input
          testId="copy-button-example-mirror"
          value={mirror}
          readOnly
          placeholder="A copied token lands here"
          style={{ flexGrow: 1 }}
        />
        <CopyButton
          testId="copy-button-example"
          text={TOKEN}
          onCopy={setMirror}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <CopyButton
          testId="copy-button-example-named"
          text={TOKEN}
          label="Copy token"
          copiedLabel="Token copied"
          onCopy={setMirror}
          size="md"
        />
        <CopyButton
          testId="copy-button-example-disabled"
          text=""
          disabled
          onCopy={setMirror}
        />
      </div>
    </div>
  );
};
