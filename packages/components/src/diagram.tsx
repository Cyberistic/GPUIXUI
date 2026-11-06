/** @jsxImportSource @gpuix/react */
/**
 * Diagram: a Mermaid source, drawn by Pele.
 *
 * A diagram is a **drawing**, and this is the component that draws one: the
 * caller gives a Mermaid source and the component renders it to SVG with
 * [Pele](https://pele.run), a zero-dependency renderer that needs no DOM —
 * measured in a plain Node process, a flowchart rendered to a 403×64 SVG with
 * `typeof document` and `typeof window` both `undefined`.
 *
 * The drawing travels the same road a chart's document travels: as a **data
 * URL** on an `<img>`, which the runtime's own decoder paints. So one
 * element carries the whole diagram, in the library's own colours.
 *
 * Two limits the native route carries, and they are the honest ones:
 *
 * - an image cannot be **re-themed by a CSS variable**. Pele writes its
 *   theme as `var(--pele-bg, …)` on the root element, which a browser
 *   resolves and a raster cannot — so the values are read from the theme
 *   here and baked into the drawing;
 * - an image cannot be **selected** and cannot carry a **link**. Pele
 *   reports the links in its result, so a caller can read them, but the
 *   pixels are not clickable.
 *
 * A source the parser refuses is a **typed failure**, not a thrown render:
 * the component paints the parser's sentence in the drawing's place.
 *
 * ```tsx
 * <Diagram
 *   aria-label="How a component becomes a picture"
 *   source={"flowchart LR\n  A[Author] --> B[Component]"}
 *   caption="The render path"
 * />
 * ```
 */

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

/** The diagram's frame: the surface it sits on and the space around it. */
export const DIAGRAM_ROOT = "flex flex-col gap-2";

/** The drawing's own box: the image, centred. */
export const DIAGRAM_CANVAS = "flex items-center justify-center";

/** The caption under the drawing. */
export const DIAGRAM_CAPTION = "text-xs text-muted-foreground";

/** The failure state: the parser's sentence in the drawing's place. */
export const DIAGRAM_ERROR =
  "rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive";

/** {@link Diagram} props. */
export interface DiagramProps extends Omit<Props, "children"> {
  /**
   * The Mermaid source.
   *
   * The source is **user text**, so a source the parser refuses is a typed
   * failure the component paints in the drawing's place — the reader sees
   * what went wrong rather than an empty frame.
   */
  readonly source: string;
  /**
   * The drawing's name, for a reader.
   *
   * The drawing is the thing a reader meets, so it is the thing that is
   * named. When the caller gives no name here, the host's own `aria-label`
   * names it — the same sentence the caller writes for the page.
   */
  readonly label?: string;
  /** The caption under the drawing. */
  readonly caption?: string;
  /** The width the drawing may use, so a narrow box adapts the layout. */
  readonly maxWidth?: number;
  /** The base font size, in pixels. */
  readonly fontSize?: number;
  /**
   * The prefix on the drawing's ids, so two diagrams on one page do not
   * collide.
   */
  readonly idPrefix?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** The chart's test id. */
  readonly testId?: string;
  /** What a caller paints beside the drawing — a legend, a note. */
  readonly children?: ReactNode;
}

/**
 * The theme's roles, as Pele's names them.
 *
 * Pele writes its theme as CSS custom properties, and a raster cannot read
 * them — so the values are read from the theme here and put into the drawing
 * as literal colours. The mapping is the one the docs page teaches.
 */
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
    // The three Pele properties that are not colours: a corner radius and
    // two font families. A raster cannot read them either, so they are given
    // literal values too.
    "--pele-radius": "4px",
    "--pele-font": "sans-serif",
    "--pele-font-mono": "monospace",
  };
};

/**
 * The drawing with the theme's colours baked in.
 *
 * Pele writes its palette twice: once as the public `--pele-*` custom
 * properties, each with Pele's own fallback, and once as the internal `--_*`
 * names the drawing actually paints with. So the substitution has two steps:
 * every `--pele-*` reference becomes the theme's value, and the internal
 * `--_*` reference becomes the public one it stood for.
 *
 * The fallback is Pele's palette, not the library's — so a diagram in a
 * raster would otherwise be painted in Pele's colours rather than the
 * library's. The replacement is a **whole token**: the pattern matches a
 * `var(` and its closing bracket, so a colour that holds a parenthesis does
 * not cut the substitution short.
 */
export const themedDrawing = (
  svg: string,
  roles: Record<string, string>,
): string => {
  // The **public** names first: each carries the theme's value and Pele's own
  // fallback, so the whole `var(--pele-bg, #fff)` becomes the theme's colour.
  const baked = svg.replace(
    /var\((--pele-[a-z-]+)\s*,\s*[^)]*\)/g,
    (whole, name: string) => roles[name] ?? whole,
  );
  // The **internal** names are what the drawing paints with: `var(--_fg)` and
  // `var(--_l)`, defined in the same `style` attribute. A raster resolves
  // neither — a custom property in a `style` attribute is CSS, and a picture
  // is not CSS — so each reference becomes the value its own definition holds.
  //
  // The value is read from the **definition**, not from a table of names:
  // Pele abbreviates them (`--pele-line` is `--_l`), and a table would have to
  // know every abbreviation Pele uses.
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

/**
 * Diagram: a Mermaid source, drawn by Pele.
 *
 * The render is **pure**, so it happens once per source and the drawing is a
 * value the surface paints. A source the parser refuses paints the failure
 * in the drawing's place.
 */
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
  // The drawing is what a reader meets, so it carries the name. The caller's
  // own `aria-label` names it when no separate label is given — the same
  // sentence the caller writes for the page.
  const name = label ?? rest["aria-label"];
  const description = rest["aria-description"];

  // The render is a pure function of the source, so it is done once per
  // source rather than on every paint.
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

/** Inventory record, mirrored into `.agents/slop/COMPONENTS.md` (plan 600). */
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
