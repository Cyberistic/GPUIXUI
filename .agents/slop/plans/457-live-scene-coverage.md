# 457 — Live scene coverage: Popover and Command menu, with the two blocked scenes recorded

**Phase:** F (showcase quality) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455 (live wasm surface), 456 (the scene contract and its four
scenes), 412 (preview strategy), 445 (published preview state)

## 1. Why this plan exists

Plan 456 shipped four live scenes and left an explicit backlog: *more scenes
(Command menu, Context menu, Popover, Date picker) once each has a real
composition.* This plan works that backlog down with the same contract — a key, a
JSX-free expectation, a view, a page record and a smoke assertion — and records
why two of the four **cannot** ship honestly yet.

The API check that decides each candidate:

| Candidate | Open-on-mount API | Verdict |
| --------- | ----------------- | ------- |
| Popover | `Popover` takes `defaultOpen` | **ship** |
| Command menu | `CommandMenu` is controlled (`open`/`onOpenChange`); the scene owns `useState(true)` | **ship** |
| Context menu | `ContextMenu` has `defaultOpen`, but the surface is painted at the component's internal `point`, which starts at `{ x: 0, y: 0 }` and is only ever set by the trigger's aux click. There is no `point` prop. | **blocked** — a scene would paint the menu over the surface's top-left corner. The smallest honest change is a `point` prop on `ContextMenu` (owner: `components`). |
| Date picker | `DatePicker` owns `open` in a private `useState`; it has no `open`/`defaultOpen` prop, and the calendar only exists while that state is true. | **blocked** — the smallest honest change is a `defaultOpen` prop on `DatePicker` (owner: `components`). |

Blocking is recorded in `TODO.md` (workstream row + cross-team table), not
worked around: the docs must not stub a component or fake an open surface.

## 2. The contract (unchanged from plan 456 §2)

1. A scene key appears in exactly three places: `preview/scenes.ts`
   (`LIVE_SCENES` + `SCENE_TEXT`), `preview/scene-views.tsx`
   (`LIVE_SCENE_VIEWS`, typed `Record<LiveScene, …>`), and the component record's
   `liveScene`.
2. `SCENE_TEXT[scene]` is JSX-free and is the string the smoke looks for in
   GPUI's tree; `scene-contract.test.ts` proves it still occurs in the view.
3. A scene is a real composition, open in the state it documents: the popover
   shows a real column chooser with its surface open; the command menu shows a
   real grouped palette, open on mount.
4. Scenes import **subpaths only** (`@gpuixui/components/popover`,
   `/command-menu`), never the package root (Toast pulls an Effect runtime).
5. No colour literal; the scene stays inside `LiveSurface`, so the docs' mode and
   platform theme reach it through `ThemeProvider`.
6. Tier L never replaces native evidence: the tier-V suite stays beneath it.

## 3. Files

Change:

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | add `popover` and `command-menu` to `LIVE_SCENES`; add their `SCENE_TEXT` entries |
| `apps/docs/preview/scene-views.tsx` | add `PopoverScene` (column chooser, surface open) and `CommandMenuScene` (grouped palette, open on mount); extend `LIVE_SCENE_VIEWS` |
| `apps/docs/src/component-meta/entries.ts` | `liveScene: "popover"` / `"command-menu"` on the two delivered records |
| `apps/docs/src/components/preview/scene-contract.test.ts` | the interaction-record map gains both; one new test pins the page-slug rule the smoke relies on |
| `apps/docs/scripts/smoke-live-preview.ts` | derive the page loop from `LIVE_SCENES` instead of a hand-written `pageScenes` list, and assert the scene key reaches the iframe |
| `docs/preview-strategy.md` | the tier-L row and the closing paragraph name six scenes and the two recorded gaps |
| `PLAN.md` | D29's scene set becomes six and names the API asks that block the other two |
| `TODO.md` | tick the backlog row down to the two blocked scenes; add the cross-team rows for `point` and `defaultOpen` |
| `.agents/slop/plans/README.md` | index this plan |

Create: none.

## 4. Implementation order

1. **Keys and expectations.** `scenes.ts`: add both keys and `SCENE_TEXT`
   (`popover` → a column name the surface renders, `command-menu` → a command
   label the palette renders).
2. **Views.** `scene-views.tsx`: the popover scene is a "Projects" card whose
   column chooser is open below its trigger; the command scene is a palette with
   two groups, a display shortcut, a disabled row and a separator-equivalent
   group break. Run `nub run --filter docs build:preview`.
   *Expected:* exit `0`, the wasm asset printed. **STOP** if either subpath does
   not compile for the browser; record the exact error and ship only the scene
   that builds.
3. **Records.** Add `liveScene` to both records; `nub run --filter docs test`
   must pass (`registry.test.ts` accepts only shipped keys).
4. **Smoke.** Replace `pageScenes` with a loop over `LIVE_SCENES`, requiring the
   page slug to equal the scene key (true for all six; a mismatch must be an
   explicit decision, so a test pins it). Run
   `nub run --filter docs smoke:preview`. *Expected:* exit `0` with one
   `scene … ready` line per scene and one `/docs/components/<slug>` line each.
5. **Unit guard.** Update the interaction map; prove the new drift guard fails by
   changing `SCENE_TEXT.popover` to an absent string, then restore.
6. **Docs and ledger.** Preview strategy, `PLAN.md` D29, `TODO.md`, the plan index.
7. **Gates.** `nub run --filter docs check-types`, `nub run --filter docs test`,
   `nub run --filter docs build`, then `nub run check`, `nub run lint`,
   `nub run test`.

## 5. Commands and expected results

```sh
nub run --filter docs build:preview   # exit 0, "preview: built … (19.x MB renderer)"
nub run --filter docs check-types     # exit 0 (app + preview project)
nub run --filter docs test            # exit 0, scene-contract tests included
nub run --filter docs smoke:preview   # exit 0, six scenes + six pages + platform toggle
nub run --filter docs build           # exit 0
nub run check && nub run lint && nub run test
```

## 6. STOP conditions

- **A component subpath does not compile into the preview bundle.** Record the
  module and reason here, ship only the scene that compiles, and leave the failed
  record without `liveScene`. Never stub or copy component source into `preview/`.
- **A scene reaches `data-gpuix="failed"`.** Record `data-reason` and stop; do not
  weaken the assertion.
- **An open surface paints but `getAllText()` omits its content.** Record the
  measurement and do not ship that scene; a scene the guard cannot prove is not a
  scene.
- **The page slug and the scene key disagree.** Stop and record the mapping
  explicitly instead of silently pointing the smoke at the wrong page.
- **The preview bundle gains a Node built-in or the toast runtime.** Fix the
  import to a subpath; never shim a Node module for the browser.

## 7. Test plan

| Test | Guards | Fails when |
| ---- | ------ | ---------- |
| `scene-contract.test.ts` (keys/expectations) | every key has a non-empty expectation; keys unique | a key is added without an expectation |
| `scene-contract.test.ts` (drift) | each expectation occurs in `scene-views.tsx` | a view's text changes and the smoke looks for a stale string |
| `scene-contract.test.ts` (records) | Popover and Command menu (plus the four from 456) declare their scene | a record loses `liveScene` and falls back to tier V |
| `scene-contract.test.ts` (slugs) | every record with a `liveScene` has `slug === scene` | the smoke's derived page URL would miss the record's page |
| `registry.test.ts` (existing) | every declared scene is a shipped key | a typo'd key ships |
| `smoke:preview` | all six scenes reach GPUI's tree and all six pages load their scene | a composition, import or page wiring breaks (exit `1`) |

Two-direction proof for the drift guard: set `SCENE_TEXT.popover` to a string the
view does not render, run `nub run --filter docs test` (expect a failure), then
restore it.

## 8. Acceptance

- `/docs/components/popover` and `/docs/components/command-menu` show a labelled
  click-to-load live GPUix surface with the real composition open.
- Native tier-V evidence remains on both pages.
- `smoke:preview` exits `0` with six scene lines and six page lines; it exits `1`
  when a scene is broken.
- Context menu and Date picker are recorded as blocked in `TODO.md` with the
  exact prop each needs and the owner; no scene is faked.
- `check-types`, `test`, `build` and the repository gates are green.

## 9. Result (implemented 2026-10-18)

Two scenes ship: `popover` and `command-menu`, bringing the set to six. Both are
real compositions from `@gpuixui/components`:

- **Popover** — a "Projects" card whose column chooser is open below its
  trigger, with four toggle rows, two of them shown.
- **Command menu** — a palette with Navigation and File groups, display
  shortcuts, a disabled row and its footer hint, open on mount.

Their records declare the matching `liveScene`, so the pages select tier L with
the tier-V suite beneath, and the smoke derives its six page URLs from
`LIVE_SCENES` (the `pageScenes` list is gone; a contract test pins
`slug === scene`).

**Blocked, with evidence:** the context menu's surface is painted at an internal
`{ x: 0, y: 0 }` point set only by the trigger's aux click, and the date picker
owns its open state with no prop to open it. A scene for either would be a fake.
`TODO.md` records the two smallest honest changes (`ContextMenu.point`,
`DatePicker.defaultOpen`) with the owner.

Measured:

- `nub run --filter docs build:preview` → exit `0`; 438 modules, 19.1 MB wasm,
  the JS bundle grew 454.70 kB → 462.55 kB for the two component scenes.
- `nub run --filter docs check-types` → exit `0` (app and preview project).
- `nub run --filter docs test` → 249 tests (up from 248), including the new
  slug guard.
- `nub run --filter docs smoke:preview` → exit `0`: six scenes ready, six
  component pages load their own scene, the unknown scene reports its reason and
  `?platform=win32` still reaches the surface.
- Two-direction proof for the drift guard: `SCENE_TEXT.popover` set to a string
  the view does not render fails `scene-contract.test.ts`; restored, it passes.
- `nub run --filter docs build` and the repository gates are green.

**Two measured corrections** while making the smoke cover six pages:

1. The expectation table is matched against **exact** `getAllText()` nodes, so
   `popover` had to be `Show columns` (the panel's own label), not a word that
   only occurs inside a longer node (`Owner ✓`).
2. `openPageSurface` clicked the SSR button once and waited. The SSR markup
   ships the control before React attaches its handler, so a click could land
   pre-hydration, do nothing, and time out on whichever page the race hit — the
   first run timed out on Theming, the next on Buttons. The loop now keeps
   offering the click until the iframe exists, and the script's overall budget
   is 240s (six scenes plus six page loads measured ~55s).

