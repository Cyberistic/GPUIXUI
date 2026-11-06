/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { themeColors } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useMemo, type ReactNode } from "react";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";
import { diagramDataUrl, renderDiagram } from "./diagram/logic.js";

export const DIAGRAM_ROOT = "flex flex-col gap-2";

export const DIAGRAM_CANVAS = "flex items-center justify-center";

export const DIAGRAM_CAPTION = "text-xs text-muted-foreground";

export const DIAGRAM_ERROR =
  "rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive";

export interface DiagramProps extends Omit<Props, "children"> {
  readonly source: string;

  readonly label?: string;

  readonly caption?: string;

  readonly maxWidth?: number;

  readonly fontSize?: number;

  readonly idPrefix?: string;

  readonly className?: string;

  readonly testId?: string;

  readonly children?: ReactNode;
}

export const peleRoles = (
  theme: ReturnType<typeof useTheme>,
): Record<string, string> => {
  const colors = themeColors(theme);
  return {
    "--pele-bg": colors.card ?? colors.background ?? "#ffffff",
    "--pele-fg": colors.foreground ?? "#000000",
    "--pele-muted": colors.mutedForeground ?? "#666666",
    "--pele-line": colors.borderStrong ?? colors.border ?? "#000000",
    "--pele-surface": colors.muted ?? "#f3f3f3",
    "--pele-surface-alt": colors.accent ?? "#e6e6e6",
    "--pele-accent": colors.primary ?? colors.accent ?? "#3b82f6",
    "--pele-border": colors.border ?? "#cccccc",

    "--pele-radius": "4px",
    "--pele-font": "sans-serif",
    "--pele-font-mono": "monospace",
  };
};

export const themedDrawing = (
  svg: string,
  roles: Record<string, string>,
): string => {
  const baked = svg.replace(
    /var\((--pele-[a-z-]+)\s*,\s*[^)]*\)/g,
    (whole, name: string) => roles[name] ?? whole,
  );

  const defined = new Map(
    Arr.map(
      [...baked.matchAll(/(--_[a-z-]+):([^;"]+)/g)],
      (match) => [match[1] ?? "", (match[2] ?? "").trim()] as const,
    ),
  );
  return baked.replace(/var\((--_[a-z-]+)\)/g, (whole, name: string) => {
    const value = defined.get(name);
    return value === undefined || value === "" ? whole : value;
  });
};

export const Diagram = ({
  source,
  label,
  caption,
  maxWidth,
  fontSize,
  idPrefix,
  className,
  testId,
  children,
  style,
  ...rest
}: DiagramProps) => {
  const theme = useTheme();
  const roles = peleRoles(theme);

  const name = label ?? rest["aria-label"];
  const description = rest["aria-description"];

  const rendered = useMemo(
    () => renderDiagram(source, { idPrefix, fontSize, maxWidth }),
    [source, idPrefix, fontSize, maxWidth],
  );

  const drawing = rendered.drawing;
  const failure = Option.getOrUndefined(rendered.failure);

  return (
    <div
      {...rest}
      testId={testId}
      style={mergeStyles(
        recipeStyle(cn(DIAGRAM_ROOT, className), theme),
        style,
      )}
    >
      <div style={recipeStyle(DIAGRAM_CANVAS, theme)}>
        {Option.match(drawing, {
          onNone: () => (
            <div
              role="status"
              testId={testId === undefined ? undefined : `${testId}-error`}
              style={recipeStyle(DIAGRAM_ERROR, theme)}
            >
              <text>
                {failure?.message ?? "The diagram could not be read."}
              </text>
            </div>
          ),
          onSome: (made) => (
            <img
              role="img"
              aria-label={name}
              aria-description={description}
              testId={testId === undefined ? undefined : `${testId}-drawing`}
              src={diagramDataUrl(themedDrawing(made.svg, roles))}
              style={{
                width: made.width,
                height: made.height,
                maxWidth: "100%",
              }}
            />
          ),
        })}
      </div>
      {caption === undefined ? undefined : (
        <text style={recipeStyle(DIAGRAM_CAPTION, theme)}>{caption}</text>
      )}
      {children}
    </div>
  );
};

export const diagramMeta = {
  name: "Diagram",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the drawing is painted as **one image** — the runtime's own SVG decoder paints the whole document — so a mark inside it is not an accessibility element and cannot be selected",
    "an image cannot carry a **link**: Pele reports the links in its result, so a caller can read them, but the pixels are not clickable",
    "Pele writes its theme as CSS custom properties, which a raster cannot read, so the values are read from the theme and **baked into** the drawing — a theme switch re-renders the diagram",
    "the drawing's font is Pele's `sans-serif` and `monospace`, not the theme's family, because a raster carries no font of its own",
    "a source the parser refuses paints the parser's sentence in the drawing's place; there is no partial render",
  ],
  docs: "docs/diagram.mdx",
  example: "examples/diagram.example.tsx",
  testFile: "src/behaviour/diagram.test.tsx",
} as const;
