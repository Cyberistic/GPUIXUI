/**
 * Browser preview for the Splitting text page.
 *
 * The native headline arrives word by word with a staggered fade and rise; the
 * preview splits the same phrase and staggers each word's entrance, replayable.
 */

import { useState } from "react";

const words = ["Build", "native", "interfaces"];

export function SplittingTextDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className="gx-splitting">
      <p className="gx-splitting-line" key={run}>
        {words.map((word, index) => (
          <span
            aria-hidden="true"
            className="gx-splitting-word"
            key={index}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </p>
      <button
        className="gx-btn gx-btn-secondary gx-btn-sm"
        onClick={() => setRun((current) => current + 1)}
        type="button"
      >
        Replay
      </button>
    </div>
  );
}

export const splittingTextDemoSource = `import { SplittingText } from "@gpuixui/components/splitting-text";

<SplittingText text="Build native interfaces" role="h1" />;`;
