import { useState } from "react";
import {
  platformNames,
  platformStyles,
  type PlatformName,
} from "@gpuixui/tokens";
import { HighlightedCode } from "@/components/highlighted-code";
import { writeClipboard } from "../../lib/clipboard";
import { platformStyleSource } from "../../lib/platform-style-source";

/**
 * A shipped platform style as the file a reader copies.
 *
 * The Theming page says a platform style is an ordinary table a consumer can
 * copy, edit and ship, and the table lives in the library — so the page shows
 * the library's own values, generated from `platformStyles` by
 * `platform-style-source.ts`, rather than a second copy typed into Markdown
 * that no guard could keep true.
 */
export function PlatformStyleSource() {
  const [selected, setSelected] = useState<PlatformName>("darwin");
  const [copied, setCopied] = useState(false);

  const choose = (name: PlatformName) => {
    setSelected(name);
    setCopied(false);
  };

  const copy = () => {
    void writeClipboard(platformStyleSource(selected)).then(setCopied);
  };

  return (
    <div className="gx-ps not-prose" data-platform-style={selected}>
      <div className="gx-ps-bar">
        <div aria-label="Platform style" className="gx-ps-group" role="group">
          {platformNames.map((name) => (
            <button
              aria-pressed={name === selected}
              className="gx-ps-tab"
              key={name}
              onClick={() => choose(name)}
              type="button"
            >
              {platformStyles[name].label}
            </button>
          ))}
        </div>
        <button className="gx-ps-copy" onClick={copy} type="button">
          {copied ? "Copied" : "Copy style"}
        </button>
      </div>
      <HighlightedCode lang="ts" code={platformStyleSource(selected)} />
      <p className="gx-ps-note">
        The object <code>platformStyles.{selected}</code>, ready to paste into
        your own file. Every value is the library's — including the switch, its
        metrics and the dark syntax table where the platform declares one — and
        a key you delete inherits the base theme's value.
      </p>
    </div>
  );
}
