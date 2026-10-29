/**
 * The class reference on `/styling`, resolved by the compiler itself.
 *
 * `@gpuixui/tw` decides what a class paints; a table copied from its source
 * goes stale the moment a utility moves, and `/styling` showed ten
 * representative classes with no way to find the other eighty. Every row here
 * is compiled through `classesToStyle` and `unsupportedReason` against the theme
 * the platform switch resolved, so a reader sees the number this release paints
 * — a control's height on macOS, the radius a Linux surface takes — and the
 * docs suite holds the list to the compiler's own vocabulary in both
 * directions.
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { StyleDesc } from "@gpuix/react";
import type { Theme } from "@gpuixui/tokens";
import { classesToStyle, unsupportedReason } from "@gpuixui/tw";

/** A family of classes a recipe may write, with the rule that governs it. */
export interface ClassGroup {
  readonly name: string;
  readonly note: string;
  readonly classes: ReadonlyArray<string>;
}

/**
 * Every class the default registry resolves, grouped the way a recipe is read.
 *
 * The suite parses `utilities.ts` for the literals and families it accepts, so
 * a utility landing there without a row here fails the docs until it is taught.
 */
export const classGroups: ReadonlyArray<ClassGroup> = [
  {
    name: "Flow and alignment",
    note: "The box a row or a column is built from, and where its children sit. `flex-1` grows and shrinks from a zero basis; `min-w-0` lets a flex child shrink below its text.",
    classes: [
      "flex",
      "inline-flex",
      "grid",
      "flex-row",
      "flex-col",
      "flex-col-reverse",
      "flex-wrap",
      "flex-1",
      "flex-grow",
      "shrink-0",
      "items-start",
      "items-center",
      "items-end",
      "items-stretch",
      "justify-start",
      "justify-center",
      "justify-between",
      "justify-end",
      "self-start",
      "self-stretch",
      "min-w-0",
      "max-w-full",
      "overflow-hidden",
    ],
  },
  {
    name: "Size",
    note: "`h-8`, `h-9`, `h-10` and `size-9` read the theme's control heights, so the platform switch resizes a control instead of pinning Tailwind's 32/36/40. Every other length is a spacing step (`4` is 16) or an `[Npx]` value.",
    classes: [
      "h-8",
      "h-9",
      "h-10",
      "h-full",
      "h-px",
      "w-full",
      "w-auto",
      "w-px",
      "w-4",
      "min-h-6",
      "min-w-6",
      "max-w-sm",
      "size-4",
      "size-9",
    ],
  },
  {
    name: "Spacing",
    note: "One step is four pixels. `p-*` sets all four sides, `px-*`/`py-*` a pair, and `pl-*`/`pr-*`/`pt-*`/`pb-*` one side; margins and gaps follow the same scale.",
    classes: [
      "p-3",
      "px-3",
      "py-1",
      "pl-2",
      "pr-2",
      "pt-1",
      "pb-1",
      "mx-2",
      "my-4",
      "mt-1",
      "mb-2",
      "ml-1",
      "mr-1",
      "gap-2",
      "gap-x-3",
      "gap-y-1",
    ],
  },
  {
    name: "Position",
    note: "`fixed` compiles to `absolute`: GPUix paints an absolutely positioned element inside its parent, and has no viewport-fixed position. Percentages are refused (see below) because a native inset is a number.",
    classes: [
      "relative",
      "absolute",
      "fixed",
      "inset-0",
      "inset-x-2",
      "inset-y-2",
      "top-2",
      "right-2",
      "bottom-2",
      "left-2",
    ],
  },
  {
    name: "Grid",
    note: "GPUix's grid takes an integer track count, not a template; `grid-cols-3` is three equal tracks. Spans and named areas have no `StyleDesc` value and are refused by name below.",
    classes: ["grid-cols-3", "grid-rows-2"],
  },
  {
    name: "Surface, corner and edge",
    note: "A colour name is a semantic role, and a `/N` suffix is that role at N% alpha. `border-input` is shadcn's hairline role (the token `input` is the field's fill). `ring-*` draws the runtime's one ring shape: a zero-blur shadow with no offset.",
    classes: [
      "bg-card",
      "bg-primary/90",
      "bg-transparent",
      "text-foreground",
      "text-muted-foreground",
      "border",
      "border-2",
      "border-input",
      "border-strong",
      "border-t",
      "rounded",
      "rounded-lg",
      "rounded-full",
      "shadow-md",
      "shadow-xl",
      "ring-1",
    ],
  },
  {
    name: "Type",
    note: "`text-*` is a size or a colour role: a size carries its own leading, and a role name paints the role. A face comes from the theme's two families, so `font-sans` follows the platform style.",
    classes: [
      "text-xs",
      "text-sm",
      "text-base",
      "text-lg",
      "text-xl",
      "text-2xl",
      "text-3xl",
      "font-sans",
      "font-mono",
      "font-medium",
      "leading-none",
      "text-left",
      "text-center",
      "text-right",
      "underline",
      "whitespace-nowrap",
      "text-ellipsis",
    ],
  },
  {
    name: "Pointer and selection",
    note: "A class that opts an element out of the pointer, or marks the cursor it asks for. `select-none` is inherited, like the CSS property.",
    classes: [
      "opacity-50",
      "pointer-events-none",
      "pointer-events-auto",
      "cursor-pointer",
      "cursor-not-allowed",
      "select-none",
    ],
  },
  {
    name: "State variants",
    note: "A state prefix compiles to the record the GPUix host applies: `hover`/`active` nest inside the style, and `focus`, `invalid`, `disabled`, `open` and `closed` are separate styles a component turns on.",
    classes: [
      "hover:bg-accent",
      "active:bg-primary/80",
      "focus-visible:ring-2",
      "disabled:opacity-50",
      "aria-invalid:border-destructive",
      "data-open:bg-card",
    ],
  },
  {
    name: "A class that paints nothing",
    note: "These resolve, and paint no property: `outline-*` clears a CSS outline the native style never draws, and `dark:` compiles to nothing because the theme already resolved light and dark at render time.",
    classes: ["outline-none", "outline-hidden", "dark:bg-card"],
  },
];

/**
 * Classes the runtime cannot carry. The compiler spells each one in
 * `TwResult.unsupported`; the reason printed beside it is
 * `unsupportedReason`'s own sentence, never a docs rewrite.
 */
export const refusedClasses: ReadonlyArray<string> = [
  "w-[calc(100%)]",
  "top-1/2",
  "rotate-45",
  "col-span-2",
  "resize-none",
  "z-50",
  "sr-only",
  "[--gap:0.75rem]",
  "placeholder:text-muted-foreground",
  "[&_svg]:pointer-events-none",
  "transition-opacity",
];

/** What one class compiled to, or why the compiler refused it. */
export type ResolvedClass =
  | {
      readonly _tag: "Painted";
      /** The properties it paints, in declaration order. */
      readonly paints: ReadonlyArray<string>;
    }
  | { readonly _tag: "Refused"; readonly reason: string };

/** A shadow, a nested state record, or a scalar as a reader reads it. */
const printable = (key: string, value: unknown): Option.Option<string> =>
  typeof value === "string" || typeof value === "number"
    ? Option.some(String(value))
    : key === "boxShadow"
      ? Option.some(
          Array.isArray(value)
            ? `${value.length} native shadows`
            : "one native shadow",
        )
      : Option.none();

/** Flattens a style to `property: value` lines, with nested states prefixed. */
const properties = (
  prefix: string,
  entries: ReadonlyArray<readonly [string, unknown]>,
): ReadonlyArray<string> =>
  entries.flatMap(([key, value]) => {
    if (key === "hover" || key === "active") {
      return typeof value === "object" && value !== null
        ? properties(`${prefix}${key}.`, Object.entries(value))
        : [];
    }
    return Arr.fromOption(
      pipe(
        printable(key, value),
        Option.map((printed) => `${prefix}${key}: ${printed}`),
      ),
    );
  });

/** The lines one compiled style prints. */
export const formatStyle = (style: StyleDesc): ReadonlyArray<string> =>
  properties("", Object.entries(style));

/** The lines a component's state bucket prints, under the bucket's name. */
const bucket = (name: string, style: StyleDesc): ReadonlyArray<string> =>
  properties(`${name}.`, Object.entries(style));

/** Compiles one class against the theme the platform switch resolved. */
export const resolveClass = (
  theme: Theme,
  className: string,
): ResolvedClass => {
  const result = classesToStyle(className, theme);
  const refused = unsupportedReason(className) ?? result.unsupported[0];
  if (refused !== undefined) return { _tag: "Refused", reason: refused };

  return {
    _tag: "Painted",
    paints: [
      ...formatStyle(result.style),
      ...bucket("focus", result.focus),
      ...bucket("invalid", result.invalid),
      ...bucket("disabled", result.disabled),
      ...bucket("open", result.open),
      ...bucket("closed", result.closed),
    ],
  };
};
