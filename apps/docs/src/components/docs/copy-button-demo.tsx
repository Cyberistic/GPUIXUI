/**
 * Browser preview for the Copy button page.
 *
 * The native icon action copies a value and acknowledges the press in its own
 * name; the preview flips "Copy" to "Copied" for the same acknowledge window.
 */

import { useEffect, useRef, useState } from "react";
import { writeClipboard } from "../../lib/clipboard";

const token = "gp_7f2c9a4e8b1d";

export function CopyButtonDemo() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="gx-copybutton">
      <div className="gx-copybutton-value">
        <span className="gx-copybutton-token">{token}</span>
      </div>
      <button
        aria-label={copied ? "Copied" : "Copy"}
        className="gx-btn gx-btn-secondary gx-btn-sm"
        onClick={async () => {
          // A copy that did not write is not a copy: the control acknowledges
          // only the text the browser accepted. (It used to flip to "Copied"
          // and write nothing, which is the one thing a copy button may not do.)
          if (!(await writeClipboard(token))) return;
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1200);
        }}
        type="button"
      >
        <span className="gx-copybutton-glyph" key={copied ? "copied" : "copy"}>
          {copied ? "✓" : "⧉"}
        </span>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export const copyButtonDemoSource = `import { CopyButton } from "@gpuixui/components/copy-button";

<CopyButton text={token} onCopy={setMirror} />;`;
