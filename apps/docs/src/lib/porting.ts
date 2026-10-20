/**
 * The adoption tables on `/docs/porting-from-shadcn` (plan 611). A reader who
 * knows shadcn/ui asks three questions the rest of the site cannot answer in
 * one place: which component replaces the one I have, what happens to the
 * React idioms I type without thinking (`className`, `cva`, `asChild`,
 * `data-state`), and which of my screens have no counterpart here yet.
 *
 * The answers are data because each one is a claim about the repository: a
 * mapped component must be a registry record, a "not shipped" row must be a
 * real Tier 3–5 target that is still `todo`, and a concept row must name a file
 * that exists and a page that explains it. `porting-page.test.tsx` fails on any
 * drift, so the page cannot promise a component that was renamed or deny one
 * that has shipped.
 *
 * Plain arrays: this module reaches the client bundle, and the site's
 * architecture guard forbids `effect/*` and `node:*` outside test boundaries.
 */

/** A shadcn/ui component and the registry record that replaces it. */
export interface PortedComponent {
  /** The shadcn/ui name as its own docs write it. */
  readonly shadcn: string;
  /** A record slug; the guard requires a delivered record. */
  readonly slug: string;
  /** The shape difference a reader must know before pasting code. */
  readonly note: string;
}

export const portedComponents: ReadonlyArray<PortedComponent> = [
  {
    shadcn: "Button",
    slug: "button",
    note: "`onActivate`, not `onClick`: Enter fires on key down, Space on key up.",
  },
  {
    shadcn: "Badge",
    slug: "badge",
    note: "A tone role paints it; it is never clickable or focusable.",
  },
  {
    shadcn: "Card",
    slug: "card",
    note: "The same parts (`CardHeader`, `CardContent`, `CardFooter`) over host boxes.",
  },
  {
    shadcn: "Avatar",
    slug: "avatar",
    note: "Initials are derived unicode-safely; the image is the runtime's inline source.",
  },
  {
    shadcn: "Alert",
    slug: "alert",
    note: "`tone` plus an optional dismiss control; no `variant` string.",
  },
  {
    shadcn: "Input",
    slug: "text-input",
    note: "A `Field` wires the label, description and error to one control.",
  },
  {
    shadcn: "Textarea",
    slug: "text-area",
    note: "Enter is always a newline: the runtime trades submit for it.",
  },
  {
    shadcn: "Label",
    slug: "label",
    note: "The sighted name; `labelledBy` is how the runtime links a field to it.",
  },
  {
    shadcn: "Checkbox",
    slug: "checkbox",
    note: "Press and checked are the component's own contract; `aria-checked` is real.",
  },
  {
    shadcn: "Radio Group",
    slug: "radio-group",
    note: "Options arrive as data, so the group owns the roving index and arrows.",
  },
  {
    shadcn: "Select",
    slug: "select",
    note: "GPUix's headless `Select`, themed here; the open state stays the runtime's.",
  },
  {
    shadcn: "Switch",
    slug: "switch",
    note: "Takes effect immediately; `invalid` is a prop, not a colour class.",
  },
  {
    shadcn: "Slider",
    slug: "slider",
    note: "The value maths is a pure module; the track is a `div` with a key contract.",
  },
  {
    shadcn: "Progress",
    slug: "progress",
    note: "A determined value painted from tokens; there is no CSS transition.",
  },
  {
    shadcn: "Tooltip",
    slug: "tooltip",
    note: "GPUix's headless `Tooltip`, themed here; delay and dismissal stay native.",
  },
  {
    shadcn: "Skeleton",
    slug: "skeleton",
    note: "A block that pulses its opacity; no `prefers-reduced-motion` media query exists.",
  },
  {
    shadcn: "Separator",
    slug: "separator",
    note: "A 1 px box with an orientation prop; per-side colour is not available.",
  },
  {
    shadcn: "Tabs",
    slug: "tabs",
    note: "Parts with `value`/`defaultValue`; automatic or manual activation.",
  },
  {
    shadcn: "Accordion",
    slug: "accordion",
    note: "Compose item, trigger and content; single or multiple, collapsible or not.",
  },
  {
    shadcn: "Collapsible",
    slug: "collapsible",
    note: "Unmounts its content while closed, so a closed panel costs nothing.",
  },
  {
    shadcn: "Breadcrumb",
    slug: "breadcrumb",
    note: "Collapsing keeps the first and last items instead of truncating blindly.",
  },
  {
    shadcn: "Pagination",
    slug: "pagination",
    note: "Edge-aware ranges; the current page is a no-op, not a disabled link.",
  },
  {
    shadcn: "Dialog",
    slug: "dialog",
    note: "No `DialogPortal`: paint order is the dismiss stack, and Escape closes the topmost.",
  },
  {
    shadcn: "Alert Dialog",
    slug: "confirm-dialog",
    note: "Cancel holds initial focus, the caller closes it, and `loading` locks both dismissals.",
  },
  {
    shadcn: "Popover",
    slug: "popover",
    note: '`side`/`align`/`sideOffset`; `align="center"` is measured off by half a panel.',
  },
  {
    shadcn: "Dropdown Menu",
    slug: "dropdown-menu",
    note: "One row registry owns the highlight; submenus compose from the same parts.",
  },
  {
    shadcn: "Context Menu",
    slug: "context-menu",
    note: "Opens at the pointer from the runtime's aux-click event.",
  },
  {
    shadcn: "Command",
    slug: "command-menu",
    note: "Subsequence ranking over actions you pass in, inside a Dialog.",
  },
  {
    shadcn: "Combobox",
    slug: "combobox",
    note: "GPUix's headless combobox with pre-ranked items and typed value semantics.",
  },
  {
    shadcn: "Sonner",
    slug: "toast",
    note: "A provider plus a viewport; the queue and its timers are Effect-owned.",
  },
  {
    shadcn: "Toggle",
    slug: "toggle",
    note: "A button that stays on to set a mode; shadcn's `ToggleGroup` has no counterpart yet.",
  },
  {
    shadcn: "Input OTP",
    slug: "otp-field",
    note: "One cell group; the key contract runs on key up, and a real clipboard paste is unverified.",
  },
  {
    shadcn: "Date Picker",
    slug: "date-picker",
    note: "A day picker; a separate time picker is documented as out of scope.",
  },
  {
    shadcn: "Form",
    slug: "form",
    note: "Schema-driven: a valid submit decodes to a typed value, not a `FormData`.",
  },
  {
    shadcn: "Field",
    slug: "inline-validation",
    note: "`Field`, `FieldLabel`, `FieldDescription`, `FieldError` and `FieldInput`.",
  },
  {
    shadcn: "Empty",
    slug: "empty-state",
    note: "A panel with a title, body and one action; it paints no surface of its own.",
  },
  {
    shadcn: "Navigation Menu",
    slug: "navigation-menu",
    note: "A value-driven navigation region, not a hover mega-menu.",
  },
  {
    shadcn: "Drawer",
    slug: "drawer",
    note: "One edge surface covers shadcn's `Drawer` and `Sheet`, with Dialog's rules.",
  },
  {
    shadcn: "Scroll Area",
    slug: "scroll-area",
    note: "Sets the overflow axes; the runtime paints the scrollbar, so the thumb cannot be tinted.",
  },
  {
    shadcn: "Carousel",
    slug: "carousel",
    note: "Discrete previous/next with arrow keys; there is no transform, so no sliding track.",
  },
  {
    shadcn: "Kbd",
    slug: "keycap",
    note: "Displays a shortcut chord; it documents a binding, it does not register one.",
  },
];

/** A React idiom from the shadcn way of working and what replaces it here. */
export interface PortedConcept {
  /** The idiom, named the way a reader would say it. */
  readonly concept: string;
  readonly shadcn: string;
  readonly here: string;
  /** Repo-relative file that proves the claim; the guard resolves it. */
  readonly evidence: string;
  /** The site page that explains it; the guard resolves it too. */
  readonly href: string;
}

export const portedConcepts: ReadonlyArray<PortedConcept> = [
  {
    concept: "className and Tailwind utilities",
    shadcn: "A string of utility classes on every element.",
    here: "One `StyleDesc` object built from theme values.",
    evidence: "packages/primitives/src/core/style.ts",
    href: "/docs/styling",
  },
  {
    concept: "cva + cn",
    shadcn: "Variant maps merged with `tailwind-merge`.",
    here: "Variant tables over colour roles; the caller's object is spread last.",
    evidence: "packages/primitives/src/core/variants.ts",
    href: "/docs/styling",
  },
  {
    concept: "CSS variables + next-themes",
    shadcn: "`:root` variables flipped by a class.",
    here: "`useTheme()` returns resolved values; the app owns which mode is active.",
    evidence: "packages/tokens/src/theme.ts",
    href: "/docs/dark-mode",
  },
  {
    concept: "Radix primitives and portals",
    shadcn: "Portalled surfaces with a focus scope per primitive.",
    here: "Parts over host elements, one dismiss stack, no portal.",
    evidence: "packages/components/src/internal/dismiss-layer.ts",
    href: "/docs/component-api",
  },
  {
    concept: "asChild + Slot",
    shadcn: "The child element becomes the trigger.",
    here: "A part renders its own host element; compose by nesting parts.",
    evidence: "packages/primitives/src/components/Button.tsx",
    href: "/docs/component-api",
  },
  {
    concept: "data-state and data-slot attributes",
    shadcn: "State and identity as DOM attributes, styled by CSS.",
    here: "State arrives as props and style variants; the only attribute surface is `HostProps`.",
    evidence: "apps/docs/src/lib/host-props.ts",
    href: "/docs/component-api",
  },
  {
    concept: "focus-visible: utilities",
    shadcn: "A pseudo-class paints the ring for keyboard users only.",
    here: "Components call `focusRing(theme)`; pointer focus looks the same.",
    evidence: "packages/tokens/src/styles.ts",
    href: "/docs/accessibility",
  },
];

/** A shadcn/ui component with no counterpart, mapped to its roadmap target. */
export interface UnportedComponent {
  readonly shadcn: string;
  /** A `COMPONENTS.md` Tier 3–5 target name, verbatim. */
  readonly roadmap: string;
  readonly note: string;
}

export const unportedComponents: ReadonlyArray<UnportedComponent> = [
  {
    shadcn: "Data Table",
    roadmap: "Tables",
    note: "Grid plus `div` rows; sortable and virtualized tables are their own targets.",
  },
  {
    shadcn: "Resizable",
    roadmap: "Resizable split panes",
    note: "Tier 4, `packages/docking`.",
  },
  {
    shadcn: "Sidebar",
    roadmap: "Collapsible sidebars",
    note: "Tier 4; a collapsible section is not a workspace sidebar.",
  },
  {
    shadcn: "Menubar",
    roadmap: "Application menus",
    note: "Tier 4; Navigation Menu is a page menu, not the app menu bar.",
  },
  {
    shadcn: "Chart",
    roadmap: "Charts",
    note: "Tier 3; no native chart renderer is verified.",
  },
];

/** Every shadcn name the page maps, delivered or not — one row per name. */
export const shadcnNames: ReadonlyArray<string> = [
  ...portedComponents.map((component) => component.shadcn),
  ...unportedComponents.map((component) => component.shadcn),
];
