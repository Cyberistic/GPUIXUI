/**
 * Browser preview for the Highlight text page.
 *
 * The native phrase sweeps a marker wash across every match of a query; the
 * preview splits the phrase on the query and paints each match in the wash.
 */

import { useState } from "react";

const text = "Native by default, fast by design";

const parts = (
  value: string,
  query: string,
): ReadonlyArray<{ readonly text: string; readonly match: boolean }> => {
  const lower = value.toLowerCase();
  const target = query.toLowerCase();
  if (target === "") return [{ text: value, match: false }];

  const out: Array<{ readonly text: string; readonly match: boolean }> = [];
  let cursor = 0;
  for (;;) {
    const at = lower.indexOf(target, cursor);
    if (at === -1) {
      out.push({ text: value.slice(cursor), match: false });
      break;
    }
    if (at > cursor) out.push({ text: value.slice(cursor, at), match: false });
    out.push({ text: value.slice(at, at + target.length), match: true });
    cursor = at + target.length;
  }
  return out;
};

export function HighlightTextDemo() {
  const [query, setQuery] = useState("native");

  return (
    <div className="gx-highlight">
      <p className="gx-highlight-text">
        {parts(text, query).map((part, index) =>
          part.match ? (
            <mark className="gx-highlight-mark" key={index}>
              {part.text}
            </mark>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </p>
      <label className="gx-highlight-field">
        <span className="gx-highlight-label">Query</span>
        <input
          className="gx-highlight-input"
          onChange={(event) => setQuery(event.target.value)}
          value={query}
        />
      </label>
    </div>
  );
}

export const highlightTextDemoSource = `import { HighlightText } from "@gpuixui/components/highlight-text";

<HighlightText text="Native by default" query="native" />;`;
