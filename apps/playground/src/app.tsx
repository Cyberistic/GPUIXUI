/**
 * The playground shell.
 *
 * The sidebar **is** the scenario registry, so a scenario can never exist in
 * the smoke suite but not in the UI (or the reverse). Selecting one renders its
 * real GPUix tree in the stage.
 *
 * `App` owns the palette and supplies it through `ThemeProvider`; `Shell` reads
 * it back with `useTheme`, so the switch exercises the same path a consumer
 * uses. GPUix has no OS appearance query, so the palette is an app decision.
 *
 * The shell renders and navigates without the native host: the smoke host's
 * checks need a `TestRenderer`, so the footer says how to run them instead of
 * offering a button that cannot work. `main.tsx` refuses to start at all on a
 * host with no binding.
 */
import { useState } from "react";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { textStyle } from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import { paletteIds, palettes, type PaletteId } from "./palettes.js";
import { Body, Readout } from "./ui.js";
import { scenarios } from "./scenarios/index.js";

const PaletteSwitch = ({
  active,
  onSelect,
}: {
  readonly active: PaletteId;
  readonly onSelect: (palette: PaletteId) => void;
}) => {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Palette
      </text>
      <div style={{ display: "flex", gap: 4 }}>
        {Arr.map(paletteIds, (palette) => (
          <div
            key={palette}
            testId={`theme-mode-${palette}`}
            tabIndex={0}
            role="button"
            onClick={() => onSelect(palette)}
            style={{
              padding: theme.spacing.xs,
              borderRadius: theme.radius.sm,
              cursor: "pointer",
              backgroundColor:
                active === palette ? theme.colors.accent : theme.colors.muted,
              hover: { backgroundColor: theme.colors.border },
            }}
          >
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.foreground,
              }}
            >
              {palette}
            </text>
          </div>
        ))}
      </div>
    </div>
  );
};

const Shell = ({
  palette,
  onPalette,
}: {
  readonly palette: PaletteId;
  readonly onPalette: (palette: PaletteId) => void;
}) => {
  const theme = useTheme();
  const [selected, setSelected] = useState(
    Option.match(Arr.head(scenarios), {
      onNone: () => "",
      onSome: (scenario) => scenario.id,
    }),
  );
  const current = pipe(
    Arr.findFirst(scenarios, (scenario) => scenario.id === selected),
    Option.orElse(() => Arr.head(scenarios)),
  );

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 260,
          flexShrink: 0,
          padding: theme.spacing.lg,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          borderRightWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <PaletteSwitch active={palette} onSelect={onPalette} />
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.foreground,
            marginTop: theme.spacing.md,
          }}
        >
          Scenarios
        </text>
        {Arr.map(scenarios, (scenario) => (
          <div
            key={scenario.id}
            testId={`nav-${scenario.id}`}
            tabIndex={0}
            role="button"
            onClick={() => setSelected(scenario.id)}
            style={{
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              cursor: "pointer",
              backgroundColor:
                selected === scenario.id
                  ? theme.colors.accent
                  : theme.colors.background,
              hover: { backgroundColor: theme.colors.muted },
            }}
          >
            <text
              style={{
                ...textStyle(theme, "label"),
                color: theme.colors.foreground,
              }}
            >
              {scenario.title}
            </text>
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.mutedForeground,
              }}
            >
              {scenario.capability}
            </text>
          </div>
        ))}
      </div>

      <div
        style={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: theme.spacing.lg,
            borderBottomWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <Body>
            {Option.match(current, {
              onNone: () => "no scenarios",
              onSome: (scenario) => scenario.title,
            })}
          </Body>
        </div>
        <div
          style={{
            flexGrow: 1,
            minHeight: 0,
            padding: theme.spacing.xl,
            overflow: "scroll",
          }}
        >
          {Option.match(current, {
            onNone: () => null,
            onSome: (scenario) => scenario.view(),
          })}
        </div>
        <div
          style={{
            padding: theme.spacing.lg,
            borderTopWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <Readout testId="app-note">
            checks run in the native test host: nub run --filter playground
            smoke
          </Readout>
        </div>
      </div>
    </div>
  );
};

export const App = () => {
  const [palette, setPalette] = useState<PaletteId>("dark");

  return (
    <ThemeProvider theme={palettes[palette]}>
      <Shell palette={palette} onPalette={setPalette} />
    </ThemeProvider>
  );
};
