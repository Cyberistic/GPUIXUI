/** @jsxImportSource @gpuix/react */
import type { KeyEvent, StyleDesc } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  fieldHelp,
  fieldHint,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import { cn } from "@gpuixui/tw";
import {
  disabledOpacity,
  nativeTextTheme,
  syntaxColors,
  textStyle,
} from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { useControllableState } from "../internal/controllable.js";
import { recipeStyle } from "../internal/recipe.js";
import { draftOf, labelOf } from "../internal/text.js";
import { codeLines, type HighlightRun } from "./highlight.js";
import {
  enterIndent,
  tabIndent,
  tabInserts,
  tabModeOf,
  visibleRows,
  type TabMode,
} from "./logic.js";

const EDITOR_ROOT =
  "relative flex flex-row overflow-hidden rounded-lg border border-input bg-background";

const EDITOR_GUTTER =
  "flex flex-col items-end bg-muted text-muted-foreground select-none";

const EDITOR_CODE = "relative flex flex-col flex-grow";

const MONO_DIGIT = 0.6;

export interface CodeEditorState {
  readonly disabled: boolean;
  readonly focused: boolean;
}

export interface CodeEditorProps {
  readonly value?: string;

  readonly defaultValue?: string;

  readonly onValueChange?: (value: string) => void;

  readonly language?: string;

  readonly lineNumbers?: boolean;

  readonly tabMode?: TabMode;

  readonly indent?: string;
  readonly placeholder?: string;
  readonly readOnly?: boolean;

  readonly disabled?: boolean;

  readonly minRows?: number;

  readonly maxRows?: number;
  readonly fullWidth?: boolean;

  readonly label?: string;

  readonly className?: string;

  readonly style?: StateStyle<CodeEditorState>;
  readonly testId?: string;
}

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
  label,
  className,
  style,
  testId = "code-editor",
}: CodeEditorProps) => {
  const theme = useTheme();

  const name = labelOf(label, "Code editor");
  const [value, setValue] = useControllableState({
    value: valueProp === undefined ? undefined : draftOf(valueProp),
    defaultValue: draftOf(defaultValue),
    onChange: onValueChange,
  });
  const [focused, setFocused] = useState(false);

  const mode = tabModeOf(tabMode);

  const syntax = syntaxColors(theme);
  const metrics = textStyle(theme, "codeBlock");
  const lines = codeLines(value, language);

  const body = visibleRows(Arr.length(lines), minRows) - Arr.length(lines);
  const rows = Arr.appendAll(
    lines,
    Arr.take(Arr.replicate(Arr.empty<HighlightRun>(), body), body),
  );
  const gutterWidth =
    Math.ceil(
      String(Math.max(1, Arr.length(rows))).length *
        metrics.fontSize *
        MONO_DIGIT,
    ) + theme.spacing.sm;
  const state: CodeEditorState = { disabled, focused };

  const edit = (next: string): void => {
    if (!readOnly && !disabled) setValue(next);
  };

  const onChange = (next: string): void =>
    edit(next === `${value}\n` ? `${next}${enterIndent(value)}` : next);

  const onKeyDown = (event: KeyEvent): void => {
    if (readOnly || disabled) return;
    const indentText = tabIndent(indent);
    if (event.key === "tab" && tabInserts(mode, indentText)) {
      event.preventDefault();
      setValue(value + indentText);
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

  const hint = fieldHint({ placeholder, disabled }, theme, value, {
    origin: "host",
    align: "top",
    style: fieldStyle,
  });
  const help = fieldHelp({ placeholder }, value);

  return (
    <div
      testId={`${testId}-surface`}
      style={mergeStyles(
        mergeStyles(
          mergeStyles(recipeStyle(cn(EDITOR_ROOT, className), theme), {
            width: fullWidth ? "100%" : undefined,
          }),
          disabled ? { opacity: disabledOpacity } : {},
        ),
        resolveStyle(style, state),
      )}
    >
      {lineNumbers ? (
        <div
          style={mergeStyles(recipeStyle(EDITOR_GUTTER, theme), {
            width: gutterWidth,
            flexShrink: 0,
          })}
        >
          {rows.map((_, index) => (
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
          {rows.map((line, index) => (
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
          theme={nativeTextTheme(theme, "background")}
          aria-label={name}
          {...(help === undefined ? {} : { "aria-description": help })}
          value={value}
          readOnly={readOnly || disabled}
          tabIndex={disabled ? -1 : 0}
          minRows={minRows}
          maxRows={maxRows}
          style={fieldStyle}
          onChange={(event) => onChange(event.value ?? "")}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {Option.match(hint, {
          onNone: () => null,
          onSome: (painted) => renderFieldHint(painted, testId),
        })}
      </div>
    </div>
  );
};

export const codeEditorMeta = {
  name: "Code editor",
  tier: 4,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a textarea with transparent ink paints no caret, and it reports no scroll offset (measured; gpuix-capabilities.md §Editable highlighted overlay), so the overlay is a highlight layer over a native field, not a positional editor",
    "Tab insert and Enter auto-indent append at the end of the document — the runtime exposes no caret position to insert at",
    "the two layers align by the codeBlock type scale in one box sized by the highlight layer; pixel-exact alignment is not verified without a native host",
    "maxRows cannot cap the editor's height: the layer cannot follow the field's internal scroll, because the runtime reports no scroll offset",
  ],
  docs: "docs/code-editor.mdx",
  example: "examples/code-editor.example.tsx",
  testFile: "src/code-editor/highlight.test.ts",
} as const;
