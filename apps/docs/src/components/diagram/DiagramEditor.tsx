import { type KeyboardEvent, useRef } from "react";

export interface DiagramEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  readonly placeholder?: string;
}

export function DiagramEditor({
  value,
  onChange,
  className,
  placeholder = "Enter a Mermaid diagram…",
}: DiagramEditorProps) {
  const gutter = useRef<HTMLDivElement | null>(null);
  const lines = value.split("\n").length;

  const key = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
    requestAnimationFrame(() => {
      target.selectionStart = start + 2;
      target.selectionEnd = start + 2;
    });
  };

  return (
    <div className={["gx-diagram-editor", className].filter(Boolean).join(" ")}>
      <div aria-hidden="true" className="gx-diagram-gutter" ref={gutter}>
        {Array.from({ length: lines }, (_, index) => (
          <span key={index + 1}>{index + 1}</span>
        ))}
      </div>
      <textarea
        aria-label="Mermaid source"
        className="gx-diagram-input"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={key}
        onScroll={(event) => {
          if (gutter.current !== null) {
            gutter.current.scrollTop = event.currentTarget.scrollTop;
          }
        }}
        placeholder={placeholder}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}
