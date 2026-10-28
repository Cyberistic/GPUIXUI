import { useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import { tokenize, type Token } from "./code-editor-preview";

/**
 * Browser preview for the Code editor page.
 *
 * The native surface is the runtime's textarea with a token layer painted under
 * it. The preview draws the same two layers in the platform theme's variables
 * and runs the component's documented keyboard rule — Tab inserts `indent` at
 * the **end** because 0.11.0 exposes no caret position — so a reader can type in
 * it. The tokenizer is the preview's own (`code-editor-preview.ts`); the Code
 * tab shows the shipped component and its highlighter.
 */

export const CODE_SAMPLE = `import { useState } from "react";

export const Counter = () => {
  const [count, setCount] = useState(0); // the caller owns it
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};`;

const linesOf = (value: string): ReadonlyArray<string> => value.split("\n");

const Line = ({ tokens }: { readonly tokens: ReadonlyArray<Token> }) => (
  <>
    {tokens.map((token, index) => (
      <span className={`gx-tok-${token.kind}`} key={index}>
        {token.text}
      </span>
    ))}
  </>
);

export const CodeEditorDemo = () => {
  const [value, setValue] = useState(CODE_SAMPLE);
  const [readOnly, setReadOnly] = useState(false);
  const view = useRef<HTMLPreElement | null>(null);
  const gutter = useRef<HTMLDivElement | null>(null);

  const sync = (event: UIEvent<HTMLTextAreaElement>): void => {
    if (view.current !== null) {
      view.current.scrollTop = event.currentTarget.scrollTop;
      view.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    if (gutter.current !== null) {
      gutter.current.scrollTop = event.currentTarget.scrollTop;
    }
  };

  const key = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Tab" || readOnly) return;
    event.preventDefault();
    setValue((current) => `${current}  `);
  };

  return (
    <div className="gx-codeedit">
      <div
        className="gx-codeedit-frame"
        data-readonly={readOnly ? "" : undefined}
      >
        <div aria-hidden="true" className="gx-codeedit-gutter" ref={gutter}>
          {linesOf(value).map((_line, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>
        <div className="gx-codeedit-body">
          <pre aria-hidden="true" className="gx-codeedit-view" ref={view}>
            {linesOf(value).map((line, index) => (
              <span className="gx-codeedit-line" key={index}>
                <Line tokens={tokenize(line)} />
                {"\n"}
              </span>
            ))}
          </pre>
          <textarea
            aria-label="Code editor"
            className="gx-codeedit-input"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={key}
            onScroll={sync}
            readOnly={readOnly}
            spellCheck={false}
            value={value}
          />
        </div>
      </div>
      <div className="gx-codeedit-foot">
        <span className="gx-codeedit-meta">
          {`${linesOf(value).length} lines · tsx`}
        </span>
        <button
          aria-pressed={readOnly}
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={() => setReadOnly((current) => !current)}
          type="button"
        >
          {readOnly ? "Edit" : "Read only"}
        </button>
      </div>
    </div>
  );
};

export const codeEditorDemoSource = `import { CodeEditor } from "@gpuixui/editor";

<CodeEditor
  value={value}
  onValueChange={setValue}
  language="tsx"
  lineNumbers
/>;`;
