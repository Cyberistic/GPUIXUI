# 458 — Live scene coverage: the pages a real surface can show without a new component API

**Phase:** F (showcase quality) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455 (live wasm surface), 456 (the scene contract), 457 (six
scenes and the two blocked ones), 412 (preview strategy), 445 (published preview
state)

## 1. Why this plan exists

Plan 457 finished the interaction backlog it could prove and recorded two
blockers (`ContextMenu.point`, `DatePicker.defaultOpen`). That left **five
component pages with neither a live surface nor a tier-A preview**, even though
each one's real state is showable in the wasm renderer today:

| Page | Registry record | What a scene would prove | API verdict |
| ---- | --------------- | ------------------------ | ----------- |
| Icons | `icon` | the real `<svg source>` markup is painted and tinted by the theme at all five size steps | **ship** — static |
| Scrollable containers | `scroll-area` | a bounded container really scrolls with the wheel, and the delta reaches `onScroll` | **ship** — static bounding box, no open state |
| Skeletons | `skeleton` | the opacity pulse advances (the runtime cannot animate more) | **ship** — animation |
| Loading indicators | `spinner` | the lit dot advances one place per step | **ship** — animation |
| Confirmation dialogs | `confirm-dialog` | the modal opens on mount, Cancel holds focus, the danger tone paints, and a real body control composes inside it | **ship** — `open` is controlled, so the scene owns `useState(true)` |

The remaining records are **not** shipped, for measured reasons, not for lack of
time:

| Page | Why not | Smallest honest fix |
| ---- | ------- | ------------------- |
| Tooltip | `Tooltip` wraps `@gpuix/react`'s tooltip but exposes no `open`/`defaultOpen`; a headless check cannot prove a hover-opened tip is in the tree, and autoFocus does not dispatch `onFocus` in this runtime (plan 144 §4) | expose `open` on the primitives wrapper (owner: `primitives`) |
| Combobox | the wrapper owns its open state and exposes no `defaultOpen`, while GPUix's primitive does | expose `defaultOpen` (owner: `components`) |
| Select | the wrapper owns its open state and exposes no `defaultOpen`; its resting state already has a tier-A preview | expose `defaultOpen` (owner: `primitives`) |
| Toast | a scene must push a toast on mount and the smoke must read it before it auto-dismisses — a race; and `ToastProvider` pulls the Effect runtime into the **shared** scene bundle every scene loads | none yet; tier V plus the behaviour suite is the stronger evidence |
| Context menu, Date picker | blocked in plan 457 | recorded in `TODO.md` |

This plan finishes the set a real surface can honestly show and records the rest,
so "every live-scene gap is a measured API or evidence limit" becomes true.

## 2. The contract (unchanged from plan 456)

1. A scene key appears in exactly three places: `preview/scenes.ts`
   (`LIVE_SCENES` + `SCENE_TEXT`), `preview/scene-views.tsx`
   (`LIVE_SCENE_VIEWS`, typed `Record<LiveScene, …>`) and the component record's
   `liveScene`. The page slug equals the scene key (`scene-contract.test.ts`).
2. `SCENE_TEXT[scene]` is JSX-free; the smoke looks for it in GPUI's tree, and
   `scene-contract.test.ts` proves the string still occurs in the view source.
3. A scene is a real composition in a state it documents, with no stubbed
   component and no colour literal. Theme comes from the two providers in
   `preview/main.tsx`.
4. Scenes import **component subpaths only** (`@gpuixui/components/...`), never
   the package root — the root re-exports Toast and its Effect runtime.
5. Tier L never replaces native evidence; the tier-V suite stays on the page.

## 3. Files

Change:

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | add `icon`, `scroll-area`, `skeleton`, `spinner`, `confirm-dialog` to `LIVE_SCENES`; add their `SCENE_TEXT` entries (one string each that the composition paints above the fold) |
| `apps/docs/preview/scene-views.tsx` | add the five scenes: an icon strip with the five size steps, a bounded activity log in a `ScrollArea`, a profile card skeleton, a saving row with a `Spinner`, and a `ConfirmDialog` open with a real checkbox body; extend `LIVE_SCENE_VIEWS` |
| `apps/docs/src/component-meta/entries.ts` | `liveScene` on the five delivered records |
| `apps/docs/src/components/preview/scene-contract.test.ts` | the interaction-record map gains `confirm-dialog`; the animation/static records are covered by the existing key/expectation/drift tests |
| `apps/docs/scripts/smoke-live-preview.ts` | raise the self-imposed 240 s ceiling to 420 s (11 scenes × 2 + the theming page) and update the comment counting them |
| `docs/preview-strategy.md` | the tier-L row, the closing paragraph and the scene list name eleven scenes and the four measured gaps (`tooltip`, `combobox`, `select`, `toast`) |
| `apps/docs/README.md` | the live-surface section lists the new scenes |
| `apps/docs/content/docs/components/confirm-dialog.mdx` | drop "The docs site cannot render it live"; the scene now renders it, and the native suite stays beneath as tier V |
| `PLAN.md` | D29's scene set becomes eleven and names the four measured gaps |
| `TODO.md` | tick the live-scene rows; add the cross-team `defaultOpen`/`open` asks and the toast reason |
| `.agents/slop/plans/README.md` | index this plan |

Create: none.

## 4. Implementation order

1. **Keys and expectations.** Add the five keys and `SCENE_TEXT`. Strings must
   name something the scene paints, not the component title alone:
   `icon` → a gallery heading, `scroll-area` → the log heading, `skeleton` →
   the placeholder's surrounding label, `spinner` → the saving label,
   `confirm-dialog` → the dialog's real title.
2. **Views.** Compose the five scenes from the real packages:
   - icon: `Icon` at `xs`…`xl`, tinted from `useTheme().colors`, with the label
     of each step;
   - scroll-area: `ScrollArea axis="vertical"` at a fixed height with more rows
     than fit, so the wheel has somewhere to go;
   - skeleton: a card-shaped stack of `Skeleton` bars beside real text;
   - spinner: `Spinner` in a "Saving changes…" row;
   - confirm-dialog: controlled `open` in the scene, `tone="danger"`, a
     `Checkbox` body the caller owns, `onConfirm` a no-op.
   Run `nub run --filter docs build:preview` and expect exit `0`.
3. **Records.** Set `liveScene` on the five records. `nub run --filter docs test`
   must pass (`registry.test.ts` accepts only shipped keys).
4. **Smoke.** Run `nub run --filter docs smoke:preview`. Expect `exit 0`, one
   `scene … ready` line per key, one `/docs/components/<slug>` line per key and
   the platform-toggle line. If a scene fails, record `data-reason` and apply §6.
5. **Docs and ledger.** Update the preview strategy, README, the confirm-dialog
   limitation, `PLAN.md`, `TODO.md` and the plan index. No page may still claim
   the site cannot render a component it now shows live.
6. **Gates.** `nub run --filter docs check-types`, `test`, `build`, then
   `nub run check`, `nub run lint`, `nub run test`.

## 5. Commands and expected results

```sh
nub run --filter docs build:preview   # exit 0, "preview: built … (19.x MB renderer)"
nub run --filter docs check-types     # exit 0 (app + preview project)
nub run --filter docs test            # exit 0, scene-contract tests included
nub run --filter docs smoke:preview   # exit 0, 11 scenes + 11 pages + platform toggle
nub run --filter docs build           # exit 0
nub run check && nub run lint && nub run test
```

## 6. STOP conditions

- **A scene reaches `data-gpuix="failed"`** (or times out): record `data-reason`
  and stop for that scene; do not weaken the assertion. The other scenes may
  ship; the failed record keeps `liveScene: null`.
- **A scene paints but `getAllText()` omits the expected string** — record the
  measured tree and do not ship that scene. A scene the guard cannot prove does
  not exist.
- **A component subpath does not compile for the browser** — record the module
  and error, ship the scenes that compile, and leave the rest planned.
- **A scene needs a component prop that does not exist** — stop and add the ask
  to `TODO.md`; never stub the component in `preview/`.
- **The preview bundle gains a Node built-in or the Toast provider** — fix the
  import to a subpath; never shim a Node module for the browser.

## 7. Test plan

| Test | Guards | Proven to fail by |
| ---- | ------ | ----------------- |
| `scene-contract.test.ts` (keys) | every key has a unique key and a non-empty expectation | adding a key with no `SCENE_TEXT` entry |
| `scene-contract.test.ts` (drift) | each expectation still occurs in `scene-views.tsx` | pointing one expectation at text the view does not paint |
| `scene-contract.test.ts` (records) | each interaction record declares its scene; slug equals key | dropping `liveScene` from a record / giving it a different key |
| `smoke:preview` | each scene reaches GPUI's tree with its text, its page loads the iframe, and the platform toggle reaches the renderer | changing one `SCENE_TEXT` to an absent string → exit `1`; restore → exit `0` |

The two-direction proofs are recorded in §8 when the plan runs.

## 8. Progress

Implemented 2026-10-18.

- **Five scenes shipped**, so `LIVE_SCENES` is eleven:
  `confirm-dialog`, `icon`, `scroll-area`, `skeleton`, `spinner`. Each record
  declares its `liveScene`, and the page needs no edit beyond dropping the
  Confirm dialog's stale "cannot render it live" limitation.
- **The gap guard** (`scene-contract.test.ts`): a delivered record with no
  `liveScene` and no `<ComponentPreview>` must be one of `combobox`,
  `context-menu`, `date-picker`, `toast`, `tooltip` — the five measured reasons.
  A new page in that hole fails, and so does a record that gains a scene/illustration
  while still listed.
- **Measured:** `nub run --filter docs test` — 41 files, 251 tests pass;
  `check-types` (app + preview project), `lint`, `fmt`, `nub run test` and
  `smoke:build` (68 pages, 87 links) are green.
- **`smoke:preview --no-build`** — all eleven scenes reach GPUI's tree with their
  text, all eleven component pages load the iframe, and the platform toggle
  reaches the renderer; exit `0`.
- **Two directions proven:**
  1. `SCENE_TEXT.skeleton` set to "Placeholder that is not painted" failed
     `scene-contract.test.ts` (`skeleton: …` under "keeps every expectation in
     the view") **and** `smoke:preview` (`FAIL live scene skeleton: expected …
     in the GPUI tree (["Loading profile"])`, exit `1`); restoring the string
     passed both.
  2. Removing `liveScene: "icon"` made the gap guard report `+ "icon"` against
     the exclusion list; restoring it passed.
- The four remaining gaps are recorded in `docs/preview-strategy.md` and
  `TODO.md`; no scene was faked and no component source was copied into
  `preview/`.

## 9. Acceptance

- The five pages carry a real GPUix surface (tier L) and still show their native
  evidence beneath it.
- `smoke:preview` drives eleven scenes and eleven pages with exit `0`, proven in
  both directions for at least one expectation.
- The four remaining gaps are named with their measured reason and, where one
  exists, the smallest honest API change — in `TODO.md` and
  `docs/preview-strategy.md`.
- No page claims the site cannot render a component it now renders live.
- All docs suites and the repository gate pass; the change is committed and
  pushed on `agent/docs-site`.
