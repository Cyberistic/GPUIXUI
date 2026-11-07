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

const typeRoles: ReadonlyArray<TextRole> = Arr.filter(
  R.keys(typography),
  (role): role is TextRole => role !== "sans" && role !== "mono",
);

const styleOf = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<Smoke.StyleSnapshot> =>
  Option.fromNullishOr(ctx.host.paintedStyle(testId));

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
