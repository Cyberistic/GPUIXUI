# Plan 519 — the in-window application menu bar: switching, roving items and accelerators

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** D (Tier 4 `Application menus`; the last Tier 4 row with no measured
interaction model).
**Depends on:** plans `100`, `110`, `120`, `140`, `155`, `156`, `164`, `176`,
`182`, `189`, `190`, `345`, `350`.

## 1. Why this plan exists

`COMPONENTS.md` records `Application menus` as **`unsupported (in-window only)`**:
0.10.0 exposes no menu/tray API (`NativeRenderer` has only window controls), so a
real menu bar must be an in-window surface. What has been measured is the
**palette** (`command-palette`, plan `176`) and the **dropdown/context surfaces**
(plans `159`, `164`, `187`) — not a menu bar's own interaction model:

1. **Switching while open.** A desktop menu bar opens one menu and moves to the
   neighbour on hover or Left/Right **without a press**. Nothing measures whether
   hover-switch survives the runtime's per-element hover rule (`declared-styles`,
   plan `335`) or whether the surface is repainted instead of stacked.
2. **Roving items.** Down/Up step the highlighted row, wrap, skip disabled rows,
   and the open menu must own focus or the keys land nowhere.
3. **The return target.** Escape and item activation return native focus to the
   **currently open title**, not to the first title and not to nothing.
4. **Accelerators.** A menu row shows a chord (`cmd-s`). With the menu closed the
   app-level window handler must run it exactly once; while the menu is open it
   must still run exactly once (never twice), and a **disabled** row's chord is
   inert. This is the rule a component must not get wrong.
5. **The surface's placement** is already measured (`side`/`sideOffset`/
   `align="start"` exact, `floating-placement`); the probe only re-asserts the
   bar-relative box so a broken mount is not blamed on the model.
6. **The accessibility model.** `role="menubar"`/`menu`/`menuitem` mapping in
   AccessKit and `aria-expanded` on a title are unmeasured.

The answer is one pure state model, one headless scenario, one live twin and a
recorded contract — not a component implementation. `COMPONENTS.md`'s
`Application menus` row cites the result and the limitation that remains.

## 2. What is built

### 2.1 New capability

`packages/testing/src/smoke.ts` — add `"menubar"` to `CAPABILITIES`. It is a
distinct verdict from `menu` (a dropdown/context surface) and `command` (a
palette). Add the same literal to `PROBE_CAPABILITIES` in
`apps/playground/src/scenarios/index.ts`, so `scenarioProblems` requires a
scenario for it.

### 2.2 The model — `apps/playground/src/scenarios/menubar-model.ts`

Pure, no React, no runtime. The state is the open menu and the highlighted row;
native focus is a scenario-side effect and is asserted separately.

```ts
export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly accelerator: Option.Option<string>; // "cmd-s", display + binding
  readonly disabled: boolean;
}
export interface Menu {
  readonly id: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly items: ReadonlyArray<MenuItem>;
}
export interface MenubarState {
  readonly active: number;                // the title focus returns to
  readonly open: Option.Option<number>;   // the open menu's index
  readonly item: number;                  // highlighted item inside it
}
export const initial: MenubarState;
export const pressTitle: (state: MenubarState, menus: ReadonlyArray<Menu>, index: number) => MenubarState;
export const hoverTitle: (state: MenubarState, menus: ReadonlyArray<Menu>, index: number) => MenubarState;
export const stepTitle: (state: MenubarState, menus: ReadonlyArray<Menu>, delta: number) => MenubarState;
export const enterMenu: (state: MenubarState, menus: ReadonlyArray<Menu>) => MenubarState;
export const stepItem: (state: MenubarState, menus: ReadonlyArray<Menu>, delta: number) => MenubarState;
export const closeMenu: (state: MenubarState) => MenubarState;
export const acceleratorCommand: (menus: ReadonlyArray<Menu>, keystroke: string) => Option.Option<string>;
```

Rules, each of which a test pins:

- `pressTitle` on the **open** title closes it (`open = None`, `active`
  unchanged); on another enabled title opens it; a **disabled** title is inert.
- `hoverTitle` changes `open` **only while a menu is open** and only to an
  enabled title; hovering the open title or a disabled title changes nothing.
- `stepTitle` runs only while open, wraps in both directions and **skips
  disabled menus**; `active` follows.
- `enterMenu` opens `active` (if closed) and selects its **first enabled**
  item; a menu with no enabled item keeps `item = 0`.
- `stepItem` runs only while open, wraps and **skips disabled items**.
- `closeMenu` clears `open` and keeps `active` (the focus-return target).
- `acceleratorCommand` returns the item **id** for an exact chord match on an
  **enabled** item; a disabled item's chord and an unknown chord are `None`.

### 2.3 The view — `apps/playground/src/scenarios/menu-bar.tsx`

A 640 px frame with a 28 px `role="menubar"` `aria-label="Application"` holding
four titles: **File**, **Edit**, **View (disabled)**, **Help**. Each title is a
focusable `div` with `role="menuitem"`, `aria-expanded`, `testId`
`menubar-file`, `menubar-edit`, `menubar-view`, `menubar-help`, and — when open —
a `FloatingLayer side="bottom" align="start" sideOffset={2}` child holding a
`role="menu"` surface of 32 px rows (`role="menuitem"`).

Items:

| Menu | Items (id, accelerator, disabled) |
| ---- | --------------------------------- |
| File | `new` `cmd-n`, `open` `cmd-o`, `save` `cmd-s`, `save-as` `cmd-shift-s` **disabled** |
| Edit | `undo` `cmd-z`, `redo` `cmd-shift-z` **disabled** |
| Help | `about` — |

A single `Readout testId="menubar-readout"` reports
`open=<file|edit|help|none> item=<id|none> runs=<n> last=<command|none> focus=<title|none>`.
The last command and the run count are the assertion surface for activation and
accelerators.

**Focus.** Opening or switching (press, hover or Left/Right) must focus the open
menu's first enabled item through a nonce-keyed layout effect calling
`renderer.focusElement`, following the measured recipe from plans `155`/`386`.
Escape, item activation and a toggle-close return focus to `active`'s title.

**Keys.** The bar container owns `onKeyDown`: `right`/`left` → `stepTitle`,
`down`/`up` → `stepItem` (or `enterMenu` when the bar holds focus); `escape` →
`closeMenu`, focus the title. Item `Enter` runs its command once, closes and
returns focus. The window handler (`useWindowKey`, as in plan `345`) owns
**only** accelerators: `acceleratorCommand` on the received chord, run once,
never opening or closing a menu by itself.

**Outside press.** A `Close` control outside the bar closes the menu without
changing `runs`.

### 2.4 The live twin — `apps/playground/src/live/scenarios.tsx`

`live-menu-bar` mounts the same view in the real 1100×720 window:

1. `waitFor("menubar-file")`, click the File title, `waitFor` the surface.
2. Assert the surface box against the title box (`y ≈ title.bottom + 2`,
   `x ≈ title.x`), and that `menubar-file-new` holds native focus.
3. `hover("menubar-edit")` → `open=edit`, focus `menubar-edit-undo`.
4. `key("right")` → `open=help` (View skipped), focus `menubar-help-about`;
   `key("right")` wraps to File.
5. `key("down")` / `key("up")` move the item and skip the disabled row.
6. `key("enter")` runs once, closes, returns focus to the title.
7. `key("escape")` closes a reopened menu and returns focus.
8. `key("cmd-s")` with the menu closed runs `save` once and does not open a menu.
9. Click the outside `Close` control → `open=none`, `runs` unchanged.

Each step settles (`settle` / `waitFor`) before reading, per plan `189`; the
surface mounts a commit after the click, so every open step waits for its row.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `"menubar"` to `CAPABILITIES` |
| `apps/playground/src/scenarios/menubar-model.ts` | **new** — the pure rules |
| `apps/playground/src/scenarios/menubar-model.test.ts` | **new** — unit tests |
| `apps/playground/src/scenarios/menu-bar.tsx` | **new** — `MenuBarProbe`, `menuBarScenario` |
| `apps/playground/src/scenarios/index.ts` | import + register + `"menubar"` in `PROBE_CAPABILITIES` |
| `apps/playground/src/live/scenarios.tsx` | import the view and add `live-menu-bar` |
| `apps/playground/src/smoke/run.test.ts` | assert the registry contains `menu-bar` / `menubar` |
| `apps/playground/README.md` | 93 → 94 headless, 43 → 44 live, `menubar=verified`, a menu-bar section and the structure lines |
| `COMPONENTS.md` | capability row; `Application menus` row gains the contract and keeps the no-OS-menu limitation |
| `PLAN.md` | D62 decision row |
| `TODO.md` | tick this probe; next free plan number |
| `.agents/slop/plans/README.md` | index this plan and its status |
| `.agents/slop/plans/140-gpuix-native-darwin-x64-build.md` §4 | the measured menu-bar row |

No other path is touched. A required change elsewhere is recorded in `TODO.md`.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground test` | model + registry tests green |
| `nub run --filter playground build` | clean build, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only menu-bar` | green, exit `0`, `menubar=verified`, 45–65 checks |
| `nub apps/playground/dist/live/run.js --only live-menu-bar` | green, exit `0`, 20–30 checks |
| `nub apps/playground/dist/smoke/run.js` | `94/94`, exit `0`, every prior capability still verified |
| `nub apps/playground/dist/live/run.js` | `44/44`, exit `0` (final gate only) |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run test` | clean |

Baseline before this plan: headless `93/93` (3251 checks), live `43/43`
(881 checks), both exit `0`.

**Two-direction proofs** (record the observed output in §9):

- **M1 — hover-switch.** Remove `hoverTitle` from the title's `onMouseEnter`;
  the hover step reads the old `open` and the focus stays on the old item.
- **M2 — skip the disabled menu.** Let `stepTitle` land on `view`; the
  `right`/`right` readout reads `open=view` instead of `open=help`.
- **M3 — the focus return target.** Return focus to title 0 instead of
  `active`; the Edit-via-hover Escape step fails with focus on `menubar-file`.
- **M4 — the disabled item's accelerator.** Let `acceleratorCommand` accept a
  disabled item; `cmd-shift-s` runs `save-as` and `runs` moves.
- **M5 — double handling.** Run the accelerator in both the window handler and
  the open menu; `cmd-s` while open reads `runs 1 → 2`.

## 5. STOP conditions and branches

- **`role="menubar"`/`"menu"` is not exposed as expected.** Assert the role the
  runtime actually reports (plan `160` measured that roles map but names are not
  derived from text). Record the mapping; do not invent a role.
- **Hover-switch is not delivered headlessly.** `hover(testId)` is measured
  (`preview-card`, plan `196`); if the title's `onMouseEnter` never fires, record
  the limitation and keep the keyboard half. Do not fake the switch from a click.
- **The open surface unmounts the focused row and focus becomes `none`.**
  Focus must be restored explicitly in the effect; if the runtime refuses until
  the next frame, use `awaitReadout` (50 ms retries, 2 s cap) and record it.
- **`FloatingLayer` clips inside the 28 px bar.** Do not add `overflow: hidden`.
  If the surface is clipped, render it as the bar's sibling with an `<anchored
  position>` from `getElementBounds` (plan `164`); record which route worked.
- **A key name or modifier is not delivered.** The key names are `enter`,
  `escape`, `left`, `right`, `down`, `up`; modifiers use `cmd-shift` syntax
  (`simulateKeystrokes`). If `cmd-shift-s` never arrives, record it and assert the
  disabled-accelerator rule through `acceleratorCommand` only.
- **A new host verb is required.** STOP and record it: the host contract is
  shared with every suite and a new verb needs its own plan. `hover`, `click`,
  `clickWindow`, `key`, `keyDown`, `waitFor`, `bounds`, `focused`, `text`,
  `a11y` and `screenshot` already exist.
- **The live window does not open.** That is exit `2` (no evidence); report it
  and keep the headless result. Never report a live pass that did not run.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `pressTitle` open / toggle / disabled | unit | a disabled menu opening, a toggle that reopens |
| `hoverTitle` closed / open / disabled / same | unit | hover opening a closed bar or missing a switch (M1) |
| `stepTitle` wrap + skip disabled | unit | landing on `view` (M2) |
| `enterMenu` first enabled / empty menu | unit | a disabled row taking the highlight |
| `stepItem` wrap + skip disabled | unit | stepping onto `save-as`/`redo` |
| `closeMenu` keeps `active` | unit | a return target reset to 0 (M3) |
| `acceleratorCommand` enabled / disabled / unknown | unit | a disabled chord running (M4) |
| `menu-bar` steps 1–12 | native smoke | any rule above regressing in the runtime |
| `scenarioProblems` registration | unit | the scenario or capability falling out of the registry |
| `live-menu-bar` | live smoke | hover-switch, focus return or an accelerator not surviving a window |
| full headless + live suites | native smoke | the new overlay leaking state into later scenarios |

The model tests are a deliberate pair: `stepTitle` from File must land on Help
(skipping disabled View) **and** `stepItem` from Save must wrap to New (skipping
disabled Save As). A test using only enabled entries lets both mutations pass.

## 7. Acceptance criteria

- `menu-bar` is registered, green, and reports capability `menubar`.
- `live-menu-bar` is green in a real window.
- The five mutation proofs are recorded in §9 with the observed output.
- `COMPONENTS.md`'s `Application menus` row cites the measured in-window model
  and keeps "no OS menu/tray API in 0.10.0" as the limitation.
- `apps/playground/README.md` counts and capability line are current.
- `nub run check`, `nub run lint` and `nub run test` pass; the full headless and
  live suites are green.
- `TODO.md` no longer lists this probe as pending, and names the next free plan
  number.

## 8. Executor checklist

1. Add the plan row to `.agents/slop/plans/README.md` and the task to `TODO.md`
   before coding.
2. Write `menubar-model.ts` and its tests first; see them fail against a stub,
   then pass.
3. Build the view; iterate against `--only menu-bar`, reading the readout and
   `focused()` — never guessed pixels.
4. Add the live twin only after the headless scenario is green.
5. Run the two scoped suites, then the full suites once, then the mutation
   proofs, restoring each mutation.
6. Update the docs and inventory, tick `TODO.md`, commit and push.

## 9. Outcome

_To be recorded by the executor: suite counts, the five mutation outputs, and
every measured fact (surface box, hover-switch, focus return, accelerator
count, the exposed roles)._
