/**
 * Text selection, match highlighting and the find controller (plan 627).
 *
 * GPUix selects text natively, paints match washes and ships a framework-neutral
 * search controller. None of it had a page: `getSelectedText`,
 * `onSelectionChange`, `observeSelectedText`, `useTextSearch` and `findRanges`
 * reached nothing or the roadmap (measured 2026-10-20). This module holds the
 * authored rows; `selection.test.ts` compares them with the installed
 * `@gpuix/native` declarations in both directions, so a field or method the
 * runtime adds fails until it is explained.
 *
 * Browser-safe: declaration text is passed in, never read from disk.
 */
import { interfaceFieldsIn } from "./native-elements";
import { rendererMethodNames } from "./window-surface";

export interface SelectionField {
  readonly name: string;
  readonly summary: string;
}

export interface SelectionMethod {
  readonly name: string;
  readonly summary: string;
}

export interface SelectionAbsence {
  readonly subject: string;
  readonly statement: string;
  /** A symbol that would make the absence false if the runtime gained it. */
  readonly symbol?: RegExp;
}

/** `HighlightSpec`, in declaration order. */
export const highlightFields: ReadonlyArray<SelectionField> = [
  {
    name: "query",
    summary:
      "The substring to match. Case-insensitive unless `caseSensitive` is set. A match never crosses a line, but does cross the nodes one interpolated line is built from.",
  },
  {
    name: "caseSensitive",
    summary: "Match the exact case.",
  },
  {
    name: "wholeWord",
    summary: "Only match when neither neighbour is alphanumeric or `_`.",
  },
  {
    name: "ranges",
    summary:
      "Explicit `[start, end)` UTF-16 pairs into the declaring subtree's text. Use this when you already know where the matches are; `query` for everything else.",
  },
  {
    name: "color",
    summary:
      "The wash colour. Defaults to the theme accent at 30 % alpha; any CSS colour is accepted.",
  },
  {
    name: "activeColor",
    summary:
      "The colour for the match at `activeIndex`. Defaults to the accent at 65 %.",
  },
  {
    name: "activeIndex",
    summary:
      "Which match a find-bar cursor is on. A negative or fractional value is ignored.",
  },
  {
    name: "matchIndexOffset",
    summary:
      "How many matches come before this subtree, so `activeIndex` can be a global position. Only needed inside a virtual list.",
  },
  {
    name: "radius",
    summary: "The wash's corner radius in pixels. Defaults to 2.",
  },
];

/** `TextSearchOptions`, in declaration order. */
export const textSearchFields: ReadonlyArray<SelectionField> = [
  {
    name: "query",
    summary: "The text to find. An empty query clears the washes.",
  },
  { name: "caseSensitive", summary: "Match the exact case." },
  {
    name: "wholeWord",
    summary: "Only match when neither neighbour is alphanumeric or `_`.",
  },
  { name: "color", summary: "The wash colour for every match." },
  {
    name: "activeColor",
    summary: "The wash colour for the active match.",
  },
  { name: "radius", summary: "The wash's corner radius in pixels." },
  {
    name: "matches",
    summary:
      "`{ total, indexOffset }` for content whose matches the controller cannot count itself — a virtual list counts its mounted window only.",
  },
];

/** `FindRangesOptions`, in declaration order. */
export const findRangeFields: ReadonlyArray<SelectionField> = [
  {
    name: "text",
    summary: "The text to search, exactly as the subtree would render it.",
  },
  { name: "query", summary: "The substring to find." },
  { name: "caseSensitive", summary: "Match the exact case." },
  {
    name: "wholeWord",
    summary: "Only match when neither neighbour is alphanumeric or `_`.",
  },
];

/** The `GpuixRenderer` methods that read or clear the selection. */
export const selectionMethods: ReadonlyArray<SelectionMethod> = [
  {
    name: "getSelectedText",
    summary:
      "The current selection joined in document order, or `null` when nothing is selected.",
  },
  {
    name: "clearSelection",
    summary: "Drop the selection and request a repaint.",
  },
  {
    name: "getPaintedHighlights",
    summary:
      "Every wash painted in the last frame, with its text, offsets and one box per visual row — the geometry a screenshot cannot report.",
  },
  {
    name: "setWindowSelectionChange",
    summary:
      "Turn the window selection event on or off. `render({ onSelectionChange })` calls it for you.",
  },
];

/** What the runtime does not provide. */
export const selectionAbsences: ReadonlyArray<SelectionAbsence> = [
  {
    subject: "Clipboard read or write",
    statement:
      "No clipboard method is declared. Copy and paste belong to the host application or the operating system; the library cannot read or write the clipboard.",
    symbol: /clipboard|writeText|readText/iu,
  },
  {
    subject: "DOM selection API",
    statement:
      "There is no `window.getSelection`, no `Range` and no `execCommand`. The selection is the operating system's own text selection, and `getSelectedText` is the only read.",
    symbol: /getSelection|createRange|execCommand/iu,
  },
  {
    subject: "Replace",
    statement:
      "The find controller highlights and moves the cursor; it does not replace. A replace action edits the application's own value and lets the render pass again.",
  },
  {
    subject: "Accessibility annotation for a wash",
    statement:
      "A highlight is a paint, not part of the accessibility tree. Screen-reader users need the match count as text (`onHighlight`'s `matchCount`), not the colour.",
    symbol: /aria-[a-z-]*highlight|axHighlight/iu,
  },
];

const differences = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): ReadonlyArray<string> => left.filter((name) => !right.includes(name));

/** The renderer's selection methods, derived from the class declaration. */
export const selectionRendererMethods = (
  declarations: string,
): ReadonlyArray<string> =>
  rendererMethodNames(declarations).filter((name) =>
    /SelectedText|Selection|PaintedHighlights/u.test(name),
  );

const interfaceViolations = (input: {
  readonly declarations: string;
  readonly interfaceName: string;
  readonly rows: ReadonlyArray<SelectionField>;
}): ReadonlyArray<string> => {
  const installed = interfaceFieldsIn(input.declarations, input.interfaceName);
  const authored = input.rows.map((row) => row.name);

  return [
    ...(installed.length === 0
      ? [`the installed declarations have no ${input.interfaceName} body`]
      : []),
    ...differences(authored, installed).map(
      (name) =>
        `${input.interfaceName}: ${name} is documented but not declared`,
    ),
    ...differences(installed, authored).map(
      (name) => `${input.interfaceName}: ${name} is declared but undocumented`,
    ),
  ];
};

/**
 * Every way this module can disagree with the installed runtime, in both
 * directions. Pure, so `selection.test.ts` feeds it fixtures per rule and the
 * real declarations for the run.
 */
export const selectionViolations = (input: {
  readonly declarations: string;
  readonly highlight: ReadonlyArray<SelectionField>;
  readonly textSearch: ReadonlyArray<SelectionField>;
  readonly findRanges: ReadonlyArray<SelectionField>;
  readonly methods: ReadonlyArray<SelectionMethod>;
  readonly absences: ReadonlyArray<SelectionAbsence>;
}): ReadonlyArray<string> => {
  const installedMethods = selectionRendererMethods(input.declarations);
  const authoredMethods = input.methods.map((method) => method.name);

  return [
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "HighlightSpec",
      rows: input.highlight,
    }),
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "TextSearchOptions",
      rows: input.textSearch,
    }),
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "FindRangesOptions",
      rows: input.findRanges,
    }),
    ...differences(authoredMethods, installedMethods).map(
      (name) => `GpuixRenderer: ${name} is documented but not declared`,
    ),
    ...differences(installedMethods, authoredMethods).map(
      (name) => `GpuixRenderer: ${name} is a selection method but undocumented`,
    ),
    ...input.absences.flatMap((absence) => {
      const found =
        absence.symbol === undefined
          ? null
          : input.declarations.match(absence.symbol);
      return found === null || found === undefined
        ? []
        : [
            `${absence.subject}: the page says it is absent, but the declarations now contain ${found[0]}`,
          ];
    }),
  ];
};
