import { typeTableTargets } from "./type-tables";

/**
 * The styling model (plan 606). GPUix has no CSS, no class attribute and no
 * stylesheets: a host element takes one `StyleDesc` object, and its values are
 * resolved from the theme. This module holds the three authored facts the
 * `/docs/styling` page needs — the field families, the concepts the runtime
 * does not have, and the field names a search document can promote — and the
 * guards that compare them with the installed `@gpuix/native` declarations.
 */
export interface StyleField {
  readonly name: string;
  readonly type: string;
}

/** The `StyleDesc` body only: the interface's own fields, not its uses. */
export const styleDescBody = (declarations: string): string => {
  const start = declarations.indexOf("interface StyleDesc");
  if (start < 0) return "";
  const open = declarations.indexOf("{", start);
  const close = declarations.indexOf("\n}", open);
  return open < 0 || close < 0 ? "" : declarations.slice(open + 1, close);
};

/**
 * `StyleDesc`'s fields in declaration order, with the type as written.
 * Exported so a fixture can prove the parser and the installed declarations
 * can prove the list, rather than either being trusted.
 */
export const styleFields = (declarations: string): ReadonlyArray<StyleField> =>
  [
    ...styleDescBody(declarations).matchAll(
      /^\s*([A-Za-z][A-Za-z0-9]*)\??:\s*(.+?);\s*$/gm,
    ),
  ].flatMap((match) => {
    const [, name, type] = match;
    return name === undefined || type === undefined ? [] : [{ name, type }];
  });

export interface StyleFieldFamily {
  /** The heading the page uses for this family of fields. */
  readonly title: string;
  /** Field-name prefixes this family owns. */
  readonly prefixes: ReadonlyArray<string>;
  /** Fields the prefixes miss, mostly the shorthand ones (`gap`). */
  readonly fields: ReadonlyArray<string>;
  /** A field the page's prose names, so the family cannot be an empty claim. */
  readonly anchor: string;
}

export const styleFieldFamilies: ReadonlyArray<StyleFieldFamily> = [
  {
    title: "Layout and flow",
    prefixes: [
      "display",
      "visibility",
      "flex",
      "align",
      "justify",
      "grid",
      "position",
      "top",
      "right",
      "bottom",
      "left",
      "overflow",
    ],
    fields: ["gap", "rowGap", "columnGap"],
    anchor: "gap",
  },
  {
    title: "Size",
    prefixes: ["min", "max"],
    fields: ["width", "height"],
    anchor: "width",
  },
  {
    title: "Spacing",
    prefixes: ["padding", "margin"],
    fields: [],
    anchor: "padding",
  },
  {
    title: "Borders and elevation",
    prefixes: ["border"],
    fields: ["boxShadow"],
    anchor: "borderColor",
  },
  {
    title: "Colour",
    prefixes: ["background"],
    fields: ["color", "opacity"],
    anchor: "backgroundColor",
  },
  {
    title: "Text",
    prefixes: ["font", "text", "line", "white"],
    fields: [],
    anchor: "lineClamp",
  },
  {
    title: "Interaction",
    prefixes: [],
    fields: [
      "cursor",
      "pointerEvents",
      "userSelect",
      "selectionColor",
      "hover",
      "active",
    ],
    anchor: "pointerEvents",
  },
];

/** Every family that claims `name`; the guard fails when this is not exactly one. */
export const familiesOf = (name: string): ReadonlyArray<StyleFieldFamily> =>
  styleFieldFamilies.filter(
    (family) =>
      family.fields.includes(name) ||
      family.prefixes.some((prefix) => name.startsWith(prefix)),
  );

/** The one family that owns `name`, if the catalogue classifies it. */
export const familyOf = (name: string): StyleFieldFamily | undefined =>
  familiesOf(name)[0];

/**
 * Every field name the runtime declares, authored once so a search document can
 * be built without `node:fs` in the bundle (the `sharedHostProps` pattern,
 * plan 587). `styleFieldViolations` fails when this list and the installed
 * declarations disagree in either direction.
 */
export const styleFieldNames: ReadonlyArray<string> = [
  "display",
  "visibility",
  "flexDirection",
  "flexWrap",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignItems",
  "alignSelf",
  "alignContent",
  "justifyContent",
  "gap",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumnMin",
  "gridRowMin",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "background",
  "backgroundColor",
  "color",
  "opacity",
  "borderWidth",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderColor",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "boxShadow",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "textAlign",
  "lineHeight",
  "whiteSpace",
  "textOverflow",
  "lineClamp",
  "textDecoration",
  "overflow",
  "overflowX",
  "overflowY",
  "cursor",
  "pointerEvents",
  "userSelect",
  "selectionColor",
  "hover",
  "active",
];

export interface AbsentConcept {
  /** The CSS idea a React developer reaches for. */
  readonly concept: string;
  /** The honest alternative in this runtime. */
  readonly replacement: string;
  /**
   * The `StyleDesc` field names that would mean the runtime gained this. Every
   * one must stay absent, so a dependency upgrade cannot leave the page
   * denying a capability it now has.
   */
  readonly wouldBeFields: ReadonlyArray<string>;
}

export const absentStylingConcepts: ReadonlyArray<AbsentConcept> = [
  {
    concept: "className and CSS classes",
    replacement: "Pass a StyleDesc object as the style prop.",
    wouldBeFields: ["className", "class", "classes"],
  },
  {
    concept: "Stylesheets and Tailwind",
    replacement:
      "There is no stylesheet pipeline; build the object from theme values.",
    wouldBeFields: ["stylesheet", "tailwind"],
  },
  {
    concept: "An sx prop",
    replacement: "style is the only styling prop, on every host element.",
    wouldBeFields: ["sx"],
  },
  {
    concept: "CSS custom properties",
    replacement:
      "useTheme() returns the resolved theme; alpha() derives a shade.",
    wouldBeFields: ["cssVariables", "customProperties", "variables"],
  },
  {
    concept: "Pseudo-classes (:hover, :active, :focus-visible)",
    replacement: "style.hover and style.active; focusRing(theme) for the ring.",
    wouldBeFields: ["pseudoClass", "selectors", "focusVisible"],
  },
  {
    concept: "Media queries",
    replacement:
      "Styles are resolved in JavaScript, so the app passes a different style for a different size.",
    wouldBeFields: ["mediaQuery", "mediaQueries", "breakpoint"],
  },
  {
    concept: "Letter spacing and tracking",
    replacement:
      "There is no letterSpacing field; a family's own spacing is what the runtime paints.",
    wouldBeFields: ["letterSpacing", "tracking"],
  },
  {
    concept: "!important",
    replacement:
      "The caller's object is spread after the component's, so a field you pass wins.",
    wouldBeFields: ["important"],
  },
];

/** Every way the authored catalogue can disagree with the installed runtime. */
export const styleFieldViolations = (input: {
  readonly declarations: string;
  readonly names: ReadonlyArray<string>;
  readonly families: ReadonlyArray<StyleFieldFamily>;
  readonly absent: ReadonlyArray<AbsentConcept>;
}): ReadonlyArray<string> => {
  const declared = styleFields(input.declarations).map((field) => field.name);
  const declaredSet = new Set(declared);
  const authoredSet = new Set(input.names);

  return [
    ...(declared.length === 0
      ? ["the installed declarations declare no StyleDesc field"]
      : []),
    ...(authoredSet.size === input.names.length
      ? []
      : ["the authored field list repeats a name"]),
    ...declared
      .filter((name) => !authoredSet.has(name))
      .map(
        (name) => `${name} is declared by StyleDesc but the catalogue omits it`,
      ),
    ...input.names
      .filter((name) => !declaredSet.has(name))
      .map((name) => `${name} is catalogued but StyleDesc does not declare it`),
    ...declared
      .filter((name) => familiesOf(name).length !== 1)
      .map(
        (name) =>
          `${name} belongs to ${familiesOf(name).length} field families`,
      ),
    ...input.families
      .filter((family) => family.title.trim().length === 0)
      .map((family) => `${family.anchor} anchors a family with no title`),
    ...input.families
      .filter((family) => !declaredSet.has(family.anchor))
      .map(
        (family) =>
          `${family.anchor} anchors ${family.title} but is not a field`,
      ),
    ...input.absent.flatMap((row) =>
      row.wouldBeFields
        .filter((name) => declaredSet.has(name))
        .map(
          (name) =>
            `${row.concept} is claimed absent, but StyleDesc declares ${name}`,
        ),
    ),
    ...input.absent
      .filter((row) => row.replacement.trim().length === 0)
      .map((row) => `${row.concept} has no replacement`),
  ];
};

/**
 * The page's own guards: every family and anchor it claims is named in the MDX,
 * the absence table is the rendered `<AbsentStylingConcepts />` rather than a
 * retyped copy, and the supported surface is a real `<auto-type-table>` for
 * `StyleDesc` rather than a heading with no table.
 */
export const stylingPageViolations = (input: {
  readonly mdx: string;
  readonly families: ReadonlyArray<StyleFieldFamily>;
  readonly absent: ReadonlyArray<AbsentConcept>;
}): ReadonlyArray<string> => {
  const targets = typeTableTargets(input.mdx);
  return [
    ...(targets.some((target) => target.name === "StyleDesc")
      ? []
      : ["the page has no <auto-type-table> for StyleDesc"]),
    ...input.families
      .filter((family) => !input.mdx.includes(family.title))
      .map((family) => `the page does not name the ${family.title} family`),
    ...input.families
      .filter((family) => !input.mdx.includes(family.anchor))
      .map((family) => `the page does not name ${family.anchor}`),
    ...(input.absent.length > 0 && !input.mdx.includes("<AbsentStylingConcepts")
      ? ["the page does not render <AbsentStylingConcepts />"]
      : []),
  ];
};
