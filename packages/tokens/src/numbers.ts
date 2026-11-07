import type { BoxShadow, Elevation } from "./elevation.js";
import { isStepRecord, requireGroups } from "./missing.js";
import {
  controlSizes,
  targetSize,
  type BorderWidth,
  type ControlSize,
  type Density,
  type DensityName,
  type IconSize,
  type Radius,
  type Spacing,
} from "./scale.js";
import type { Stored } from "./theme.js";
import type { TextRole, Typography } from "./typography.js";

export type NumberGroup =
  | "spacing"
  | "radius"
  | "borderWidth"
  | "iconSize"
  | "typography"
  | "density"
  | "elevation";

export type NumberRule =
  | "finite"
  | "positive"
  | "nonNegative"
  | "pressable"
  | "leading"
  | "fits"
  | "emphasis";

type SingleRule = Exclude<NumberRule, "leading" | "fits" | "emphasis">;

export interface InvalidNumber {
  readonly group: NumberGroup;

  readonly path: string;

  readonly value: unknown;

  readonly rule: NumberRule;
}

type TypographyNumbers = Stored<Typography>;

export type NumberSource = {
  readonly spacing?: Stored<Spacing>;
  readonly radius?: Stored<Radius>;
  readonly borderWidth?: Stored<BorderWidth>;
  readonly iconSize?: Stored<IconSize>;
  readonly density?: Stored<Density> | DensityName;

  readonly typography?: TypographyNumbers;

  readonly elevation?: Stored<Elevation>;
};

const layable = (value: unknown, rule: SingleRule): boolean => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return false;
  }
  if (rule === "positive") {
    return value > 0;
  }
  if (rule === "pressable") {
    return value >= targetSize.minimum;
  }
  return rule === "finite" || value >= 0;
};

const inspect = (
  group: NumberGroup,
  path: string,
  value: unknown,
  rule: SingleRule,
): readonly InvalidNumber[] =>
  layable(value, rule)
    ? []
    : [
        {
          group,
          path,
          value,
          rule: typeof value === "number" ? rule : "finite",
        },
      ];

const inspectLengths = (
  group: NumberGroup,
  scale: unknown,
  rule: SingleRule,
  prefix = "",
): readonly InvalidNumber[] =>
  Object.entries(isStepRecord(scale) ? scale : {}).flatMap(([key, value]) =>
    value === undefined || value === null
      ? []
      : inspect(group, `${prefix}${key}`, value, rule),
  );

const inspectBorderWidths = (
  borderWidth: NumberSource["borderWidth"],
): readonly InvalidNumber[] => {
  const widths = isStepRecord(borderWidth) ? borderWidth : {};
  return [
    ...inspect("borderWidth", "thin", widths.thin, "nonNegative"),
    ...inspect("borderWidth", "strong", widths.strong, "positive"),
  ];
};

interface StoredTextStyle {
  readonly fontSize: unknown;
  readonly lineHeight: unknown;
  readonly fontWeight: unknown;
}

const isTextStyle = (value: unknown): value is StoredTextStyle =>
  isStepRecord(value) && "fontSize" in value;

const usable = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const exceeds = (value: unknown, than: unknown): boolean =>
  typeof value === "number" && typeof than === "number" && value > than;

const isShadowList = (value: unknown): value is readonly BoxShadow[] =>
  Array.isArray(value);

const isShadowEntry = (value: unknown): value is BoxShadow =>
  typeof value === "object" && value !== null;

const inspectType = (
  typography: NumberSource["typography"],
): readonly InvalidNumber[] =>
  Object.entries(isStepRecord(typography) ? typography : {}).flatMap(
    ([role, value]) => {
      if (!isTextStyle(value)) {
        return [];
      }
      const measured = [
        ...inspect(
          "typography",
          `${role}.fontSize`,
          value.fontSize,
          "positive",
        ),
        ...inspect(
          "typography",
          `${role}.lineHeight`,
          value.lineHeight,
          "positive",
        ),
        ...inspect(
          "typography",
          `${role}.fontWeight`,
          value.fontWeight,
          "finite",
        ),
      ];

      const collides =
        usable(value.fontSize) &&
        usable(value.lineHeight) &&
        value.lineHeight < value.fontSize;
      return collides
        ? [
            ...measured,
            {
              group: "typography",
              path: `${role}.lineHeight`,
              value: value.lineHeight,
              rule: "leading",
            },
          ]
        : measured;
    },
  );

const inspectEmphasis = (
  typography: NumberSource["typography"],
): readonly InvalidNumber[] => {
  const roles = isStepRecord(typography) ? typography : {};
  const { body, bodyStrong } = roles;

  if (!isTextStyle(body) || !isTextStyle(bodyStrong)) {
    return [];
  }

  const reaching = (role: StoredTextStyle): boolean =>
    usable(role.fontSize) &&
    usable(role.lineHeight) &&
    role.lineHeight >= role.fontSize;
  const shared = (
    path: "fontSize" | "lineHeight",
    comparable: boolean,
  ): readonly InvalidNumber[] => {
    const bodyValue = body[path];
    const strongValue = bodyStrong[path];
    return !comparable || bodyValue === strongValue
      ? []
      : [
          {
            group: "typography",
            path: `bodyStrong.${path}`,
            value: strongValue,
            rule: "emphasis",
          },
        ];
  };
  const outweighs =
    !Number.isFinite(body.fontWeight) ||
    !Number.isFinite(bodyStrong.fontWeight) ||
    exceeds(bodyStrong.fontWeight, body.fontWeight)
      ? []
      : [
          {
            group: "typography",
            path: "bodyStrong.fontWeight",
            value: bodyStrong.fontWeight,
            rule: "emphasis",
          } satisfies InvalidNumber,
        ];
  return [
    ...shared("fontSize", usable(body.fontSize) && usable(bodyStrong.fontSize)),
    ...shared("lineHeight", reaching(body) && reaching(bodyStrong)),
    ...outweighs,
  ];
};

const controlRoles = ["label", "body"] as const satisfies readonly TextRole[];

const rowRoles = ["body", "code"] as const satisfies readonly TextRole[];

const contentCeiling = (
  typography: NumberSource["typography"],
  iconSize: NumberSource["iconSize"],
  roles: readonly TextRole[],
): number | undefined => {
  const scale = isStepRecord(typography) ? typography : {};
  const styles = roles.map((role) => scale[role]);
  const glyph = isStepRecord(iconSize) ? iconSize.md : undefined;
  const leadings = styles.flatMap((style) =>
    isTextStyle(style) ? [style.lineHeight] : [],
  );

  if (leadings.length !== styles.length || typeof glyph !== "number") {
    return undefined;
  }
  const parts: ReadonlyArray<unknown> = [...leadings, glyph];
  return parts.every(
    (part): part is number => typeof part === "number" && Number.isFinite(part),
  )
    ? Math.max(...parts)
    : undefined;
};

const missingFit = (
  path: string,
  value: number,
  ceiling: number | undefined,
): readonly InvalidNumber[] =>
  ceiling === undefined || value >= ceiling
    ? []
    : [{ group: "density", path, value, rule: "fits" }];

const inspectControlHeights = (
  density: NumberSource["density"],
  typography: NumberSource["typography"],
  iconSize: NumberSource["iconSize"],
): readonly InvalidNumber[] => {
  const ceiling = contentCeiling(typography, iconSize, controlRoles);
  const heights: unknown = isStepRecord(density)
    ? density.controlHeight
    : undefined;
  return controlSizes.flatMap((size: ControlSize) => {
    const path = `controlHeight.${size}`;
    const value = isStepRecord(heights) ? heights[size] : undefined;

    if (value === undefined || value === null) {
      return [];
    }
    const pressable = inspect("density", path, value, "pressable");
    return pressable.length > 0 || typeof value !== "number"
      ? pressable
      : missingFit(path, value, ceiling);
  });
};

const inspectRowHeight = (
  density: NumberSource["density"],
  typography: NumberSource["typography"],
  iconSize: NumberSource["iconSize"],
): readonly InvalidNumber[] => {
  const value: unknown = isStepRecord(density) ? density.rowHeight : undefined;
  if (value === undefined || value === null) {
    return [];
  }
  const pressable = inspect("density", "rowHeight", value, "pressable");
  return pressable.length > 0 || typeof value !== "number"
    ? pressable
    : missingFit(
        "rowHeight",
        value,
        contentCeiling(typography, iconSize, rowRoles),
      );
};

const inspectShadow = (
  level: string,
  index: number,
  shadow: BoxShadow,
): readonly InvalidNumber[] => {
  const at = `${level}[${index}].`;
  return [
    ...inspect("elevation", `${at}offsetX`, shadow.offsetX, "finite"),
    ...inspect("elevation", `${at}offsetY`, shadow.offsetY, "finite"),
    ...inspect(
      "elevation",
      `${at}blurRadius`,
      shadow.blurRadius,
      "nonNegative",
    ),
    ...inspect("elevation", `${at}spreadRadius`, shadow.spreadRadius, "finite"),
  ];
};

export function invalidNumbers(theme: NumberSource): readonly InvalidNumber[] {
  requireGroups(theme);
  return [
    ...inspectLengths("spacing", theme.spacing, "nonNegative"),
    ...inspectLengths("radius", theme.radius, "nonNegative"),
    ...inspectBorderWidths(theme.borderWidth),
    ...inspectLengths("iconSize", theme.iconSize, "positive"),
    ...inspectType(theme.typography),
    ...inspectEmphasis(theme.typography),
    ...inspectControlHeights(theme.density, theme.typography, theme.iconSize),
    ...inspectLengths(
      "density",
      isStepRecord(theme.density) ? theme.density.controlPaddingX : undefined,
      "nonNegative",
      "controlPaddingX.",
    ),
    ...inspectRowHeight(theme.density, theme.typography, theme.iconSize),
    ...Object.entries(theme.elevation ?? {}).flatMap(([level, shadows]) =>
      isShadowList(shadows)
        ? shadows.flatMap((shadow: unknown, index) =>
            isShadowEntry(shadow) ? inspectShadow(level, index, shadow) : [],
          )
        : [],
    ),
  ];
}
