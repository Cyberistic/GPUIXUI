/**
 * The accessibility contract, as data and total functions.
 *
 * The library's own suites hold every shipped colour set to these pairs and
 * floors, and {@link themeContrastFailures} exposes the same check so a
 * consumer can hold an edited platform style or brand theme to it in one
 * assertion. Keeping the pair list here — rather than in test-only code — means
 * the documented contract and the tests that enforce it cannot drift.
 */

import { alpha, colorRoles, isHexColor, type ThemeColors } from "./color.js";
import { skeletonPulseOpacity } from "./motion.js";
import { filledControlFamilies, statusTones } from "./styles.js";
import type { Theme, ThemeContrast } from "./theme.js";

/** The floor class a documented pair belongs to. */
export type ContrastPairClass =
  | "body"
  | "secondary"
  /** An inactive label: dimmed but readable (a design floor, not a WCAG one). */
  | "inactive"
  | "boundary"
  /**
   * A solid role painted as a glyph, a bar or a dot rather than behind text.
   * WCAG's non-text requirement (3:1, 4.5:1 at AAA) is the same number the
   * boundary class uses; the separate name records the intent, so a fill's
   * 1.05:1 wash floor cannot be mistaken for a mark's floor.
   */
  | "mark"
  /** One surface must be perceivable against another (`xSoft` on a canvas). */
  | "surface"
  /**
   * One designed state of a fill against the state before it. A hover or a
   * press that is not perceivable is not a state, so every filled family's
   * `xHover` is held to its `x` and its `xActive` to its `xHover`. The floor is
   * the same at every contrast level: the change is a state, not text.
   */
  | "step"
  /** A decorative border (`border`) must stay visible on its surface. */
  | "divider";

/** A role pair and the floor class it belongs to. */
export type ContrastPair = readonly [
  keyof ThemeColors,
  keyof ThemeColors,
  ContrastPairClass,
];

const softSurfaceRoles = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

/**
 * The base surfaces a soft status panel can occupy. The quiet panel is the
 * sidebar and settings group surface — a status badge or a small Alert sits
 * there, and the platform light variants change `muted` while inheriting the
 * identity's tints, so it is held to the same floor as the canvas.
 */
const softSurfacePairs: readonly ContrastPair[] = softSurfaceRoles.flatMap(
  (role) =>
    (["background", "card", "popover", "muted"] as const).map(
      (background): ContrastPair => [role, background, "surface"],
    ),
);

/**
 * The surfaces a loading placeholder sits on beyond the plain ones: the quiet
 * panel of a sidebar list and the four washes a loading row paints — pointer
 * hover, press, the `accent` fill a selectable list row uses on hover, and the
 * selected fill. A skeleton row is hovered, pressed and selected like any other,
 * and a placeholder that vanishes into the wash is a failed loading state, so
 * each is held to the surface floor. Unlike a soft status chip it has no
 * designed edge to keep its shape if the fill matches.
 */
const skeletonSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

/**
 * The fills that must stay perceivable on the surfaces they sit on: the soft
 * status tints and the loading skeleton.
 */
const surfacePairs: readonly ContrastPair[] = [
  ...softSurfacePairs,
  ...skeletonSurfaces.map(
    (background): ContrastPair => ["skeleton", background, "surface"],
  ),
];

/**
 * The dim frame of a loading pulse. A `Skeleton` alternates the role with
 * `skeletonPulseOpacity` of it, so half of every cycle is the role composited
 * over the surface behind it. Measured as a composite, like the selection wash
 * and the modal scrim: an opaque pair cannot see a fade.
 */
export const skeletonPulsePairs: readonly ContrastPair[] = skeletonSurfaces.map(
  (background): ContrastPair => ["skeleton", background, "surface"],
);

/**
 * The surfaces a value indicator's unfilled groove sits on. A progress bar,
 * meter or slider rail can be placed on the four base surfaces, a selectable
 * row's persistent `accent` fill and a selected row's `selected` fill. The
 * momentary `hover`/`active` washes are deliberately absent: the filled part of
 * the indicator still carries the value while the pointer is down, and the XP
 * light palette has no track that clears both the 1.05:1 wash floor and the
 * 3:1 mark floor at once.
 */
const trackSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "accent",
  "selected",
] as const;

/** The track measured against every surface it is painted on. */
export const trackSurfacePairs: readonly ContrastPair[] = trackSurfaces.map(
  (background): ContrastPair => ["track", background, "surface"],
);

/**
 * The filled part of a value indicator is a mark, not a wash: a progress
 * segment that matches its groove is a bar with no value. The four
 * `PROGRESS_TONES` in `primitives` are `primary`, `success`, `destructive` and
 * `muted` (which paints `mutedForeground`), so all four are held to the mark
 * floor on the track.
 */
export const trackMarkPairs: readonly ContrastPair[] = [
  ["primary", "track", "mark"],
  ["success", "track", "mark"],
  ["destructive", "track", "mark"],
  ["mutedForeground", "track", "mark"],
];

/**
 * The designed edge around each soft status surface. It is a decorative border
 * on its own fill, so the divider floor applies: 1.05:1 by default and 3:1 at
 * high contrast, where the 30% mixture it replaced measured 1.12:1.
 */
const softBorderPairs: readonly ContrastPair[] = [
  ["infoSoftBorder", "infoSoft", "divider"],
  ["successSoftBorder", "successSoft", "divider"],
  ["warningSoftBorder", "warningSoft", "divider"],
  ["destructiveSoftBorder", "destructiveSoft", "divider"],
];

/**
 * The surfaces a status chip occupies — soft or solid. A Badge sits on the
 * plain surfaces, the quiet panel and the four washes a row paints, so a soft
 * chip's designed edge is the boundary a reader sees (its fill is deliberately
 * close to the row wash, plan 300) and a solid chip's fill is the shape; both
 * are held to the perceivability floor on the same list.
 */
const chipSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

/** Each soft status edge measured on the surfaces a chip sits on. */
export const softBorderSurfacePairs: readonly ContrastPair[] =
  statusTones.flatMap((tone) =>
    chipSurfaces.map(
      (background): ContrastPair => [
        `${tone}SoftBorder`,
        background,
        "divider",
      ],
    ),
  );

/**
 * The soft status fills a plain divider is painted on. A tone-tinted Alert can
 * separate a footer or an action row with a line, and the divider must stay
 * visible there like it does on the canvas.
 */
const softDividerPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["border", background, "divider"],
);

/**
 * The state washes a row paints behind its own text: pointer hover, press, the
 * accent a selectable row uses on hover, and the selected fill. Secondary text
 * sits on all four, so the `secondary` floor applies to each.
 */
const stateWashes = ["hover", "active", "accent", "selected"] as const;

const secondaryTextPairs: readonly ContrastPair[] = stateWashes.map(
  (background): ContrastPair => ["mutedForeground", background, "secondary"],
);

/**
 * The field's own secondary text. A time picker paints the separator between
 * its segments and its clear control on the `input` fill with
 * `mutedForeground`, so the secondary floor applies to the surface a field
 * paints for its own chrome, not only to the plain surfaces and the row washes.
 */
const fieldSecondaryPairs: readonly ContrastPair[] = [
  ["mutedForeground", "input", "secondary"],
];

/**
 * The fills a bordered control paints behind its own edge: a secondary
 * control's resting, hovered and pressed fills, the hover and pressed washes an
 * outline control uses, and the accent family a pressed outline toggle takes —
 * its resting fill and the designed hover and press it steps through. `border`
 * is painted on all eight, so the divider floor applies to each.
 */
const controlFillRoles = [
  "secondary",
  "secondaryHover",
  "secondaryActive",
  "hover",
  "active",
  "accent",
  "accentHover",
  "accentActive",
] as const;

const controlFillPairs: readonly ContrastPair[] = controlFillRoles.map(
  (background): ContrastPair => ["border", background, "divider"],
);

/**
 * The selected row fill an outline control keeps its edge on. A selectable row
 * paints `selected` behind its children and the outline Button variant paints
 * no fill at rest — only a `border` edge — so the edge lands on the row, as
 * does a separator inside one.
 */
const selectedRowEdgePairs: readonly ContrastPair[] = [
  ["border", "selected", "divider"],
];

/**
 * The interactive fills a control or a row paints as its own shape: the two
 * generic washes, the accent family at rest, hover and press, the selected
 * fill, and the filled-action families at rest, hover and press. A filled
 * control is a surface, so its fill has to stay perceivable on the surface
 * behind it.
 */
export const stateFillRoles = [
  "primary",
  "primaryHover",
  "primaryActive",
  "secondary",
  "secondaryHover",
  "secondaryActive",
  "destructive",
  "destructiveHover",
  "destructiveActive",
  "accent",
  "accentHover",
  "accentActive",
  "hover",
  "active",
  "selected",
] as const;

/**
 * The surfaces an interactive fill is painted on: the canvas, a card, a
 * popover (a menu item) and the quiet `muted` panel (a sidebar row or a
 * settings-group control). A fill that matches its panel is not a state.
 */
export const stateFillSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

/** Every interactive fill, measured on each surface it paints on. */
export const stateFillSurfacePairs: readonly ContrastPair[] =
  stateFillRoles.flatMap((fill) =>
    stateFillSurfaces.map(
      (background): ContrastPair => [fill, background, "surface"],
    ),
  );

/** The interactive compositions, so a later fill list does not repeat one. */
const stateFillCompositions: ReadonlySet<string> = new Set(
  stateFillSurfacePairs.map(
    ([foreground, background]) => `${foreground}|${background}`,
  ),
);

/**
 * The solid status fill on the surfaces a chip occupies. The solid roles carry a
 * measured foreground (`xForeground` on `x`), so they are designed as fills; the
 * fill half of that pair was the one no list measured, because plan 309 holds
 * the *interactive* fills and a status chip is not interactive. A status dot or
 * label is a different class: it is `xText` at the secondary floor, because the
 * light `warning` fill is 1.78:1 on the canvas, under the 3:1 a mark needs. A
 * solid chip is a fill, so it is held to the perceivability floor where it is
 * painted. `destructive` is also an action fill, so the four base surfaces it
 * already has through `stateFillSurfacePairs` are not repeated.
 */
export const statusFillPairs: readonly ContrastPair[] = statusTones
  .flatMap((tone) =>
    chipSurfaces.map(
      (background): ContrastPair => [tone, background, "surface"],
    ),
  )
  .filter(
    ([foreground, background]) =>
      !stateFillCompositions.has(`${foreground}|${background}`),
  );

/**
 * The designed steps within each filled family. A filled control walks
 * `x` → `xHover` → `xActive`, and each step must be perceivable against the
 * fill before it, or the pointer state is invisible. `filled-states.test.ts`
 * holds the shipped themes to the rule; these pairs publish the same rule
 * through {@link themeContrastFailures}, so an edited theme cannot collapse a
 * hover or a press while every fill-on-surface pair still passes.
 */
export const stateStepPairs: readonly ContrastPair[] =
  filledControlFamilies.flatMap(
    (family): ReadonlyArray<ContrastPair> => [
      [`${family}Hover`, family, "step"],
      [`${family}Active`, `${family}Hover`, "step"],
    ],
  );

/**
 * The generic pointer ladder. A ghost or outline control paints no fill at
 * rest, the `hover` wash under the pointer and the `active` wash while pressed;
 * the shipped secondary control still paints the same two washes (plan 334)
 * while it migrates to the designed family. A press that is not a step past the
 * hover it follows is not a press, exactly the rule {@link stateStepPairs}
 * publishes for the filled families.
 */
export const washStepPairs: readonly ContrastPair[] = [
  ["active", "hover", "step"],
];

/**
 * The selection step. A selectable list row paints `accent` under the pointer
 * and `selected` once it is chosen, so the two fills are the state before and
 * after a click. In the identity (both modes, both contrast levels) and macOS
 * light they were the same role value, and Windows light, macOS dark and XP
 * light sat under the step floor — hovering one row looked like selecting
 * another, and clicking a hovered row changed nothing. The pair publishes the
 * same rule the filled families and the wash ladder carry.
 */
export const selectionStepPairs: readonly ContrastPair[] = [
  ["selected", "accent", "step"],
];

/**
 * The solid roles painted as marks, and the surfaces they sit on. A progress
 * segment (`primitives/src/core/style.ts` `progressFillStyle`) and a slider fill
 * paint over the `muted` track; a slider thumb rings its own `input` fill with
 * the same role; a rating star and a combobox check are glyphs on the surface
 * they sit on — a selected option's check also sits on the `hover` wash the row
 * paints while highlighted; a timeline's current dot is a `primary` dot on the
 * canvas, card, popover or quiet panel. A mark is the information, so a fill
 * that matches its surface is a failed state, not a subtle one.
 */
const markSurfaces = ["background", "card", "popover", "muted"] as const;

/** The solid roles the library paints as a mark. */
export const markRoles = ["primary", "success", "destructive"] as const;

/**
 * A selected combobox option's check glyph on the wash it highlights with.
 * `rowStyle` paints `hover` behind a highlighted option, so the check has to
 * stay a mark there, not only on the popover at rest.
 */
const comboboxCheckPairs: readonly ContrastPair[] = [
  ["primary", "hover", "mark"],
];

/** Every mark on every surface it can sit on, plus the thumb's own fill. */
export const markPairs: readonly ContrastPair[] = [
  ...markRoles.flatMap((role) =>
    markSurfaces.map((background): ContrastPair => [role, background, "mark"]),
  ),
  ["primary", "input", "mark"],
  ["destructive", "input", "mark"],
  ...comboboxCheckPairs,
];

/**
 * The surfaces an inactive label paints on, beyond the soft status fills: its
 * own `disabled` fill, the plain surfaces a ghost disabled action sits on, and
 * the row washes a disabled control inside a hovered or selected row paints. A
 * disabled `Select` item is the shipped case — it paints `disabledForeground` on
 * the menu's `popover` with no fill behind it.
 */
const inactiveBaseSurfaces = [
  "disabled",
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

/**
 * The soft status fills a disabled action sits on. A tone-tinted Alert carries
 * actions — Retry, Undo, Dismiss — and one can be unavailable while the panel is
 * open, so the label needs the inactive floor there like it does on a plain
 * surface.
 */
export const inactiveSoftPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["disabledForeground", background, "inactive"],
);

/** Every surface an inactive label paints on, in documentation order. */
export const inactiveSurfaces = [
  ...inactiveBaseSurfaces,
  ...softSurfaceRoles,
] as const;

/** The inactive label measured on each surface in {@link inactiveSurfaces}. */
export const inactivePairs: readonly ContrastPair[] = [
  ...inactiveBaseSurfaces.map(
    (background): ContrastPair => [
      "disabledForeground",
      background,
      "inactive",
    ],
  ),
  ...inactiveSoftPairs,
];

/**
 * The surfaces a bounded control sits on beyond the plain ones: the quiet panel
 * that groups fields and checkboxes, and the four washes a row paints. A
 * checkbox in a hovered, pressed, selectable or selected row paints its
 * `borderStrong` edge against that fill, so the boundary floor applies.
 */
const controlBoundarySurfaces = [
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const controlBoundaryPairs: readonly ContrastPair[] =
  controlBoundarySurfaces.map(
    (background): ContrastPair => ["borderStrong", background, "boundary"],
  );

/**
 * The soft status fills a bounded control can sit on. A tone-tinted Alert carries
 * an action — a field, a "don't show again" checkbox — and inline validation
 * renders inside a soft `destructive` block, so the edge a reader uses to see an
 * unchecked control is painted on these fills too. The boundary floor applies.
 */
export const controlBoundarySoftPairs: readonly ContrastPair[] =
  softSurfaceRoles.map(
    (background): ContrastPair => ["borderStrong", background, "boundary"],
  );

/**
 * The surfaces brand-toned text is painted on: the plain surfaces, the quiet
 * grouping panel a sidebar link sits on, the two washes the Link variant paints
 * behind its own label, and the fills a selectable row paints under a nested
 * link (`accent` on hover, `selected` when selected).
 */
const primaryTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const primaryTextPairs: readonly ContrastPair[] = primaryTextSurfaces.map(
  (background): ContrastPair => ["primaryText", background, "secondary"],
);

/**
 * The surfaces a focused control can sit on: the plain surfaces, the quiet
 * panel a sidebar control sits on, the accent wash a selectable row paints, and
 * the three state washes a focused row paints. The ring is painted outside the
 * control, on the surface behind it, so each must keep it visible.
 */
const ringSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "accent",
  "hover",
  "active",
  "selected",
] as const;

const ringPairs: readonly ContrastPair[] = ringSurfaces.map(
  (background): ContrastPair => ["ring", background, "boundary"],
);

/**
 * The soft status fills a focused control can sit on. A tone-tinted Alert carries
 * actions — a Retry or Dismiss button — and the ring is the only indicator of
 * which control holds focus, so each fill is held to the boundary floor like the
 * surfaces a control normally sits on.
 */
export const ringSoftPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["ring", background, "boundary"],
);

/**
 * The invalid control's focus ring. `controlFocusStyle` recolours the ring with
 * `destructive` when a field fails validation, and the runtime can draw only
 * one ring, so the error ring is the control's only focus indicator. It is
 * painted outside the control on the same surfaces the regular ring sits on,
 * not on the field's own fill.
 */
export const invalidRingPairs: readonly ContrastPair[] = [
  // `destructive` on `background` is already the ColorPicker hex field's error
  // edge (plan 325), and the ring shares that composition; adding it twice
  // would break the contract's uniqueness.
  ...ringSurfaces
    .filter((background) => background !== "background")
    .map((background): ContrastPair => ["destructive", background, "boundary"]),
  ...softSurfaceRoles.map(
    (background): ContrastPair => ["destructive", background, "boundary"],
  ),
];

/**
 * The surfaces a status label, icon or indicator dot paints on: the quiet
 * panel of a sidebar or settings group, and the four washes a row paints. A
 * status dot in a sidebar sits on `muted` the way a soft status chip does
 * (plan 300), so the `secondary` floor applies there too.
 */
const statusTextSurfaces = [
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const statusTextTones = ["info", "success", "warning", "destructive"] as const;

const statusTextSurfacePairs: readonly ContrastPair[] = statusTextTones.flatMap(
  (tone) =>
    statusTextSurfaces.map(
      (background): ContrastPair => [`${tone}Text`, background, "secondary"],
    ),
);

/**
 * The default text roles a row paints on the washes it paints behind them. A
 * selectable list row uses `accent` on hover and `selected` when selected, a
 * selected row keeps its inherited `selectedForeground` while hovered or
 * pressed — the `accent` fill `list.tsx` paints on hover as well as the
 * `hover`/`active` pointer washes — a menu row paints `popoverForeground` on
 * `hover`/`active`, and a selected `Select` option paints `popoverForeground`
 * on `selected`.
 */
const rowTextPairs: readonly ContrastPair[] = [
  ["foreground", "accent", "body"],
  ["foreground", "selected", "body"],
  ["popoverForeground", "hover", "body"],
  ["popoverForeground", "active", "body"],
  ["popoverForeground", "selected", "body"],
  ["selectedForeground", "hover", "secondary"],
  ["selectedForeground", "active", "secondary"],
  ["selectedForeground", "accent", "secondary"],
];

/**
 * The field edge. A text field paints `border` on the `input` fill, so the
 * divider floor applies to the pair a reader uses to find the field.
 */
const fieldEdgePairs: readonly ContrastPair[] = [
  ["border", "input", "divider"],
];

/**
 * The field's pressed edge. `fieldVariant.active` in `primitives` repaints the
 * field border with `ring` on the `input` fill, the way `hover` repaints it
 * with `borderStrong`; the role is a control boundary here, not a shadow
 * outside the control.
 */
const fieldPressedEdgePairs: readonly ContrastPair[] = [
  ["ring", "input", "boundary"],
];

/**
 * The invalid field edge. A field in an error state paints `destructive` as its
 * border — `FieldInput` on its `input` fill and the ColorPicker hex field on the
 * `background` canvas — so the error signal is an essential boundary, not a
 * fill. `destructive` is measured as a fill elsewhere; this is the pair that
 * keeps the error itself visible.
 */
const invalidEdgePairs: readonly ContrastPair[] = [
  ["destructive", "input", "boundary"],
  ["destructive", "background", "boundary"],
];

/**
 * The surfaces a placeholder is painted on beyond the `input` fill: the four
 * `Surface` tones a transparent field (`SearchInput`, `InlineEdit`,
 * `ColorPicker`, `TagInput`, `MentionInput`) can sit on. A hint that disappears
 * into a sidebar or a dialog is a failed field.
 */
const placeholderSurfacePairs: readonly ContrastPair[] = (
  ["background", "card", "popover", "muted"] as const
).map((background): ContrastPair => ["placeholder", background, "secondary"]);

/**
 * The surfaces typed text is painted on: the four `Surface` tones a transparent
 * field (`SearchInput`, `InlineEdit`, `ColorPicker`, `TagInput`,
 * `MentionInput`) can sit on. They are the same four surfaces the placeholder is
 * measured on, because a field that loses its text is worse than one that loses
 * its hint.
 */
const inputTextSurfaces = ["background", "card", "popover", "muted"] as const;

const inputTextSurfacePairs: readonly ContrastPair[] = inputTextSurfaces.map(
  (background): ContrastPair => ["inputForeground", background, "body"],
);

/**
 * The surfaces default body text (`foreground`) is painted on: the canvas and
 * the card, the quiet panel an avatar's fallback initials sit on, the floating
 * surface a date picker's month header sits on, and the hover and pressed
 * washes a ghost row paints. `foreground` is the default `Text` tone on every
 * `Surface` tone in `primitives`, so the panel and the popover are compositions
 * the API invites, not accidents.
 */
const bodyTextSurfaces = [
  "background",
  "card",
  "muted",
  "popover",
  "hover",
  "active",
] as const;

const bodyTextPairs: readonly ContrastPair[] = bodyTextSurfaces.map(
  (background): ContrastPair => ["foreground", background, "body"],
);

/**
 * The four soft status fills a default body text role is painted on. An Alert's
 * description and its ghost dismiss control paint `foreground` inside the
 * tone-tinted root (`components/alert.tsx`), so the body floor applies to each
 * fill the same way it does on the quiet panel.
 */
const softBodyPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["foreground", background, "body"],
);

/**
 * The two text roles a status panel carries besides its own tone and body: a
 * caption or supporting line in the quiet tonality (`mutedForeground`) and a
 * link or action in the brand tonality (`primaryText`). `AlertDescription` is
 * documented as a container that may hold an action, and the primitives `Link`
 * paints `primaryText`, so both sit on the tone-tinted root.
 */
export const softPanelTextPairs: readonly ContrastPair[] =
  softSurfaceRoles.flatMap(
    (background): ReadonlyArray<ContrastPair> => [
      ["mutedForeground", background, "secondary"],
      ["primaryText", background, "secondary"],
    ],
  );

/**
 * The soft tone foreground a Toast paints on its floating card. The shipped
 * `toast/viewport.tsx` paints its tone glyph and its 3px bar with
 * `statusTone(...).foreground` (`xSoftForeground`) directly on the `popover`
 * card, not on the soft fill the role is designed for. The `components`
 * migration to `statusTone(...).text` is recorded cross-team; until it lands
 * this pair keeps the glyph — and, because the secondary floor is stricter, the
 * bar's mark — visible in an edited theme.
 */
export const toastTonePairs: readonly ContrastPair[] = statusTones.flatMap(
  (tone): ReadonlyArray<ContrastPair> => [
    [`${tone}SoftForeground`, "popover", "secondary"],
  ],
);

/**
 * The designed action family for a tone-tinted status panel. `softAction` is the
 * raised fill an action inside a tone-tinted Alert or Badge paints, and a ghost
 * action paints its hover and press on the panel itself. Neither the canvas
 * washes (`hover`, `active`) nor the neutral fill (`secondary`) is perceivable on
 * a soft status fill — the four tints sit in a narrow luminance band and 80 of
 * the 288 shipped fill-on-tint pairs measured under 1.05:1 — so each fill is held
 * to the surface floor on the four fills, the family is a perceivable ladder, and
 * the one foreground is held on all three fills and on the panel a ghost
 * action's label rests on. A Toast is a `popover` card, not a tinted panel: its
 * action paints the canvas neutral family, which `stateFillSurfacePairs` measures
 * on that card.
 */
export const softActionPairs: readonly ContrastPair[] = (
  ["softAction", "softActionHover", "softActionActive"] as const
).flatMap((fill) =>
  softSurfaceRoles.map(
    (background): ContrastPair => [fill, background, "surface"],
  ),
);

/** The panel action's hover and press, one perceivable step apart. */
export const softActionStepPairs: readonly ContrastPair[] = [
  ["softActionHover", "softAction", "step"],
  ["softActionActive", "softActionHover", "step"],
];

/**
 * The panel action's one foreground: on the three fills a filled action paints,
 * and on the four soft fills a ghost action's label rests on with no fill of its
 * own.
 */
export const softActionLabelPairs: readonly ContrastPair[] = [
  ["softActionForeground", "softAction", "secondary"],
  ["softActionForeground", "softActionHover", "secondary"],
  ["softActionForeground", "softActionActive", "secondary"],
  ...softSurfaceRoles.map(
    (background): ContrastPair => ["softActionForeground", background, "body"],
  ),
];

/**
 * The generic washes the shipped secondary control still paints behind its
 * label. `components/internal/button.tsx` keeps `secondaryForeground` while the
 * fill becomes `hover` or `active`; the designed family is `secondaryHover` /
 * `secondaryActive`, and the consumer migration is recorded cross-team, but a
 * label on screen needs a pair until it lands.
 */
const secondaryWashPairs: readonly ContrastPair[] = [
  ["secondaryForeground", "hover", "secondary"],
  ["secondaryForeground", "active", "secondary"],
];

/**
 * Every documented pair — text, status, surface and divider — including
 * secondary text and status text on the state washes, a status label or dot on
 * the quiet `muted` panel, brand-toned text on the plain surfaces, the washes a
 * link paints and the row fills it sits on, default body text on the quiet panel,
 * the floating surface and the four soft status fills an Alert's description and
 * ghost dismiss control paint, a status panel's caption and link — `mutedForeground`
 * and `primaryText` on the same four fills (`softPanelTextPairs`) — a Toast's
 * tone glyph and bar, which the shipped component paints with the soft
 * foreground on its floating `popover` card (`toastTonePairs`) — the focus ring
 * on every surface a focused control
 * can sit on, the ring on the soft status fills a toast's action button sits on,
 * the `destructive` ring an invalid control paints on those same surfaces,
 * status text on a floating surface, the functional control
 * boundary on a floating surface, a quiet panel, the state washes and the soft
 * status fills a control sits in, the soft
 * status surfaces and the loading skeleton a canvas, a quiet panel or a row wash
 * must distinguish, the
 * designed edge around each soft status surface, measured on its own fill and
 * on the eight surfaces a chip sits on, the solid status fill on those same
 * surfaces (`statusFillPairs`) — a solid role is a fill, while a status dot is
 * `xText` — the plain divider on those
 * soft fills, the decorative dividers
 * that must stay visible, including on the fills a bordered control paints —
 * the neutral family's resting, hovered and pressed fills, the generic washes
 * and the accent family an outline control uses, and the `selected` row fill an
 * outline action sits on — and
 * on the inactive fill a disabled control keeps its shape with, and the inactive
 * label an unavailable control, menu item or row paints on its fill, the plain
 * surfaces and the state washes. The default text role of a list or menu row is
 * measured on the washes the row paints — including a selected row's inherited
 * label on the `accent` fill a selectable row hovers and on the `hover`/`active`
 * pointer washes — a selected `Select` option's label on
 * its `selected` fill, a status label or dot on the quiet `muted` panel, typed
 * text on the `input` fill and on the `background`, `card`, `popover` and
 * `muted` surfaces a transparent field paints, secondary text on the `input`
 * fill a time picker's separator and clear control paint, the placeholder on
 * those same surfaces, and a text field's
 * edge is measured on the `input` fill it sits on; an invalid field's
 * `destructive` edge is a boundary pair on that fill and on the `background`
 * canvas a transparent field paints. A field's pressed border is `ring` on
 * that same `input` fill — the hover edge is `borderStrong` — so the ring's
 * shadow surfaces and its one control edge are both measured.
 *
 * The filled families — `primary`, `secondary`, `destructive` and `accent` —
 * are measured at rest, hover and pressed. The neutral
 * fill's `secondaryHover`/`secondaryActive` steps are designed roles, not the
 * generic `hover`/`active` washes a ghost or outline control paints; the shipped
 * secondary Button still paints those washes behind its `secondaryForeground`
 * label, so both pairs are measured too. Every
 * interactive fill — the washes, the accent and selected fills and the three
 * filled families at rest, hover and press — is a surface in its own right and
 * is held to the surface floor on the canvas, a card, a popover and the quiet
 * `muted` panel it paints on, because a fill that matches its panel is not a
 * state. Each filled family's `xHover` and `xActive` are also held one
 * perceivable step from the fill before them (`stateStepPairs`, the `step`
 * class), so a collapsed hover or press is reported like an invisible fill. The
 * generic washes are a ladder too: `active` is held one perceivable step from
 * `hover` (`washStepPairs`, the same class), because a ghost or outline control
 * paints no fill at rest and its press is the only change the pointer sees. A
 * selectable row is the same story one state further: `accent` is the wash it
 * paints under the pointer and `selected` the fill it keeps once chosen, so
 * `selected` is held one perceivable step from `accent` (`selectionStepPairs`,
 * the same class) — otherwise hovering one row looks like selecting another and
 * the click changes nothing.
 *
 * A solid role painted as a **mark** — a progress segment, a slider fill, a
 * slider thumb's ring, a rating star, a combobox check or a timeline dot — is a
 * graphic, not a wash, and is held to the `mark` floor instead: 3:1, and 4.5:1
 * at AAA. The solid status roles are deliberately absent from that list: a
 * status indicator is `xText`, which the status pairs already measure, because
 * the light `warning` fill is 1.78:1 on the canvas.
 *
 * The unfilled groove of a progress bar, meter or slider rail is `track`: a
 * surface role cannot carry it, because the quiet panel is the same value as the
 * card in every platform dark style. Its surface pairs and the four fills
 * painted on it (`trackSurfacePairs`, `trackMarkPairs`) keep an indeterminate
 * progress bar visible on a dark card and give a slider's unfilled span a shape.
 *
 * A **status panel's action** is the one family the canvas washes cannot carry:
 * the four soft status fills sit in one narrow luminance band in each mode, so a
 * neutral wash has the tint's own value there — 80 of the 288 shipped
 * fill-on-tint pairs measured under the surface floor, the worst at 1.0042:1.
 * `softAction` is a raised neutral fill, `softActionHover`/`softActionActive` are
 * its ladder and `softActionForeground` is the one label role; each fill is
 * measured on all four soft fills (`softActionPairs`), the ladder is the `step`
 * class (`softActionStepPairs`), and the label is measured on the three fills and
 * on the panel a ghost action rests on (`softActionLabelPairs`).
 */
export const contrastPairs: readonly ContrastPair[] = [
  ...bodyTextPairs,
  ["cardForeground", "card", "body"],
  ["popoverForeground", "popover", "body"],
  ["mutedForeground", "muted", "secondary"],
  ["mutedForeground", "background", "secondary"],
  ["mutedForeground", "card", "secondary"],
  ["mutedForeground", "popover", "secondary"],
  ["inputForeground", "input", "body"],
  ...inputTextSurfacePairs,
  ...ringPairs,
  ...ringSoftPairs,
  ...invalidRingPairs,
  ["secondaryForeground", "secondary", "secondary"],
  ["secondaryForeground", "secondaryHover", "secondary"],
  ["secondaryForeground", "secondaryActive", "secondary"],
  ...secondaryWashPairs,
  ["accentForeground", "accentHover", "secondary"],
  ["accentForeground", "accentActive", "secondary"],
  ["primaryForeground", "primary", "secondary"],
  ["primaryForeground", "primaryHover", "secondary"],
  ["primaryForeground", "primaryActive", "secondary"],
  ["destructiveForeground", "destructive", "secondary"],
  ["destructiveForeground", "destructiveHover", "secondary"],
  ["destructiveForeground", "destructiveActive", "secondary"],
  ["successForeground", "success", "secondary"],
  ["warningForeground", "warning", "secondary"],
  ["infoForeground", "info", "secondary"],
  ["infoSoftForeground", "infoSoft", "body"],
  ["successSoftForeground", "successSoft", "body"],
  ["warningSoftForeground", "warningSoft", "body"],
  ["destructiveSoftForeground", "destructiveSoft", "body"],
  ["infoText", "background", "secondary"],
  ["infoText", "card", "secondary"],
  ["infoText", "popover", "secondary"],
  ["successText", "background", "secondary"],
  ["successText", "card", "secondary"],
  ["successText", "popover", "secondary"],
  ["warningText", "background", "secondary"],
  ["warningText", "card", "secondary"],
  ["warningText", "popover", "secondary"],
  ["destructiveText", "background", "secondary"],
  ["destructiveText", "card", "secondary"],
  ["destructiveText", "popover", "secondary"],
  ...statusTextSurfacePairs,
  ...rowTextPairs,
  ...softBodyPairs,
  ...softPanelTextPairs,
  ...toastTonePairs,
  ["accentForeground", "accent", "secondary"],
  ["selectedForeground", "selected", "secondary"],
  ["placeholder", "input", "secondary"],
  ...placeholderSurfacePairs,
  ...inactivePairs,
  ["borderStrong", "background", "boundary"],
  ["borderStrong", "card", "boundary"],
  ["borderStrong", "input", "boundary"],
  ["borderStrong", "popover", "boundary"],
  ...controlBoundaryPairs,
  ...controlBoundarySoftPairs,
  ...primaryTextPairs,
  ...secondaryTextPairs,
  ...fieldSecondaryPairs,
  ...surfacePairs,
  ...trackSurfacePairs,
  ...trackMarkPairs,
  ...softBorderPairs,
  ...softBorderSurfacePairs,
  ...softDividerPairs,
  ["border", "background", "divider"],
  ["border", "card", "divider"],
  ["border", "popover", "divider"],
  ["border", "muted", "divider"],
  ["border", "disabled", "divider"],
  ...fieldEdgePairs,
  ...fieldPressedEdgePairs,
  ...invalidEdgePairs,
  ...controlFillPairs,
  ...selectedRowEdgePairs,
  ...stateFillSurfacePairs,
  ...statusFillPairs,
  ...softActionPairs,
  ...softActionStepPairs,
  ...softActionLabelPairs,
  ...stateStepPairs,
  ...washStepPairs,
  ...selectionStepPairs,
  ...markPairs,
];

/** WCAG floors by contrast level and pair class. */
export const contrastFloors: Readonly<
  Record<ThemeContrast, Readonly<Record<ContrastPairClass, number>>>
> = {
  default: {
    body: 7,
    secondary: 4.5,
    inactive: 3,
    boundary: 3,
    mark: 3,
    surface: 1.05,
    step: 1.05,
    divider: 1.05,
  },
  high: {
    body: 7,
    secondary: 7,
    inactive: 4.5,
    boundary: 4.5,
    mark: 4.5,
    surface: 1.05,
    step: 1.05,
    divider: 3,
  },
};

/**
 * The text tiers the library documents, each held a perceivable step below the
 * tier above it, as `[dimmer, brighter]`: body copy, then secondary text, then
 * the two roles below it — an unavailable label and a field's hint. A tier that
 * is only *at least* as readable as the one above it is not a tier; the reader
 * uses the difference to tell a caption from body copy, a hint from a caption
 * and a disabled label from an enabled one. The step is the same 1.05:1 the
 * filled families and the wash ladder publish, applied to roles a reader
 * compares side by side.
 */
export const textTiers = [
  ["mutedForeground", "foreground"],
  ["disabledForeground", "mutedForeground"],
  ["placeholder", "mutedForeground"],
] as const satisfies ReadonlyArray<
  readonly [keyof ThemeColors, keyof ThemeColors]
>;

/** A text tier that is not a perceivable step below the tier above it. */
export interface TextTierFailure {
  /** The dimmer role, which must measure below `brighter`. */
  readonly dimmer: keyof ThemeColors;
  /** The role above it in the hierarchy. */
  readonly brighter: keyof ThemeColors;
  /** The surface both are measured on. */
  readonly surface: keyof ThemeColors;
  /** The dimmer role's ratio on `surface`. */
  readonly dimmerRatio: number;
  /** The brighter role's ratio on `surface`. */
  readonly brighterRatio: number;
  /** The step the dimmer tier missed — `contrastFloors[level].step`. */
  readonly step: number;
}

/** The surfaces a role is documented on, in pair order, deduplicated. */
const textSurfaces = (
  role: keyof ThemeColors,
): ReadonlyArray<keyof ThemeColors> =>
  contrastPairs
    .flatMap(([foreground, background]) =>
      foreground === role ? [background] : [],
    )
    .filter((surface, index, all) => all.indexOf(surface) === index);

/**
 * Every text tier that is not one step below the tier above it.
 *
 * The contrast check enforces minimums, so it cannot see an inverted hierarchy:
 * a `disabledForeground` raised to body strength, or a `mutedForeground` set to
 * `foreground`, clears every floor while the reader can no longer tell the
 * tiers apart. This check compares the two roles **on the same surface**, where
 * both already have a documented pair, and reports the tier when the brighter
 * role's ratio is less than one `contrastFloors[level].step` above the dimmer
 * one's. The level defaults to the one the theme declares, like the other
 * checks.
 *
 * The surfaces come from `contrastPairs`, so a surface joins the comparison by
 * joining a role's pairs and the check never names a surface no pair paints. A
 * role whose value the token maths cannot parse reports `NaN` here as well as in
 * {@link themeColorFailures}.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeTextTierFailures } from "@gpuixui/tokens";
 *
 * const flattened = extendTheme(getTheme("light"), {
 *   colors: { disabledForeground: getTheme("light").colors.mutedForeground },
 * });
 *
 * themeTextTierFailures(flattened); // a failure per surface the tiers share
 * ```
 */
export function themeTextTierFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<TextTierFailure> {
  const step = contrastFloors[contrast].step;
  return textTiers.flatMap(([dimmer, brighter]) => {
    const brighterSurfaces = textSurfaces(brighter);
    return textSurfaces(dimmer).flatMap((surface) => {
      if (!brighterSurfaces.includes(surface)) {
        return [];
      }
      const dimmerRatio = contrastRatio(
        theme.colors[dimmer],
        theme.colors[surface],
      );
      const brighterRatio = contrastRatio(
        theme.colors[brighter],
        theme.colors[surface],
      );
      return brighterRatio / dimmerRatio >= step
        ? []
        : [{ dimmer, brighter, surface, dimmerRatio, brighterRatio, step }];
    });
  });
}

/** A colour role whose value the token helpers cannot parse. */
export interface ColorFailure {
  /** The role, named the way the catalogue names it. */
  readonly role: keyof ThemeColors;
  /** The value the theme carried. */
  readonly value: string;
}

/**
 * Every colour role whose value is not a six- or eight-digit hex colour.
 *
 * The theme's maths — {@link contrastRatio}, `compositeOver` and `alpha` — parse
 * only that form. A role in another CSS form is painted by the runtime but
 * invisible to the helpers; for a measured role the contrast check then reports
 * `NaN`, but the tint roles have no pair: a `shadow` of `"black"` makes every
 * elevation level fully opaque because `alpha` returns an unparseable tint
 * unchanged, and no other check sees it.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeColorFailures } from "@gpuixui/tokens";
 *
 * const tinted = extendTheme(getTheme("light"), {
 *   colors: { shadow: "black" },
 * });
 *
 * themeColorFailures(tinted); // [{ role: "shadow", value: "black" }]
 * ```
 */
export function themeColorFailures(theme: Theme): ReadonlyArray<ColorFailure> {
  return colorRoles.flatMap((role) => {
    const value = theme.colors[role];
    return isHexColor(value) ? [] : [{ role, value }];
  });
}

const opaqueHex = /^#([0-9A-Fa-f]{6})$/;
const translucentHex = /^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})$/;

const hexOf = (color: string): string | undefined => opaqueHex.exec(color)?.[1];

const channel = (hex: string, at: number): number =>
  Number.parseInt(hex.slice(at, at + 2), 16) / 255;

const linear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const luminance = (hex: string): number =>
  0.2126 * linear(channel(hex, 0)) +
  0.7152 * linear(channel(hex, 2)) +
  0.0722 * linear(channel(hex, 4));

/**
 * The WCAG 2.x contrast ratio between two **opaque** `#RRGGBB` colours.
 *
 * A value that is not an opaque six-digit hex — a translucent role, a CSS
 * function, a typo — yields `NaN`, which can never pass a floor, so a malformed
 * theme is reported rather than silently accepted.
 *
 * @example
 * ```ts
 * contrastRatio("#FFFFFF", "#000000"); // 21
 * ```
 */
export function contrastRatio(foreground: string, background: string): number {
  const foregroundHex = hexOf(foreground);
  const backgroundHex = hexOf(background);
  if (foregroundHex === undefined || backgroundHex === undefined) {
    return Number.NaN;
  }
  const high = Math.max(luminance(foregroundHex), luminance(backgroundHex));
  const low = Math.min(luminance(foregroundHex), luminance(backgroundHex));
  return (high + 0.05) / (low + 0.05);
}

/**
 * Composite a translucent `#RRGGBBAA` colour over an opaque `#RRGGBB` one.
 *
 * The result is the opaque colour the runtime paints, so a wash such as the
 * `selection` role can be measured as text actually sees it. An input the
 * parser does not recognise is returned unchanged, the same convention as
 * {@link alpha}, so it reaches a ratio check as a failure instead of a guess.
 *
 * @example
 * ```ts
 * compositeOver("#00000080", "#FFFFFF"); // "#7F7F7F"
 * ```
 */
export function compositeOver(color: string, background: string): string {
  const overlay = translucentHex.exec(color);
  const under = opaqueHex.exec(background);
  if (overlay === null || under === null) {
    return color;
  }
  const [, overlayRgb, alphaHex] = overlay;
  const [, baseRgb] = under;
  if (
    overlayRgb === undefined ||
    alphaHex === undefined ||
    baseRgb === undefined
  ) {
    return color;
  }
  const opacity = Number.parseInt(alphaHex, 16) / 255;
  const channels = [0, 2, 4].map((at) =>
    Math.round(
      Number.parseInt(overlayRgb.slice(at, at + 2), 16) * opacity +
        Number.parseInt(baseRgb.slice(at, at + 2), 16) * (1 - opacity),
    )
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`.toUpperCase();
}

/** A documented pair that misses its floor in one theme. */
export interface ContrastFailure {
  /** The role carrying text, or the surface being perceived. */
  readonly foreground: keyof ThemeColors;
  /** The role painted behind it, or the surface it must stand out from. */
  readonly background: keyof ThemeColors;
  /** The translucent role composited over `background`, when the pair sits on a wash. */
  readonly wash?: keyof ThemeColors;
  /** The class whose floor the pair missed. */
  readonly pairClass: ContrastPairClass;
  /** The floor the pair missed. */
  readonly floor: number;
  /** The measured ratio; `NaN` when a role is not an opaque `#RRGGBB`. */
  readonly ratio: number;
  /** The fraction a role was composited at, when the paint was a fade. */
  readonly opacity?: number;
}

/**
 * The surfaces a selected glyph is painted on: the plain surfaces, the quiet
 * panel, the field, the three state washes and a selected row. A wash measured
 * only on the canvas leaves the other eight unprotected.
 */
export const selectionSurfaces = [
  "background",
  "card",
  "muted",
  "hover",
  "active",
  "accent",
  "popover",
  "input",
  "selected",
] as const;

const selectionForegrounds: Readonly<
  Record<(typeof selectionSurfaces)[number], keyof ThemeColors>
> = {
  background: "foreground",
  card: "foreground",
  muted: "foreground",
  hover: "foreground",
  active: "foreground",
  accent: "foreground",
  popover: "popoverForeground",
  input: "inputForeground",
  selected: "selectedForeground",
};

/**
 * Every text pair a selected glyph paints: the role each surface uses for its
 * own text on the left, and secondary text on the right. A card carries two —
 * the default `foreground` a `CardTitle` paints and its own `cardForeground`,
 * which a context menu trigger sets on its `card` fill — and both are measured.
 * A row description or a message timestamp is selected with the body copy
 * around it, so it carries the secondary floor through the same wash.
 */
export const selectionPairs: readonly ContrastPair[] = [
  ...selectionSurfaces.map(
    (surface): ContrastPair => [
      selectionForegrounds[surface],
      surface,
      surface === "selected" ? "secondary" : "body",
    ],
  ),
  ["cardForeground", "card", "body"],
  ...selectionSurfaces.map(
    (surface): ContrastPair => ["mutedForeground", surface, "secondary"],
  ),
];

/**
 * The status labels a reader selects with the copy around them. `xText` is the
 * role for a label, icon or dot on the plain surfaces and the four row washes
 * (plan 083), and a selectable row's label is dragged over like any other text,
 * so the four tones are held through the composited wash exactly like body and
 * secondary text. The status tone's own `xSoftForeground` is measured by
 * {@link selectionSoftPairs}; a status panel's caption by the same list.
 */
export const selectionStatusPairs: readonly ContrastPair[] =
  statusTones.flatMap((tone) =>
    selectionSurfaces.map(
      (surface): ContrastPair => [`${tone}Text`, surface, "secondary"],
    ),
  );

/**
 * The surfaces a selection wash must stay visible on. Each entry pairs the
 * translucent `selection` role with the surface it paints on; the check
 * composites the two, so a theme whose highlight has become imperceptible fails
 * the `surface` floor even when every glyph is readable.
 */
export const selectionWashPairs: readonly ContrastPair[] =
  selectionSurfaces.map(
    (surface): ContrastPair => ["selection", surface, "surface"],
  );

/**
 * Content painted on a filled action — a user message bubble on `primary`, a
 * neutral filled surface, a destructive one, or a brand-toned toggle — uses the
 * inverse veil rather than the accent-tinted `selection`, which is invisible on
 * the accent fill itself. Both lists derive from `filledControlFamilies`, so a
 * fifth family cannot ship with no selection pair: the veil is held to the
 * perceivability floor on each fill, and each family's own foreground to the
 * floor it already has on that fill.
 */
export const selectionFillWashPairs: readonly ContrastPair[] =
  filledControlFamilies.map(
    (fill): ContrastPair => ["selectionOnFill", fill, "surface"],
  );

/** The family foreground through the inverse veil, at the on-colour floor. */
export const selectionFillPairs: readonly ContrastPair[] =
  filledControlFamilies.map(
    (fill): ContrastPair => [`${fill}Foreground`, fill, "secondary"],
  );

/**
 * The text roles a soft status panel carries, through the selection wash: the
 * tone's own foreground (its title), default body text (`AlertDescription`, the
 * ghost dismiss control) and the quiet caption or supporting line. A reader
 * copies any of the three and the wash composites over the fill, so each is
 * held to its own floor. Accent-toned text is the one deliberate omission
 * (plan 087): no wash that stays perceivable keeps a link at 7:1 at AAA.
 */
export const selectionSoftPairs: readonly ContrastPair[] =
  softSurfaceRoles.flatMap(
    (background): ReadonlyArray<ContrastPair> => [
      [`${background}Foreground`, background, "body"],
      ["foreground", background, "body"],
      ["mutedForeground", background, "secondary"],
    ],
  );

/**
 * The surfaces the selection wash must stay visible on inside a soft status
 * surface. A highlight that disappears on a dark destructive tint is still a
 * failed selection, so each fill is compared with the composited wash.
 */
export const selectionSoftWashPairs: readonly ContrastPair[] = [
  ["selection", "infoSoft", "surface"],
  ["selection", "successSoft", "surface"],
  ["selection", "warningSoft", "surface"],
  ["selection", "destructiveSoft", "surface"],
];

/**
 * The surfaces a modal scrim covers. A dialog's scrim is painted across the
 * window, so everything the window shows is behind it: the base layout — the
 * canvas, a card, the quiet panel, the field fill a form paints and the
 * persistent `selected` fill a table or list keeps — the floating surface a
 * menu opens on, the resting fills of the actions on the page (`primary`,
 * `secondary`, `accent`, `destructive` and the soft status panel's `softAction`)
 * and the four soft status panels an Alert or Badge paints. A scrim that
 * composites to its own surface is an invisible modal backdrop, so each is held
 * to the `surface` floor.
 *
 * The transient pointer states stay out: `hover`, `active` and the filled
 * families' `xHover`/`xActive` steps are gone by the time the pointer reaches
 * the dialog, so a scrim over them is not a composition the system supports.
 * `accent` is included because it is also the resting fill of a toggled-on
 * control, not only the wash a selectable row hovers; `softAction` is the raised
 * action a tone-tinted Alert paints (plan 394), so it is a resting fill a window
 * shows too, while its hover and press are transient. `disabled`, `skeleton`
 * and `track` are not the content a dialog opens over: a scrim that is
 * invisible on a disabled control, a loading placeholder or a progress groove
 * still dims the layout the reader is looking at.
 */
export const overlaySurfaces = [
  "background",
  "card",
  "muted",
  "input",
  "selected",
  "popover",
  "primary",
  "secondary",
  "accent",
  "destructive",
  "softAction",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

/**
 * The scrim composited over the surfaces it covers. The pointer washes
 * (`hover`, `active`) and the filled families' `xHover`/`xActive` steps are
 * deliberately absent: the pointer leaves the row to reach the dialog, so a
 * scrim over a transient state is not a composition the design system supports.
 * `selected` persists while the modal opens, `input` is a layout surface, the
 * filled actions are the resting fills on the page, the panel action
 * (`softAction`) is the resting fill inside a status panel and `accent` is also
 * the resting fill of a toggled-on control, so all of them are measured.
 * `disabled`, `skeleton` and `track` are not the content a dialog opens over.
 */
export const overlayWashPairs: readonly ContrastPair[] = overlaySurfaces.map(
  (surface): ContrastPair => ["overlay", surface, "surface"],
);

const textOverWashFailures = (
  pairs: readonly ContrastPair[],
  wash: keyof ThemeColors,
  theme: Theme,
  floors: Readonly<Record<ContrastPairClass, number>>,
): ReadonlyArray<ContrastFailure> =>
  pairs.flatMap(([foreground, background, pairClass]) => {
    const ratio = contrastRatio(
      theme.colors[foreground],
      compositeOver(theme.colors[wash], theme.colors[background]),
    );
    const floor = floors[pairClass];
    return ratio >= floor
      ? []
      : [{ foreground, background, wash, pairClass, floor, ratio }];
  });

const washVisibilityFailures = (
  pairs: readonly ContrastPair[],
  wash: keyof ThemeColors,
  theme: Theme,
  floors: Readonly<Record<ContrastPairClass, number>>,
): ReadonlyArray<ContrastFailure> =>
  pairs.flatMap(([foreground, background, pairClass]) => {
    const painted = compositeOver(theme.colors[wash], theme.colors[background]);
    const ratio = contrastRatio(painted, theme.colors[background]);
    const floor = floors[pairClass];
    return ratio >= floor
      ? []
      : [{ foreground, background, wash, pairClass, floor, ratio }];
  });

/**
 * A role painted at a fraction of its own value — the dim frame of a pulse. The
 * pair names the role the color was derived from and the fraction, so the
 * failure is distinguishable from the opaque pair it shares a role and surface
 * with.
 */
const fadedVisibilityFailures = (
  pairs: readonly ContrastPair[],
  role: keyof ThemeColors,
  opacity: number,
  theme: Theme,
  floors: Readonly<Record<ContrastPairClass, number>>,
): ReadonlyArray<ContrastFailure> =>
  pairs.flatMap(([, background, pairClass]) => {
    const painted = compositeOver(
      alpha(theme.colors[role], opacity),
      theme.colors[background],
    );
    const ratio = contrastRatio(painted, theme.colors[background]);
    const floor = floors[pairClass];
    return ratio >= floor
      ? []
      : [
          {
            foreground: role,
            background,
            wash: role,
            opacity,
            pairClass,
            floor,
            ratio,
          },
        ];
  });

/**
 * Every documented pair a theme misses.
 *
 * The check is the union of the published pair lists, so it is total over the
 * compositions the library documents rather than a curated sample:
 *
 * - `contrastPairs` — body and secondary text on the plain surfaces, the field,
 *   the row washes and the soft status fills; the control boundary, focus ring
 *   and dividers; the inactive label; the marks and the value track; every
 *   interactive fill against the panel it paints on; the solid status fill on
 *   the surfaces a status chip occupies (`statusFillPairs`); and the state steps
 *   of the filled families, the generic washes, the selected row and the status
 *   panel's raised action — `softActionPairs`, `softActionStepPairs` and
 *   `softActionLabelPairs`.
 * - `selectionPairs`, `selectionStatusPairs`, `selectionWashPairs`,
 *   `selectionSoftPairs` and `selectionSoftWashPairs` — text, status text and
 *   the wash's own perceivability through the composited `selection` colour.
 * - `selectionFillPairs` and `selectionFillWashPairs` — the inverse
 *   `selectionOnFill` veil on every filled family; the list derives from
 *   `filledControlFamilies`, so `accent` is included.
 * - `skeletonPulsePairs` — the loading pulse's dim frame, the `skeleton` role
 *   composited at `skeletonPulseOpacity` over every surface a placeholder sits
 *   on; a failure names the role and the fraction.
 * - `overlayWashPairs` — the modal scrim composited over every surface a window
 *   shows.
 *
 * A missed pair is returned with both roles, the class whose floor it missed,
 * the floor and the measured ratio; a pair through a wash also names the wash,
 * and a pair through a fade names the fraction.
 * The level defaults to the one the theme declares, so a high-contrast theme is
 * checked against its own floors. An empty array is the library's guarantee,
 * and a role whose value the token maths cannot parse is reported as `NaN` by
 * this check and by {@link themeColorFailures}.
 *
 * @example
 * ```ts
 * import { getTheme, themeContrastFailures } from "@gpuixui/tokens";
 *
 * themeContrastFailures(getTheme("dark")); // []
 * themeContrastFailures(getTheme("dark"), "high"); // the same theme at AAA
 * ```
 */
export function themeContrastFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<ContrastFailure> {
  const floors = contrastFloors[contrast];
  const pairFailures: ReadonlyArray<ContrastFailure> = contrastPairs.flatMap(
    ([foreground, background, pairClass]) => {
      const ratio = contrastRatio(
        theme.colors[foreground],
        theme.colors[background],
      );
      return ratio >= floors[pairClass]
        ? []
        : [
            {
              foreground,
              background,
              pairClass,
              floor: floors[pairClass],
              ratio,
            },
          ];
    },
  );
  return [
    ...pairFailures,
    ...textOverWashFailures(selectionPairs, "selection", theme, floors),
    ...textOverWashFailures(selectionStatusPairs, "selection", theme, floors),
    ...washVisibilityFailures(selectionWashPairs, "selection", theme, floors),
    ...textOverWashFailures(selectionSoftPairs, "selection", theme, floors),
    ...washVisibilityFailures(
      selectionSoftWashPairs,
      "selection",
      theme,
      floors,
    ),
    ...textOverWashFailures(
      selectionFillPairs,
      "selectionOnFill",
      theme,
      floors,
    ),
    ...washVisibilityFailures(
      selectionFillWashPairs,
      "selectionOnFill",
      theme,
      floors,
    ),
    ...fadedVisibilityFailures(
      skeletonPulsePairs,
      "skeleton",
      skeletonPulseOpacity,
      theme,
      floors,
    ),
    ...washVisibilityFailures(overlayWashPairs, "overlay", theme, floors),
  ];
}
