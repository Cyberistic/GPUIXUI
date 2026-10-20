/**
 * The runtime's element catalogue (plan 626).
 *
 * The library documents how to style a host element and which props every part
 * inherits, but never which JSX tags exist. The runtime declares twelve, six of
 * which no page named and five of which no component wraps. Every row here is
 * authored and checked against the installed `@gpuix/native` declarations, the
 * installed `@gpuix/react` JSX runtime and the package source by
 * `native-elements.test.ts`: a tag or prop the runtime adds fails until it is
 * explained, and a row this module invents fails by name.
 *
 * The module stays browser-safe — the page renders it — so it takes declaration
 * text as arguments instead of reading files.
 */

/** One element the runtime paints. */
export interface NativeElement {
  /** The `ElementType` value, which is also the JSX tag. */
  readonly tag: string;
  /** What the tag paints, in one sentence. */
  readonly paints: string;
  /** Props declared beyond `HostProps`, in declaration order. */
  readonly props: ReadonlyArray<string>;
  /**
   * The components that render it. Representative where a tag is ubiquitous
   * (`div`, `text`); empty exactly when no component renders it, which is what
   * the guard checks.
   */
  readonly composedBy: ReadonlyArray<string>;
  /** The roadmap target that would wrap it, when no component does. */
  readonly roadmap?: string;
  /** A caveat the table shows. */
  readonly note?: string;
}

/** A tag a React developer expects and this runtime does not have. */
export interface AbsentElement {
  readonly tag: string;
  readonly replacement: string;
  /** The page that owns the replacement. */
  readonly owner: string;
}

export const nativeElements: ReadonlyArray<NativeElement> = [
  {
    tag: "div",
    paints:
      "A layout box: flex, grid, padding, border, background and the only tag that arranges children.",
    props: [],
    composedBy: ["Box", "Stack", "every component"],
    note: "There is no display default to rely on; set `display` when a box must lay out.",
  },
  {
    tag: "text",
    paints:
      "A run of text. A string child is a text node; this is the element form and the only text tag.",
    props: [],
    composedBy: ["Text", "Label", "most parts"],
  },
  {
    tag: "img",
    paints:
      "A raster or SVG image from a filesystem path, a data URL or an http(s) URL.",
    props: ["src", "objectFit", "alt"],
    composedBy: ["Avatar"],
    note: "`Avatar` paints one when you pass `src`; there is no general image component yet. Bytes can also be painted through a ref: `setImage` or `setImagePixels`.",
  },
  {
    tag: "svg",
    paints:
      "Vector graphics from a desktop path (`src`) or from raw SVG markup (`source`).",
    props: ["src", "source"],
    composedBy: ["Icons", "Rating"],
    note: "`source` is the portable form: the browser live surface paints it, a desktop path does not exist there.",
  },
  {
    tag: "canvas",
    paints: "A raw drawing surface.",
    props: [],
    composedBy: [],
    note: "Declared and typed, but no probe in this repository paints one — treat it as unverified rather than working.",
  },
  {
    tag: "input",
    paints: "A single-line text field.",
    props: ["value", "placeholder", "readOnly", "theme"],
    composedBy: [
      "Input",
      "OTPField",
      "NumberField",
      "InlineEdit",
      "TagInput",
      "TimePicker",
    ],
    note: "It needs `autoFocus` or a click before it receives key events. There is no `type` attribute: a number or OTP field is a component.",
  },
  {
    tag: "textarea",
    paints:
      "A multi-line text field. Enter submits only when `onSubmit` is set.",
    props: ["minRows", "maxRows"],
    composedBy: ["TextArea"],
    note: "Every `<input>` prop applies too.",
  },
  {
    tag: "anchored",
    paints:
      "A child positioned against its parent — the surface of a menu, popover or dialog.",
    props: [
      "position",
      "side",
      "align",
      "gap",
      "anchor",
      "offset",
      "fit",
      "snapMargin",
      "deferred",
      "priority",
      "occlude",
    ],
    composedBy: [
      "Popover",
      "Dialog",
      "Drawer",
      "Context menu",
      "Dropdown menu",
    ],
    note: "It paints no surface of its own: put the background and the handlers on the content inside it.",
  },
  {
    tag: "code",
    paints:
      "A syntax-highlighted, read-only code block in fixed-height rows that never wrap.",
    props: ["code", "language", "path", "showLineNumbers", "theme"],
    composedBy: [],
    roadmap: "Syntax highlighting",
    note: "It paints no surface: `style` is the surface, and the block scrolls itself horizontally.",
  },
  {
    tag: "diff",
    paints: "A read-only unified diff from a git patch.",
    props: [
      "patch",
      "wordDiff",
      "collapsedPaths",
      "scroll",
      "maxLines",
      "theme",
    ],
    composedBy: [],
    roadmap: "Diff viewer",
    note: "File headers, hidden-line counts and clicked lines report through their own events.",
  },
  {
    tag: "markdown",
    paints:
      "GitHub-flavoured markdown — tables, strikethrough and task lists — rendered read-only.",
    props: ["source", "theme"],
    composedBy: [],
    roadmap: "Rich-text editing",
    note: "It reports a link click; opening the URL is the application's job.",
  },
  {
    tag: "virtual-list",
    paints:
      "A list that builds only the rows near its viewport while keeping every row in the tree.",
    props: [
      "style",
      "alignment",
      "followTail",
      "overdraw",
      "onVisibleRange",
      "estimatedItemHeight",
      "itemCount",
      "windowStart",
    ],
    composedBy: ["Message scroller"],
    note: "It takes no `onClick`, `onKeyDown` or `tabIndex` — put interactions on the rows.",
  },
];

export const absentElements: ReadonlyArray<AbsentElement> = [
  {
    tag: "button",
    replacement:
      '`Button` and `IconButton`: a themed box with `role="button"` and key handling.',
    owner: "/docs/components/button",
  },
  {
    tag: "a",
    replacement:
      "A click handler on text; no shell-open API is declared, so opening a URL is the host application's job.",
    owner: "/docs/components/navigation-menu",
  },
  {
    tag: "ul, ol, li",
    replacement:
      '`List` / `ListItem` — `role="list"` and `"listitem"`, or `listbox` and `option` when selectable.',
    owner: "/docs/components/list",
  },
  {
    tag: "table, tr, td",
    replacement:
      'Rows of `div`s in a grid with `role="row"` and `"cell"`. There is no table element.',
    owner: "/docs/data-display",
  },
  {
    tag: "h1–h6",
    replacement:
      '`<text role="heading" aria-level={n}>`. `Text`\'s `role` prop is a type role, so the heading role belongs on the element.',
    owner: "/docs/components/text",
  },
  {
    tag: "p, span",
    replacement:
      "`<text>` is the only inline text element; a paragraph is a `div` of body text.",
    owner: "/docs/components/text",
  },
  {
    tag: "form",
    replacement:
      "`Form`: an owned value, a schema submit and a decoded result.",
    owner: "/docs/components/form",
  },
  {
    tag: "label",
    replacement: "`Label`, with the `labelledBy` contract the controls read.",
    owner: "/docs/components/label",
  },
  {
    tag: "select",
    replacement: "`Select`, GPUix's headless select wrapped in the theme.",
    owner: "/docs/components/select",
  },
  {
    tag: "dialog",
    replacement:
      "`Dialog`: a local overlay with an explicit dismiss stack, not a portal.",
    owner: "/docs/components/dialog",
  },
];

/** The props interface each element adds to `HostProps`, and what it extends. */
export const propInterfaces: ReadonlyArray<{
  readonly tag: string;
  readonly name: string;
  readonly parents: ReadonlyArray<string>;
}> = [
  { tag: "input", name: "InputProps", parents: ["HostProps"] },
  {
    tag: "textarea",
    name: "TextareaProps",
    parents: ["HostProps", "InputProps"],
  },
  { tag: "img", name: "ImgProps", parents: ["HostProps"] },
  { tag: "svg", name: "SvgProps", parents: ["HostProps"] },
  { tag: "code", name: "CodeProps", parents: ["HostProps"] },
  { tag: "diff", name: "DiffProps", parents: ["HostProps"] },
  { tag: "markdown", name: "MarkdownProps", parents: ["HostProps"] },
  { tag: "anchored", name: "AnchoredProps", parents: ["HostProps"] },
];

/** The `ElementType` union, in declaration order. */
export const elementTypeNames = (
  declarations: string,
): ReadonlyArray<string> => {
  const match = /type ElementType\s*=\s*([^;]+);/u.exec(declarations);
  const body = match?.[1] ?? "";
  return [...body.matchAll(/"([^"]+)"/gu)].flatMap((found) =>
    found[1] === undefined ? [] : [found[1]],
  );
};

/** The keys of `JSX.IntrinsicElements` in the installed JSX runtime. */
export const jsxIntrinsicNames = (
  declarations: string,
): ReadonlyArray<string> => {
  const start = declarations.indexOf("interface IntrinsicElements");
  const open = start < 0 ? -1 : declarations.indexOf("{", start);
  const close = open < 0 ? -1 : declarations.indexOf("\n  }", open);
  const body = open < 0 || close < 0 ? "" : declarations.slice(open + 1, close);
  return [...body.matchAll(/^\s*"?([A-Za-z][A-Za-z0-9-]*)"?\s*:/gmu)].flatMap(
    (found) => (found[1] === undefined ? [] : [found[1]]),
  );
};

/** Field names every `interface Name` body declares, in first-seen order. */
export const interfaceFieldsIn = (
  declarations: string,
  name: string,
): ReadonlyArray<string> => {
  const pattern = new RegExp(
    `interface ${name}[^{\\n]*\\{([\\s\\S]*?)\\n\\}`,
    "gu",
  );
  const fields = [...declarations.matchAll(pattern)].flatMap((match) =>
    bodyFieldNames(match[1] ?? ""),
  );
  return [...new Set(fields)];
};

/**
 * A field at the body's own depth. A nested object — `<anchored>`'s `position`
 * and `offset` — declares `x` and `y` one level down, and those are not props.
 */
const bodyFieldNames = (body: string): ReadonlyArray<string> =>
  body.split("\n").reduce<{
    readonly depth: number;
    readonly names: ReadonlyArray<string>;
  }>(
    (state, line) => {
      const match =
        state.depth === 0 ? /^\s*([A-Za-z][A-Za-z0-9]*)\??:/u.exec(line) : null;
      return {
        depth: state.depth + braces(line),
        names:
          match?.[1] === undefined ? state.names : [...state.names, match[1]],
      };
    },
    { depth: 0, names: [] },
  ).names;

const braces = (line: string): number =>
  (line.match(/\{/gu)?.length ?? 0) - (line.match(/\}/gu)?.length ?? 0);

/** A tag's own prop names: its interface's fields minus its parents'. */
export const ownProps = (
  declarations: string,
  name: string,
  parents: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const inherited = parents.flatMap((parent) =>
    interfaceFieldsIn(declarations, parent),
  );
  return interfaceFieldsIn(declarations, name).filter(
    (field) => !inherited.includes(field),
  );
};

/**
 * `<virtual-list>`'s props. Its shape is a union of intersections, so the two
 * helpers read the pieces: `VirtualListShared`'s body and the union's branch
 * fields. The accessibility names and `testId` are excluded because
 * Accessibility and Component API own them.
 */
export const virtualListProps = (
  declarations: string,
): ReadonlyArray<string> => {
  const sharedStart = declarations.indexOf("type VirtualListShared");
  const sharedOpen =
    sharedStart < 0 ? -1 : declarations.indexOf("{", sharedStart);
  const sharedClose =
    sharedOpen < 0 ? -1 : declarations.indexOf("\n};", sharedOpen);
  const sharedBody =
    sharedOpen < 0 || sharedClose < 0
      ? ""
      : declarations.slice(sharedOpen + 1, sharedClose);

  const unionStart = declarations.indexOf("type VirtualListProps");
  const unionEnd =
    unionStart < 0 ? -1 : declarations.indexOf("\n});", unionStart);
  const unionBody =
    unionStart < 0 || unionEnd < 0
      ? ""
      : declarations.slice(unionStart, unionEnd);

  const fields = (body: string) =>
    [...body.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)\??:/gmu)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    );

  const owned = (name: string) =>
    name === "role" || name === "testId" || name.startsWith("aria");

  return [
    ...new Set(
      [...fields(sharedBody), ...fields(unionBody)].filter(
        (name) => !owned(name),
      ),
    ),
  ];
};

const differences = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): ReadonlyArray<string> => left.filter((name) => !right.includes(name));

const duplicates = (names: ReadonlyArray<string>): ReadonlyArray<string> => {
  const counts = new Map<string, number>();
  names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));
  return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
};

/**
 * Every way this module can disagree with the runtime, in both directions.
 * Pure, so the test feeds it fixtures for each rule and the real declarations
 * for the run.
 *
 * `renderedTags` is the set of tags the package source actually renders
 * (`native-elements.test.ts` scans each package's `src` tree), which is what proves the
 * "no component ships" column.
 */
export const nativeElementViolations = (input: {
  readonly declarations: string;
  readonly jsxRuntime: string;
  readonly elements: ReadonlyArray<NativeElement>;
  readonly absent: ReadonlyArray<AbsentElement>;
  readonly renderedTags: ReadonlyArray<string>;
  readonly roadmapNames: ReadonlyArray<string>;
}): ReadonlyArray<string> => {
  const authored = input.elements.map((element) => element.tag);
  const installed = elementTypeNames(input.declarations);
  const intrinsic = jsxIntrinsicNames(input.jsxRuntime);

  return [
    ...(installed.length === 0
      ? ["the installed declarations have no ElementType union"]
      : []),
    ...(intrinsic.length === 0
      ? ["the installed JSX runtime has no IntrinsicElements map"]
      : []),
    ...duplicates(authored).map((tag) => `${tag} is documented twice`),
    ...differences(authored, installed).map(
      (tag) => `${tag} is documented but ElementType does not declare it`,
    ),
    ...differences(installed, authored).map(
      (tag) => `${tag} is an element but undocumented`,
    ),
    ...differences(authored, intrinsic).map(
      (tag) =>
        `${tag} is documented but JSX.IntrinsicElements has no tag for it`,
    ),
    ...differences(intrinsic, authored).map(
      (tag) => `${tag} is a JSX tag but undocumented`,
    ),
    ...propInterfaces.flatMap(({ tag, name, parents }) => {
      const row = input.elements.find((element) => element.tag === tag);
      const documented = row?.props ?? [];
      const declared = ownProps(input.declarations, name, parents);
      return [
        ...(declared.length === 0
          ? [`the installed declarations have no ${name} body`]
          : []),
        ...differences(documented, declared).map(
          (prop) =>
            `${tag}: ${prop} is documented but ${name} does not declare it`,
        ),
        ...differences(declared, documented).map(
          (prop) => `${tag}: ${prop} is declared by ${name} but undocumented`,
        ),
      ];
    }),
    ...(() => {
      const row = input.elements.find(
        (element) => element.tag === "virtual-list",
      );
      const documented = row?.props ?? [];
      const declared = virtualListProps(input.declarations);
      return [
        ...(declared.length === 0
          ? ["the installed declarations have no VirtualListProps shape"]
          : []),
        ...differences(documented, declared).map(
          (prop) =>
            `virtual-list: ${prop} is documented but the declarations do not name it`,
        ),
        ...differences(declared, documented).map(
          (prop) => `virtual-list: ${prop} is declared but undocumented`,
        ),
      ];
    })(),
    ...input.elements.flatMap((element) => {
      const rendered = input.renderedTags.includes(element.tag);
      if (element.composedBy.length === 0 && rendered)
        return [
          `${element.tag}: the table says no component renders it, but the package source does`,
        ];
      if (element.composedBy.length > 0 && !rendered)
        return [
          `${element.tag}: the table names ${element.composedBy.join(", ")}, but no package source renders it`,
        ];
      return [];
    }),
    ...input.elements.flatMap((element) => {
      if (element.roadmap === undefined) return [];
      return input.roadmapNames.includes(element.roadmap)
        ? []
        : [
            `${element.tag}: the roadmap has no target named ${element.roadmap}`,
          ];
    }),
    ...input.absent.flatMap((row) => {
      if (installed.includes(row.tag)) {
        return [
          `${row.tag}: the page says it is absent, but ElementType now declares it`,
        ];
      }
      return row.owner.startsWith("/docs/")
        ? []
        : [`${row.tag}: ${row.owner} is not a docs path`];
    }),
  ];
};
