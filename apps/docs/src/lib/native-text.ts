/**
 * The runtime's native text theme (plan 629).
 *
 * `@gpuixui/tokens` describes the React components. The runtime's `<input>`,
 * `<textarea>`, `<code>`, `<diff>` and `<markdown>` elements take a second,
 * separate `GpuixTheme`, with its own syntax palette and layout metrics. No
 * page owned it: measured 2026-10-20, `GpuixTheme`, `SyntaxTheme`,
 * `GpuixMetrics` and `gutter` returned nothing, `syntax colors` returned the
 * colour picker and `code metrics` returned Theming's scale table. The library
 * already maps its tokens onto it through `nativeTextTheme`.
 *
 * This module holds the authored rows. `native-text.test.ts` compares them with
 * the installed declarations, the installed reconciler's forwarding sets and
 * the real `nativeTextTheme` source in both directions, so a field the runtime
 * adds fails until it is explained and a mapped key the source loses fails by
 * name.
 *
 * Browser-safe: declaration and source text are passed in, never read here.
 */
import { interfaceFieldsIn } from "./native-elements";

export interface NativeTextField {
  readonly name: string;
  readonly group: string;
  readonly summary: string;
}

export interface NativeTextMetricField extends NativeTextField {}

/** A syntax capture class. The value is a CSS colour. */
export interface NativeTextSyntaxField {
  readonly name: string;
  readonly summary: string;
}

/** One element whose props declare `theme`. */
export interface NativeTextElement {
  readonly tag: string;
  readonly interfaceName: string;
  /** The parent that declares `theme`, when the interface only inherits it. */
  readonly inherits?: string;
  readonly what: string;
  /** The component that renders it, if this library ships one. */
  readonly usedBy: ReadonlyArray<string>;
}

export interface NativeTextAbsence {
  readonly subject: string;
  readonly statement: string;
  /** A symbol that would make the absence false if the runtime gained it. */
  readonly symbol?: RegExp;
}

/** `GpuixTheme`, in declaration order (18 fields). */
export const themeFields: ReadonlyArray<NativeTextField> = [
  {
    name: "appearance",
    group: "Appearance",
    summary:
      '`"light"` swaps the runtime\'s built-in light palette first; every other field then layers on top. Any value other than `"light"` keeps the dark base.',
  },
  {
    name: "bg",
    group: "Palette",
    summary: "The content plane behind code and diff bodies.",
  },
  {
    name: "border",
    group: "Palette",
    summary: "The hairline separator.",
  },
  { name: "text", group: "Palette", summary: "Primary text." },
  {
    name: "textMuted",
    group: "Palette",
    summary:
      "Secondary labels, the code block's language tag and its copy control.",
  },
  {
    name: "textFaint",
    group: "Palette",
    summary: "Placeholders and diff gutter numbers.",
  },
  {
    name: "textDim",
    group: "Palette",
    summary: "Diff file paths — one notch below `textMuted`.",
  },
  {
    name: "accent",
    group: "Palette",
    summary: "List markers, the blockquote rail and the selection wash.",
  },
  { name: "caret", group: "Palette", summary: "The text editor's caret." },
  {
    name: "codeText",
    group: "Text surfaces",
    summary: "Inline-code text.",
  },
  {
    name: "codeWash",
    group: "Text surfaces",
    summary: "The rounded wash behind inline code.",
  },
  {
    name: "diffAdd",
    group: "Text surfaces",
    summary: "Added diff lines.",
  },
  {
    name: "diffDel",
    group: "Text surfaces",
    summary: "Deleted diff lines.",
  },
  {
    name: "diffHunkBg",
    group: "Text surfaces",
    summary: "The diff hunk-header wash.",
  },
  {
    name: "fontSans",
    group: "Fonts",
    summary: "The UI font family an installed family names.",
  },
  {
    name: "fontMono",
    group: "Fonts",
    summary: "The monospace family for code, diffs and terminals.",
  },
  {
    name: "syntax",
    group: "Children",
    summary: "The 24 syntax capture colours; paint only.",
  },
  {
    name: "metrics",
    group: "Children",
    summary: "The 29 layout numbers behind code, diff and markdown.",
  },
];

/** `SyntaxTheme`, in declaration order (24 capture classes). */
export const syntaxFields: ReadonlyArray<NativeTextSyntaxField> = [
  { name: "comment", summary: "Comments." },
  { name: "keyword", summary: "Language keywords." },
  { name: "string", summary: "String literals." },
  {
    name: "stringSpecial",
    summary: "Special string content, such as an interpolation or a raw block.",
  },
  { name: "escape", summary: "Escape sequences." },
  { name: "number", summary: "Numeric literals." },
  { name: "boolean", summary: "Boolean literals." },
  { name: "typeName", summary: "User-declared type and class names." },
  { name: "typeBuiltin", summary: "Built-in types." },
  { name: "constructor", summary: "Constructor calls." },
  { name: "function", summary: "Function names and calls." },
  { name: "functionBuiltin", summary: "Built-in functions." },
  { name: "macroName", summary: "Macro names." },
  { name: "property", summary: "Object properties and fields." },
  { name: "constant", summary: "Constants." },
  { name: "variable", summary: "Variables." },
  { name: "variableSpecial", summary: "Special variables such as `this`." },
  { name: "parameter", summary: "Function parameters." },
  { name: "operator", summary: "Operators." },
  { name: "punctuation", summary: "Brackets, separators and punctuation." },
  { name: "tag", summary: "Markup and template tags." },
  { name: "attribute", summary: "Markup attributes." },
  { name: "label", summary: "Labels." },
  { name: "invalid", summary: "Invalid or unrecognised syntax." },
];

/** `GpuixMetrics`, in declaration order (5 + 10 + 14 numbers). */
export const metricFields: ReadonlyArray<NativeTextMetricField> = [
  {
    name: "codeTextSize",
    group: "Code",
    summary: "Text size for `<code>` and a markdown fenced block.",
  },
  {
    name: "codeLineHeight",
    group: "Code",
    summary: "Fixed row height; a block scrolls by whole rows.",
  },
  {
    name: "codeGutterDigitWidth",
    group: "Code",
    summary: "Gutter width added per line-number digit.",
  },
  {
    name: "codeGutterPaddingRight",
    group: "Code",
    summary: "Gap between the line-number gutter and the code.",
  },
  {
    name: "codeGutterMinWidth",
    group: "Code",
    summary: "Minimum gutter width, before digit counting.",
  },
  {
    name: "diffTextSize",
    group: "Diff",
    summary: "Diff body text size.",
  },
  {
    name: "diffLineHeight",
    group: "Diff",
    summary: "Diff row height.",
  },
  {
    name: "diffFileHeaderHeight",
    group: "Diff",
    summary: "The clickable file-header row.",
  },
  {
    name: "diffHunkHeaderHeight",
    group: "Diff",
    summary: "The hunk-header row.",
  },
  {
    name: "diffNoticeHeight",
    group: "Diff",
    summary: "The notice row the renderer adds itself.",
  },
  {
    name: "diffBodyBottomPad",
    group: "Diff",
    summary: "Padding after the last diff row.",
  },
  {
    name: "diffGutterWidth",
    group: "Diff",
    summary: "Minimum width of one line-number gutter column.",
  },
  {
    name: "diffMarkerWidth",
    group: "Diff",
    summary: "The `+` / `−` / `·` marker column.",
  },
  {
    name: "diffAccentBarWidth",
    group: "Diff",
    summary: "The coloured bar at a changed row's edge.",
  },
  {
    name: "diffRowPaddingX",
    group: "Diff",
    summary: "Horizontal padding inside a diff row.",
  },
  {
    name: "mdTextSize",
    group: "Markdown",
    summary: "Markdown body text size.",
  },
  {
    name: "mdLineHeight",
    group: "Markdown",
    summary: "Markdown body line height.",
  },
  {
    name: "mdBlockGap",
    group: "Markdown",
    summary: "Vertical gap between markdown blocks.",
  },
  {
    name: "mdHeadingSizes",
    group: "Markdown",
    summary: "Heading sizes for `[h1, h2, h3, h4–h6]`.",
  },
  {
    name: "mdHeadingLineHeights",
    group: "Markdown",
    summary: "Heading line heights for `[h1, h2, h3, h4–h6]`.",
  },
  {
    name: "mdTableCellPadding",
    group: "Markdown",
    summary: "Padding inside a markdown table cell.",
  },
  {
    name: "mdTableMinColumnWidth",
    group: "Markdown",
    summary: "Width below which a column stops shrinking; content wraps.",
  },
  {
    name: "mdTableMinColumnContent",
    group: "Markdown",
    summary:
      "Floor for a column's max-content share, so a short column beside prose stays readable.",
  },
  {
    name: "mdInlineCodeRadius",
    group: "Markdown",
    summary: "Corner radius of an inline-code wash.",
  },
  {
    name: "mdCodePaddingX",
    group: "Markdown",
    summary: "Horizontal padding of the fenced-block card.",
  },
  {
    name: "mdCodePaddingY",
    group: "Markdown",
    summary: "Vertical padding of the fenced-block card.",
  },
  {
    name: "mdCodeRadius",
    group: "Markdown",
    summary: "Corner radius of the fenced-block card.",
  },
  {
    name: "mdCodeHeaderPaddingY",
    group: "Markdown",
    summary: "Vertical padding of the fenced block's language header.",
  },
  {
    name: "mdCodeHeaderTextSize",
    group: "Markdown",
    summary: "Text size of the fenced block's language header.",
  },
];

/** The five elements whose props declare `theme`. */
export const themeElements: ReadonlyArray<NativeTextElement> = [
  {
    tag: "input",
    interfaceName: "InputProps",
    what: "Placeholder, caret, selection wash, text and the mono family.",
    usedBy: ["Input"],
  },
  {
    tag: "textarea",
    interfaceName: "TextareaProps",
    inherits: "InputProps",
    what: "The same palette as `<input>`, on the multi-line editor.",
    usedBy: ["TextArea"],
  },
  {
    tag: "code",
    interfaceName: "CodeProps",
    what: "Syntax colours, code text size and line height, and the line-number gutter.",
    usedBy: [],
  },
  {
    tag: "diff",
    interfaceName: "DiffProps",
    what: "Added, deleted and hunk washes, file-path dimness, gutters, marker column and row heights.",
    usedBy: [],
  },
  {
    tag: "markdown",
    interfaceName: "MarkdownProps",
    what: "Body, heading and table metrics, the inline-code wash and the fenced-block card.",
    usedBy: [],
  },
];

/** The nine fields `nativeTextTheme` maps from the design system. */
export const mappedFields: ReadonlyArray<string> = [
  "appearance",
  "bg",
  "text",
  "textMuted",
  "textFaint",
  "accent",
  "caret",
  "fontSans",
  "fontMono",
];

/** The nine a field does not set, and why. */
export const unmappedFields: ReadonlyArray<{
  readonly name: string;
  readonly summary: string;
}> = [
  {
    name: "border",
    summary:
      "`Input` draws its own border through `StyleDesc` so the shared focus ring can replace it.",
  },
  {
    name: "textDim",
    summary: "Reserved for diff file paths; no component renders a diff yet.",
  },
  {
    name: "codeText",
    summary: "Reserved for a code or markdown component.",
  },
  {
    name: "codeWash",
    summary: "Reserved for a code or markdown component.",
  },
  {
    name: "diffAdd",
    summary: "Reserved for a diff viewer.",
  },
  {
    name: "diffDel",
    summary: "Reserved for a diff viewer.",
  },
  {
    name: "diffHunkBg",
    summary: "Reserved for a diff viewer.",
  },
  {
    name: "syntax",
    summary:
      "Reserved for a code block; the field uses the type scale instead.",
  },
  {
    name: "metrics",
    summary: "Reserved with the content surfaces; a field uses the type scale.",
  },
];

/** What the runtime does not provide. */
export const nativeTextAbsences: ReadonlyArray<NativeTextAbsence> = [
  {
    subject: "Global theme setter",
    statement:
      "There is no `setTheme` on the renderer and no provider: `theme` is a prop on five elements, so each surface carries its own.",
    symbol: /setTheme|setNativeTheme/iu,
  },
  {
    subject: "A theme on a layout box",
    statement:
      "`<div>` and `<text>` are built-in types; the reconciler forwards only its universal props to them, so `theme` is dropped rather than inherited. Put it on the input, code, diff or markdown element.",
  },
  {
    subject: "CSS variables",
    statement:
      "There is no custom-property syntax and no cascade. A value is a plain colour string on `GpuixTheme`; a shared palette is a JavaScript object.",
    symbol: /cssVariables|setProperty/iu,
  },
  {
    subject: "Font registration",
    statement:
      "There is no `registerFont`; `fontSans` and `fontMono` name a family the operating system already has. [Typography](/docs/typography) records the same limit.",
    symbol: /registerFont/iu,
  },
  {
    subject: "A component wrapper",
    statement:
      "No component in this library wraps `<code>`, `<diff>` or `<markdown>`; the [roadmap](/docs/roadmap) lists the syntax, diff and rich-text targets.",
  },
];

/** The keys of the `GpuixTheme` the real helper returns, in source order. */
export const nativeTextThemeKeys = (source: string): ReadonlyArray<string> => {
  const match = /nativeTextTheme[\s\S]*?=>\s*\(\{([\s\S]*?)\n\}\);/u.exec(
    source,
  );
  const body = match?.[1] ?? "";
  return [...body.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*):/gmu)].map(
    (field) => field[1] ?? "",
  );
};

/** The quoted members of one `new Set([...])` in the installed mutations module. */
const setMembers = (source: string, name: string): ReadonlyArray<string> => {
  const match = new RegExp(
    `${name}\\s*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`,
    "u",
  ).exec(source);
  const body = match?.[1] ?? "";
  return [...body.matchAll(/"([^"]+)"/gu)].map((member) => member[1] ?? "");
};

/** Every interface whose own body declares `theme?:`. */
const interfacesDeclaringTheme = (
  declarations: string,
): ReadonlyArray<string> =>
  [
    ...declarations.matchAll(
      /interface ([A-Za-z0-9]+)[^{\n]*\{([\s\S]*?)\n\}/gu,
    ),
  ]
    .filter((match) => /^\s*theme\?:/mu.test(match[2] ?? ""))
    .map((match) => match[1] ?? "");

const differences = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): ReadonlyArray<string> => left.filter((name) => !right.includes(name));

const interfaceViolations = (input: {
  readonly declarations: string;
  readonly interfaceName: string;
  readonly rows: ReadonlyArray<{ readonly name: string }>;
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
 * Every way this module can disagree with the installed runtime and the real
 * helper, in both directions. Pure, so the test feeds it fixtures per rule and
 * the real sources for the run.
 */
export const nativeTextViolations = (input: {
  readonly declarations: string;
  readonly mutations: string;
  readonly helperSource: string;
  readonly theme: ReadonlyArray<NativeTextField>;
  readonly syntax: ReadonlyArray<NativeTextSyntaxField>;
  readonly metrics: ReadonlyArray<NativeTextMetricField>;
  readonly elements: ReadonlyArray<NativeTextElement>;
  readonly mapped: ReadonlyArray<string>;
  readonly unmapped: ReadonlyArray<{ readonly name: string }>;
  readonly absences: ReadonlyArray<NativeTextAbsence>;
}): ReadonlyArray<string> => {
  const declared = interfaceFieldsIn(input.declarations, "GpuixTheme");
  const helperKeys = nativeTextThemeKeys(input.helperSource);
  const builtIn = setMembers(input.mutations, "BUILT_IN_TYPES");
  const universal = setMembers(input.mutations, "UNIVERSAL_PROPS");
  const authoredUnmapped = input.unmapped.map((field) => field.name);

  const elementProblems = input.elements.flatMap((element) => {
    if (element.inherits !== undefined) {
      const inherits = new RegExp(
        `interface ${element.interfaceName}\\s+extends\\s+${element.inherits}`,
        "u",
      ).test(input.declarations);
      const parentHasTheme = interfaceFieldsIn(
        input.declarations,
        element.inherits,
      ).includes("theme");
      return [
        ...(inherits
          ? []
          : [
              `${element.tag}: ${element.interfaceName} does not extend ${element.inherits}`,
            ]),
        ...(parentHasTheme
          ? []
          : [`${element.tag}: ${element.inherits} does not declare theme`]),
      ];
    }
    return interfaceFieldsIn(
      input.declarations,
      element.interfaceName,
    ).includes("theme")
      ? []
      : [`${element.tag}: ${element.interfaceName} does not declare theme`];
  });

  const documentedInterfaces = input.elements.map(
    (element) => element.inherits ?? element.interfaceName,
  );
  const installedInterfaces = interfacesDeclaringTheme(input.declarations);

  return [
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "GpuixTheme",
      rows: input.theme,
    }),
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "SyntaxTheme",
      rows: input.syntax,
    }),
    ...interfaceViolations({
      declarations: input.declarations,
      interfaceName: "GpuixMetrics",
      rows: input.metrics,
    }),
    ...elementProblems,
    ...differences(installedInterfaces, documentedInterfaces).map(
      (name) => `${name} declares theme but no element row documents it`,
    ),
    ...differences(documentedInterfaces, installedInterfaces).map(
      (name) =>
        `${name} is documented as a theme owner but does not declare it`,
    ),
    ...(helperKeys.length === 0
      ? ["nativeTextTheme's returned object could not be read"]
      : []),
    ...differences(input.mapped, helperKeys).map(
      (name) => `nativeTextTheme: ${name} is documented as mapped but not set`,
    ),
    ...differences(helperKeys, input.mapped).map(
      (name) => `nativeTextTheme: ${name} is mapped but not documented`,
    ),
    ...differences(input.mapped, declared).map(
      (name) => `nativeTextTheme: ${name} is mapped but not a GpuixTheme field`,
    ),
    ...differences(declared, [...input.mapped, ...authoredUnmapped]).map(
      (name) => `GpuixTheme: ${name} is neither mapped nor explained as unset`,
    ),
    ...differences([...input.mapped, ...authoredUnmapped], declared).map(
      (name) => `GpuixTheme: ${name} is explained but not declared`,
    ),
    ...(builtIn.includes("div") && builtIn.includes("text")
      ? []
      : ["the installed reconciler no longer treats div and text as built-in"]),
    ...(universal.includes("theme")
      ? ["theme is now a universal prop, so the layout-box absence is false"]
      : []),
    ...input.absences.flatMap((absence) => {
      if (absence.symbol === undefined) return [];
      const found = new RegExp(
        absence.symbol.source,
        absence.symbol.flags,
      ).test(
        `${input.declarations}\n${input.mutations}\n${input.helperSource}`,
      );
      return found
        ? [`${absence.subject} is claimed absent but its symbol is declared`]
        : [];
    }),
  ];
};
