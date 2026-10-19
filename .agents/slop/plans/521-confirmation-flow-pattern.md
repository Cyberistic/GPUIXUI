# 521 — The confirmation-flow pattern, proved on the live surface

**Status:** implemented · **Phase:** F (showcase) / G (release gate) ·
**Owner:** docs-site
**Depends on:** `410`, `412`, `427`, `455`, `461`, `475`, `484`, `486`, `497`,
`508`, `513`, `515`, `560`
**Owns:** `apps/docs`, `docs/preview-strategy.md`, `TODO.md`, this plan and the
plan index. No component package is edited.
**Number:** `521` — the next free docs number after `520`/`560`.

## 1. The gap this plan closes

`MISSION.md` asks for **pattern pages**: realistic compositions, not isolated
controls. `/docs/patterns` has one shipped pattern (the settings form) and
names two still owed. Its "Still to come" section says:

> The confirmation flow and the command palette have every component they need
> … They wait on one **runnable composed example** (`ConfirmDialog` + a form +
> `Toast`; `CommandMenu` + `Dialog`), because a pattern page is never assembled
> from separate component demos.

The confirmation-flow half has been blocked on an example that no workstream
shipped. The docs already own a place where a real composition runs: the
isolated live-preview document (`preview/scenes.ts` + `preview/scene-views.tsx`)
on GPUix's published WebAssembly renderer, which `smoke:preview` drives on every
release gate. Plan `560` proved that a docs-owned composition scene
(`showcase`) is an honest, testable page with no component record. This plan
applies the same mechanism to the confirmation flow:

**One real composition** — a destructive action guarded by `ConfirmDialog`, a
type-to-confirm `Input`, and a success `Toast` — mounts the shipping packages,
paints its dialog at rest, and proves the workflow end to end when the smoke
types the workspace name and confirms.

The command-palette pattern stays owed. It is a second composition with its own
scene, not a copy of this one.

## 2. Files to change

All paths relative to `apps/docs/` unless stated otherwise.

### 2.1 New: `preview/patterns/confirmation-flow-logic.ts`

The one decision the flow makes, kept pure so a test can fail without a GPUix
window:

```ts
/** The workspace this destructive action removes. Lower-case because
 * `Locator.fill` sends typed characters without a shift modifier. */
export const CONFIRM_WORKSPACE = "atlas";

/** The typed name matches the workspace once surrounding space is ignored. */
export const confirmsWorkspace = (typed: string): boolean =>
  typed.trim() === CONFIRM_WORKSPACE;
```

### 2.2 New: `preview/patterns/confirmation-flow.tsx`

The composition, with `/** @jsxImportSource @gpuix/react */` like
`preview/scene-views.tsx`. It exports `ConfirmationFlow`.

- `ToastProvider` wraps the screen; `ToastViewport` is rendered inside it.
- A column `Stack` paints the scene heading ("Remove a workspace") and the
  consequence sentence. This is the only text in the rest frame; it is **not**
  the smoke's expectation.
- A `ConfirmDialog` is mounted `open` with `useState`, `tone="danger"`,
  `confirmLabel="Delete workspace"`. Its `children`:
  - a `Text role="label"` instruction ("Type atlas to confirm");
  - an `Input` with `testId="scene-confirm-name"`, controlled by `useState`,
    `fullWidth`;
  - when the typed name does not match, a `Text role="caption"
tone="destructive"` line (only after a failed confirm, not on every keystroke).
- `onConfirm`:
  - a mismatch sets the error and keeps the dialog open (the caller owns the
    close — the component's documented contract);
  - a match closes the dialog and pushes a toast with
    `duration: Duration.infinity` (the measured way to keep the smoke from
    racing the dismissal, plan 484). The toast title is **"Workspace deleted"**
    and the description names the files and the retention window.
- Every colour, space and type value comes from the active theme; no literal.

### 2.3 `preview/scene-views.tsx`

Import `ConfirmationFlow` and register it:

```ts
confirmation-flow: ConfirmationFlow,
```

Nothing else changes; `LIVE_SCENE_VIEWS` is a `Record<LiveScene, …>`, so a key
without a view is a type error.

### 2.4 `preview/scenes.ts`

- `LIVE_SCENES`: add `"confirmation-flow"` after `"showcase"`.
- `SCENE_TEXT`: `"confirmation-flow": "Workspace deleted"` — text the **toast**
  paints, not the scene heading.
- `SCENE_PAGE`: `"confirmation-flow": "/docs/patterns/confirmation-flow"`.
- New `SCENE_LABEL`: the reader-facing title for a composition scene, because it
  has no registry record to borrow one from:
  ```ts
  export const SCENE_LABEL: Readonly<Partial<Record<LiveScene, string>>> = {
    showcase: "Showcase",
    "confirmation-flow": "Confirmation flow",
  };
  ```
- `SCENE_GESTURE["confirmation-flow"]`:
  1. `{ kind: "fill", testId: "scene-confirm-name", text: "atlas" }`
  2. `{ kind: "click", testId: "confirm-accept" }`
- `SCENE_INTERACTION["confirmation-flow"]`:
  `"Type the workspace name, then confirm."` — it must not contain the
  expected text.

`confirm-accept` is painted by `ConfirmDialog`, not by the scene source, so add
it to `componentOwnedTargets` in `scene-contract.test.ts` with the same written
reason the date-picker cell and time-picker segment carry.

### 2.5 New: `content/docs/patterns/confirmation-flow.mdx`

Frontmatter `title: Confirmation flow`. A real page with the six sections the
pattern guard requires:

- **The task** — deleting a workspace that cannot be undone; the reader must
  type its name before the destructive action commits, and the screen confirms
  with a toast.
- **Composition** — `<LiveSurface scene="confirmation-flow" title="Confirmation
flow" />`, the real components it composes (ConfirmDialog, Dialog, Input, Button,
  Toast), and why the composition lives in the preview project (the docs' real
  renderer) rather than in a component demo.
- **State** — the composed component owns the dialog's open flag and the typed
  name; `ConfirmDialog` owns Cancel-first focus and never closes on confirm;
  the Toast store owns the transient message.
- **What is verified** — a table naming
  `nub run --filter docs smoke:preview` (the gesture, before/after, canvas), the
  components' own native suites, and the exact limits (browser WebAssembly
  renderer, not the desktop binary; one locale; no persistence).
- **Source** — `<include>` of `../../../preview/patterns/confirmation-flow.tsx`.
- **Related** — links to Confirmation dialog, Dialog, Text input, Button, Toast.

No placeholder prose, no claim the desktop window was run.

### 2.6 `content/docs/patterns/meta.json` and `index.mdx`

- Sidebar: `["index", "settings-form", "confirmation-flow"]`.
- Index: a new "Confirmation flow" section that links the page and says the
  scene runs on the live renderer; "Still to come" now names only the command
  palette and the inspector workspace. Delete the now-false sentence that the
  confirmation flow waits on an example.

### 2.7 `content/docs/component-pages.mdx`

- "The build ships 43 scenes today" → **44** (the guard derives it).
- The live-scene file table gains
  `preview/patterns/confirmation-flow.tsx` — *"a composed page's real scene,
  kept out of `scene-views.tsx` so its source is readable on the page"*.

### 2.8 `src/pattern-pages.test.ts`

The guard currently validates a `nub run --filter` command only against
`examples/*` packages. A docs-owned pattern is verified by a docs script, so:

- read `apps/docs/package.json` as well and union its scripts into the command
  table (the app's manifest is decoded with the same `Schema.Struct`);
- the existing rule still fails a command neither tree defines.

### 2.9 `src/components/preview/preview-gaps.test.ts`

Composition scenes have no record, so they have no title. Use `SCENE_LABEL`
for them and include the labels in both expected sets (the tier list and the
gesture table), so a new composition page cannot be added without the strategy
naming it.

### 2.10 `src/components/preview/scene-contract.test.ts`

Add `["confirmation-flow", ["confirm-accept"]]` to `componentOwnedTargets`,
with the reason: the action is painted by `ConfirmDialog`'s footer, not by the
scene source.

### 2.11 `docs/preview-strategy.md`

- Tier L row: keep the component list as the component scenes, and replace the
  trailing sentence with one that names the two composed pages (Showcase and the
  confirmation-flow pattern) and says they have no component record.
- "and 20 more are opened by a real gesture" → **21**.
- "43 scenes ship today: 42 are one per record … one is the Showcase page's
  composed screen" → **44**; 42 records, the Showcase and this pattern.
- Gesture table: a **Confirmation flow** row — *type the workspace name, then
  confirm — the destructive action commits only through the typed check and the
  toast proves it succeeded*.

### 2.12 `apps/docs/README.md`

- Live-surface paragraph: 44 scenes, 42 records + the Showcase + the confirmation
  flow; "20 of those" → **21**.
- The Pattern pages section: name the new page and its live scene.

### 2.13 `TODO.md` and `.agents/slop/plans/README.md`

- Add and tick the docs-site task; keep the progress bar honest.
- Index this plan as implemented; the command-palette half of plan `427` stays
  open.

## 3. Commands

```sh
cd apps/docs
nub run test                       # all suites, incl. the new logic test
nub run check-types
nub run build
nub scripts/smoke-live-preview.ts --no-build
nub scripts/smoke-build.ts --no-build
cd ../..
nub run check && nub run lint && nub run test
```

Expected:

- `nub run test`: every file passes; the new confirmation logic test and the
  enlarged scene/pattern guards are included.
- `check-types`: both the app and the preview project compile.
- `smoke:live-preview`: every scene, including `confirmation-flow`, reaches
  `ready`; the gesture scene reports the text absent before and present after
  two steps, and the page `/docs/patterns/confirmation-flow` loads the iframe
  with `scene=confirmation-flow&mode=dark`.
- `smoke:build`: the sitemap gains one page and the crawl stays `0`.
- Root gates `0`.

## 4. STOP conditions

Stop and report, do not improvise, if:

- `Locator.fill` cannot reach an input inside the open `ConfirmDialog` (the
  smoke reports the locator failing): record the measurement and fall back to a
  click-opened dialog whose field is focused first — but only after checking the
  automation API, and record the change here.
- The toast paints before the gesture (the before-assertion fails): the flow is
  not proving the confirmation. Do not weaken the expectation; find the state
  that leaks and remove it.
- A pattern page cannot cite the docs script because the guard rejects it: fix
  the guard as §2.8 says, and prove it fails on an invented script.
- The scene cannot compile against the pinned packages (a prop is missing):
  record the exact declaration and stop before inventing a component API.

## 5. Test plan

| Test | What it must catch | How it fails without the change |
| ---- | ------------------ | ------------------------------- |
| `src/components/preview/confirmation-flow-logic.test.ts` (new) | a confirmation that accepts a near-miss name | `confirmsWorkspace("atlas ")` true, `("atlas")` true; `("")`, `("atlas-2")`, `("Atlas")` false. Change the predicate to `includes` and the last three fail |
| `scene-contract.test.ts` (existing, enlarged) | a stale expectation, a gesture target the scene does not paint, a reader instruction that leaks the expected text, a missing view | remove the toast title from the view → "keeps every expectation in the view" fails; drop the fill step → `SCENE_GESTURE` no longer matches the before/after contract's gesture set; drop the `SCENE_INTERACTION` line → "tells the reader … exactly the scenes" fails |
| `preview-gaps.test.ts` (existing, enlarged) | a composition scene the strategy does not name, a wrong count | remove `Showcase`/`Confirmation flow` from the tier row or the new gesture row → both name comparisons fail; leave the totals at 43/20 → both count assertions fail |
| `pattern-pages.test.ts` (existing, enlarged) | a page with no real source, a missing section, a command no package defines | change the command to `smoke:nowhere` → the command rule fails |
| `showcase-page.test.tsx` (existing) | a `SCENE_PAGE` override pointing nowhere | its "maps every scene override to a page that exists" applies to the new key automatically; remove the page → fails |
| `smoke:live-preview` | the surface never paints the success state, or paints it before the gesture | remove the toast push → the after-check fails; push on mount → the before-check fails |

## 6. Two-direction proofs

Run each against the built site; record the exact output in §7.

1. **The scene ships and the page loads it.** With the change: `smoke:preview`
   reports `confirmation-flow` opened by 2 steps and the page loaded at
   `/docs/patterns/confirmation-flow`. Remove the `LiveSurface` block from the
   page → the page check fails (`no live surface`).
2. **The typed check is load-bearing.** Change `confirmsWorkspace` to `true`
   (or `includes`) and the unit test fails on the near-miss cases; restore and
   it passes.
3. **The toast is the proof, not the rest frame.** Push the toast at mount
   instead of on confirm → the smoke's before-assertion fails by name. Move it
   back → passes.
4. **The strategy cannot drift.** Drop `Confirmation flow` from the tier row →
   `preview-gaps.test.ts` fails with it as a missing name; restore → passes.
5. **The command guard is real.** Replace the page's `smoke:preview` with
   `smoke:nowhere` → `pattern-pages.test.ts` fails; restore → passes.

## 7. Measured results

All commands run in `workspaces/docs-site` on 2026-10-19, against the tree this
plan produces.

- `nub run --filter docs test` — **507 tests / 74 files, exit `0`** (was 505/73;
  the new logic suite is the difference).
- `nub run --filter docs check-types` — exit `0`; the app and the `preview/`
  project both compile.
- `nub run --filter docs build` — exit `0`.
- `nub run --filter docs smoke:preview` — **exit `0`**: `confirmation-flow
  opened by 2 step(s) — 640x520 canvas, 7 text nodes`, and
  `/docs/patterns/confirmation-flow loaded the live iframe —
  /gpuix-preview/?scene=confirmation-flow&platform=default&mode=dark (606x358)`.
  The scene paints different frames in light and dark (21 564 / 21 936 bytes).
- `nub run --filter docs smoke:build` — **exit `0`**: 94 sitemap pages checked
  (was 93), 117 links, 3 brand assets, search and robots.
- `nub run check` — **exit `0`** (format, lint, `check:tests`, every
  workspace's type-check).
- `nub run test` — **exit `0`** (docs 507, components 308, primitives 282,
  playground 11).

### Two-direction proofs

1. **The page must mount the scene.** Removed the `<LiveSurface>` block:
   `smoke:preview` exited `1` with
   `FAIL live surface: /docs/patterns/confirmation-flow reported no-control`.
   Restored, the same run is green. — measured.
2. **The typed check is load-bearing.** Loosened `confirmsWorkspace` to
   `includes`: `confirmation-flow-logic.test.ts` failed
   (`expected true to be false` on a near miss). Restored, 2/2 pass. — measured.
3. **The toast is the proof, not the rest frame.** Pushed the toast in a mount
   effect: `smoke:preview` exited `1` with
   `FAIL live scene confirmation-flow: "Workspace deleted" was painted before
   the gesture; the scene opens itself`. Restored, the scene opens by 2 steps.
   — measured.
4. **The strategy cannot drift.** Removed `Showcase, Confirmation flow` from
   the tier row: `preview-gaps.test.ts` failed with both names missing.
   Restored, 8/8 pass. — measured.
5. **The command guard is real.** Renamed the page's command to
   `smoke:nowhere`: `pattern-pages.test.ts` failed with
   `confirmation-flow: docs has no smoke:nowhere script`. Restored, 7/7 pass.
   — measured.

