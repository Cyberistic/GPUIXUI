/**
 * MarkdownEditor example: one controlled document, three views.
 *
 * The value is the example's own state, so a keystroke in the source reaches
 * the preview in the same frame and the status line counts it.
 */

import { useState } from "react";
import { MarkdownEditor } from "../src/markdown/markdown-editor.js";

const FIRST = `# Release notes

The editor writes **markdown** and the runtime renders the preview.

- source on the left
- rendered document on the right

\`\`\`ts
const answer = 42;
\`\`\`
`;

export const MarkdownEditorExample = () => {
  const [value, setValue] = useState(FIRST);
  return (
    <MarkdownEditor
      value={value}
      onValueChange={setValue}
      label="Release notes"
      width={640}
      height={300}
      placeholder="Write markdown here"
    />
  );
};
