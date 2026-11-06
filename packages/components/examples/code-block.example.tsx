/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { CodeBlock } from "../src/code-block.js";

const snippet = `export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);`;

const log = [
  "bun install",
  "resolved 1 244 packages",
  "packages/components ready in 1.2s",
  "packages/tokens ready in 0.8s",
  "packages/motion ready in 0.4s",
  "packages/primitives ready in 1.9s",
  "packages/tw ready in 0.3s",
].join("\n");

export const CodeBlockExample = () => {
  const [mirror, setMirror] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CodeBlock code={snippet} path="src/clamp.ts" lineNumbers />
      <CodeBlock
        code={log}
        title="Build"
        language="bash"
        height={72}
        onCopy={setMirror}
      />
      <input
        testId="code-block-example-mirror"
        value={mirror}
        readOnly
        placeholder="A copied snippet lands here"
      />
    </div>
  );
};
