/** @jsxImportSource @gpuix/react */
/**
 * The calculator app: one native window, the fx-991ES Plus keypad, the LCD, a
 * mode-aware inspector, and the ⌘K palette over every command in the model.
 *
 * The app is a composition of the library, not a second design system. Every
 * colour comes from `@gpuixui/tokens` except the LCD's physical ink; every
 * interaction goes through the engine's session (or the palette's actions).
 */

import {
  calculatorKeyOf,
  defaultModel,
  displayOf,
  type CalculatorState,
  type CommandAction,
} from "@gpuixui/calc";
import { useCalculator } from "@gpuixui/calc/react";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
} from "@gpuixui/components/command-menu";
import { Icon } from "@gpuixui/icons";
import { Button, Stack, Text } from "@gpuixui/primitives";
import { StatusBar, Window, WindowToolbar } from "@gpuixui/shell";
import {
  darkTheme,
  lightTheme,
  currentPlatform,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import { useMemo, useState } from "react";
import type { KeyEvent } from "@gpuix/react";
import {
  modeForShortcut,
  paletteEntries,
  paletteMatches,
  statusItems,
} from "./app-logic.js";
import { Display } from "./display.js";
import { Inspector } from "./inspector.js";
import { Keypad } from "./keypad.js";
import { SetupSheet } from "./setup-sheet.js";
import { bodyPaint } from "./theme.js";

const model = defaultModel;

export interface CalculatorAppProps {
  /** Start in the dark appearance. Defaults to light. */
  readonly initialDark?: boolean;
}

type InspectorTab = "history" | "mode" | "catalog";

export const CalculatorApp = ({ initialDark = false }: CalculatorAppProps) => {
  const [dark, setDark] = useState(initialDark);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recents, setRecents] = useState<ReadonlyArray<string>>([]);
  const [tab, setTab] = useState<InspectorTab>("mode");
  const [setupOpen, setSetupOpen] = useState(false);
  const [poweredOff, setPoweredOff] = useState(false);
  const [contrast, setContrast] = useState(6);
  const { state, press, run } = useCalculator();
  const theme: Theme = dark ? darkTheme : lightTheme;
  const display = displayOf(state);

  const runEngine = (command: {
    readonly action: CommandAction;
    readonly id: string;
  }): void => {
    setRecents((current) =>
      Arr.take([command.id, ...current.filter((id) => id !== command.id)], 6),
    );
    run(command.action);
  };

  const entries = useMemo(
    () =>
      paletteEntries(model, {
        runEngine,
        toggleAppearance: () => setDark((current) => !current),
        showHistory: () => setTab("history"),
      }),
    // `run` is stable for the store; the callbacks only close over setters.
    [run],
  );
  const actions = useMemo(
    () => Arr.map(entries, (entry) => entry.action),
    [entries],
  );

  const pressKey = (key: string): void => {
    if (poweredOff) {
      setPoweredOff(false);
      return;
    }
    if (state.shift && key === "MODE") {
      press("SHIFT");
      setSetupOpen(true);
      return;
    }
    if (state.shift && key === "AC") {
      press("SHIFT");
      setPoweredOff(true);
      return;
    }
    press(key);
  };

  const onKeyDown = (event: KeyEvent): void => {
    if (paletteOpen || setupOpen) return;
    if (poweredOff) {
      event.preventDefault();
      setPoweredOff(false);
      return;
    }
    const modifiers = event.modifiers;
    const key = event.key ?? "";
    if (modifiers?.cmd === true && key === ",") {
      event.preventDefault();
      setSetupOpen(true);
      return;
    }
    if (
      modifiers?.cmd === true &&
      modifiers.shift === true &&
      key.toLowerCase() === "q"
    ) {
      event.preventDefault();
      setPoweredOff(true);
      return;
    }
    if (modifiers?.cmd === true && key.toLowerCase() === "k") {
      event.preventDefault();
      setPaletteOpen(true);
      return;
    }
    if (
      modifiers?.cmd === true &&
      modifiers.shift === true &&
      key.toLowerCase() === "l"
    ) {
      event.preventDefault();
      setDark((current) => !current);
      return;
    }
    if (modifiers?.cmd === true) {
      const index = Number.parseInt(key, 10);
      if (Number.isInteger(index)) {
        const mode = modeForShortcut(index);
        if (mode !== null) {
          event.preventDefault();
          run({ _tag: "mode", mode });
        }
      }
      return;
    }
    if (modifiers?.ctrl === true) return;
    const calculatorKey = calculatorKeyOf({
      key,
      shift: modifiers?.shift,
      alt: modifiers?.alt,
    });
    if (calculatorKey._tag === "Some") {
      event.preventDefault();
      pressKey(calculatorKey.value);
    }
  };

  const body = bodyPaint(theme);

  return (
    <ThemeProvider theme={theme}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        <Window
          testId="calculator-window"
          platform={currentPlatform}
          autoFocus
          tabIndex={0}
          onKeyDown={onKeyDown}
          toolbar={
            <WindowToolbar
              title="Calculator"
              leading={
                <Text role="caption" tone="muted">
                  {model.label}
                </Text>
              }
              actions={
                <Stack direction="row" gap="2xs" align="center">
                  <Button
                    testId="calc-appearance"
                    variant="ghost"
                    size="sm"
                    square
                    label={
                      dark
                        ? "Switch to light appearance"
                        : "Switch to dark appearance"
                    }
                    tabIndex={-1}
                    onActivate={() => setDark((current) => !current)}
                  >
                    <Icon
                      name={dark ? "sun" : "moon"}
                      color={theme.colors.foreground}
                      size="sm"
                    />
                  </Button>
                  <Button
                    testId="calc-open-palette"
                    variant="outline"
                    size="sm"
                    leading={
                      <Icon
                        name="search"
                        color={theme.colors.mutedForeground}
                        size="xs"
                      />
                    }
                    onActivate={() => setPaletteOpen(true)}
                  >
                    ⌘K
                  </Button>
                </Stack>
              }
            />
          }
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              minHeight: 0,
            }}
          >
            <ModeRail state={state} theme={theme} run={run} />

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexGrow: 1,
                minHeight: 0,
              }}
            >
              <div
                testId="calculator-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexBasis: 486,
                  flexGrow: 0,
                  flexShrink: 1,
                  minWidth: 400,
                  gap: theme.spacing.sm,
                  padding: theme.spacing.md,
                  backgroundColor: body.background,
                  borderRightWidth: theme.borderWidth.thin,
                  borderColor: body.border,
                }}
              >
                <Display
                  display={display}
                  dark={dark}
                  theme={theme}
                  contrast={contrast}
                  poweredOff={poweredOff}
                />
                <Keypad
                  rows={model.keypad}
                  shift={state.shift}
                  alpha={state.alpha}
                  hyp={state.hyp}
                  theme={theme}
                  press={pressKey}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: theme.spacing.sm,
                  }}
                >
                  <Text role="caption" tone="muted">
                    Enter = evaluate · Esc AC · ⌘K every command
                  </Text>
                  <Text role="caption" tone="muted">
                    {state.setup.angle}
                  </Text>
                </div>
              </div>

              <Inspector
                state={state}
                theme={theme}
                dark={dark}
                run={run}
                press={pressKey}
                tab={tab}
                onTab={setTab}
              />
            </div>

            <StatusBar
              testId="calculator-status"
              label="Calculator status"
              left={Arr.map(statusItems(state).left, (item) => ({
                id: item.id,
                label: item.label,
              }))}
              right={Arr.map(statusItems(state).right, (item) => ({
                id: item.id,
                label: item.label,
              }))}
            />
          </div>
        </Window>

        <SetupSheet
          open={setupOpen}
          onOpenChange={setSetupOpen}
          state={state}
          theme={theme}
          contrast={contrast}
          onContrast={setContrast}
          run={run}
        />

        <CommandMenu
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          actions={actions}
          recents={recents}
          filter={(action, query) => {
            const entry = entries.find((held) => held.action.id === action.id);
            return entry === undefined ? false : paletteMatches(entry, query);
          }}
        >
          <CommandMenuInput placeholder="Search functions, modes, constants…" />
          <CommandMenuList />
          <CommandMenuEmpty>No matching command</CommandMenuEmpty>
        </CommandMenu>
      </div>
    </ThemeProvider>
  );
};

const ModeRail = ({
  state,
  theme,
  run,
}: {
  readonly state: CalculatorState;
  readonly theme: Theme;
  readonly run: (action: CommandAction) => void;
}) => (
  <div
    testId="calculator-modes"
    style={{
      display: "flex",
      flexDirection: "row",
      gap: 2,
      paddingLeft: theme.spacing.lg,
      paddingRight: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderBottomWidth: theme.borderWidth.thin,
      borderColor: theme.colors.border,
      alignItems: "center",
    }}
  >
    {Arr.map(model.modes, (mode) => (
      <Button
        key={mode.mode}
        variant={state.mode === mode.mode ? "primary" : "ghost"}
        size="sm"
        tabIndex={-1}
        onActivate={() => run({ _tag: "mode", mode: mode.mode })}
        testId={`calc-mode-${mode.mode}`}
      >
        {mode.label}
      </Button>
    ))}
    <div style={{ flexGrow: 1 }} />
    <Text role="caption" tone="muted">
      8 modes · every command in ⌘K
    </Text>
  </div>
);
