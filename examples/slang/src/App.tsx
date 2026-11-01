/** @jsxImportSource @gpuix/react */
/**
 * Slang, the calculator app: one native window holding the fx-991ES Plus as the device
 * is — body, LCD and keypad — beside a panel (history, the mode's editor, the
 * catalogue) that folds away, and the ⌘K palette over every model command.
 *
 * The app is a composition of the library, not a second design system. Every
 * colour comes from `@gpuixui/tokens` except the LCD's physical ink; every
 * interaction goes through the engine's session (or the palette's actions).
 */

import {
  calculatorKeyOf,
  defaultModel,
  displayOf,
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
import * as Option from "effect/Option";
import { fileURLToPath } from "node:url";
import { useMemo, useState } from "react";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import {
  DEVICE,
  deviceUnit,
  modeForShortcut,
  modeMenu,
  modeMenuPick,
  paletteEntries,
  paletteMatches,
  shiftMenu,
  statusItems,
  type InspectorTab,
} from "./app-logic.js";
import { Display } from "./display.js";
import { Inspector } from "./inspector.js";
import { Keypad } from "./keypad.js";
import { SetupSheet } from "./setup-sheet.js";
import { device } from "./theme.js";

/** The app's mark: `media/logo.svg`, rendered at 128 px. */
const LOGO = fileURLToPath(new URL("./logo.png", import.meta.url));

const model = defaultModel;

export interface CalculatorAppProps {
  /** Start in the dark appearance. Defaults to light. */
  readonly initialDark?: boolean;
}

export const CalculatorApp = ({ initialDark = false }: CalculatorAppProps) => {
  const [dark, setDark] = useState(initialDark);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recents, setRecents] = useState<ReadonlyArray<string>>([]);
  const [tab, setTab] = useState<InspectorTab>("history");
  const [panelOpen, setPanelOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [u, setU] = useState(1);
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
        showHistory: () => {
          setTab("history");
          setPanelOpen(true);
        },
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
    if (menuOpen) {
      setMenuOpen(false);
      Option.map(modeMenuPick(key), (mode) => run({ _tag: "mode", mode }));
      return;
    }
    if (!state.shift && key === "MODE") {
      setMenuOpen(true);
      return;
    }
    if (state.shift && key === "MODE") {
      press("SHIFT");
      setSetupOpen(true);
      return;
    }
    const menu = state.shift ? shiftMenu(key) : Option.none();
    if (Option.isSome(menu)) {
      press("SHIFT");
      if (menu.value._tag === "setup") setSetupOpen(true);
      else {
        Option.map(menu.value.mode, (mode) => run({ _tag: "mode", mode }));
        setTab(menu.value.tab);
        setPanelOpen(true);
      }
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
    if (modifiers?.cmd === true && key.toLowerCase() === "h") {
      event.preventDefault();
      setPanelOpen((open) => !open);
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

  const fit = (event: EventPayload) => {
    if (event.width !== undefined && event.height !== undefined)
      setU(deviceUnit(event.width, event.height));
  };

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
              title="Slang"
              leading={
                <Stack direction="row" gap="xs" align="center">
                  <img
                    testId="slang-logo"
                    src={LOGO}
                    objectFit="contain"
                    style={{ width: 18, height: 18 }}
                  />
                  <Text role="caption" tone="muted">
                    {model.label}
                  </Text>
                </Stack>
              }
              actions={
                <Stack direction="row" gap="2xs" align="center">
                  <Button
                    testId="calc-panel-toggle"
                    variant={panelOpen ? "secondary" : "ghost"}
                    size="sm"
                    square
                    label={panelOpen ? "Hide the panel" : "Show the panel"}
                    tabIndex={-1}
                    onActivate={() => setPanelOpen((open) => !open)}
                  >
                    <Icon
                      name="panel-right"
                      color={theme.colors.foreground}
                      size="sm"
                    />
                  </Button>
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
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexGrow: 1,
                minHeight: 0,
              }}
            >
              <div
                testId="calculator-stage"
                onLayout={fit}
                style={{
                  display: "flex",
                  flexGrow: 1,
                  flexBasis: 0,
                  minWidth: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.colors.muted,
                }}
              >
                <div
                  testId="calculator-body"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: DEVICE.width * u,
                    gap: 10 * u,
                    padding: 18 * u,
                    borderRadius: 24 * u,
                    backgroundColor: device.body,
                    borderWidth: Math.max(1, 2 * u),
                    borderColor: device.bodyEdge,
                  }}
                >
                  <DeviceHeader u={u} theme={theme} />
                  <Display
                    display={display}
                    theme={theme}
                    contrast={contrast}
                    poweredOff={poweredOff}
                    menu={menuOpen ? Option.some(modeMenu) : Option.none()}
                    u={u}
                  />
                  <div style={{ height: 2 * u }} />
                  <Keypad
                    keypad={model.keypad}
                    shift={state.shift}
                    alpha={state.alpha}
                    hyp={state.hyp}
                    theme={theme}
                    u={u}
                    press={pressKey}
                  />
                </div>
              </div>

              {panelOpen ? (
                <div
                  style={{
                    display: "flex",
                    flexBasis: 420,
                    flexShrink: 1,
                    minWidth: 300,
                    borderLeftWidth: theme.borderWidth.thin,
                    borderColor: theme.colors.border,
                  }}
                >
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
              ) : null}
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

/** The model line and the solar panel above the LCD. */
const DeviceHeader = ({
  u,
  theme,
}: {
  readonly u: number;
  readonly theme: Theme;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 26 * u,
    }}
  >
    <div style={{ display: "flex", flexDirection: "column" }}>
      <text
        style={{
          fontFamily: theme.typography.sans,
          fontSize: 11 * u,
          lineHeight: 13 * u,
          fontWeight: 700,
          color: device.model,
        }}
      >
        fx-991ES PLUS
      </text>
      <text
        style={{
          fontFamily: theme.typography.sans,
          fontSize: 7 * u,
          lineHeight: 9 * u,
          fontWeight: 600,
          color: device.model,
        }}
      >
        NATURAL-V.P.A.M.
      </text>
    </div>
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: u,
        padding: 2 * u,
        borderRadius: 3 * u,
        backgroundColor: device.solar,
      }}
    >
      {Arr.map(Arr.range(1, 4), (cell) => (
        <div
          key={cell}
          style={{
            width: 18 * u,
            height: 16 * u,
            backgroundColor: device.solarCell,
          }}
        />
      ))}
    </div>
  </div>
);
