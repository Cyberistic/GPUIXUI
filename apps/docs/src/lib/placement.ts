/**
 * The placement model of every floating surface (plan 636).
 *
 * Every popover, menu, select, combobox, tooltip and preview card is placed by
 * GPUix's `<anchored>` element through `@gpuix/react/floating`'s
 * `FloatingLayer`. The site documented paint order and listed `side`/`align` in
 * each props table, but nothing explained the five placement props, what the
 * React layer asks the runtime for, or the two measured defects the library
 * compensates for. Measured 2026-10-21: `placement`, `positioning`, `collision`
 * and `side offset` reached another page's prose, and `reposition` returned
 * nothing.
 *
 * The rows are authored; the names, types, defaults and mechanisms are not.
 * `overlay-placement.test.ts` re-derives them from the installed
 * `@gpuix/react@0.10.0` declarations and implementation and from every
 * component source, in both directions.
 */
import { interfaceFieldsIn } from "./native-elements";

export interface PlacementPropRow {
  readonly name: string;
  readonly type: string;
  /** The default `FloatingLayer` applies, as it writes it. */
  readonly default: string;
  readonly summary: string;
}

/** The five placement fields of the installed `FloatingContentProps`. */
export const placementProps: ReadonlyArray<PlacementPropRow> = [
  {
    name: "side",
    type: "FloatingSide",
    default: "bottom",
    summary: "The window edge the surface opens towards.",
  },
  {
    name: "sideOffset",
    type: "number",
    default: "0",
    summary: "The gap between the trigger and the surface, in pixels.",
  },
  {
    name: "align",
    type: "FloatingAlign",
    default: "start",
    summary:
      'Where the surface sits along that edge. `"center"` is the runtime\'s own imperfect centre.',
  },
  {
    name: "alignOffset",
    type: "number",
    default: "0",
    summary:
      "A shift along the edge, added after placement. The components use it for the measured centre correction.",
  },
  {
    name: "collisionPadding",
    type: "number",
    default: "8",
    summary: "The margin a snapped surface keeps from the window edge.",
  },
];

export interface LayerMappingRow {
  /** The `FloatingContentProps` field, or `—` for a fixed value. */
  readonly from: string;
  /** The `<anchored>` prop it becomes. */
  readonly to: string;
  /** The expression the layer passes, exactly as the shipped implementation writes it. */
  readonly value: string;
  readonly summary: string;
}

/** How `FloatingLayer` translates the React props into one `<anchored>` element. */
export const layerMapping: ReadonlyArray<LayerMappingRow> = [
  {
    from: "side",
    to: "side",
    value: "side",
    summary: "Passed through unchanged.",
  },
  {
    from: "align",
    to: "align",
    value: "align",
    summary: "Passed through unchanged.",
  },
  {
    from: "sideOffset",
    to: "gap",
    value: "sideOffset",
    summary: "Becomes the gap between the anchor box and the surface.",
  },
  {
    from: "alignOffset",
    to: "offset",
    value: "offset",
    summary:
      "The layer turns it into `{ x }` on a top/bottom side and `{ y }` on a left/right side — never both.",
  },
  {
    from: "collisionPadding",
    to: "snapMargin",
    value: "collisionPadding",
    summary: "Becomes the margin the snapped surface keeps from the window.",
  },
  {
    from: "—",
    to: "fit",
    value: '"snap"',
    summary:
      "Hardcoded. The layer never asks the runtime to switch sides; `usePlacement` flips instead.",
  },
  {
    from: "—",
    to: "deferred",
    value: "true",
    summary: "The surface is measured after its content is laid out.",
  },
  {
    from: "—",
    to: "priority",
    value: "1",
    summary: "One stacking priority for every floating surface.",
  },
  {
    from: "—",
    to: "occlude",
    value: 'props.style?.pointerEvents !== "none"',
    summary:
      "A surface that ignores pointer events does not occlude what is behind it.",
  },
];

/** How a surface reaches its position. */
export type PlacementCorrection =
  | "measured"
  | "pass-through"
  | "fixed"
  | "pointer";

export interface PlacementSurfaceRow {
  readonly surface: string;
  /** Repo-relative component source, or the installed package that owns it. */
  readonly source: string;
  /** The placement props the part exposes; `—` when it exposes none. */
  readonly props: string;
  /** The defaults the part applies; `—` when it does not place itself. */
  readonly defaults: string;
  readonly correction: PlacementCorrection;
  readonly summary: string;
}

/**
 * Every part that places a floating surface. The `measured` rows call
 * `usePlacement`; every other row is a source-verified mechanism, so a new
 * component adopting the layer fails the guard by path.
 */
export const placementSurfaces: ReadonlyArray<PlacementSurfaceRow> = [
  {
    surface: "PopoverContent",
    source: "packages/components/src/popover.tsx",
    props: "side, align, sideOffset, alignOffset, collisionPadding",
    defaults:
      "side=bottom, align=start, sideOffset=6, alignOffset=0, collisionPadding=8",
    correction: "measured",
    summary:
      'Corrected: `align="center"` is measured from the trigger and the surface flips once when snapping would cover it.',
  },
  {
    surface: "DropdownMenuContent",
    source: "packages/components/src/dropdown-menu.tsx",
    props: "side, align, sideOffset, alignOffset, collisionPadding",
    defaults:
      "side=bottom, align=start, sideOffset=4, alignOffset=0, collisionPadding=8",
    correction: "measured",
    summary: "Corrected like PopoverContent, with a 4px gap.",
  },
  {
    surface: "ComboboxContent",
    source: "packages/components/src/combobox.tsx",
    props: "side, align, sideOffset, alignOffset, collisionPadding",
    defaults:
      "side=bottom, align=start, sideOffset=4, alignOffset=0, collisionPadding=8",
    correction: "measured",
    summary: "Corrected like DropdownMenuContent, over the headless list.",
  },
  {
    surface: "PreviewCardContent",
    source: "packages/components/src/preview-card.tsx",
    props: "side, align, sideOffset, collisionPadding",
    defaults: "side=bottom, align=start, sideOffset=6, collisionPadding=8",
    correction: "pass-through",
    summary:
      'Not corrected: `align="center"` is half a card short and a card near the bottom edge is snapped over its trigger.',
  },
  {
    surface: "NavigationMenuContent",
    source: "packages/components/src/navigation-menu.tsx",
    props: "—",
    defaults: "side=bottom, align=start, sideOffset=4, collisionPadding=8",
    correction: "fixed",
    summary:
      "Always opens below its item, aligned to its start; a navigation panel chooses no placement.",
  },
  {
    surface: "MentionInputList",
    source: "packages/components/src/mention-input.tsx",
    props: "—",
    defaults: "side=bottom, align=start, sideOffset=4, collisionPadding=8",
    correction: "fixed",
    summary: "Always opens below the field, aligned to its start.",
  },
  {
    surface: "ContextMenuContent",
    source: "packages/components/src/context-menu.tsx",
    props: "—",
    defaults: "—",
    correction: "pointer",
    summary:
      "Anchored at the press point. The runtime snaps it inside the window; there is no side or align.",
  },
  {
    surface: "MenuSubContent",
    source: "packages/components/src/menu/sub.tsx",
    props: "—",
    defaults: "—",
    correction: "pointer",
    summary:
      "Anchored at the trigger row's right edge in window coordinates, snapped with an 8px margin.",
  },
  {
    surface: "DialogContent",
    source: "packages/components/src/dialog.tsx",
    props: "—",
    defaults: "—",
    correction: "fixed",
    summary:
      "The veil is anchored at the window origin and sized from `useWindowSize()`; the dialog box is centred inside it.",
  },
  {
    surface: "DrawerContent",
    source: "packages/components/src/drawer.tsx",
    props: "—",
    defaults: "—",
    correction: "fixed",
    summary:
      "A window-origin veil with the panel laid out on the chosen edge; the veil is not a placed surface.",
  },
  {
    surface: "SelectContent",
    source: "@gpuix/react/select",
    props: "side, align, sideOffset, alignOffset, collisionPadding",
    defaults: "runtime defaults",
    correction: "pass-through",
    summary:
      "GPUix's own select forwards the five props to `FloatingLayer`; this library does not correct it.",
  },
  {
    surface: "TooltipContent",
    source: "@gpuix/react/tooltip",
    props: "side, align, sideOffset, alignOffset, collisionPadding",
    defaults: "side=top, align=center, sideOffset=0",
    correction: "pass-through",
    summary:
      "GPUix's tooltip defaults to `align=\"center\"`, so the tip is half its width left of the trigger's centre. This library does not correct it.",
  },
];

/**
 * Whether the correction applies the measured centre fix and the one-step flip.
 * Derived from the mechanism, never authored: only `measured` rows call
 * `usePlacement`.
 */
export const centreCorrected = (row: PlacementSurfaceRow): boolean =>
  row.correction === "measured";

export const flipsOnce = (row: PlacementSurfaceRow): boolean =>
  row.correction === "measured";

/** A reader-facing label for each mechanism. */
export const placementCorrectionLabels: Record<PlacementCorrection, string> = {
  measured: "Measured and corrected",
  "pass-through": "Passed through",
  fixed: "Fixed by the component",
  pointer: "Anchored at a point",
};

export interface PlacementAbsence {
  readonly subject: string;
  readonly statement: string;
}

/** What the placement surface cannot do, each with its substitute. */
export const placementAbsences: ReadonlyArray<PlacementAbsence> = [
  {
    subject: "An arrow or pointer triangle",
    statement:
      "Neither `FloatingContentProps` nor `AnchoredProps` declares one. Tooltip records the same absence.",
  },
  {
    subject: "A custom anchor element",
    statement:
      "`FloatingLayer` anchors to its containing block, not to an element id. The raw element's `anchor` chooses a corner (`topLeft` … `bottomLeft`), not another element.",
  },
  {
    subject: "Choosing `fit`",
    statement:
      '`FloatingLayer` hardcodes `fit="snap"`. The raw `<anchored>` element offers `switch`; using it means writing the layer yourself.',
  },
  {
    subject: '`side="auto"`',
    statement:
      "`side` is one of the four literal edges. The corrected components decide the opposite side themselves after measuring.",
  },
  {
    subject: "More than one flip",
    statement:
      "`resolvePlacement` runs once per open, so a flip cannot oscillate. A surface that still does not fit stays where the snap put it.",
  },
  {
    subject: "Live re-placement on resize or scroll",
    statement:
      "The measurement runs on the surface's first commit. After the window or the trigger moves, close and reopen the surface.",
  },
  {
    subject: "A cross-axis shift beyond the snap clamp",
    statement:
      "There is no `shift` or `avoidCollisions` prop. The runtime clamps inside the window and the corrected components add only the centre offset.",
  },
  {
    subject: "Placement animation",
    statement:
      "Nothing animates placement. Theming owns the runtime's motion surface, which has no transform or layout animation.",
  },
];

/** Every absence subject, in table order. */
export const placementAbsenceSubjects: ReadonlyArray<string> =
  placementAbsences.map((absence) => absence.subject);

const DOCUMENTED_PROPS = placementProps.map((row) => row.name);

/** The fields the installed `FloatingContentProps` declares itself. */
const floatingFieldsIn = (declarations: string): ReadonlyArray<string> =>
  interfaceFieldsIn(declarations, "FloatingContentProps").filter(
    (field) => field !== "children",
  );

/** A field's declared type inside one interface body, first occurrence. */
const declaredTypeIn = (
  declarations: string,
  interfaceName: string,
  field: string,
): string => {
  const body = new RegExp(
    `interface ${interfaceName}[^{\\n]*\\{([\\s\\S]*?)\\n\\}`,
    "u",
  ).exec(declarations)?.[1];
  const line = new RegExp(`^\\s*${field}\\??:\\s*([^;]+);`, "mu").exec(
    body ?? "",
  );
  return (line?.[1] ?? "").trim();
};

/** The value after `name =` inside a destructuring pattern, unquoted. */
const defaultIn = (source: string, field: string): string =>
  (new RegExp(`\\b${field}\\s*=\\s*([^,}]+)`, "u").exec(source)?.[1] ?? "")
    .trim()
    .replace(/^["']|["']$/gu, "");

/** The `<anchored>` call `FloatingLayer` renders, up to its children. */
const anchoredCallIn = (source: string): string => {
  const jsx = source.indexOf('_jsx("anchored"');
  const start = jsx >= 0 ? jsx : source.indexOf("<anchored");
  if (start < 0) return "";
  const end = source.indexOf("children:", start);
  return source.slice(start, end < 0 ? undefined : end);
};

/** How a row's claimed mechanism is recognised in its source. */
const mechanismIn: Record<PlacementCorrection, (source: string) => boolean> = {
  measured: (source) => source.includes("usePlacement("),
  "pass-through": (source) =>
    !source.includes("usePlacement(") && source.includes("side={side}"),
  fixed: (source) =>
    source.includes('side="bottom"') || source.includes("position={{ x: 0"),
  pointer: (source) => source.includes("position={point}"),
};

const MECHANISM_HINT: Record<PlacementCorrection, string> = {
  measured: "call usePlacement",
  "pass-through": "pass a caller's side and align to FloatingLayer",
  fixed:
    'place the surface with a literal side="bottom" or at the window origin',
  pointer: "anchor the surface at a measured point",
};

/** A component source file and its repo-relative path. */
export interface ComponentSourceFile {
  readonly path: string;
  readonly source: string;
}

export interface PlacementSurfaceInput {
  /** The installed `@gpuix/react` floating declarations. */
  readonly reactDeclarations: string;
  /** The installed `FloatingLayer` implementation. */
  readonly reactLayer: string;
  /** The installed `@gpuix/native` host declarations. */
  readonly nativeDeclarations: string;
  /** The installed `@gpuix/react` tooltip implementation. */
  readonly runtimeTooltip: string;
  /** `packages/components/src/internal/use-placement.ts`. */
  readonly usePlacementSource: string;
  /** Every `.ts`/`.tsx` file under `packages/components/src`. */
  readonly components: ReadonlyArray<ComponentSourceFile>;
}

/** Rows that name a file in this repository rather than an installed package. */
const isPackageRow = (row: PlacementSurfaceRow): boolean =>
  row.source.startsWith("packages/");

/**
 * Every claim the page makes about placement, checked against the installed
 * declarations, the shipped layer and every component source. An empty array
 * means they agree; each message names the member that drifted.
 */
export const placementSurfaceViolations = ({
  reactDeclarations,
  reactLayer,
  nativeDeclarations,
  runtimeTooltip,
  usePlacementSource,
  components,
}: PlacementSurfaceInput): ReadonlyArray<string> => {
  const declared = floatingFieldsIn(reactDeclarations);
  const anchoredFields = interfaceFieldsIn(nativeDeclarations, "AnchoredProps");
  const anchoredCall = anchoredCallIn(reactLayer);
  const componentByPath = new Map(
    components.map((file) => [file.path, file.source] as const),
  );
  const placementFiles = components.filter(
    (file) =>
      file.source.includes("usePlacement(") ||
      file.source.includes("FloatingLayer") ||
      file.source.includes("<anchored"),
  );
  const packageRows = placementSurfaces.filter(isPackageRow);
  const anchorDeclaration =
    new RegExp("^\\s*anchor\\?:\\s*([^;]+);", "mu").exec(
      nativeDeclarations,
    )?.[1] ?? "";

  return [
    // 1. The five props are exactly the installed declaration, types included.
    ...declared
      .filter((field) => !DOCUMENTED_PROPS.includes(field))
      .map(
        (field) =>
          `FloatingContentProps.${field} is declared and not documented`,
      ),
    ...placementProps
      .filter((row) => !declared.includes(row.name))
      .map(
        (row) =>
          `${row.name} is documented and not declared on FloatingContentProps`,
      ),
    ...placementProps.flatMap((row) => {
      const actual = declaredTypeIn(
        reactDeclarations,
        "FloatingContentProps",
        row.name,
      );
      return actual === row.type
        ? []
        : [`${row.name} is declared as ${actual}; the page says ${row.type}`];
    }),

    // 2. The layer's own defaults are the ones the page prints.
    ...placementProps.flatMap((row) => {
      const actual = defaultIn(reactLayer, row.name);
      return actual === row.default
        ? []
        : [`${row.name} defaults to ${actual}; the page says ${row.default}`];
    }),

    // 3. Each mapping is the expression the layer really passes.
    ...layerMapping.flatMap((row) =>
      anchoredCall.includes(`${row.to}: ${row.value}`)
        ? []
        : [`the layer no longer passes ${row.to}: ${row.value}`],
    ),
    ...layerMapping
      .filter((row) => !anchoredFields.includes(row.to))
      .map((row) => `AnchoredProps does not declare ${row.to}`),

    // 4. Every file that places a surface is a row, and every row still places one.
    ...placementFiles
      .filter((file) => !packageRows.some((row) => row.source === file.path))
      .map((file) => `${file.path} places a surface and has no placement row`),
    ...packageRows.flatMap((row) => {
      const source = componentByPath.get(row.source);
      if (source === undefined) {
        return [`${row.source} is documented and no longer places a surface`];
      }
      return mechanismIn[row.correction](source)
        ? []
        : [
            `${row.source} is documented as ${row.correction} and its source does not ${MECHANISM_HINT[row.correction]}`,
          ];
    }),

    // 5. The runtime tooltip default is the one the honest limitation names.
    ...(runtimeTooltip.includes('align = "center"')
      ? []
      : ['TooltipContent no longer defaults align to "center"']),
    ...placementSurfaces
      .filter(
        (row) =>
          row.source === "@gpuix/react/tooltip" &&
          row.correction !== "pass-through",
      )
      .map(
        (row) =>
          `TooltipContent is documented as ${row.correction}; the installed component passes its placement through`,
      ),

    // 6. Every absence is provable.
    ...(anchoredFields.includes("arrow")
      ? ["AnchoredProps declares an arrow, which the page says does not exist"]
      : []),
    ...(new RegExp("^\\s*(readonly )?fit\\??:", "mu").test(reactDeclarations)
      ? [
          "FloatingContentProps declares fit, which the React layer does not expose",
        ]
      : []),
    ...(anchorDeclaration.length === 0
      ? ["AnchoredProps no longer declares anchor"]
      : /"[A-Za-z]+"\s*\|/u.test(anchorDeclaration) &&
          !/element/iu.test(anchorDeclaration)
        ? []
        : ["AnchoredProps.anchor is no longer a corner union"]),
    ...["addEventListener", "requestAnimationFrame", "ResizeObserver"]
      .filter((token) => usePlacementSource.includes(token))
      .map(
        (token) =>
          `${token} appears in use-placement.ts, which the page says measures once per open`,
      ),
  ];
};
