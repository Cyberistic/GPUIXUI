/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  fadeFrom,
  presenceMotion,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { nameOf } from "./internal/text.js";
import { syntaxColors, textStyle, useTheme } from "./internal/theme.js";
import { CopyButton } from "./copy-button.js";
import { codeLines } from "./code-block/tokenize.js";
import {
  codeBlockDescription,
  codeBlockHeader,
  codeBlockName,
  codeRowCount,
  hasCode,
} from "./code-block/logic.js";
import { surfaceLevelOf, type SurfaceLevel } from "./motion.js";

const CODE_BLOCK_ROOT =
  "flex flex-col overflow-hidden rounded-lg border border-input bg-background";

const CODE_BLOCK_HEADER =
  "flex flex-row items-center justify-between gap-2 px-3 py-1.5";

const CODE_BLOCK_LABEL = "text-xs font-mono text-muted-foreground";

const CODE_BLOCK_BODY = "px-3 py-2";

const CODE_BLOCK_EMPTY = "text-sm font-mono text-muted-foreground";

const CODE_BLOCK_RULE = "h-px bg-border";

const CODE_BLOCK_RISE = 4;

const MONO_DIGIT = 0.6;

export interface CodeBlockState {
  readonly hasCode: boolean;
  readonly reducedMotion: boolean;
}

export interface CodeBlockProps extends Omit<Props, "children" | "style"> {
  readonly code: string;

  readonly title?: string;

  readonly path?: string;

  readonly language?: string;

  readonly lineNumbers?: boolean;

  readonly height?: number;

  readonly level?: SurfaceLevel;

  readonly emptyLabel?: string;

  readonly copyLabel?: string;

  readonly copiedLabel?: string;

  readonly onCopy?: (code: string) => void;

  readonly className?: string;

  readonly style?: StateStyle<CodeBlockState>;
}

export const CodeBlock = ({
  code,
  title,
  path,
  language,
  lineNumbers = false,
  height,
  level: storedLevel = "normal",
  emptyLabel = "No code",
  copyLabel = "Copy",
  copiedLabel = "Copied",
  onCopy,
  className,
  style,
  testId,
  "aria-label": ariaLabel,
  ...rest
}: CodeBlockProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const header = codeBlockHeader({ title, path, language });
  const content = hasCode(code);
  const level = surfaceLevelOf(storedLevel);
  const timing = useSurfaceTiming(level === "none" ? "normal" : level);
  const presence = useSurfacePresence(true, timing);
  const base = testId ?? "code-block";

  const capped = Option.getOrUndefined(
    Option.filter(
      Option.fromNullishOr(height),
      (pixels) => Number.isFinite(pixels) && pixels > 0,
    ),
  );

  const state: CodeBlockState = {
    hasCode: content,
    reducedMotion: preference === "reduced",
  };
  const spansHeader =
    Option.isSome(header.title) ||
    Option.isSome(header.language) ||
    onCopy !== undefined;

  const syntax = syntaxColors(theme);
  const metrics = textStyle(theme, "codeBlock");
  const lines = codeLines(
    code,
    Option.getOrElse(header.language, () => ""),
  );
  const gutterWidth =
    Math.ceil(
      String(Math.max(1, lines.length)).length * metrics.fontSize * MONO_DIGIT,
    ) + theme.spacing.sm;

  return (
    <div
      {...rest}
      role="group"
      aria-label={nameOf(ariaLabel) ?? codeBlockName(header)}
      aria-description={codeBlockDescription(
        codeRowCount(code),
        header.language,
      )}
      testId={base}
      motion={
        level === "none"
          ? undefined
          : presenceMotion(fadeFrom("top", CODE_BLOCK_RISE), presence)
      }
      style={mergeStyles(
        mergeStyles(
          { position: "relative" },
          recipeStyle(cn(CODE_BLOCK_ROOT, className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      {spansHeader ? (
        <>
          <div style={recipeStyle(CODE_BLOCK_HEADER, theme)}>
            {Option.match(header.title, {
              onNone: () => <div />,
              onSome: (name) => (
                <text
                  testId={`${base}-title`}
                  style={recipeStyle(CODE_BLOCK_LABEL, theme)}
                >
                  {name}
                </text>
              ),
            })}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
              }}
            >
              {Option.match(header.language, {
                onNone: () => null,
                onSome: (name) => (
                  <text
                    testId={`${base}-language`}
                    style={recipeStyle(CODE_BLOCK_LABEL, theme)}
                  >
                    {name}
                  </text>
                ),
              })}
              {onCopy === undefined ? null : (
                <CopyButton
                  testId={`${base}-copy`}
                  size="sm"
                  text={code}
                  onCopy={onCopy}
                  label={copyLabel}
                  copiedLabel={copiedLabel}
                  level={level === "none" ? "none" : "fast"}
                  color={theme.colors.mutedForeground}
                />
              )}
            </div>
          </div>
          <div style={recipeStyle(CODE_BLOCK_RULE, theme)} />
        </>
      ) : null}
      <div style={recipeStyle(CODE_BLOCK_BODY, theme)}>
        {content ? (
          <div
            style={mergeStyles(
              { overflowX: "auto" },
              capped === undefined
                ? undefined
                : { height: capped, overflowY: "scroll" },
            )}
          >
            <div
              testId={`${base}-source`}
              style={{ display: "flex", flexDirection: "column" }}
            >
              {lines.map((line, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    minHeight: metrics.lineHeight,
                  }}
                >
                  {lineNumbers ? (
                    <div
                      style={{
                        width: gutterWidth,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        paddingRight: theme.spacing.sm,
                      }}
                    >
                      <text
                        role="presentation"
                        style={{ ...metrics, color: theme.colors.placeholder }}
                      >
                        {String(index + 1)}
                      </text>
                    </div>
                  ) : null}
                  <div style={{ display: "flex", flexDirection: "row" }}>
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
                </div>
              ))}
            </div>
          </div>
        ) : (
          <text
            testId={`${base}-empty`}
            style={recipeStyle(CODE_BLOCK_EMPTY, theme)}
          >
            {emptyLabel}
          </text>
        )}
      </div>
    </div>
  );
};

export const codeBlockMeta = {
  name: "Code block",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the code text is painted as presentational runs, so a reader gets the block's name and line count, not the code",
    "the tokenizer is `@tanstack/highlight`, whose grammar decides which run is a token; the token package's `syntaxColors(theme)` decides the colour — a brand owns the palette by carrying `syntax`, which replaces the table whole",
    "a language the tokenizer does not ship (`@tanstack/highlight` has no `c` grammar, for example) paints plain text, and the gutter width is the block's own estimate, not the runtime's metrics",
    "no per-line highlight, wrap toggle or diff markers — a diff goes to the runtime's `<diff>` host",
    "no clipboard write exists in 0.11.0, so the copy action calls the caller's `onCopy` and acknowledges the press, not a finished write",
    "a capped block scrolls by wheel and scrollbar only; it is not a keyboard scroll region",
  ],
  docs: "docs/code-block.mdx",
  example: "examples/code-block.example.tsx",
  testFile: "src/behaviour/code-block.test.tsx",
} as const;
