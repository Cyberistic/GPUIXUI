/**
 * Browser preview for the Code block page.
 *
 * The native block paints a title bar, an optional line-number gutter and the
 * tokenized source; the preview draws the same chrome with a short snippet.
 */

const lines = [
  "export function deploy() {",
  "  const plan = await build();",
  "  return plan.apply();",
  "}",
];

export function CodeBlockDemo() {
  return (
    <div className="gx-codeblock">
      <div className="gx-codeblock-head">
        <span className="gx-codeblock-title">src/deploy.ts</span>
        <button className="gx-codeblock-copy" type="button">
          Copy
        </button>
      </div>
      <pre className="gx-codeblock-body">
        {lines.map((line, index) => (
          <span className="gx-codeblock-line" key={index}>
            <span aria-hidden="true" className="gx-codeblock-num">
              {index + 1}
            </span>
            <code className="gx-codeblock-code">{line}</code>
          </span>
        ))}
      </pre>
    </div>
  );
}

export const codeBlockDemoSource = `import { CodeBlock } from "@gpuixui/components/code-block";

<CodeBlock
  code={source}
  title="src/app.tsx"
  language="tsx"
  lineNumbers
/>;`;
