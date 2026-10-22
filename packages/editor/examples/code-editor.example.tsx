/**
 * CodeEditor example: a controlled, highlighted editor over a small source.
 *
 * The editor is uncontrolled for its draft but the example holds the value so
 * the surrounding page can read it; the language id drives the tokenizer, the
 * gutter numbers the rows and Tab inserts indentation.
 */

import { useState } from "react";
import { CodeEditor } from "../src/code-editor/code-editor.js";

const source = `export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);`;

/** A highlighted editor over a TypeScript snippet. */
export const CodeEditorExample = () => {
  const [value, setValue] = useState(source);
  return (
    <CodeEditor
      value={value}
      onValueChange={setValue}
      language="ts"
      lineNumbers
      minRows={4}
      maxRows={8}
      fullWidth
    />
  );
};
