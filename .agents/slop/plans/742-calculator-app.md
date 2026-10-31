# 742 — `examples/calculator`: the native macOS-feeling app

| Field | Value |
| ----- | ----- |
| Owner | `calculator` workstream |
| Depends on | 740, 741, 733 (`Window`/`nativeWindowOptions`), 726 (fx, optional) |
| Blocks | 743 (verification + docs) |
| Status | in progress |

## Product brief

A real native window, not a web page: the fx-991ES Plus body, a modern macOS
frame, light and dark following the system or a toggle, full keyboard control,
a ⌘K palette over **everything**, and the same app in a kitty/Ghostty terminal.
Extending to TI-84 later is a model addition, not an app fork.

## Layout

```
┌───────────────────────────────────────────────────────────────┐
│ ● ● ●   Calculator        [COMP|CMPLX|STAT|…]     ☾   ⌘K     │  unified toolbar
├───────────────────────────────┬───────────────────────────────┤
│  DISPLAY                      │  INSPECTOR                    │
│  SHIFT ALPHA M STO RCL …      │  mode-specific panel:         │
│  expression / result          │  history · stat editor ·      │
│                               │  base converter · EQN coeffs ·│
│  ┌─────────────────────────┐  │  matrix/vector grid · table   │
│  │ fx-991ES keypad         │  │  or the command reference     │
│  └─────────────────────────┘  │                               │
├───────────────────────────────┴───────────────────────────────┤
│ COMP · Deg · Norm 1 · Math · M  │  42 commands · ⌘K · Terminal  │
└───────────────────────────────────────────────────────────────┘
```

- Width 1060 × 760 (min 860 × 620), resizable; terminal fills the terminal.
- `Window` from `@gpuixui/shell` with `titlebarTransparent: true` and
  `windowBackground: "blurred"` through `nativeWindowOptions`; when
  `isTerminal()` is true the traffic-light reserve is dropped.
- Calculator panel is a card with a warm graphite shell in dark mode and a
  silver shell in light mode. All colours are theme roles; the calculator's
  accent is the system accent, not a literal.
- Display uses a dark LCD surface in both modes (a calculator's display is
  always dark), with monospace numerals, status chips and a right-aligned
  result. Fraction/expression line is `Math` styled; no DOM, no MathML.
- Keypad: six-column grid from the model; keys have a 3D-ish two-tone
  treatment that is a pressed state, not a fake shadow stack. Every key shows
  its SHIFT legend above and ALPHA legend below in the fx-991ES colours
  (mapped to theme roles: `warning`/`success`, or tonal variants in
  high-contrast).
- Inspector: `ScrollArea` with a segmented sub-header. History rows are
  clickable (replay); stat/eqn/matrix/vector editors are grids of `Input`-like
  cells with keyboard focus and arrow navigation; table adds start/end/step and
  a result table.

## Interaction rules

- Clicking a key runs `store.press(id)` synchronously; the display updates in
  the same frame.
- SHIFT/ALPHA are latches (`state.shift`), cleared after the next key, exactly
  as the manual's indicators say.
- Escape clears entry (AC), Backspace deletes (DEL), Enter evaluates (=).
- Arrow keys move the cursor; Up/Down recall history at the result line, and
  move within editors when one is focused.
- ⌘K opens `CommandMenu` with every model command plus app actions. Searching
  `hex`, `regression`, `determinant`, `integral`, `solve`, `constant 28` etc.
  lands on the right command. Running a command inserts the token, switches
  mode, or applies the setup change; the palette closes and the display shows
  the result of a mode switch immediately.
- ⌘1…⌘8 switch modes; ⌘⇧L toggles appearance; ⌘⌫ clears all with a
  confirmation dialog (destructive action must be undoable/prevented).
- `Cmd+K` must work while focus is on a key, the display, or an editor cell:
  the window-level `onKeyDown` in `main.tsx` forwards the chord to the app's
  store, and the app's own root handler handles the rest. (GPUix delivers
  element handlers before the window handler; the window handler checks
  `defaultPrevented`.)
- Terminal: `nub run --filter @gpuixui/calculator terminal` or
  `GPUIX_TERMINAL=1 … dev`; no traffic lights, no titlebar reserve, same
  keyboard map. The status bar switches its hint from "⌘K" to "Ctrl+K" when
  the host is not macOS.

## Theming

- `ThemeProvider` from `@gpuixui/tokens/react`; starts from the system
  appearance (`readAppearance`/`watchAppearance`) and falls back to light.
- Light/dark, high-contrast and density are the token groups; no literal colour
  in the app. The LCD is a deliberate exception expressed as a token pair in
  the app's own style layer (`--`-free: a `useMemo` palette derived from
  `theme.colors` plus fixed LCD hues annotated as physical-device colour).
- The app must be readable at macOS large-text settings; use `Text` roles and
  the token scale, not pixel font sizes except the display (documented).

## Files

```
examples/calculator/
  package.json            @gpuixui/calculator, dev/terminal/test/check-types
  tsconfig.json
  vitest.config.ts
  README.md
  src/
    main.tsx              mount boundary; render(..., nativeWindowOptions, terminal)
    App.tsx               window, toolbar, split, status bar, palette wiring
    display.tsx           LCD display + indicators
    keypad.tsx            model-driven keys, SHIFT/ALPHA
    inspector.tsx         mode panels (history/stat/base/eqn/matrix/vector/table)
    palette.tsx           CommandMenu + app actions
    keyboard.ts           computer key -> model key; chord detection
    appearance.ts         system appearance + toggle
    app-store.ts          palette open, inspector tab, appearance
    *.test.ts(x)          logic tests; one native smoke render
```

## Test plan

- `keyboard.test.ts`: every computer key mapping; chord detection; ⌘K not
  consumed as a calculator key; platform formatting (⌘ vs Ctrl).
- `app-store.test.ts`: palette open/close, mode switch closes palette, appearance
  toggles and persists across a remount, clear-all confirmation.
- `display.test.tsx`: indicators derive from state (SHIFT/ALPHA/M/STO/RCL,
  Deg/Rad/Gra, FIX/SCI, mode); a long result truncates with the right scroll
  indicator; an error shows the Casio message and its location.
- `keypad.test.tsx`: renders exactly the model's key count; pressing SHIFT then
  sin inserts `sin⁻¹(`; pressing ALPHA then A inserts `A`; every key has an
  accessible label.
- `native.test.tsx` (behaviour config): mount the real app in the GPUix test
  renderer, press `1 + 2 =`, read the display `3`; open ⌘K and find
  `determinant`; switch dark/light and assert the painted surface changed.
- Docs: `packages/calc/README.md` and `examples/calculator/README.md` include
  run instructions, a feature matrix against the manual, the model seam for
  TI-84, limitations (no MathML/2D typesetting, no VERIFY on this model, no
  symbolic algebra), and screenshots/capture instructions.

## Commands

```sh
nub run --filter @gpuixui/calculator dev
nub run --filter @gpuixui/calculator terminal
nub run --filter @gpuixui/calculator test
nub run --filter @gpuixui/calculator check-types
```

Expected: the window opens on macOS; `1 + 2 =` reads `3`; ⌘K lists commands;
the terminal run paints the same tree; tests are green.

## STOP conditions

- If `nativeWindowOptions` requires the docs/playground native binding and it
  is missing, run the documented build script once; if it still fails, use the
  plain window options and record the limitation. Do not fabricate a screenshot.
- If `CommandMenu` cannot open from a window-level chord, keep the root key
  handler and document the focus condition; do not claim global shortcuts.

## Acceptance

The app runs natively and in the terminal, all 8 modes are reachable, keyboard
and ⌘K work, both appearances are legible, and every interactive claim has a
test or a recorded runtime measurement.
