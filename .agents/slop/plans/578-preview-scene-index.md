# 578 — Previews lists every shipped scene on-site, not behind a 404

**Phase:** F (docs completeness)
**Workstream:** docs-site
**Depends on:** 412 (preview strategy), 455 (live surface), 486 (gesture scenes),
508/513 (the last stateful scenes), 521/522/560/575 (the composed scenes),
571 (the reader-facing preview guide), 577 (copyable imports)
**Status:** implemented

## 1. The measured defect

`/docs/previews` is the reader-facing preview guide (plan 571). It says a scene
may mount in its documented state **or** be opened by a gesture, and then sends
the reader to a raw GitHub link for the list:

```mdx
The full list of scenes and gestures is in the
[preview strategy](https://github.com/Cyberistic/GPUIXUI/blob/master/docs/preview-strategy.md).
```

Measured 2026-10-19 from the worktree root:

| Fact | Measurement |
| ---- | ----------- |
| live scenes registered in `apps/docs/preview/scenes.ts` | **49** (`LIVE_SCENES`) |
| scenes on a component record | **45** |
| composed scenes (`SCENE_PAGE`) | **4** (Showcase, confirmation flow, command palette, project browser) |
| scenes opened by a gesture (`SCENE_GESTURE`) | **26** |
| reader instructions for those gestures (`SCENE_INTERACTION`) | **26**, no gaps |
| links to `docs/preview-strategy.md` on `previews.mdx` | **2** (lines 37–38 and 92–93) |
| pages that list the scenes themselves | **0** |

The repository link does not resolve on the default branch:

```sh
curl -s -o /dev/null -w '%{http_code}\n' -L \
  https://github.com/Cyberistic/GPUIXUI/blob/master/docs/preview-strategy.md
# => 404
```

`docs/preview-strategy.md` exists in this worktree but not on `origin/master`
(verified with `git cat-file -e origin/master:docs/preview-strategy.md`). The
reader therefore cannot reach the list the page promises, from either of the two
places that link it. `previews.mdx` itself does not import `LIVE_SCENES`,
`SCENE_GESTURE`, `SCENE_INTERACTION` or `SCENE_LABEL`, so nothing on the built
page can fail when a scene is added and the prose goes stale.

A reader page that promises "the full list" and then 404s is a correctness
defect, not a wording issue. It is also the only place the site depends on a
repository file that the default branch does not serve.

## 2. What to build

### 2.1 `apps/docs/src/components/preview/scene-index.tsx` (new)

A browser-safe component in the style of `preview-tiers.tsx`. It imports the
registry and the scene contract directly; it must not import `effect` or
`node:*` (the docs client bundle cannot carry them).

```ts
import { components } from "@/component-meta/registry";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_INTERACTION,
  SCENE_LABEL,
  SCENE_PAGE,
  type LiveScene,
} from "../../../preview/scenes";

export interface LiveSceneRow {
  /** The scene key the smoke drives. */
  readonly scene: LiveScene;
  /** The component title, or the composed page's label. */
  readonly title: string;
  /** The docs page that mounts the scene, or `null` when no page owns it. */
  readonly href: string | null;
  /** What a reader does to see the documented state. */
  readonly interaction: string;
}

/** One row per registered scene, in registry order. */
export const liveSceneRows = (): ReadonlyArray<LiveSceneRow> =>
  LIVE_SCENES.map((scene) => {
    const record = components.find((component) => component.liveScene === scene);
    const composed = SCENE_PAGE[scene];
    const label = SCENE_LABEL.find((entry) => entry.scene === scene);
    return {
      scene,
      title: record?.title ?? label?.title ?? scene,
      href: record === undefined ? (composed ?? null) : `/docs/components/${record.slug}`,
      interaction:
        SCENE_GESTURE[scene] === undefined
          ? "Mounts in the state it documents."
          : (SCENE_INTERACTION[scene] ?? "Opened by a real gesture."),
    };
  });
```

Rules:

- **Do not hand-write a scene, a title or a count.** The rows and the caption
  (`{scenes} live scenes: {records} on component records, {composed} composed`)
  are all derived.
- A scene that has neither a record nor a `SCENE_PAGE` entry is a contract
  break, not a rendering choice: `href` stays `null` and the test in §3 fails by
  scene name. Do not invent a URL.
- A gesture scene with no `SCENE_INTERACTION` instruction falls back to a plain
  sentence **and fails the test**. If the fallback is hit, add the instruction to
  `preview/scenes.ts` in the same change (that file is owned by this workstream).
- A scene with no gesture is stated as mounting in its documented state, which
  is the strategy's own rule.
- Render a `<table>` with a caption and `<th scope="col">` for every column:
  **Scene**, **Where it runs**, **How to see the state**. Give each `<tr>`
  `data-live-scene={scene}` so the test counts rows. Link with a plain `<a href>`
  (the other MDX components do), and render the title as the link text.
- The heading and table are `not-prose`, like `PreviewTiers`.

### 2.2 `apps/docs/content/docs/previews.mdx`

- Delete the raw GitHub link in **The live surface**. Replace those two lines
  with a sentence that points at the list below, then add:

  ```mdx
  ## Every live scene

  A scene is either mounted in the state it documents or opened by the gesture
  the smoke drives. The table is generated from `LIVE_SCENES` in
  `preview/scenes.ts`, so a new scene appears here with no docs edit.

  <LiveSceneIndex />
  ```

  Place the new section after **The live surface** and before **Native
  evidence**; the built crawl checks heading order but not section order, so
  keep the reader's order intentional.
- Delete the raw GitHub link in **The full rules**. Keep the maintainer file
  named as inline code — `docs/preview-strategy.md` — and link the on-site
  authoring guide instead: `[Live scenes](/docs/component-pages#live-scenes)`.
  Do not replace it with a `blob/agent/docs-site` URL: a branch name is not a
  durable destination.
- Do not add a hand-written scene count to the MDX; the component's caption owns
  it.

### 2.3 `apps/docs/src/components/mdx.tsx`

Import `LiveSceneIndex` from `./preview/scene-index` and add it to
`getMDXComponents()`. Without this, SSR fails after the `<head>` has already
rendered (the exact bug `mdx-components.test.ts` guards).

### 2.4 `apps/docs/README.md`

In **Previews** (around the tier list), add one paragraph: `/docs/previews`
renders `<LiveSceneIndex />`, one row per `LIVE_SCENES` entry with its page and
the instruction a reader follows; the strategy file stays the maintainer record.
Name plan `578`.

### 2.5 Optional, only if the test is already red for it

If `SCENE_INTERACTION` has gained a gesture scene without an instruction by the
time this runs, write one reader sentence next to the other entries in
`apps/docs/preview/scenes.ts`. Do not loosen the test.

## 3. Tests

### 3.1 `apps/docs/src/components/preview/scene-index.test.tsx` (new)

Render with `renderToStaticMarkup`, as `preview-tiers.test.tsx` does. Header
comment records the bug: the page linked a repository file the default branch
does not serve, and listed no scenes itself.

1. **One row per registered scene, no extras.** The rendered
   `data-live-scene=` count equals `LIVE_SCENES.length`, and the set of keys
   equals `new Set(LIVE_SCENES)`. Removing a row, duplicating one, or registering
   a scene without rendering it fails.
2. **Every row links its real page.** For each row: a record scene's href is
   `/docs/components/<slug>` and the slug's page exists; a composed scene's href
   is `SCENE_PAGE[scene]` and every href starts with `/docs/`. A `null` href is
   reported by scene name.
3. **Gesture scenes carry the reader instruction.** Every key of
   `SCENE_GESTURE` has a non-empty `SCENE_INTERACTION` entry, and its row
   contains that exact sentence. A gesture scene without an instruction fails
   here.
4. **Non-gesture scenes say they mount open.** Their row contains
   "Mounts in the state it documents."
5. **The caption is derived.** It states `LIVE_SCENES.length`,
   `records.length` and `composed.length`; change a scene and the caption moves.
6. **The page uses the component and no longer links the 404.** Read
   `content/docs/previews.mdx`: it contains `<LiveSceneIndex />`, and it does not
   contain `blob/master/docs/preview-strategy.md`. Naming the maintainer file in
   inline code is still allowed.

The test must be able to fail: the two-direction proof in §5 removes a row, a
page href and the `<LiveSceneIndex />` block in turn.

### 3.2 Existing guards to re-run

- `mdx-components.test.ts` — the new block must be registered.
- `preview-tiers.test.tsx` — the page it reads gains a section; its existing
  assertions must stay true.
- `preview-gaps.test.ts` — scene counts are derived; it must stay green.
- `code-imports.test.ts` — the new component adds no fenced import.
- `smoke:build` — the page must render, keep its heading outline and have no
  broken internal fragment.

## 4. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/docs-site`).

```sh
# 1. focused suite; expect every new case green
nub run --filter docs test -- src/components/preview/scene-index.test.tsx

# 2. the guides it touches; expect green
nub run --filter docs test -- src/components/preview/preview-tiers.test.tsx \
  src/mdx-components.test.ts src/components/preview/preview-gaps.test.ts

# 3. the whole docs suite; expect 93 files / 66x tests, no failures
nub run --filter docs test

# 4. strict types; expect exit 0
nub run --filter docs check-types

# 5. production build + crawl; expect exit 0, 98 pages, 0 broken links/anchors
nub run --filter docs smoke:build

# 6. repo gates; expect exit 0
nub run check
nub run lint
```

`smoke:build` exits `2` when it cannot build/serve; that is "unverified", never
a pass. Record the exact output if it happens.

## 5. Two-direction proofs (record the measured result in this plan)

After the tests are green, re-break each defect, run the focused suite, and
restore:

1. Delete one row from `liveSceneRows()` → test 1 fails by count.
2. Change the composed `href` for `showcase` to `/docs/showcase/` → test 2 fails
   by scene name (or, if it still exists, point it at `/docs/nothing`).
3. Remove one `SCENE_INTERACTION` entry → test 3 fails by scene name; restore.
4. Remove `<LiveSceneIndex />` from `previews.mdx` → test 6 fails.
5. Restore the raw GitHub link → test 6 fails.

Each run's command, exit code and first failing message go in a `## 6. Results`
section before this plan is marked implemented.

## 6. Results (measured 2026-10-19)

| Command | Result |
| ------- | ------ |
| `nub exec vitest run src/components/preview/scene-index.test.tsx` (from `apps/docs`) | 1 file / **6 tests passed** |
| `nub run --filter docs test` | **93 files / 664 tests passed** |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs smoke:build --no-build` | **98 pages, 121 links, 1 277 anchors**, exit `0` |
| `nub run check` | exit `0` |
| `nub run test` | exit `0` (`packages/primitives` 282, docs 664) |
| `nub run lint` | exit `0` |

Two-direction proofs, each run alone with the focused suite and then restored:

| Forced defect | Measured failure |
| ------------- | ---------------- |
| `LIVE_SCENES.slice(0, -1)` in `liveSceneRows` | 3 failed: row order (48 vs 49), `project-browser: no row`, caption `48 … 45 … 3` |
| composed `href` given `/nothing` | 1 failed: "links every scene to the page that mounts it" |
| `SCENE_INTERACTION.tooltip` removed | 1 failed: `expected [ 'tooltip' ] to deeply equal []` |
| `<LiveSceneIndex />` removed from the page | 1 failed: page does not contain `<LiveSceneIndex />` |
| the raw GitHub link restored | 1 failed: page contains `blob/master/docs/preview-strategy.md` |

The measured scene split at implementation: **49 scenes — 45 on component
records, 4 composed; 26 gesture scenes, all with a reader instruction.**

## 7. STOP conditions

- `LIVE_SCENES` contains a scene with neither a record nor a `SCENE_PAGE` entry:
  stop and report the scene. Do not invent a page or drop the row.
- A gesture scene has no `SCENE_INTERACTION` sentence: add the sentence (this
  workstream owns `preview/scenes.ts`) or stop if the gesture's target is
  unclear.
- The scene count differs from §1 because another workstream merged scenes:
  derive all counts (the component does), update only the measured table in this
  plan, and keep the tests relational. Do not hardcode the new number in MDX.
- `smoke:build` fails on the new page: read the page name and error, fix the
  block or the registration, and do not mark the plan done.
- Any command reports a test that did not run: that is not a pass.

## 8. Acceptance

- `/docs/previews` lists every `LIVE_SCENES` entry with its page and how to see
  its state, generated from the contract.
- Neither raw GitHub link to `docs/preview-strategy.md` remains on the site; the
  page links on-site authoring instead.
- `scene-index.test.tsx` fails when a row, a page link, an instruction or the
  page block is removed.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check` and
  `nub run lint` pass, and the plan index, `TODO.md` and `apps/docs/README.md`
  record the change.
