# 486 — Gesture-driven live scenes: the five remaining preview gaps

**Phase:** F (docs showcase completeness) · **Owner:** docs-site
**Depends on:** 455 (live wasm surface), 456 (interaction scenes), 458 (gap
contract), 461 (the 17 Tier 2 pages), 475 (sized canvas), 484 (Toast scene)
**Status:** in progress

## 1. The bug this fixes

`docs/preview-strategy.md` and `apps/docs/src/components/preview/gaps.ts` list
**five component pages with neither a live scene nor a tier-A illustration**:

| Page | Recorded reason |
| ---- | --------------- |
| `combobox` | the wrapper owns the popup's open state and exposes no `defaultOpen` |
| `context-menu` | the surface paints at an internal point no prop can set |
| `date-picker` | the picker owns its open state and exposes no `defaultOpen` |
| `hotkey-input` | the field's content is a captured chord, which needs a real key event |
| `tooltip` | the wrapper exposes no open state, and a headless check cannot prove a hover-opened tip |

Every reason assumes a scene can only show what a **prop** opens. That assumption
is false for the published renderer: `@gpuix/native@0.10.0`'s WebAssembly
`GpuixRenderer` ships a full automation surface, and `@gpuix/react`'s `render()`
installs it as `globalThis.gpuix` (an `App` with `getByTestId(...).click()` /
`.hover()` / `.press()`, and a protocol with `click`, `mouseMove`, `keystrokes`,
`getTree`, `getAllText`). A live scene therefore *can* be opened by a real GPUI
gesture, and the smoke *can* prove it.

**Measured on this host, 2026-10-18** (throwaway probe against a temporary
scene; exact results below):

- clicking a tab's text switched the panel text — `click` goes through GPUI hit
  testing and the React handler runs;
- right-clicking a `ContextMenuTrigger` (`button: 2`) painted the menu item;
- clicking a `DatePickerTrigger` painted the October 2026 calendar;
- clicking a `ComboboxTrigger` painted `Ada Lovelace`;
- hovering a **raw focusable div** inside `Tooltip` painted the tip;
- clicking `HotkeyRecorder`, then `keyDown`/`keyUp` with its `elementId`,
  captured `⌘ Shift P`.

One measured limitation stays: `Tooltip` wrapping the library's `Button` does
**not** open, because `ButtonProps` is closed and does not forward
`onMouseEnter`/`onFocus`; the Tooltip page already documents that the child must
be "a focusable host element that forwards hover and focus". The scene uses a
host `div`, which is the documented contract — not a workaround.

## 2. Goal and acceptance

Five live scenes ship, one per gap page, each opened by a real GPUI gesture:

| Scene / page | Composition | Gesture the smoke drives | Text the smoke expects |
| ------------ | ----------- | ----------------------- | ---------------------- |
| `tooltip` | a focusable host `div` + `Tooltip content="Revenue, net of refunds."` | `hover` the trigger | `Revenue, net of refunds.` |
| `context-menu` | a project row + menu (Open / Copy path / Delete) | `click` the row with `button: 2` | `Copy path` |
| `date-picker` | a due-date trigger + calendar + "Booked …" line | click the trigger, then `date-day-2026-10-21` | `Booked 21 October` |
| `combobox` | a reviewer trigger + one option | click the trigger | `Ada Lovelace` |
| `hotkey-input` | a recorder + a "Recorded …" line | click the recorder, then `press("p")` | `Recorded p` |

Acceptance:

- `apps/docs/src/components/preview/gaps.ts` is empty; every delivered
  component page has a live scene or a tier-A illustration;
- `docs/preview-strategy.md` has no gap rows and explains the gesture proof;
- `smoke:preview` asserts, for every gesture scene, that the expected text is
  **absent before** the gesture and **present after** it — so a scene that opens
  itself, or a gesture that stops working, fails the release gate;
- every scene page tells the reader the gesture to try;
- `nub run --filter docs test`, `nub run check`, `nub run lint` and
  `nub run --filter docs smoke:preview` pass.

## 3. Exact changes

### 3.1 `apps/docs/preview/scenes.ts`

Add the five keys to `LIVE_SCENES` (in the same order as the gap table) and their
`SCENE_TEXT` entries. Add a **JSX-free** gesture table and a reader instruction
per gesture scene:

```ts
export type SceneStep =
  | { readonly kind: "hover"; readonly testId: string }
  | { readonly kind: "click"; readonly testId: string; readonly button?: 0 | 2 }
  | { readonly kind: "press"; readonly testId: string; readonly keys: string };

/** The gesture a scene needs before its documented state exists. */
export const SCENE_GESTURE: Readonly<Partial<Record<LiveScene, readonly SceneStep[]>>> = {
  tooltip: [{ kind: "hover", testId: "scene-tooltip-trigger" }],
  "context-menu": [{ kind: "click", testId: "scene-context-row", button: 2 }],
  "date-picker": [
    { kind: "click", testId: "scene-date-trigger" },
    { kind: "click", testId: "date-day-2026-10-21" },
  ],
  combobox: [{ kind: "click", testId: "scene-combobox-trigger" }],
  "hotkey-input": [
    { kind: "click", testId: "scene-hotkey" },
    { kind: "press", testId: "scene-hotkey", keys: "p" },
  ],
};

/** What the reader must do to see the opened state. */
export const SCENE_INTERACTION: Readonly<Partial<Record<LiveScene, string>>> = {
  tooltip: "Hover the info control to open the tip.",
  "context-menu": "Right-click the project row to open the menu.",
  "date-picker": "Click the due-date field, then the 21st, to book it.",
  combobox: "Click the reviewer field to open the suggestions.",
  "hotkey-input": "Click the shortcut field, then press P.",
};
```

`SCENE_TEXT` must not occur in its `SCENE_INTERACTION` string (guard below).

### 3.2 `apps/docs/preview/scene-views.tsx`

Add five views and map them in `LIVE_SCENE_VIEWS`. Each is a real composition,
compact enough for the docs iframe (606×358): keep the trigger near the top and
the opened surface below it.

- `TooltipScene`: `<Tooltip content="Revenue, net of refunds." side="bottom"
  delay={0}><div tabIndex={0} testId="scene-tooltip-trigger" style={{...}}>
  …</div></Tooltip>` plus a caption. Use the primitives' spacing/type via
  `useTheme()`; no colour literal.
- `ContextMenuScene`: a `Card`-like row (`ContextMenuTrigger testId="scene-context-row"`)
  with `ContextMenuItem`s `Open`, `Copy path` (`tone="destructive"` on
  `Delete`). No `defaultOpen`.
- `DatePickerScene`: `DatePicker` with `value` state initialised to `null`,
  `today="2026-10-17"`, `DatePickerTrigger testId="scene-date-trigger"`, and
  `onValueChange` that stores the ISO day. Render a `<Text>` **only when the
  value is `2026-10-21`**: `Booked 21 October`. No `defaultOpen`.
- `ComboboxScene`: `Combobox options={[{ value: "ada", label: "Ada Lovelace" }]}`,
  `ComboboxTrigger testId="scene-combobox-trigger"`, content with input + list +
  empty. No `defaultOpen`.
- `HotkeyScene`: `HotkeyRecorder label="Toggle the command palette"
  testId="scene-hotkey" value={hotkey} onChange={setHotkey}` and a `<Text>`
  rendered only when `hotkey === "p"`: `Recorded p`. A bare key is deliberate:
  the accelerator for a chord differs by platform (`mod` on macOS, `ctrl`
  elsewhere), and the scene must assert the same text on every host. Initial
  `hotkey = null` so nothing is painted before the gesture.

The scene's own heading/caption may stay, but the **expected text must be painted
only after the gesture**; test 3.6 enforces the source shape.

### 3.3 `apps/docs/preview/main.tsx`

Import `SCENE_INTERACTION` and render the instruction inside the surface chrome,
above the scene, only when one exists:

```tsx
{interaction === undefined ? null : (
  <Text role="caption" tone="muted">{interaction}</Text>
)}
```

`Surface` already receives `scene`; derive `interaction = SCENE_INTERACTION[scene]`.

### 3.4 `apps/docs/scripts/smoke-live-preview.ts`

1. Raise the Chrome window to `--window-size=640,720` (measured: the current
   640×360 window gives a **640×160** canvas, which clips an opened calendar).
2. Import `SCENE_GESTURE`.
3. In the scene loop, after `openScene` is `ready`:
   - read `paintedText`;
   - if the scene has steps, assert `SCENE_TEXT[scene]` is **not** in that list
     (otherwise the scene opens itself and the gesture proves nothing);
   - run each step in the page through the installed `App`:

     ```js
     await globalThis.gpuix.getByTestId(testId).hover()
     await globalThis.gpuix.getByTestId(testId).click({ button: 2 })
     await globalThis.gpuix.getByTestId(testId).press(keys)
     ```

     Each step is one `Runtime.evaluate` of an async IIFE with the test id and
     key JSON-encoded into the expression; a rejection is a `FAIL` with the
     scene and step named.
   - poll `paintedText` every 100 ms for up to 5 s until it contains
     `SCENE_TEXT[scene]`; a timeout prints the text it saw.
4. Keep the existing no-scene, unknown-scene, mode and page loops unchanged.
   Log `scene <name> opened by <n> step(s) — <n> text nodes`.

### 3.5 `apps/docs/src/components/preview/live-surface.tsx`

Import `isLiveScene` and `SCENE_INTERACTION` from `../../../preview/scenes` and
render, above the load control:

```tsx
<p data-scene-interaction className="text-sm text-fd-muted-foreground">
  {interaction}
</p>
```

Do not change the honesty notice. A gesture scene still says it is the
WebAssembly renderer, not the desktop window.

### 3.6 `apps/docs/src/components/preview/scene-contract.test.ts`

- Add the five slug→scene pairs to `interactionScenes`.
- Add a `gesture scenes` describe:
  - every gesture step's `testId` occurs in `viewSource` as
    `testId="<id>"` (the scene really renders that target);
  - `SCENE_INTERACTION` has an entry exactly for the keys of `SCENE_GESTURE`;
  - no `SCENE_TEXT[scene]` occurs in `SCENE_INTERACTION[scene]` (else the
    before-absence proof is impossible).
- Keep the "expectation occurs in the view" rule; the five chosen expectations
  are literals in the views (`Revenue, net of refunds.`, `Copy path`,
  `Booked 21 October`, `Ada Lovelace`, `Recorded p`).

### 3.7 `apps/docs/src/components/preview/gaps.ts` and `preview-gaps.test.ts`

- `gaps.ts`: `export const NO_LIVE_SCENE: ReadonlyMap<string, string> = new Map();`
  Keep the file and its header comment, rewritten to say the set is empty and why
  (the gesture proof). Do not delete the guard.
- `preview-gaps.test.ts`: unchanged logic still proves document ⇄ code agree
  (both empty). Keep the section heading in the document (`### The pages without
  a live scene`) with a sentence and no table rows, so `rows` parses to `[]`.

### 3.8 `docs/preview-strategy.md`

- Tier L row: add the five components to the parenthetical list.
- "Sixteen scenes ship today" → twenty-one; add the five names.
- Replace "Five records remain…" with one short paragraph: no page is without a
  live scene; five of them (tooltip, context menu, date picker, combobox, hotkey
  input) open by a gesture, and `smoke:preview` proves the text is absent before
  the gesture and present after it.
- Replace the five-row gap table with a table of the **gestures** the surface
  proves (page → gesture → what it proves), or fold it into the tier-L section.
  Keep the `### The pages without a live scene` heading and an explicit
  "None." sentence.

### 3.9 `apps/docs/README.md`

Update the tier-L bullet: the scene list (add the five) and a sentence that
gesture scenes are opened through `globalThis.gpuix`'s locators in the smoke, with
the before/after assertion.

### 3.10 `TODO.md`, plan index

- Tick `[ ]` "Live scenes for Context menu and Date picker" and the gap work;
  adjust the "five records" rows to reflect zero.
- Add this plan to `.agents/slop/plans/README.md` (docs block, after 485).

## 4. Commands and expected results

```sh
cd apps/docs && nub run build:preview        # emits public/gpuix-preview, ~20 MB
cd apps/docs && nub run build                # copies it into dist/client
cd apps/docs && nub run smoke:preview --no-build
# expected: every scene loads; each gesture scene prints "opened by N step(s)";
#           exit 0
cd apps/docs && nub run test                 # all files pass, including the new guards
nub run check                                # types + test-quality + format
nub run lint                                 # oxlint clean
```

Two-direction proof, recorded in the plan's §6 after measuring:

1. **Remove a gesture** from `SCENE_GESTURE` (e.g. `combobox`) and rebuild:
   `smoke:preview` must fail with `expected "Ada Lovelace" in the GPUI tree`
   after the 5 s budget. Restore it and re-run: exit 0.
2. **Make a scene open itself** (add `defaultOpen` to the combobox scene) and
   rebuild: the before-absence assertion must fail with
   `opened before the gesture`. Restore it and re-run: exit 0.
3. **Break a gesture target** (rename the scene's `testId`): `scene-contract`
   must fail naming the missing test id.

## 5. STOP conditions

- **A gesture does not reach the component** (measured after implementing, not
  assumed): do **not** fall back to a prop, a hardcoded open state, or a fake
  scene. Keep that page in `NO_LIVE_SCENE` with the measured reason, restore the
  document row, and record the measurement here.
- **The opened surface is clipped** in the docs iframe (606×358): shrink the
  composition (fewer rows, smaller calendar) or move the trigger up; never move
  the assertion to text that is painted outside the visible frame.
- **`globalThis.gpuix` is absent** in a production build (it is installed by
  `render()` today): stop — the smoke cannot drive the surface; record the
  evidence and do not ship gesture scenes.
- **The tooltip trigger must be a raw host element**: if the scene uses `Button`
  it will not open (measured). Use the documented contract and keep the
  limitation on the Tooltip page; do not change `packages/primitives` from here
  (record it in `TODO.md` if a component fix is wanted).

## 6. Measured results

Run on this host (Intel macOS, locally built 0.10.0 binding), 2026-10-18.

| Command | Result |
| ------- | ------ |
| `nub run --filter docs build` (runs `build:preview`) | pass |
| `nub run --filter docs smoke:preview --no-build` | **exit 0** — 21 scenes; `tooltip` 1 step, `context-menu` 1, `date-picker` 2, `combobox` 1, `hotkey-input` 2; every scene and every page reports a **640×520** canvas |
| `nub run --filter docs test` | 46 files / **300 tests** pass |
| `nub run check` | pass (test quality, oxlint, oxfmt, types) |
| `nub run lint` | pass |
| `nub run test` | pass |
| `nub run --filter docs smoke:build` | exit 0 (production crawl) |
| `nub run --filter docs smoke:browser` | exit 0 (hydrated previews) |

Two-direction proofs, each run against a rebuilt preview:

1. **A gesture that is removed.** `combobox: []` → `smoke:preview` failed with
   `FAIL live scene combobox: expected "Ada Lovelace" after 0 gesture step(s)`
   and the text it saw (`["Click the reviewer field …","Task details","Select…","▾"]`).
   Restored → exit 0.
2. **A scene that opens itself.** The date scene started with
   `useState("2026-10-21")` → `FAIL live scene date-picker: "Booked 21 October"
   was painted before the gesture; the scene opens itself`. Restored → exit 0.
3. **A gesture target that drifts.** Renaming the tooltip trigger in
   `SCENE_GESTURE` → `scene-contract.test.ts` failed
   `targets a test id the scene really renders`. Restored → 300 tests pass.

Two measured facts that shaped the implementation:

- **The smoke's window was too short for an opened calendar.** The old
  `--window-size=640,360` gave a **640×160** canvas; the calendar's day cells
  painted with no bounds and the first run failed
  `Element has no painted bounds`. The smoke now opens a 640×720 window
  (640×520 canvas), and waits 250 ms between steps so the popover's placement
  frame records the day bounds.
- **A bare key is the portable expectation.** A chord's accelerator is
  `mod+…` on macOS and `ctrl+…` elsewhere, so the hotkey scene captures `p` and
  asserts `Recorded p`; the keyboard path is still a real GPUI key event.

