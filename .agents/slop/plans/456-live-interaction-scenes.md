# 456 — Live interaction scenes: Tabs, Dropdown menu, Dialog

**Phase:** F (showcase quality) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455 (live wasm surface), 410 (site shell), 412 (preview strategy),
434 (platform-styled previews), 445 (published preview state)

## 1. Why this plan exists

Plan 455 shipped tier L — the library's real component code on GPUix's published
WebAssembly renderer — with **one** scene (Button). It recorded the backlog
explicitly: *one scene per interaction record first (Tabs, Dropdown menu,
Dialog), each with its own `LIVE_SCENES` key, a real composition and a smoke
assertion.*

Those three records are the ones a static tier-A preview cannot honestly carry:

- **Tabs** switches panels; a still picture of two triggers proves nothing.
- **Dropdown menu** only exists while open; a still picture would be a button.
- **Dialog** is a modal lifecycle: focus entry, a blocking veil, a task.

`MISSION.md` ranks a real GPUix surface above an approximation, so tier L is the
strongest honest preview for all three. This plan adds the three scenes, then
makes the smoke check assert **every** scene instead of only Button, so a scene
cannot ship as a key with no composition.

## 2. The contract (extending plan 455 §3)

1. A scene key appears in **three** places and no fourth:
   - `preview/scenes.ts` → `LIVE_SCENES` and `SCENE_TEXT`;
   - `preview/scene-views.tsx` → `LIVE_SCENE_VIEWS`, typed
     `Record<LiveScene, () => ReactElement>` so a missing view is a type error;
   - the component record's `liveScene` (the page then selects tier L).
2. `SCENE_TEXT[scene]` is the string the smoke check looks for in GPUI's tree.
   It lives with the keys, JSX-free, so the Node smoke script and the vitest
   guard read the same table.
3. A scene is a **real composition**, not a sampler:
   - Tabs: a settings-style tab set with a real panel per tab;
   - Dropdown menu: a file-actions menu, **open on mount** (`defaultOpen`), so
     the surface is visible without a pointer and the smoke can read its rows;
   - Dialog: a destructive-confirmation workflow, **open on mount**
     (`defaultOpen`), with a title, description and footer actions.
4. The preview imports **subpaths only** — `@gpuixui/components/tabs`,
   `/dropdown-menu`, `/dialog` — never the package root. The root re-exports
   Toast, whose provider builds an Effect `ManagedRuntime`; that must not enter a
   20 MB browser bundle for no reason.
5. A scene names no colour literal and stays inside `LiveSurface`, so the active
   docs mode and platform theme still reach it through `ThemeProvider`.
6. Tier L never replaces native evidence (`NativePreview` already renders the
   tier-V suite beneath a live scene).

## 3. Files

Change:

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | add `tabs`, `dropdown-menu`, `dialog` to `LIVE_SCENES`; add the JSX-free `SCENE_TEXT` table with one non-empty expectation per key |
| `apps/docs/preview/scene-views.tsx` | import the three component subpaths; add `TabsScene`, `DropdownMenuScene`, `DialogScene`; extend `LIVE_SCENE_VIEWS` |
| `apps/docs/src/component-meta/entries.ts` | `liveScene: "tabs"` / `"dropdown-menu"` / `"dialog"` on the three delivered records |
| `apps/docs/scripts/smoke-live-preview.ts` | replace the Button-only assertion with a loop over `LIVE_SCENES`, reading `SCENE_TEXT`; keep the unknown-scene, component-page and platform-toggle checks |
| `docs/preview-strategy.md` | name the four scenes, state that an interactive scene opens in the state it documents, and keep the "not every component has a scene" limit |
| `TODO.md` | tick the scene backlog row and record what remains (one scene per other interaction record) |
| `.agents/slop/plans/README.md` | index this plan |
| `PLAN.md` | D29 gains one sentence: the scene set is per interaction record, not a sampler |

Create:

| File | Purpose |
| ---- | ------- |
| `apps/docs/src/components/preview/scene-contract.test.ts` | the vitest guard: every key has an expectation, every expectation is real text in the view source, the three interaction records declare their scene |

## 4. Implementation order

1. **Keys and expectations.** `scenes.ts`: add the keys and `SCENE_TEXT`.
2. **Views.** `scene-views.tsx`: add the three compositions. Run
   `nub run --filter docs build:preview`. *Expected:* exit `0`, the wasm asset
   printed. **STOP** if `@gpuixui/components` cannot compile for the browser —
   record the exact error and ship only the scenes that build; never stub a
   component.
3. **Records.** Add `liveScene` to the Tabs, Dropdown menus and Dialogs records.
   `nub run --filter docs test` — `registry.test.ts` must accept the keys.
4. **Smoke.** Loop over `LIVE_SCENES` for the standalone surface; keep the
   unknown-scene, component-page and platform-toggle checks. Run
   `nub run --filter docs smoke:preview`. *Expected:* exit `0` with one
   `scene … ready` line per scene, plus the existing three lines.
5. **Unit guard.** Add `scene-contract.test.ts`; prove it fails by editing one
   `SCENE_TEXT` value away from the view source, then restoring it.
6. **Docs and ledger.** Preview strategy, TODO, plan index, PLAN D29.
7. **Gates.** `nub run --filter docs check-types`, `nub run --filter docs test`,
   `nub run --filter docs build`, then `nub run check`, `nub run lint`,
   `nub run test`.

## 5. Commands and expected results

```sh
# the isolated surface compiles with the component package
nub run --filter docs build:preview
# expect: exit 0, "preview: built … (19.x MB renderer)"

# the app and the preview project both type-check
nub run --filter docs check-types

# the unit guard and the whole docs suite
nub run --filter docs test

# the real browser check (real time; NOT --virtual-time-budget)
nub run --filter docs smoke:preview
# expect: exit 0 and four "scene <key> ready" lines

# the production build and the release gate
nub run --filter docs build
nub run check && nub run lint && nub run test
```

## 6. STOP conditions

- **`@gpuixui/components` does not compile into the preview bundle.** Record the
  exact error (module, reason) in this plan's result section, ship only the
  scenes whose imports compile, and leave the failed record without `liveScene`.
  Do not stub, mock or copy the component source into `preview/`.
- **A scene reaches `data-gpuix="failed"`.** Record the reason from the surface
  (`data-reason`) and stop; do not weaken the assertion to make it pass.
- **An open menu or dialog cannot be read from GPUI's tree.** If the overlay
  paints but `getAllText()` omits its content, record the measurement and keep
  the scene out; a scene the guard cannot prove is not shipped.
- **The preview bundle gains a Node built-in or the toast runtime.** Stop and
  fix the import to a subpath; never add a browser shim for a Node module.
- **The wasm size grows materially.** These scenes add component code only; a
  size jump means something unintended was pulled in.

## 7. Test plan

| Test | Guards | Fails when |
| ---- | ------ | ---------- |
| `scene-contract.test.ts` (expectations) | every `LIVE_SCENES` key has a non-empty `SCENE_TEXT` entry, and the keys are unique | a key is added without an expectation, or a duplicate key appears |
| `scene-contract.test.ts` (drift) | each expectation string occurs in `preview/scene-views.tsx` | a view's text changes and the smoke would look for a stale string |
| `scene-contract.test.ts` (records) | Tabs, Dropdown menus and Dialog each declare the scene that documents them | a record loses its `liveScene` and silently falls back to tier V |
| `registry.test.ts` (existing) | every declared scene is a shipped `LIVE_SCENES` key | a typo'd scene key ships |
| `preview.test.tsx` (existing) | a live record still shows its native evidence beneath | the tier composition regresses |
| `smoke:preview` | all four scenes reach GPUI's tree in headless Chrome, in real time | a scene's composition, its import or the mount breaks (exit `1`) |

Two-direction proof for the drift guard: change `SCENE_TEXT.tabs` to a string the
view does not render, run `nub run --filter docs test` (expect a failure), then
restore it. The smoke's own two-direction proof: drop the Tabs view's panel text
and run `smoke:preview` (expect exit `1`), then restore it.

## 8. Acceptance

- The Tabs, Dropdown menus and Dialogs pages show a labelled click-to-load live
  GPUix surface, and each surface carries its real composition in the active
  docs mode and platform style.
- The native tier-V evidence is still on all three pages.
- `nub run --filter docs smoke:preview` exits `0` and prints one ready line per
  scene; it exits `1` when a scene is broken.
- `nub run --filter docs test`, `check-types` and `build` are green.
- `nub run check`, `nub run lint`, `nub run test` stay green.
- No 20 MB artefact is committed; a checkout without `build:preview` still shows
  the labelled "not built" notice.

## 9. Result (implemented 2026-10-18)

Four scenes ship: `button`, `tabs`, `dropdown-menu`, `dialog`. The three new
views are real compositions from `@gpuixui/components` — a settings tab set with
three panels, an open file-actions menu (label, action, disabled row, separator,
destructive row), and an open destructive-confirmation dialog (title,
description, Cancel/Delete footer). Their records declare the matching
`liveScene`, so the pages select tier L and keep the tier-V suite beneath it.

**One measured correction.** The first dialog scene failed with `GPUIX web window
is not ready` (the renderer's own runtime-error overlay replaced the tree). The
cause is the ordering measured from the pinned source: `render()` returns before
asynchronous graphics init, the DOM canvas is created at the *start* of that
init, and `isInitialized()` reports the app handle, which is assigned before the
window handle. Neither canvas nor `isInitialized()` is a readiness signal; any
`update_web_window` call — including `getFocusedElementId` and `focusElement` —
throws until the window exists. `preview/renderer-ready.ts` therefore polls
`getFocusedElementId` (the same query the dialog makes) and catches its
"not ready" throw at the wasm boundary. `SceneRoot` mounts the scene only after
that probe succeeds, shows `Preparing the scene…` until then, and only then marks
the document `ready`. This also fixed the canvas size the smoke reported: the
scenes now paint at 640×160 instead of the 300×150 default.

Measured:

- `nub run --filter docs build:preview` → exit `0`; 435 modules, 19.1 MB wasm,
  the JS bundle grew 430.19 kB → 454.70 kB for the three component scenes.
- `nub run --filter docs check-types` → exit `0` (app and preview project).
- `nub run --filter docs test` → 248 tests (up from 244), including the new
  `scene-contract.test.ts`.
- `nub run --filter docs smoke:preview` → exit `0`:
  - `scene button ready — 640x160 canvas, 11 text nodes`
  - `scene tabs ready — 640x160 canvas, 6 text nodes`
  - `scene dropdown-menu ready — 640x160 canvas, 7 text nodes`
  - `scene dialog ready — 640x160 canvas, 8 text nodes`
  - unknown scene reports its reason;
  - `/docs/components/{button,tabs,dropdown-menu,dialog}` each load the iframe
    with their own `scene=` key (606×358);
  - `?platform=win32` still reaches the surface.
- Two-direction proof for the drift guard: setting `SCENE_TEXT.tabs` to a string
  the view does not render fails `scene-contract.test.ts`; restoring it passes.
  The smoke's own direction was observed while fixing the dialog: a scene that
  does not reach GPUI's tree exits `1` with the missing string and the tree.
- `nub run --filter docs build` and the repository gates are green (§5).

Deliberately still open: more scenes (Command menu, Context menu, Popover, Date
picker) once each has a real composition. The expectation table, the record key
and the per-page smoke loop make each one a small, guarded change.

## 10. Note on the readiness probe

`preview/renderer-ready.ts` contains a `try/catch`. It is deliberate: the caught
throw is the renderer's documented "window not ready" signal, and the probe is a
wasm interop boundary, not domain logic. There is no Effect runtime in
`apps/docs` (plan 411 §5), and modelling this as a typed failure would add a
runtime to a browser entrypoint to observe a transient interop state. The probe
stops as soon as it succeeds.
