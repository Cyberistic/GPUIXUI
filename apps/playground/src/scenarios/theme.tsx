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
  platformTypes,
  textStyle,
  typography,
  type TextRole,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import { Smoke } from "@gpuixui/testing";
import { Body, Pressable, Readout } from "../ui.js";
import {
  nextPalette,
  nextPlatform,
  palettes,
  type PaletteId,
  type PlatformId,
} from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";

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

export const themeColorRolesScenario: PlaygroundScenario = {
  id: "theme-color-roles",
  title: "Theme: every colour role paints and the switch re-paints",
  capability: "theme",
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

export const themeTypeAndShadowScenario: PlaygroundScenario = {
  id: "theme-type-and-shadow",
  title: "Theme: type roles, focus ring and elevation reach the runtime",
  capability: "theme",
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

/** The platform cycle, painted with the shipped `platformTheme` per step. */
const PlatformProbe = () => {
  const [platform, setPlatform] = useState<PlatformId>("default");
  const theme = platformTheme(palettes.dark, platform);

  return (
    <ThemeProvider theme={theme}>
      <Surface>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pressable
            testId="platform-next"
            onClick={() => setPlatform((current) => nextPlatform[current])}
          >
            <Body>switch platform</Body>
          </Pressable>
          <Readout testId="platform-readout">
            {`platform=${platform} label=${platformTypes[platform].label}`}
          </Readout>
        </div>
        <text
          testId="platform-mono"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.foreground,
          }}
        >
          code: the quick brown fox
        </text>
        <text
          testId="platform-sans"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          body: the quick brown fox
        </text>
        <div
          testId="platform-surface"
          style={{
            width: 120,
            height: 32,
            backgroundColor: theme.colors.background,
          }}
        />
      </Surface>
    </ThemeProvider>
  );
};

const family = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  Option.flatMap(styleOf(ctx, testId), (style) => style.fontFamily);

const platformReadout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("platform-readout")),
    () => "",
  );

export const themePlatformScenario: PlaygroundScenario = {
  id: "theme-platform",
  title: "Theme: the platform type styles reach the runtime",
  capability: "theme",
  view: () => <PlatformProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const mono = (platform: PlatformId) =>
        expectStyle(
          ctx,
          `${platform} mono family`,
          "platform-mono",
          (style) => style.fontFamily,
          platformTypes[platform].mono,
        );
      const sans = (platform: PlatformId) =>
        expectStyle(
          ctx,
          `${platform} sans family`,
          "platform-sans",
          (style) => style.fontFamily,
          platformTypes[platform].sans,
        );

      yield* mono("default");
      yield* sans("default");
      yield* ctx.expectContains(
        "the default style is labelled",
        platformReadout(ctx),
        "platform=default label=Default",
      );

      ctx.host.click("platform-next");
      yield* ctx.expectContains(
        "the switch reaches macOS",
        platformReadout(ctx),
        "platform=darwin label=macOS",
      );
      yield* mono("darwin");
      yield* sans("darwin");

      ctx.host.click("platform-next");
      yield* ctx.expectContains(
        "the switch reaches Linux",
        platformReadout(ctx),
        "platform=linux label=Linux",
      );
      yield* mono("linux");
      yield* sans("linux");
      yield* expectStyle(
        ctx,
        "a platform style keeps the palette",
        "platform-surface",
        (style) => style.backgroundColor,
        palettes.dark.colors.background,
      );

      ctx.host.click("platform-next");
      yield* ctx.expectContains(
        "the switch reaches Windows",
        platformReadout(ctx),
        "platform=win32 label=Windows",
      );
      yield* mono("win32");
      yield* sans("win32");

      ctx.host.click("platform-next");
      yield* ctx.expectContains(
        "the cycle returns to the default",
        platformReadout(ctx),
        "platform=default",
      );
      const familyNow = yield* ctx.expectSome(
        "the default family is reported after the cycle",
        family(ctx, "platform-mono"),
      );
      yield* ctx.expectEqual(
        "the default mono family is restored",
        familyNow,
        platformTypes.default.mono,
      );
    }),
};
