/**
 * The theme gallery: the token layer painting in the real runtime.
 *
 * `theme-color-roles` renders every role in `colorRoles` as a labelled swatch,
 * then switches dark → light → high contrast. Each step asserts the runtime's
 * **own style report** (`paintedStyle`) against the theme's value, so a token
 * that never reaches the renderer fails without a screenshot diff.
 *
 * `theme-type-and-shadow` does the same for every type role through
 * `textStyle`, plus `focusRing` and an `md` elevation. The ring check is a
 * **style** proof, not a focus-behaviour proof: `focus-traversal` owns that.
 *
 * `theme-platform` paints one row per platform through `platformTheme` — its
 * mono face, a palette role, a radius from its own scale and an `md` control at
 * its density — and asserts each against the runtime's style report, so the
 * platform styles are real theme values rather than a docs-only toggle.
 *
 * `theme-look` does the same for the authored looks (`retroTheme` over
 * `retroStyles`), with the base theme's own `lg` radius and `primary` fill as the
 * negative control: a look that inherited its base would fail both.
 *
 * The role lists are derived from `colorRoles` and `typography`, never copied,
 * so a new token cannot go untested. The panel rows are explicit flex rows
 * because `flexWrap` is not a verified GPUix capability.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import {
  colorRoles,
  elevationShadow,
  focusRing,
  platformTheme,
  retroNames,
  retroStyles,
  retroTheme,
  textStyle,
  typography,
  type PlatformName,
  type TextRole,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import { Smoke } from "@gpuixui/testing";
import { Body, Pressable, Readout } from "../ui.js";
import { nextPalette, palettes, type PaletteId } from "../palettes.js";
import type { ScenarioBody } from "../types.js";

const SWATCH_COLUMNS = 4;
const SWATCH_WIDTH = 176;

/** The gallery's own surface, so the smoke screenshot is not a black page. */
const Surface = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      {children}
    </div>
  );
};

/** Every typographic role, read off `typography` rather than restated. */
const typeRoles: ReadonlyArray<TextRole> = Arr.filter(
  R.keys(typography),
  (role): role is TextRole => role !== "sans" && role !== "mono",
);

const styleOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<Smoke.StyleSnapshot> =>
  Option.fromNullishOr(ctx.host.paintedStyle(testId));

/**
 * Asserts one property of one element's painted style.
 *
 * `paintedStyle` is `null` when the element is not painted and a property is
 * `None` when the runtime did not report it; both fail the check with a label
 * naming the element, so a style the runtime silently dropped cannot pass.
 */
const expectStyle = <A extends Smoke.Scalar>(
  ctx: Smoke.SmokeContext,
  label: string,
  testId: string,
  property: (style: Smoke.StyleSnapshot) => Option.Option<A>,
  expected: A,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Option.match(Option.flatMap(styleOf(ctx, testId), property), {
    onNone: () =>
      Effect.fail(
        new Smoke.SmokeAssertionError({
          label,
          expected: `${expected}`,
          actual: `no such style property on ${testId}`,
        }),
      ),
    onSome: (actual) => ctx.expectEqual(label, actual, expected),
  });

const backgroundOf = (
  ctx: Smoke.SmokeContext,
  role: (typeof colorRoles)[number],
): Option.Option<string> =>
  Option.flatMap(
    styleOf(ctx, `swatch-${role}`),
    (style) => style.backgroundColor,
  );

/** Asserts every colour role paints its own value in `theme`. */
const expectPalette = (
  ctx: Smoke.SmokeContext,
  theme: Theme,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.forEach(
    colorRoles,
    (role) =>
      expectStyle(
        ctx,
        `swatch ${role}`,
        `swatch-${role}`,
        (style) => style.backgroundColor,
        theme.colors[role],
      ),
    { concurrency: 1, discard: true },
  );

const SwatchGrid = ({ theme }: { readonly theme: Theme }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {Arr.map(Arr.chunksOf(colorRoles, SWATCH_COLUMNS), (row, rowIndex) => (
      <div key={rowIndex} style={{ display: "flex", gap: 6 }}>
        {Arr.map(row, (role) => (
          <div key={role} style={{ width: SWATCH_WIDTH }}>
            <div
              testId={`swatch-${role}`}
              style={{
                height: 22,
                backgroundColor: theme.colors[role],
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            />
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
                whiteSpace: "nowrap",
              }}
            >
              {role}
            </text>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const ColorRolesProbe = () => {
  const [palette, setPalette] = useState<PaletteId>("dark");
  const theme = palettes[palette];

  return (
    <ThemeProvider theme={theme}>
      <Surface>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pressable
            testId="theme-next"
            onClick={() => setPalette((current) => nextPalette[current])}
          >
            <Body>switch palette</Body>
          </Pressable>
          <Readout testId="theme-readout">
            {`palette=${palette} name=${theme.name}`}
          </Readout>
        </div>
        <SwatchGrid theme={theme} />
      </Surface>
    </ThemeProvider>
  );
};

/** The `palette=` readout, or `""` when the readout is missing. */
const readout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("theme-readout")),
    () => "",
  );

const familyOf = (
  ctx: Smoke.SmokeContext,
  role: TextRole,
): Option.Option<string> =>
  Option.flatMap(styleOf(ctx, `type-${role}`), (style) => style.fontFamily);

const TypeProbe = () => {
  const theme = palettes.dark;

  return (
    <ThemeProvider theme={theme}>
      <Surface>
        {Arr.map(typeRoles, (role) => (
          <text
            key={role}
            testId={`type-${role}`}
            style={{
              ...textStyle(theme, role),
              color: theme.colors.foreground,
            }}
          >
            {`${role}: the quick brown fox`}
          </text>
        ))}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <div
            testId="theme-focus-ring"
            style={{
              ...focusRing(theme),
              width: 120,
              height: 32,
              backgroundColor: theme.colors.card,
            }}
          />
          <div
            testId="theme-elevation-md"
            style={{
              width: 120,
              height: 32,
              backgroundColor: theme.colors.card,
              boxShadow: elevationShadow(theme, "md"),
            }}
          />
        </div>
      </Surface>
    </ThemeProvider>
  );
};

export const themeColorRolesScenario: ScenarioBody = {
  view: () => <ColorRolesProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* expectPalette(ctx, palettes.dark);
      const darkBackground = yield* ctx.expectSome(
        "dark background reported",
        backgroundOf(ctx, "background"),
      );

      ctx.host.click("theme-next");
      yield* expectPalette(ctx, palettes.light);
      const lightBackground = yield* ctx.expectSome(
        "light background reported",
        backgroundOf(ctx, "background"),
      );
      yield* ctx.expectEqual(
        "the switch re-painted the surface",
        lightBackground === darkBackground,
        false,
      );
      yield* ctx.expectContains(
        "readout names the palette",
        readout(ctx),
        "palette=light",
      );

      ctx.host.click("theme-next");
      yield* expectPalette(ctx, palettes.high);
      const highBackground = yield* ctx.expectSome(
        "high contrast background reported",
        backgroundOf(ctx, "background"),
      );
      yield* ctx.expectEqual(
        "high contrast is a third colour set",
        highBackground === darkBackground || highBackground === lightBackground,
        false,
      );
      yield* ctx.expectContains(
        "readout names high contrast",
        readout(ctx),
        "palette=high",
      );
    }),
};

export const themeTypeAndShadowScenario: ScenarioBody = {
  view: () => <TypeProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* Effect.forEach(
        typeRoles,
        (role) => {
          const style = textStyle(palettes.dark, role);
          return Effect.gen(function* () {
            yield* expectStyle(
              ctx,
              `type ${role} size`,
              `type-${role}`,
              (snapshot) => snapshot.fontSize,
              style.fontSize,
            );
            yield* expectStyle(
              ctx,
              `type ${role} family`,
              `type-${role}`,
              (snapshot) => snapshot.fontFamily,
              style.fontFamily,
            );
          });
        },
        { concurrency: 1, discard: true },
      );

      const bodyFamily = yield* ctx.expectSome(
        "body family reported",
        familyOf(ctx, "body"),
      );
      const codeFamily = yield* ctx.expectSome(
        "code family reported",
        familyOf(ctx, "code"),
      );
      yield* ctx.expectEqual(
        "code role paints the mono family",
        codeFamily !== bodyFamily,
        true,
      );

      const ring = focusRing(palettes.dark).boxShadow;
      yield* expectStyle(
        ctx,
        "focus ring colour",
        "theme-focus-ring",
        (snapshot) => Option.map(snapshot.boxShadow, (shadow) => shadow.color),
        ring.color,
      );
      yield* expectStyle(
        ctx,
        "focus ring spread",
        "theme-focus-ring",
        (snapshot) =>
          Option.map(snapshot.boxShadow, (shadow) => shadow.spreadRadius),
        ring.spreadRadius,
      );
      yield* expectStyle(
        ctx,
        "focus ring is a spread, not a blur",
        "theme-focus-ring",
        (snapshot) =>
          Option.map(snapshot.boxShadow, (shadow) => shadow.blurRadius),
        0,
      );

      const md = yield* ctx.expectSome(
        "md elevation is a shadow",
        Option.fromNullishOr(elevationShadow(palettes.dark, "md")),
      );
      yield* expectStyle(
        ctx,
        "md elevation colour",
        "theme-elevation-md",
        (snapshot) => Option.map(snapshot.boxShadow, (shadow) => shadow.color),
        md.color,
      );
      yield* expectStyle(
        ctx,
        "md elevation blur",
        "theme-elevation-md",
        (snapshot) =>
          Option.map(snapshot.boxShadow, (shadow) => shadow.blurRadius),
        md.blurRadius,
      );
      yield* expectStyle(
        ctx,
        "md elevation offset",
        "theme-elevation-md",
        (snapshot) =>
          Option.map(snapshot.boxShadow, (shadow) => shadow.offsetY),
        md.offsetY,
      );
    }),
};

/**
 * One row of theme samples: the mono face, the primary fill, an `lg` radius and
 * an `md` control at the theme's density.
 *
 * The sans face is GPUI's `.SystemUIFont` sentinel in every style, so the family
 * that distinguishes two themes is the mono one. `base` paints the labels and
 * the row's gap; `themed` owns every sampled value.
 */
const ThemeRow = ({
  label,
  testId,
  base,
  themed,
}: {
  readonly label: string;
  readonly testId: string;
  readonly base: Theme;
  readonly themed: Theme;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: base.spacing.lg,
    }}
  >
    <text
      testId={testId}
      style={{
        ...textStyle(themed, "code"),
        color: base.colors.foreground,
      }}
    >
      {`${label}: ${themed.typography.mono}`}
    </text>
    <div
      testId={`${testId}-primary`}
      style={{
        width: 24,
        height: 24,
        backgroundColor: themed.colors.primary,
        borderRadius: themed.radius.sm,
      }}
    />
    <div
      testId={`${testId}-radius`}
      style={{
        width: 32,
        height: 32,
        backgroundColor: themed.colors.card,
        borderRadius: themed.radius.lg,
      }}
    />
    <div
      testId={`${testId}-control`}
      style={{
        width: 64,
        height: themed.density.controlHeight.md,
        backgroundColor: themed.colors.muted,
        borderRadius: themed.radius.md,
      }}
    />
  </div>
);

/** Asserts one row's four samples against the runtime's own style report. */
const expectThemeRow = (
  ctx: Smoke.SmokeContext,
  label: string,
  testId: string,
  themed: Theme,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    yield* expectStyle(
      ctx,
      `${label} mono family`,
      testId,
      (snapshot) => snapshot.fontFamily,
      themed.typography.mono,
    );
    yield* expectStyle(
      ctx,
      `${label} primary fill`,
      `${testId}-primary`,
      (snapshot) => snapshot.backgroundColor,
      themed.colors.primary,
    );
    yield* expectStyle(
      ctx,
      `${label} large radius`,
      `${testId}-radius`,
      (snapshot) => snapshot.borderRadius,
      themed.radius.lg,
    );
    const control = yield* ctx.expectSome(
      `${label} paints a control box`,
      Option.fromNullishOr(ctx.host.bounds(`${testId}-control`)),
    );
    yield* ctx.expectNear(
      `${label} md control height`,
      control.height,
      themed.density.controlHeight.md,
      1,
    );
  });

/**
 * The platforms whose styles the gallery proves.
 *
 * `default` is the house identity and is already painted by the other two
 * scenarios, so only the three that must differ are sampled here.
 */
const platformNames: ReadonlyArray<Exclude<PlatformName, "default">> = [
  "darwin",
  "linux",
  "win32",
];

const PlatformProbe = () => {
  const base = palettes.dark;

  return (
    <ThemeProvider theme={base}>
      <Surface>
        {Arr.map(platformNames, (platform) => (
          <ThemeRow
            key={platform}
            label={platform}
            testId={`platform-${platform}`}
            base={base}
            themed={platformTheme(base, platform)}
          />
        ))}
      </Surface>
    </ThemeProvider>
  );
};

export const themePlatformScenario: ScenarioBody = {
  view: () => <PlatformProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const families = yield* Effect.forEach(
        platformNames,
        (platform) => {
          const themed = platformTheme(palettes.dark, platform);
          return Effect.map(
            expectThemeRow(ctx, platform, `platform-${platform}`, themed),
            () => ({
              platform,
              mono: themed.typography.mono,
              sans: themed.typography.sans,
            }),
          );
        },
        { concurrency: 1 },
      );

      const sans = Arr.map(families, (family) => family.sans);
      yield* ctx.expectEqual(
        "every platform keeps the system UI sentinel",
        Arr.every(sans, (family) => family === palettes.dark.typography.sans),
        true,
      );
      yield* ctx.expectEqual(
        "the three platforms name three different mono families",
        Arr.length(Arr.dedupe(Arr.map(families, (family) => family.mono))),
        3,
      );
    }),
};

/**
 * One row per authored look, styled through `retroTheme`.
 *
 * The looks are not platform names — `platformNames` is the persisted key and
 * the docs toggle offers it — so they get their own probe rather than a fourth
 * platform row. Each row samples the same four values `platformTheme` is held to,
 * because `applyStyle` is the one merge rule both routes use.
 */
const LookProbe = () => {
  const base = palettes.dark;

  return (
    <ThemeProvider theme={base}>
      <Surface>
        {Arr.map(retroNames, (look) => (
          <ThemeRow
            key={look}
            label={look}
            testId={`look-${look}`}
            base={base}
            themed={retroTheme(base, look)}
          />
        ))}
      </Surface>
    </ThemeProvider>
  );
};

export const themeLookScenario: ScenarioBody = {
  view: () => <LookProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const base = palettes.dark;
      const painted = Arr.map(retroNames, (look) => ({
        look,
        theme: retroTheme(base, look),
      }));

      yield* Effect.forEach(
        painted,
        ({ look, theme }) => expectThemeRow(ctx, look, `look-${look}`, theme),
        { concurrency: 1, discard: true },
      );

      // The samples only prove `retroTheme` painted the look if they differ from
      // the base; the probe's negative control is a row that inherited the
      // base's radius or primary fill. Two looks may legitimately share an `lg`
      // step — Luna and Omarchy both author 3 — so the aggregate reads the
      // styles' own table instead of demanding that every look be unique: a look
      // that fell back to the base would drop a step the table authors.
      const radii = Arr.map(painted, ({ theme }) => theme.radius.lg);
      yield* ctx.expectEqual(
        "every look paints a radius the base does not",
        Arr.contains(radii, base.radius.lg),
        false,
      );
      yield* ctx.expectEqual(
        "the looks paint as many distinct lg steps as their styles author",
        Arr.length(Arr.dedupe(radii)),
        Arr.length(
          Arr.dedupe(
            Arr.map(retroNames, (look) => retroStyles[look].radius.lg),
          ),
        ),
      );
      const fills = Arr.map(painted, ({ theme }) => theme.colors.primary);
      yield* ctx.expectEqual(
        "every look paints a palette the base does not",
        Arr.contains(fills, base.colors.primary),
        false,
      );
      yield* ctx.expectEqual(
        "the looks do not share one mono family",
        Arr.length(
          Arr.dedupe(Arr.map(painted, ({ theme }) => theme.typography.mono)),
        ),
        Arr.length(painted),
      );
    }),
};
