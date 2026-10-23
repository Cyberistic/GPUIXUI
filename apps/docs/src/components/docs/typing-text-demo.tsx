/**
 * Browser preview for the Typing text page.
 *
 * The native control reveals a string a character at a time with the whole
 * string as its name; the preview ticks the same cursor forward on a timer.
 */

import { useEffect, useState } from "react";

const text = "Deploying to production…";

export function TypingTextDemo() {
  const [length, setLength] = useState(0);

  useEffect(() => {
    const handle = setInterval(() => {
      setLength((current) => {
        if (current >= text.length) {
          clearInterval(handle);
          return current;
        }
        return current + 1;
      });
    }, 55);
    return () => clearInterval(handle);
  }, []);

  return (
    <div className="gx-typing">
      <p className="gx-typing-value" aria-label={text}>
        {text.slice(0, length)}
        <span aria-hidden="true" className="gx-typing-caret" />
      </p>
    </div>
  );
}

export const typingTextDemoSource = `import { TypingText } from "@gpuixui/components/typing-text";

<TypingText text="Deploying to production…" speed={35} caret />;`;
