# 522 — The command-palette pattern, proved on the live surface

**Status:** implemented · **Phase:** F (showcase) / G (release gate) ·
**Owner:** docs-site
**Depends on:** `410`, `412`, `427`, `455`, `456`, `471`, `475`, `486`, `521`,
`485`
**Owns:** `apps/docs`, `docs/preview-strategy.md`, `TODO.md`, this plan and the
plan index. No component package is edited.
**Number:** `522` — the next free docs number after `521`.

## 1. The gap this plan closes

`MISSION.md` lists the command palette among the workspace components and asks
for **pattern pages**: realistic compositions, not isolated controls.
`/docs/patterns` still has a "Still to come" section that names the command
palette: every component exists (`CommandMenu`, `Dialog`), but no runnable
composition shipped, so plan `427`'s last unblocked pattern page is missing.

Plan `521` established the honest solution the docs already own: a composition
under `apps/docs/preview/patterns/`, mounted on the real GPUix WebAssembly
renderer, driven by `smoke:preview`, and documented with its own source. This
plan applies the same mechanism to the command palette:

**One real composition** — a project surface whose `Commands` control opens the
real `CommandMenu`, whose `Duplicate project` action adds a copy through a pure
naming rule, and whose `Copy link` / disabled `Delete project` rows show the
palette's real states. The palette starts **closed**, so the smoke proves the
open and the run as gestures rather than as a mounted prop.

The package-owned `examples/` composition remains a cross-team task in
`TODO.md` (plan `521` set the precedent: a docs-owned composition does not
replace the package example).

## 2. Files to change

All paths relative to `apps/docs/` unless stated otherwise.

### 2.1 New: `preview/patterns/command-palette-logic.ts`

The one decision the composition makes that is not rendering, kept pure:

```ts
/**
 * The next free copy name: `atlas copy`, then `atlas copy 2`, and so on.
 * Lower-case input is the renderer's typed path; this rule does not care.
 */
export const uniqueProjectName = (
  base: string,
  taken: ReadonlyArray<string>,
): string => { ... };
```

Rules:

- `uniqueProjectName("atlas", [])` → `"atlas copy"`.
- `uniqueProjectName("atlas", ["atlas copy"])` → `"atlas copy 2"`.
- it stops at the first free index; it never reuses a taken name.

### 2.2 New: `preview/patterns/command-palette.tsx`

The composition, with `/** @jsxImportSource @gpuix/react */`.

- Imports `CommandMenu`, `CommandMenuEmpty`, `CommandMenuInput`,
  `CommandMenuList`, `type CommandAction` from
  `@gpuixui/components/command-menu` (the subpath, so the package root's Effect
  runtime does not enter the 20 MB preview bundle).
- Imports `Button`, `Stack`, `Text` from `@gpuixui/primitives`.
- Exports `CommandPalette`.
- Renders a column `Stack`:
  - heading `Text role="h3"` — **"Projects"** (not the expectation);
  - a caption explaining the surface is the real packages;
  - a row with `Button testId="scene-palette-trigger"` (`onActivate` opens the
    palette) and a caption naming the app-level shortcut (`⌘K`); the
    composition binds no shortcut — `CommandMenu` documents that the app owns
    it;
  - the project list (`atlas`, then any copies), each a `Text` with its own
    test id;
  - when a command has run, a `Text testId="scene-palette-status"` whose text is
    the constant **`"Duplicated the project into a new copy."`** for the duplicate
    action and a distinct sentence for copy-link.
  - the real `CommandMenu` with `open`/`onOpenChange` from `useState`, mounting
    `CommandMenuInput`, `CommandMenuList`, `CommandMenuEmpty`.
- Actions:
  - `duplicate` — group `Project`, shortcut `⌘D`; calls
    `uniqueProjectName("atlas", projects)`, appends the copy and sets the status;
  - `copy-link` — group `Share`, shortcut `⌘L`; sets a status naming the
    simulated link (no clipboard primitive exists; the page says so);
  - `delete` — group `Danger`, `disabled: true`, so a visible row is not
    runnable.
- The status starts `null`, so the smoke's expectation is **absent before** the
  gesture.
- Every colour, space and type value comes from the active theme; no literal.

### 2.3 `preview/scene-views.tsx`

- Import `CommandPalette` from `./patterns/command-palette`.
- Add `"command-palette": CommandPalette` to `LIVE_SCENE_VIEWS` after the
  confirmation-flow entry.

### 2.4 `preview/scenes.ts`

- Add `"command-palette"` to `LIVE_SCENES` (after `"confirmation-flow"`).
- `SCENE_TEXT`: `command-palette` → `"Duplicated the project into a new copy."`
- `SCENE_PAGE`: `command-palette` → `/docs/patterns/command-palette`.
- `SCENE_LABEL`: add `{ scene: "command-palette", title: "Command palette" }`.
- `SCENE_GESTURE`:

  ```ts
  "command-palette": [
    { kind: "click", testId: "scene-palette-trigger" },
    { kind: "click", testId: "command-duplicate" },
  ],
  ```

- `SCENE_INTERACTION`: `"Open the palette, then run Duplicate project."` The
  sentence must not contain the expectation (a guard compares the two).

### 2.5 `src/components/preview/scene-contract.test.ts`

The row `command-duplicate` is painted by `CommandMenu`, not by the composition,
so it joins `componentOwnedTargets` with its reason:

```ts
["command-palette", ["command-duplicate"]],
```

The test already fails on an unused exemption, so the entry cannot outlive the
step.

### 2.6 New: `src/components/preview/command-palette-logic.test.ts`

Header comment states the bug guarded: a copy-name rule that reuses a taken
name (or returns the base unchanged for a second duplicate) makes the visible
result contradict the palette's promise.

Cases:

- first copy → `atlas copy`;
- second copy → `atlas copy 2`;
- an unrelated name does not affect the sequence;
- the base itself is never returned as the copy.

### 2.7 New: `content/docs/patterns/command-palette.mdx`

Frontmatter `title: Command palette`, a one-sentence description. The six
required `##` sections (`The task`, `Composition`, `State`, `What is verified`,
`Source`, `Related`) exactly as `pattern-pages.test.ts` requires.

- **The task** — run a project command without hunting through menus; the
  palette is searchable, grouped and keyboard-driven.
- **Composition** — `<LiveSurface scene="command-palette" title="Command palette" />`,
  then the composed parts and where the source lives.
- **State** — the composition owns `open`, the project list and the last
  status; `CommandMenu` owns the query and highlight and closes after a run;
  the app owns the `⌘K` shortcut. Name the measured limit: no clipboard
  primitive, so `Copy link` reports a simulated link.
- **What is verified** — a table naming `nub run --filter docs smoke:preview`
  (the two gestures and the absent/present assertion), the components'
  behaviour suites, and `nub run --filter docs test` (the naming rule and the
  scene contract).
- **Source** — `<include>` of
  `apps/docs/preview/patterns/command-palette.tsx`.
- **Related** — Command menu, Dialog, Button, Patterns.

### 2.8 `content/docs/patterns/meta.json`

Add `"command-palette"` after `"confirmation-flow"`.

### 2.9 `content/docs/patterns/index.mdx`

- Add the command-palette paragraph and link.
- "Still to come" now names only the inspector workspace waiting on
  `packages/docking`; remove the command-palette half. Keep the sentence that a
  pattern is never a browser imitation.

### 2.10 `docs/preview-strategy.md` (repository root)

Every number and name is derived by `preview-gaps.test.ts`; update all four
places together:

- tier-L row: "The two composed pages …" → the three composed pages, naming the
  command-palette pattern;
- "**44 scenes ship today**: 42 are one per record …, and two are composed
  pages" → **45**, 42, three composed pages;
- "21 scenes document state only a gesture produces" → **22**;
- gesture table: one new row `| Command palette | click Commands, then Duplicate
  project | a control opens the palette and a command runs |`.
- the sentence about chosen states may add "a command that changes the
  document"; keep it truthful.

### 2.11 `apps/docs/README.md`

- "42 today … plus the Showcase page and the confirmation-flow pattern's
  composed screens" → 42 plus the Showcase page and the two composed pattern
  screens (confirmation flow and command palette).
- "21 of those" → 22.
- The Pattern pages section names the new page and its file.

### 2.12 `content/docs/component-pages.mdx`

- "The build ships 44 scenes today" → 45.
- "the Showcase page and the confirmation-flow pattern add one composition each"
  → the Showcase page and the two pattern pages add one composition each.
- "Five files own the mechanism" → "These files own the mechanism", and the
  table gains a row for `preview/patterns/command-palette.tsx`. The
  confirmation-flow row must stay: the guard names that exact path.

### 2.13 `TODO.md` and `PLAN.md`

- `TODO.md`, docs workstream: 123/123 → 124/124 and a new ticked task with the
  plan number and the measured result.
- `TODO.md`, cross-team command-palette row: note that the docs half is done
  (plan 522) and the package-owned `examples/` composition stays open.
- `PLAN.md` §4: decision `D42` — a docs-owned pattern composition is a live
  scene, not a demo collage; the package example remains a cross-team task.
- `.agents/slop/plans/README.md`: one row in the docs block for `522`.

## 3. Commands and expected results

Run from the repository root.

1. `nub run --filter docs test`
   - Expected: every suite green, including the new logic test and the widened
     guards. Before the scene table is updated, `component-page-docs.test.ts`
     and `preview-gaps.test.ts` fail on the stated totals; that is the
     two-direction proof for the counts.
2. `nub run --filter docs check-types`
   - Expected: exit `0`; the preview tsconfig compiles the new files.
3. `nub run --filter docs build`
   - Expected: exit `0`; `public/gpuix-preview/` contains the new scene.
4. `nub run --filter docs smoke:preview`
   - Expected: every scene, including `command-palette`, reports a sized canvas
     and the expected text after the gesture; the page half loads
     `/docs/patterns/command-palette` and passes the docs' mode and platform.
5. `nub run check` and `nub run lint`
   - Expected: exit `0`.

## 4. Two-direction proofs

For each rule, break it on purpose, run the named check, and record the result
in the implementation commit message or this plan's §5.

1. Remove the second gesture step (`command-duplicate`) → `smoke:preview` fails
   on `command-palette` after the steps with the expectation absent.
2. Paint the status line initially (`useState("Duplicated the project into a new copy.")`)
   → `smoke:preview` fails the before-assertion ("painted before the gesture").
3. Rename the scene key in `LIVE_SCENES` without the view mapping → the smoke
   reports `No live scene is named "command-palette"`.
4. Change `SCENE_LABEL`'s title → `preview-gaps.test.ts` fails naming the
   gesture table.
5. Change the stated scene total in `docs/preview-strategy.md` → the count test
   fails.
6. Make `uniqueProjectName` return `base` for a second duplicate → the new
   logic test fails.

## 5. Result

Implemented on `agent/docs-site`.

- `nub run --filter docs test` — 75 files / 511 tests, exit `0`.
- `nub run --filter docs check-types` — exit `0`.
- `nub run --filter docs smoke:preview` — every scene green; the new one reports
  `scene command-palette opened by 2 step(s) — 640x520 canvas, 8 text nodes`,
  and `/docs/patterns/command-palette loaded the live iframe`.
- `nub run check`, `nub run lint`, `nub run fmt` — exit `0`.
- `nub run --filter docs smoke:build` — the new page is crawled, its links and
  fragments resolve.

Two-direction proofs, measured:

1. Removing the `command-duplicate` step: `smoke:preview` exit `1`,
   `FAIL live scene command-palette: expected "Duplicated the project into a new copy."
   after 1 gesture step(s)`, and the tree listed only the closed surface.
2. Initialising the status with the expectation: a full docs build plus
   `smoke:preview` exit `1`, `"Duplicated the project into a new copy." was painted
   before the gesture; the scene opens itself`.
3. Removing the `"command-palette"` view mapping: `tsc -p preview/tsconfig.json`
   exit `1` with `Property '"command-palette"' is missing` and an unused-import
   error.
4. Renaming `SCENE_LABEL`'s title: `preview-gaps.test.ts` exit `1`, naming the
   missing and extra gesture-table titles (`Command palette` /
   `Command Palette`).
5. Stating `46 scenes` in `docs/preview-strategy.md`: `preview-gaps.test.ts`
   exit `1`, `expected 46 to be 45`.
6. Making the copy rule return the base name: the new logic test exit `1` with
   three failing assertions (`atlas`, `atlas copy 2` and `atlas copy`).

Every mutation was reverted before the final verified run.

