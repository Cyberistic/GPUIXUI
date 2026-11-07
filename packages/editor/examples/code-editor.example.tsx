/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { CodeEditor } from "../src/code-editor/code-editor.js";

const source = `export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);`;

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
