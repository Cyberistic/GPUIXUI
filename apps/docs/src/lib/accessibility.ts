/**
 * The pinned runtime's ARIA surface and the honest substitute for every
 * attribute it does not accept (plan 565).
 *
 * The arrays below are a claim about `@gpuix/native@0.10.0`, not a copy of
 * documentation: `accessibility.test.ts` parses `interface HostProps` from the
 * installed declarations and fails when the two disagree in either direction.
 * The page renders them through `<AriaSupportTable />`; nothing retypes a row.
 */
export interface SupportedAttribute {
  readonly attribute: string;
  readonly meaning: string;
}

export interface MissingAttribute {
  readonly attribute: string;
  readonly substitute: string;
}

/** The `aria-*` keys the pinned host props accept. */
export const supportedAria: ReadonlyArray<SupportedAttribute> = [
  {
    attribute: "aria-label",
    meaning:
      "The accessible name. Every icon-only control and every named surface requires one.",
  },
  {
    attribute: "aria-description",
    meaning:
      "Extra text announced after the name, role and value — the runtime's only description channel.",
  },
  {
    attribute: "aria-id",
    meaning:
      "A stable author id exposed to automation. It names nothing to a reader.",
  },
  {
    attribute: "aria-expanded",
    meaning:
      "Open state for a disclosure, menu trigger, combobox or navigation trigger.",
  },
  {
    attribute: "aria-selected",
    meaning:
      "Selected state for a tab, option, row or page — also the stand-in for `aria-current`.",
  },
  {
    attribute: "aria-valuetext",
    meaning:
      "The readable value of a slider, meter or bar, and the carrier for a state the runtime has no attribute for.",
  },
  {
    attribute: "aria-level",
    meaning: "Heading level, 1-based.",
  },
];

/** The non-ARIA host props that carry the accessibility contract. */
export const supportedHostProps: ReadonlyArray<SupportedAttribute> = [
  {
    attribute: "role",
    meaning:
      "The AccessKit role. A node enters the accessibility tree only with a role; `presentation` removes it.",
  },
  {
    attribute: "tabIndex",
    meaning:
      "The native tab order. `0` is a normal stop; there is no positive order.",
  },
  {
    attribute: "autoFocus",
    meaning:
      "Takes native focus on mount. It dispatches no `onFocus`, so it is not a focus event.",
  },
];

/** Every attribute the pinned runtime lacks, with what the library does instead. */
export const missingAria: ReadonlyArray<MissingAttribute> = [
  {
    attribute: "aria-checked",
    substitute:
      "Checkbox and Switch report `checked`, `unchecked` or `mixed` through `aria-valuetext`.",
  },
  {
    attribute: "aria-pressed",
    substitute:
      "Toggle reports `pressed` / `not pressed` through `aria-valuetext`.",
  },
  {
    attribute: "aria-valuenow",
    substitute:
      "The value rides on `aria-valuetext` for Slider, RangeSlider, Meter and Progress.",
  },
  {
    attribute: "aria-valuemin",
    substitute:
      "The range comes from the component's own `min` prop; the announced value does not state the bound.",
  },
  {
    attribute: "aria-valuemax",
    substitute:
      "The range comes from the component's own `max` prop; the announced value does not state the bound.",
  },
  {
    attribute: "aria-disabled",
    substitute:
      "A disabled control is read-only where the host allows it, leaves the tab order, paints the disabled roles and guards its handlers.",
  },
  {
    attribute: "aria-invalid",
    substitute:
      "An invalid field paints the destructive border and shows its message as visible text.",
  },
  {
    attribute: "aria-labelledby",
    substitute:
      "A control takes a required `label`; `Label` is the visible text beside it and the control owns its own `aria-label`.",
  },
  {
    attribute: "aria-describedby",
    substitute:
      "A required `label` plus visible description text; `aria-description` carries the short extra text the runtime accepts.",
  },
  {
    attribute: "aria-controls",
    substitute:
      "No relationship is exposed; the panel is named by its own value or label.",
  },
  {
    attribute: "aria-modal",
    substitute:
      'Dialog uses `role="dialog"`, a required `label`, a Tab trap and focus return. It does not claim modality to the tree.',
  },
  {
    attribute: "aria-haspopup",
    substitute:
      "A trigger exposes `aria-expanded` where the runtime accepts it; the opened surface supplies its own role.",
  },
  {
    attribute: "aria-activedescendant",
    substitute:
      "Native focus moves to the highlighted row in CommandMenu, Combobox and menus instead of a virtual active descendant.",
  },
  {
    attribute: "aria-current",
    substitute:
      "The current page, tab or step uses `aria-selected`, supported by colour and text.",
  },
  {
    attribute: "aria-live",
    substitute:
      'Toasts use `role="status"` and alerts `role="alert"`; announcement of a later insertion is not verified.',
  },
  {
    attribute: "aria-atomic",
    substitute:
      "A status region is marked with a role; there is no atomicity policy to set.",
  },
  {
    attribute: "aria-busy",
    substitute:
      "A loading control announces `Loading` through `aria-description`.",
  },
  {
    attribute: "aria-orientation",
    substitute:
      "Orientation is the layout plus the arrow pair; Tabs and Slider take `orientation`, but no attribute is exposed.",
  },
  {
    attribute: "aria-multiselectable",
    substitute:
      "A multiple List announces each row's `aria-selected`; the group declares no multi-select attribute.",
  },
  {
    attribute: "aria-keyshortcuts",
    substitute:
      "Keycap displays a chord as text; the component never binds or announces it.",
  },
  {
    attribute: "aria-autocomplete",
    substitute:
      "Combobox exposes its open state and ranked list; there is no autocomplete hint.",
  },
  {
    attribute: "aria-required",
    substitute:
      "Required is the consumer's visible label and validation; the control has no required attribute.",
  },
  {
    attribute: "aria-readonly",
    substitute:
      "The native input's `readOnly` is the read-only state; no separate attribute is exposed.",
  },
];

/** The `HostProps` interface body, or `""` when the declaration is absent. */
const hostPropsBody = (declarations: string): string => {
  const start = declarations.indexOf("interface HostProps");
  if (start < 0) return "";
  const open = declarations.indexOf("{", start);
  const close = declarations.indexOf("\n}", open);
  return open < 0 || close < 0 ? "" : declarations.slice(open + 1, close);
};

/**
 * The `aria-*` keys `HostProps` declares, in declaration order. Exported so a
 * fixture test can prove the parser rather than trusting it.
 */
export const ariaAttributesInHostProps = (
  declarations: string,
): ReadonlyArray<string> =>
  [
    ...hostPropsBody(declarations).matchAll(/^\s*"(aria-[a-z]+)"\??:/gm),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/**
 * Every way the module can disagree with the installed declarations, in both
 * directions. Pure, so each rule has a fixture test and the real run is one
 * call with the installed typings.
 */
export const accessibilityViolations = (input: {
  readonly declarations: string;
  readonly supported: ReadonlyArray<SupportedAttribute>;
  readonly missing: ReadonlyArray<MissingAttribute>;
}): ReadonlyArray<string> => {
  const installed = ariaAttributesInHostProps(input.declarations);
  const installedSet = new Set(installed);
  const supported = new Set(input.supported.map((row) => row.attribute));
  const missing = new Set(input.missing.map((row) => row.attribute));

  return [
    ...(installed.length === 0
      ? ["the installed declarations declare no HostProps aria attribute"]
      : []),
    ...(supported.size === input.supported.length
      ? []
      : ["the supported list repeats an attribute"]),
    ...(missing.size === input.missing.length
      ? []
      : ["the absent list repeats an attribute"]),
    ...[...supported]
      .filter((attribute) => !installedSet.has(attribute))
      .map(
        (attribute) =>
          `${attribute} is listed as supported but HostProps does not declare it`,
      ),
    ...[...missing]
      .filter((attribute) => installedSet.has(attribute))
      .map(
        (attribute) =>
          `${attribute} is listed as absent but HostProps declares it`,
      ),
    ...installed
      .filter(
        (attribute) => !supported.has(attribute) && !missing.has(attribute),
      )
      .map(
        (attribute) =>
          `${attribute} is declared by HostProps but neither list classifies it`,
      ),
    ...[...supported]
      .filter((attribute) => missing.has(attribute))
      .map(
        (attribute) =>
          `${attribute} is classified as both supported and absent`,
      ),
    ...input.supported
      .filter((row) => row.meaning.trim().length === 0)
      .map((row) => `${row.attribute} has no meaning`),
    ...input.missing
      .filter((row) => row.substitute.trim().length === 0)
      .map((row) => `${row.attribute} has no substitute`),
  ];
};
