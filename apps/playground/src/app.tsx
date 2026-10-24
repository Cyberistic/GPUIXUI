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
import { useLayoutEffect, useRef, useState } from "react";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { textStyle } from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import { paletteIds, palettes, type PaletteId } from "./palettes.js";
import { sidebarCursor } from "./sidebar.js";
import type { PlaygroundScenario } from "./types.js";
import { Body, Readout, isActivationKey } from "./ui.js";

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
            onKeyDown={(event) => {
              if (!isActivationKey(event.key)) return;
              event.preventDefault();
              onSelect(palette);
            }}
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

/**
 * The scenario list: one roving tab stop, arrows that open the next entry.
 *
 * Every row used to be a stop, so a keyboard reader paid a press per scenario to
 * reach the stage and no key moved between rows. The open row is the list's only
 * stop now; an arrow steps the cursor with a clamp, and the step carries the
 * native focus and the scroller with it — the contract `focus-reveal-lifecycle`
 * measured for the library's own lists. Focus and reveal are called from a
 * layout effect because the `tabIndex` change has to paint first (a call from
 * the key handler moved nothing, measured by `virtual-tree-lifecycle`).
 */
const ScenarioList = ({
  list,
  selected,
  onSelect,
}: {
  readonly list: ReadonlyArray<PlaygroundScenario>;
  readonly selected: string;
  readonly onSelect: (id: string) => void;
}) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const rows = useRef<Array<PublicInstance | null>>([]);
  const moved = useRef(false);
  const cursor = Option.getOrElse(
    Arr.findFirstIndex(list, (scenario) => scenario.id === selected),
    () => 0,
  );

  useLayoutEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const row = rows.current[cursor];
    if (row === null || row === undefined) return;
    renderer?.focusElement?.(row.id);
    row.scrollIntoView?.();
  }, [cursor, renderer]);

  /** Opens `next` and moves the focus with the cursor; the open row is the stop. */
  const move = (next: number): void => {
    const target = Option.fromNullishOr(list[next]);
    if (Option.isNone(target) || target.value.id === selected) return;
    moved.current = true;
    onSelect(target.value.id);
  };

  return (
    <div
      testId="shell-nav-list"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flexGrow: 1,
        minHeight: 0,
        overflowY: "scroll",
      }}
    >
      {Arr.map(list, (scenario, index) => (
        <div
          key={scenario.id}
          testId={`nav-${scenario.id}`}
          ref={(row) => {
            rows.current[index] = row;
          }}
          tabIndex={selected === scenario.id ? 0 : -1}
          role="button"
          onClick={() => onSelect(scenario.id)}
          onKeyDown={(event) => {
            const next = sidebarCursor(event.key, cursor, list.length);
            if (Option.isSome(next)) {
              event.preventDefault();
              move(next.value);
              return;
            }
            if (!isActivationKey(event.key)) return;
            event.preventDefault();
            onSelect(scenario.id);
          }}
          style={{
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            cursor: "pointer",
            flexShrink: 0,
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
  );
};

const Shell = ({
  palette,
  onPalette,
  list,
}: {
  readonly palette: PaletteId;
  readonly onPalette: (palette: PaletteId) => void;
  readonly list: ReadonlyArray<PlaygroundScenario>;
}) => {
  const theme = useTheme();
  const [selected, setSelected] = useState(
    Option.match(Arr.head(list), {
      onNone: () => "",
      onSome: (scenario) => scenario.id,
    }),
  );
  const current = pipe(
    Arr.findFirst(list, (scenario) => scenario.id === selected),
    Option.orElse(() => Arr.head(list)),
  );

  return (
    <div
      testId="app-shell"
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
        <ScenarioList list={list} selected={selected} onSelect={setSelected} />
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
          <Body testId="app-title">
            {Option.match(current, {
              onNone: () => "no scenarios",
              onSome: (scenario) => scenario.title,
            })}
          </Body>
        </div>
        <div
          testId="app-stage"
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

export const App = ({
  list,
}: {
  readonly list: ReadonlyArray<PlaygroundScenario>;
}) => {
  const [palette, setPalette] = useState<PaletteId>("dark");

  return (
    <ThemeProvider theme={palettes[palette]}>
      <Shell palette={palette} onPalette={setPalette} list={list} />
    </ThemeProvider>
  );
};
