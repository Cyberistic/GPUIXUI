import {
  alphaOf,
  blend,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloorsFor,
  contrastPairs,
  contrastRatio,
  type ContrastPair,
  type ContrastSource,
} from "./contrast.js";
import type { ElevationLevel, ShadowSource } from "./elevation.js";
import {
  filledFeedback,
  filledFeedbackStates,
  filledRoles,
  statusEdgeAlpha,
  statusTones,
  type FilledFeedbackState,
  type FilledRole,
} from "./styles.js";

export const decorativeFloor = 1.05;

export interface DecorativeSurface {
  readonly surface:
    | "divider"
    | "softDivider"
    | "skeleton"
    | "scrim"
    | "statusTint"
    | "statusEdge"
    | "scrollbar"
    | "stateWash"
    | "filledAction"
    | "track"
    | "disabledFace"
    | "actionFeedback"
    | "pointerWash"
    | "derivedDivider"
    | "pressedDivider"
    | "elevation";

  readonly role: keyof ThemeColors;

  readonly over: keyof ThemeColors;

  readonly alpha?: number;

  readonly level?: ElevationLevel;
}

const statusEdge = (
  tone: (typeof statusTones)[number],
  over: keyof ThemeColors,
): DecorativeSurface => ({
  surface: "statusEdge",
  role: tone,
  over,
  alpha: statusEdgeAlpha,
});

const statusTintStrips = ["background", "card", "popover", "muted"] as const;

const statusWashStrips = ["hover", "active", "selected", "accent"] as const;

const stateWashRoles = ["hover", "active", "selected", "accent"] as const;
const stateWashStrips = ["background", "card", "popover", "muted"] as const;

const filledActionRole = "secondary" as const;
const filledActionStrips = ["background", "card", "popover", "muted"] as const;

const trackRole = "muted" as const;
const trackStrips = ["background", "card", "popover"] as const;

export const softDividerAlpha = 0.5;

export interface ActionFeedbackPlacement {
  readonly role: FilledRole;

  readonly state: FilledFeedbackState;
}

export const actionFeedbackPlacements: readonly ActionFeedbackPlacement[] =
  filledRoles.flatMap((role) =>
    filledFeedbackStates.map(
      (state): ActionFeedbackPlacement => ({ role, state }),
    ),
  );

export function actionFeedbackFailures(
  theme: ColourSource & ContrastSource,
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  return actionFeedbackPlacements.flatMap(({ role, state }) => {
    const resting = themeColors(theme)[role];
    const painted = filledFeedback(theme, role, state);
    const ratio =
      resting === undefined || painted === undefined
        ? undefined
        : contrastRatio(painted, resting);
    return ratio !== undefined && ratio >= floor
      ? []
      : [
          {
            surface: "actionFeedback" as const,
            role,
            over: role,
            ratio,
            floor,
          },
        ];
  });
}

export type PointerWashSurface = "selected" | "accent" | "hover";

export type PointerWashRole = "accent" | "active";

export interface PointerWashTransition {
  readonly wash: PointerWashRole;

  readonly replaced: PointerWashSurface;
}

export const pointerWashTransitions: readonly PointerWashTransition[] = [
  { wash: "accent", replaced: "selected" },
  { wash: "active", replaced: "accent" },
  { wash: "active", replaced: "hover" },
];

const pointerWashLabels: Readonly<
  Record<PointerWashRole, readonly ContrastPair[]>
> = {
  accent: contrastPairs.filter(({ background }) => background === "accent"),
  active: contrastPairs.filter(({ background }) => background === "active"),
};

const POINTER_STEP_CEILING = 0.18;

const POINTER_STEPS: readonly number[] = [
  0,
  ...Array.from(
    { length: Math.round(POINTER_STEP_CEILING * 100) },
    (_, offset) => (offset + 1) / 100,
  ),
];

export function pointerWash(
  source: ColourSource & ContrastSource,
  wash: PointerWashRole,
  replaced: PointerWashSurface,
  floor: number = decorativeFloor,
): string | undefined {
  const colors = themeColors(source);
  const base = colors[wash];
  const over = colors[replaced];
  const toward = colors.foreground;
  if (base === undefined || over === undefined || toward === undefined) {
    return undefined;
  }
  const floors = contrastFloorsFor(source);
  const paintedAt = (step: number): string => blend(base, toward, step);
  const seenAt = (step: number): boolean => {
    const ratio = contrastRatio(paintedAt(step), over);
    return ratio !== undefined && ratio >= floor;
  };
  const readableAt = (step: number): boolean =>
    pointerWashLabels[wash].every(({ foreground, floor: kind }) => {
      const ratio = contrastRatio(colors[foreground], paintedAt(step));
      return ratio !== undefined && ratio >= floors[kind];
    });
  const firstSeen = POINTER_STEPS.find(seenAt);
  const lastReadable = [...POINTER_STEPS].reverse().find(readableAt);
  return paintedAt(
    Math.min(
      firstSeen ?? POINTER_STEP_CEILING,
      lastReadable ?? POINTER_STEP_CEILING,
    ),
  );
}

export function pointerWashFailures(
  theme: ColourSource & ContrastSource,
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  return pointerWashTransitions.flatMap(({ wash, replaced }) => {
    const painted = pointerWash(theme, wash, replaced, floor);
    const ratio =
      painted === undefined
        ? undefined
        : contrastRatio(painted, themeColors(theme)[replaced]);
    return ratio !== undefined && ratio >= floor
      ? []
      : [
          {
            surface: "pointerWash" as const,
            role: wash,
            over: replaced,
            ratio,
            floor,
          },
        ];
  });
}

export const dividerWashes = [
  "hover",
  "accent",
  "selected",
] as const satisfies ReadonlyArray<keyof ThemeColors>;

export type DividerWash = (typeof dividerWashes)[number];

export const dividerPresses: ReadonlyArray<PointerWashSurface> =
  pointerWashTransitions.flatMap(({ wash, replaced }) =>
    wash === "active" ? [replaced] : [],
  );

const DIVIDER_STEPS = 50;

export function dividerOn(
  source: ColourSource,
  surface: string | undefined,
  floor: number = decorativeFloor,
): string | undefined {
  const colors = themeColors(source);
  const base = colors.border;
  const strongest = colors.borderStrong;
  if (base === undefined || strongest === undefined) return undefined;
  if (surface === undefined) return base;
  const seen = (colour: string): boolean => {
    const ratio = contrastRatio(colour, surface);
    return ratio !== undefined && ratio >= floor;
  };

  if (contrastRatio(base, surface) === undefined || seen(base)) return base;
  return (
    Array.from({ length: DIVIDER_STEPS }, (_, offset) =>
      blend(base, strongest, (offset + 1) / DIVIDER_STEPS),
    ).find(seen) ?? strongest
  );
}

export function dividerFailures(
  theme: ColourSource & ContrastSource,
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  const failureOn = (
    surface: "derivedDivider" | "pressedDivider",
    over: DividerWash | PointerWashSurface,
    painted: string | undefined,
  ): readonly DecorativeFailure[] => {
    const rule = dividerOn(theme, painted, floor);
    const ratio =
      rule === undefined || painted === undefined
        ? undefined
        : contrastRatio(rule, painted);
    return ratio !== undefined && ratio >= floor
      ? []
      : [
          {
            surface,
            role: "border" as const,
            over,
            ratio,
            floor,
          },
        ];
  };
  return [
    ...dividerWashes.flatMap((over) =>
      failureOn("derivedDivider", over, themeColors(theme)[over]),
    ),
    ...dividerPresses.flatMap((replaced) =>
      failureOn(
        "pressedDivider",
        replaced,
        pointerWash(theme, "active", replaced, floor),
      ),
    ),
  ];
}

const disabledFaceRole = "disabled" as const;
const enabledFaces = [
  "primary",
  "secondary",
  "destructive",
  "accent",
  "input",
] as const;

const skeletonStrips = ["background", "card", "popover", "muted"] as const;

const elevationRole = "shadow" as const;

const raisedLevels = [
  "sm",
  "md",
  "lg",
] as const satisfies ReadonlyArray<ElevationLevel>;

const messageTintStrips = statusTones.map((tone) => `${tone}Soft` as const);

const elevationStrips = [
  "background",
  "card",
  "popover",
  "muted",
  "secondary",
  "primary",
  "destructive",
  "input",
  "selected",
  "active",
  "accent",
  "hover",
  ...messageTintStrips,
] as const;

export const decorativeSurfaces: readonly DecorativeSurface[] = [
  { surface: "divider", role: "border", over: "background" },
  { surface: "divider", role: "border", over: "card" },
  { surface: "divider", role: "border", over: "popover" },
  { surface: "divider", role: "border", over: "muted" },

  {
    surface: "softDivider",
    role: "border",
    over: "popover",
    alpha: softDividerAlpha,
  },
  ...skeletonStrips.map(
    (over): DecorativeSurface => ({
      surface: "skeleton",
      role: "skeleton",
      over,
    }),
  ),

  { surface: "scrim", role: "overlay", over: "card" },
  { surface: "scrim", role: "overlay", over: "popover" },
  { surface: "scrim", role: "overlay", over: "muted" },
  { surface: "scrim", role: "overlay", over: "secondary" },

  { surface: "scrim", role: "overlay", over: "primary" },
  { surface: "scrim", role: "overlay", over: "destructive" },
  { surface: "scrim", role: "overlay", over: "input" },

  { surface: "scrim", role: "overlay", over: "selected" },

  { surface: "scrim", role: "overlay", over: "active" },
  { surface: "scrim", role: "overlay", over: "accent" },

  { surface: "scrim", role: "overlay", over: "hover" },

  ...messageTintStrips.map(
    (over): DecorativeSurface => ({
      surface: "scrim",
      role: "overlay",
      over,
    }),
  ),

  { surface: "scrollbar", role: "scrollbar", over: "background" },
  { surface: "scrollbar", role: "scrollbar", over: "card" },
  { surface: "scrollbar", role: "scrollbar", over: "popover" },
  { surface: "scrollbar", role: "scrollbar", over: "muted" },
  ...filledActionStrips.map(
    (over): DecorativeSurface => ({
      surface: "filledAction",
      role: filledActionRole,
      over,
    }),
  ),
  ...trackStrips.map(
    (over): DecorativeSurface => ({
      surface: "track",
      role: trackRole,
      over,
    }),
  ),
  ...raisedLevels.flatMap((level) =>
    elevationStrips.map(
      (over): DecorativeSurface => ({
        surface: "elevation",
        role: elevationRole,
        over,
        level,
      }),
    ),
  ),
  ...enabledFaces.map(
    (over): DecorativeSurface => ({
      surface: "disabledFace",
      role: disabledFaceRole,
      over,
    }),
  ),
  ...stateWashRoles.flatMap((role) =>
    stateWashStrips.map(
      (over): DecorativeSurface => ({
        surface: "stateWash",
        role,
        over,
      }),
    ),
  ),

  { surface: "stateWash", role: "accent", over: "selected" },

  ...statusTones.flatMap((tone) => [
    ...statusTintStrips.map(
      (over): DecorativeSurface => ({
        surface: "statusTint",
        role: `${tone}Soft`,
        over,
      }),
    ),
    statusEdge(tone, `${tone}Soft`),
    ...statusTintStrips.map((over) => statusEdge(tone, over)),
    ...statusWashStrips.map((over) => statusEdge(tone, over)),
  ]),
] satisfies ReadonlyArray<DecorativeSurface>;

export interface DecorativeFailure {
  readonly surface: DecorativeSurface["surface"];

  readonly role: keyof ThemeColors;

  readonly over: keyof ThemeColors;

  readonly level?: ElevationLevel;

  readonly ratio: number | undefined;

  readonly floor: number;
}

export function decorativeFailures(
  theme: ColourSource & ShadowSource & ContrastSource,
  floor: number = decorativeFloor,
): readonly DecorativeFailure[] {
  const surfaces = decorativeSurfaces.flatMap(
    ({ surface, role, over, alpha, level }) => {
      const colors = themeColors(theme);
      const paintedOver = colors[over];
      const paintedRole =
        level === undefined
          ? colors[role]
          : theme.elevation?.[level]?.[0]?.color;
      const painted =
        paintedOver === undefined || paintedRole === undefined
          ? undefined
          : blend(paintedOver, paintedRole, alpha ?? alphaOf(paintedRole));
      const ratio = contrastRatio(painted, paintedOver);
      return ratio !== undefined && ratio >= floor
        ? []
        : [
            {
              surface,
              role,
              over,
              ...(level === undefined ? {} : { level }),
              ratio,
              floor,
            },
          ];
    },
  );
  const feedback = actionFeedbackFailures(theme, floor);
  const washes = pointerWashFailures(theme, floor);
  const rules = dividerFailures(theme, floor);
  return [...surfaces, ...feedback, ...washes, ...rules];
}
