/**
 * CodeEditor: a real `<textarea>` with a read-only highlight layer behind it.
 *
 * The runtime's `<textarea>` owns the caret, the selection, the IME and the
 * paste, so the editor never re-implements text input. It paints two layers in
 * one box: a highlight layer of `@tanstack/highlight` runs (tokenised text plus
 * a line-number gutter) and, on top, the transparent `<textarea>` — the reader
 * sees the highlighted code, the runtime reads the keystrokes.
 *
 * Two runtime gaps limit the overlay (both measured upstream, see
 * `docs/code-editor.mdx`): a `<textarea>` with transparent ink paints no caret,
 * and it reports no scroll offset. The editor therefore states the caret colour
 * through `nativeTextTheme` and keeps the two layers on one scroll surface, and
 * documents what that still cannot reach.
 *
 * Tab and Enter are editing decisions, not input re-implementation. In
 * `"insert"` mode Tab swallows the focus traversal and inserts the indent
 * string; Enter keeps the newline and appends the previous line's leading
 * indentation. Without a caret-position API the insert lands at the end of the
 * document, which is correct while typing sequentially and the strongest honest
 * alternative mid-document.
 */

import type { KeyEvent, StyleDesc } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { nativeTextTheme, syntaxColors, textStyle } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState } from "react";
import { useControllableState } from "../internal/controllable.js";
import { recipeStyle } from "../internal/recipe.js";
import { codeLines } from "./highlight.js";
import { enterIndent, tabInserts, type TabMode } from "./logic.js";

/** The editor's resting appearance: a field-edged surface with a gutter. */
const EDITOR_ROOT =
  "relative flex flex-row overflow-hidden rounded-lg border border-input bg-background";
/** The gutter column: right-aligned line numbers in the quiet role. */
const EDITOR_GUTTER =
  "flex flex-col items-end bg-muted text-muted-foreground select-none";
/** The code area: one row per line, the runs painted inside. */
const EDITOR_CODE = "relative flex flex-col flex-grow";

/** A monospace digit's advance as a share of the code type size. */
const MONO_DIGIT = 0.6;

/** What the editor tells a `style` callback. */
export interface CodeEditorState {
  readonly disabled: boolean;
  readonly focused: boolean;
}

/** {@link CodeEditor} props. */
export interface CodeEditorProps {
  /** The controlled text. Omit it to let the editor hold its own draft. */
  readonly value?: string;
  /** The initial text when uncontrolled. */
  readonly defaultValue?: string;
  /** Every edit, including Tab and Enter insertions. */
  readonly onValueChange?: (value: string) => void;
  /** The tokenizer's language id (`"tsx"`, `"rust"`). Unknown ids paint plain text. */
  readonly language?: string;
  /** Number every row in a gutter. Default `true`. */
  readonly lineNumbers?: boolean;
  /** What Tab does: insert indentation, or move focus. Default `"insert"`. */
  readonly tabMode?: TabMode;
  /** The string Tab inserts in `"insert"` mode. Default two spaces. */
  readonly indent?: string;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  /** Not editable, out of the tab order, painted with the disabled chrome. */
  readonly disabled?: boolean;
  /** Minimum visible rows. */
  readonly minRows?: number;
  /** Rows after which the editor scrolls. */
  readonly maxRows?: number;
  readonly fullWidth?: boolean;
  /** Accessible name. Default `"Code editor"`. */
  readonly label?: string;
  /** A Tailwind class string for the surface, joined after the recipe so it wins. */
  readonly className?: string;
  /** A style, or a function of the editor's state. */
  readonly style?: StateStyle<CodeEditorState>;
  readonly testId?: string;
}

/**
 * A highlighted, editable code surface.
 *
 * The highlight layer is presentational (`role="presentation"` runs); the
 * `<textarea>` is the named, focusable editor. The two share one scroll
 * surface, so a reader scrolls the code and its highlight together.
 */
export const CodeEditor = ({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  language,
  lineNumbers = true,
  tabMode = "insert",
  indent = "  ",
  placeholder,
  readOnly = false,
  disabled = false,
  minRows,
  maxRows,
  fullWidth = false,
  label = "Code editor",
  className,
  style,
  testId = "code-editor",
}: CodeEditorProps) => {
  const theme = useTheme();
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [focused, setFocused] = useState(false);

  const syntax = syntaxColors(theme);
  const metrics = textStyle(theme, "codeBlock");
  const lines = codeLines(value, language ?? "");
  const gutterWidth =
    Math.ceil(
      String(Math.max(1, lines.length)).length * metrics.fontSize * MONO_DIGIT,
    ) + theme.spacing.sm;
  const state: CodeEditorState = { disabled, focused };

  const onKeyDown = (event: KeyEvent): void => {
    if (event.key === "tab" && tabInserts(tabMode)) {
      event.preventDefault();
      setValue(value + indent);
      return;
    }
    if (event.key === "enter") {
      event.preventDefault();
      setValue(`${value}\n${enterIndent(value)}`);
    }
  };

  const fieldStyle: StyleDesc = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: "transparent",
    backgroundColor: "transparent",
    fontSize: metrics.fontSize,
    lineHeight: metrics.lineHeight,
    fontFamily: metrics.fontFamily,
    fontWeight: metrics.fontWeight,
  };

  return (
    <div
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(EDITOR_ROOT, className), theme), {
          width: fullWidth ? "100%" : undefined,
        }),
        resolveStyle(style, state),
      )}
    >
      {lineNumbers ? (
        <div
          style={mergeStyles(recipeStyle(EDITOR_GUTTER, theme), {
            width: gutterWidth,
            flexShrink: 0,
            paddingTop: theme.spacing.md,
          })}
        >
          {lines.map((_, index) => (
            <text
              key={index}
              role="presentation"
              style={{
                ...metrics,
                color: theme.colors.mutedForeground,
                textAlign: "right",
                paddingRight: theme.spacing.sm,
              }}
            >
              {String(index + 1)}
            </text>
          ))}
        </div>
      ) : null}
      <div style={recipeStyle(EDITOR_CODE, theme)}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "row",
                minHeight: metrics.lineHeight,
              }}
            >
              {line.map((run, runIndex) => (
                <text
                  key={runIndex}
                  role="presentation"
                  style={{
                    ...metrics,
                    color:
                      run.role === undefined
                        ? theme.colors.foreground
                        : syntax[run.role],
                    whiteSpace: "nowrap",
                  }}
                >
                  {run.text}
                </text>
              ))}
            </div>
          ))}
        </div>
        <textarea
          testId={testId}
          theme={nativeTextTheme(theme)}
          aria-label={label}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly || disabled}
          tabIndex={disabled ? -1 : 0}
          minRows={minRows}
          maxRows={maxRows}
          style={fieldStyle}
          onChange={(event) => setValue(event.value ?? "")}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` by the owning workstream. */
export const codeEditorMeta = {
  name: "Code editor",
  tier: 4,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a textarea with transparent ink paints no caret, and it reports no scroll offset (measured; gpuix-capabilities.md §Editable highlighted overlay), so the overlay is a highlight layer over a native field, not a positional editor",
    "Tab insert and Enter auto-indent append at the end of the document — the runtime exposes no caret position to insert at",
    "the two layers align by the codeBlock type scale and one scroll surface; pixel-exact alignment is not verified without a native host",
  ],
  docs: "docs/code-editor.mdx",
  example: "examples/code-editor.example.tsx",
  testFile: "src/code-editor/highlight.test.ts",
} as const;
