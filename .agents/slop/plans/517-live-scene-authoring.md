# 517 — Live-scene authoring on the component-page template

**Phase:** F (docs polish and contributor instructions)
**Owner:** `docs-site`
**Depends on:** 410, 411, 412, 455, 456, 486, 487, 508, 513
**Status:** implemented

## 1. The gap, measured

`/docs/component-pages` is the published component-page template (plan 487). It
documents the record, the sections, the MDX blocks, the preview tiers and the
guards. It does **not** document how to author the part of a page that is now
the most involved: the live GPUix scene.

The page currently says only:

> A live scene appears only when the record declares `liveScene`; the scene must
> exist in `preview/scenes.ts`.

That is the whole instruction. The real mechanism spans four files and two
packages, and a contributor can only learn it by reading the source:

| File | What it owns |
| ---- | ------------ |
| `apps/docs/src/component-meta/entries.ts` | the record field `liveScene`, which opts a page in |
| `apps/docs/preview/scenes.ts` | `LIVE_SCENES`, `SCENE_TEXT`, `SCENE_GESTURE`, `SCENE_INTERACTION`, `SCENE_TEXT_IS_SCENE_PROSE` |
| `apps/docs/preview/scene-views.tsx` | `LIVE_SCENE_VIEWS`: one real composition per scene |
| `apps/docs/preview/main.tsx` | the isolated document, the two theme providers and the readiness contract |

The gesture vocabulary (`SceneStep`) is likewise only in the source: `hover`,
`click`, `click-text`, `press`, `fill`, `wheel`. A new gesture is a type change
plus a smoke change, and no reader-facing page names the set.

Why this is worth doing now:

- `MISSION.md` asks for "clear install, usage, contribution and extension
  instructions". The template is the contribution guide for the one artefact
  every future component must produce.
- 42 of 66 delivered pages carry a live scene, and plan 508's rule makes a
  `stateful` record owe one. The next component author hits this section first.
- The page is guarded (plan 487), so an undocumented step is invisible: the
  build passes, the page renders, and only a reader who tries to add a scene
  discovers the missing instructions.

## 2. Exact changes

### 2.1 `apps/docs/content/docs/component-pages.mdx`

Insert one new `## Live scenes` section **after `## The preview`** and before
`## The guards`. It must contain, in this order:

1. **When a scene is required.** A `stateful` record owes one (plan 508); a
   static page uses a tier-A illustration instead; a state a still cannot prove
   is the reason a scene exists. State the honesty rule: a scene mounts the
   real component code, never a browser reimplementation.
2. **The scene table.** A table of the files above, each row naming the real
   path and what it owns.
3. **The scene fields.** A short list of the real exports:
   `LIVE_SCENES`, `SCENE_TEXT`, `SCENE_GESTURE`, `SCENE_INTERACTION`,
   `SCENE_TEXT_IS_SCENE_PROSE`, and what each is for.
4. **The gesture vocabulary.** A table with one row per `SceneStep` kind
   (`hover`, `click`, `click-text`, `press`, `fill`, `wheel`), what it drives
   and the field it needs (`testId`, `text` + `within`, `keys`, `deltaY`).
5. **The readiness contract.** `renderer-ready.ts` asks the renderer for its
   window handle; `render()` returning and the DOM canvas are not readiness.
   The smoke waits for a canvas larger than 1×1, asserts the expectation is
   absent before every gesture and present after it, and forces the scheme and
   platform. A scene must mount inside both theme providers with the same
   resolved theme (plan 457 §9).
6. **The guards.** The real files that keep scenes honest:
   `src/components/preview/scene-contract.test.ts`,
   `src/components/preview/preview-gaps.test.ts`,
   `src/preview-pages.test.ts`,
   `src/component-meta/registry.test.ts` and
   `src/component-pages.test.ts`.
7. **The order of work.** A numbered checklist: add the record field and page,
   add the key + expectation to `scenes.ts`, write the composition in
   `scene-views.tsx`, add the gesture and the reader sentence when the state
   needs one, run the scene contract and `smoke:preview`, then update
   `docs/preview-strategy.md` only if a tier claim changes.

The section may name the Button scene as a worked example (it is the simplest
real one), but it must not hand-count scenes: any total is derived by the test
from `LIVE_SCENES`.

### 2.2 `apps/docs/src/component-page-docs.test.tsx`

Add three tests next to the existing four, using the same real-file reads:

1. **Every gesture kind is documented.** Parse the `SceneStep` union in
   `apps/docs/preview/scenes.ts` for `kind: "<name>"`, collect the unique
   names, and assert the `## Live scenes` section contains one table row per
   kind **and no kind the union does not have** (set equality both ways).
2. **Every scene file is documented and exists.** Assert the four paths in
   §2.1 appear in the section and `existsSync` for each; assert the five guard
   paths appear and exist.
3. **A scene total is derived, not remembered.** Match every
   `\d+ (live )?scenes?` claim in the section; each digit must equal
   `LIVE_SCENES.length` (imported from `preview/scenes.ts`). A hand-typed total
   that drifts fails by name.

Keep `node:fs`/regex reads: this suite already reads real content (plan 487
§header), and `apps/docs` has no Effect runtime.

### 2.3 `apps/docs/README.md`

One sentence in the "Live GPUix surface (tier L)" section pointing a
contributor at `/docs/component-pages` for the authoring steps. No new command.

## 3. Commands and expected results

```sh
cd apps/docs
nub run test -- src/component-page-docs.test.tsx   # the new suite, all green
nub run test                                       # 68 files / 465+ tests, green
nub run check-types                                # tsc clean (fumadocs-mdx first)
cd ../..
nub run check                                      # test-quality, lint, format, types
nub run --filter docs smoke:build                  # 91 pages, exit 0
```

## 4. Two-direction proof (record the measured result in this plan)

Before calling the work done, run each of these and capture the failure text:

1. Delete the `wheel` row from the new gesture table → the gesture test fails
   naming `wheel`.
2. Add a fake `| `drag` | … |` row → the gesture test fails naming `drag`.
3. Rename `preview/scenes.ts` in the prose only → the file test fails by path.
4. Change the sentence to "43 scenes" → the count test fails naming 43 and 42.
5. Remove the whole `## Live scenes` section → all three tests fail.

Record the exact output (test name + message) under §7.

## 5. STOP conditions

- STOP if `SceneStep` cannot be read from `preview/scenes.ts` without a
  TypeScript parser; the regex over the union is acceptable, a compiler
  dependency is not (AGENTS §2: no new dependency for this).
- STOP if the page test would need a browser or a build; this is a source-read
  guard like plan 487.
- STOP if any existing test's assertion changes. This plan adds a section and
  three tests; it rewrites nothing.

## 6. Acceptance

- `/docs/component-pages` contains `## Live scenes` with the seven parts above,
  and every gesture kind, file, guard and total it states is true of the code.
- `component-page-docs.test.tsx` has three new tests; each fails when its fact
  is removed and passes otherwise (proofs in §7).
- `nub run --filter docs test`, `nub run check`, and
  `nub run --filter docs smoke:build` are green.
- `TODO.md` has the row ticked and the plan index row is `implemented`.

## 7. Implementation record

**Landed.** `apps/docs/content/docs/component-pages.mdx` gains `## Live scenes`
between *The preview* and *The guards*: when a scene is required and the honesty
rule, the four-file table, the scene-field table, the gesture vocabulary, the
readiness contract and its two-provider rule, the scene-guard table, and a
five-step authoring checklist. `apps/docs/README.md` points contributors at the
section from its tier-L chapter. `apps/docs/src/component-page-docs.test.tsx`
adds a `live-scene authoring docs` suite with three tests:

| Test | Derived from |
| ---- | ------------ |
| `documents every gesture the scene grammar can take` | the `SceneStep` union in `preview/scenes.ts`, compared with the first column of the published gesture table (both directions) |
| `names every file a scene touches, and only files that exist` | ten real paths: the record, the four scene files and five guards; each must be in the section and on disk |
| `states a scene total the registry agrees with` | every `N scenes` claim must equal `LIVE_SCENES.length` |

The suite imports `LIVE_SCENES` from `../preview/scenes`, so a renamed export is
a compile error rather than a silently skipped check. It keeps the file's
existing `node:fs` reads and native sort: this is the vitest boundary the file
header documents, and `apps/docs` carries no Effect runtime (plan 411 §5).

Measured two-direction proofs (each run over the whole docs suite, then the
file restored):

1. Deleting the `wheel` row → `expected [ 'click', 'click-text', 'fill', …(2) ]
   to deeply equal [ …(3) ]`, the missing `"wheel"`.
2. Adding a `drag` row → the same assertion with `+ "drag"` in the received
   table.
3. Renaming `preview/renderer-ready.ts` in the prose only →
   `+ [ "preview/renderer-ready.ts" ]` from the file test.
4. Typing `43 scenes` instead of `42` → `+ 43` from the total test
   (`LIVE_SCENES.length` is 42).
5. Removing the whole section → all three tests fail together, and no other
   test changes.

Final counts: **67 files / 465 tests** (was 67 / 462), `nub run --filter docs
check-types` clean, `nub run check` and `nub run --filter docs smoke:build`
green (91 pages).

