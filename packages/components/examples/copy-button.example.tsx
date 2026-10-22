/**
 * CopyButton example: an API token a reader can copy, a renamed confirmation and
 * a disabled action.
 *
 * `0.11.0` publishes no clipboard write, so the caller owns the path: here a
 * press writes the token into the read-only field beside it, the one surface the
 * platform lets a reader select from. The second control names its own press and
 * confirmation; the third has nothing to copy and shows the disabled shape.
 */

import { useState } from "react";
import { CopyButton } from "../src/copy-button.js";
import { useTheme } from "../src/internal/theme.js";

const TOKEN = "gpx_live_7f3c9a2e51b84d0fa6c2";

/** Three copy actions over one token, with the caller's write made visible. */
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
