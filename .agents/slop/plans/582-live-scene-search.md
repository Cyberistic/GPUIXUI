# 582 — A live scene's instruction reaches the page that shows it

**Phase:** F (search and information architecture) · **Workstream:** docs-site ·
**Depends on:** 410, 412, 419, 431, 455, 486, 504, 561, 564, 570, 571, 578, 580

## 1. The gap

`/docs/previews` renders one row per live scene, with the gesture that opens the
state it documents (`<LiveSceneIndex />`, plan 578). Component pages render the
same sentence above their live surface. Both are **React rendered from
`preview/scenes.ts`**, so the Fumadocs MDX index never sees them — the exact
class of gap D32 closed for the component registry, token tables, capability
matrix, icon catalogue and roadmap.

Measured on `agent/docs-site` at `79cf1acc` against the real `search()`:

| Query | First results now | The page that owns it |
| ----- | ----------------- | --------------------- |
| `right click` | `component-pages#the-gesture-vocabulary` ×2, then Context menu prose | Context menu |
| `wheel up` | Radio group, Button group | Message scroller |
| `press end` | Extending, Range slider prose | Slider |
| `type a name` | Typography, Icon | Text inputs |
| `type the workspace name` | Workspace, Theming | Confirmation flow (pattern) |
| `open the palette` | Theming, Command palette | Command palette (pattern) |
| `live scene` | `component-pages#live-scenes` headings | Previews |

The words are authored by the site and shown to the reader, but only in React.
No ranker rule can recover them: the index never contains them. This is the
same structural failure plans 504/505/507 fixed, not a relevance problem.

`SCENE_INTERACTION` holds one sentence per gesture scene (26 today), and
`SCENE_GESTURE` holds the steps the smoke drives. Both already exist and are
already rendered; they need an index document.

## 2. The change

### 2.1 `apps/docs/src/lib/live-scenes.ts` (new)

Move the scene-row derivation out of the React component so both the page table
and the search document read one function:

```ts
export interface LiveSceneRow {
  readonly scene: LiveScene;
  readonly title: string;
  readonly href: string;
  readonly kind: "record" | "composed";
  readonly interaction: string;
  /** The reader-visible words for the steps the smoke drives. */
  readonly gesture: string;
}

/** One row per registered scene, in `LIVE_SCENES` order. */
export const liveSceneRows = (): ReadonlyArray<LiveSceneRow>;
```

- The record lookup is the existing one (`components.find` by `liveScene`), the
  composed title is `SCENE_LABEL`, the page is `SCENE_PAGE`.
- `href` is non-optional: `scene-index.test.tsx` already fails when a scene has
  no page, and the search document cannot carry a `null` URL. Throw nothing:
  return `/docs/previews` for a scene with no page would lie; instead keep the
  test as the guard and type `href: string` after a total lookup.
- `interaction` stays exactly what the page prints (the existing `interactionFor`
  rule: `SCENE_INTERACTION` or "Mounts in the state it documents.").
- `gesture` derives from `SCENE_GESTURE`, never from prose:
  - `click` with `button: 2` → `right click`;
  - `click` / `click-text` → `click`;
  - `hover` → `hover`;
  - `fill` → `type`;
  - `press` → `press <keys>`;
  - `wheel` → `wheel up` when `deltaY > 0`, otherwise `wheel down`
    (`COMPONENTS.md` records that positive Y scrolls up).
  A scene with no steps gets `""`.
- Native array helpers are deliberate at this browser boundary, as in
  `registry.ts`; `effect` must not enter the docs bundle.

### 2.2 `apps/docs/src/components/preview/scene-index.tsx`

Delete the local `LiveSceneRow`, `interactionFor` and `liveSceneRows`; import
them from `@/lib/live-scenes`. The rendered markup, caption and row count do not
change. `scene-index.test.tsx` imports `liveSceneRows` from the new module.

### 2.3 `apps/docs/src/lib/scene-search.ts` (new)

Two exports:

```ts
/** One promoted document per gesture scene: the page that mounts it. */
export const sceneSearchEntries: ReadonlyArray<GeneratedSearchEntry>;

/** `/docs/previews` itself, which lists every scene. */
export const scenesIndexEntry: GeneratedSearchEntry;
```

For each row with `gesture !== ""` (a scene no gesture opens has no instruction
to search, and its page title already ranks):

- record scene → `url = /docs/components/<slug>`, `title = record.title`;
- composed scene → `url = SCENE_PAGE[scene]`, `title = SCENE_LABEL` title;
- `content` = scene key, title, interaction sentence and gesture words, one per
  line;
- `keywords` = scene key, title, gesture words;
- `names` = the title **and the interaction sentence**. `promotedNameRank`
  matches a multiword query whose words prefix one name, so
  `type a name` matches "Type a name into the field." while a single word is
  never promoted (plan 564's rule, unchanged).
- `breadcrumbs = ["Previews"]`.

`scenesIndexEntry` is one document at `/docs/previews`:

- `title: "Live scenes"`, names `["Live scenes"]`;
- content = every row (`title`, interaction, gesture), including the static
  scenes the per-page entries skip;
- keywords = every scene key and title.

All titles, interactions and gestures come from `preview/scenes.ts` and the
registry. No sentence is authored twice.

### 2.4 `apps/docs/src/lib/search.ts`

- Import the two exports and append them to `generatedEntries`; the existing
  `generatedByUrl` map, `generatedNameHits` synthesis and `promotedNameRank`
  then do the work. No new ranker rule and no change to `mergeResults`.
- **Collision check:** `generatedByUrl` holds one entry per URL. The only
  component page with an existing generated entry is Icons
  (`iconSearchEntry`), and its scene has no gesture, so it is not in
  `sceneSearchEntries`. Record that fact in a test (§3) so a future gesture on
  the Icons page fails instead of silently replacing the icon document. If that
  test fails, the fix is to merge names per URL, not to drop either document.
- Do **not** add these words to `componentSearchIndex` as a second path: one
  index per fact, and the scene entries already carry the page URL.

### 2.5 `apps/docs/content/docs/previews.mdx`

Add one paragraph under `## Every live scene`:

> The sentence above each surface is indexed, so a reader who remembers the
> gesture can search for it: `wheel up` reaches Message scroller, `press end`
> reaches Slider and `right click` reaches Context menu. A single word is never
> promoted by this rule, so `input` and `click` keep the page that owns them.

### 2.6 `apps/docs/README.md`

Add a paragraph to the **Search** section after plan 578's scene-index
paragraph: the scene instruction is promoted from `preview/scenes.ts`, one
document per gesture scene plus `/docs/previews`, and the collision rule with
the Icons document.

### 2.7 Index and ledger

- Add this plan to `.agents/slop/plans/README.md` under the docs-site table,
  status `implemented — …` after §4 passes. The `4xx` block is full; `582` is
  the next free number.
- Add and tick the task in `TODO.md` under the docs-site workstream.

## 3. Test plan

### 3.1 `apps/docs/src/lib/live-scenes.test.ts` (new)

- Every `LIVE_SCENES` entry produces exactly one row, in contract order.
- Every record scene's `href` is its component page; every composed scene's is
  `SCENE_PAGE`.
- Every gesture scene has the exact `SCENE_INTERACTION` sentence; every static
  scene says "Mounts in the state it documents."
- The gesture words cover each `SceneStep` kind: assert the four measured
  phrases `right click`, `press end`, `type`, `wheel up` occur on their scenes.
- No row has an empty `href`.

### 3.2 `apps/docs/src/lib/scene-search.test.ts` (new)

Structural:

- `sceneSearchEntries.length` equals the number of gesture scenes; every entry
  URL is a row's `href`; every gesture scene appears once.
- Every entry's content contains its `SCENE_INTERACTION` sentence and its
  derived gesture words.
- `scenesIndexEntry.index.content` contains every `LIVE_SCENES` key, including
  static ones.
- No entry URL collides with another generated document:
  `sceneSearchEntries.every((entry) => entry.index.url !== "/docs/components/icon")`.
- `promotedNameRank(entry, "click")` is `undefined` for a scene entry: a single
  plain word is never promoted.

Integration through the real `search()` (the same call `/api/search` uses):

- `right click` → first `/docs/components/context-menu`;
- `wheel up` → first `/docs/components/message-scroller`;
- `press end` → first `/docs/components/slider`;
- `type a name` → first `/docs/components/text-input`;
- `type the workspace name` → first `/docs/patterns/confirmation-flow`;
- `open the palette` → first `/docs/patterns/command-palette`;
- `live scene` → first `/docs/previews`;
- `type a name` lists `/docs/components/text-input` once.

Negative guards, so the new names cannot swallow existing subjects:

- `input` still reaches `/docs/components/text-input`? Use the existing proven
  page instead: `button` still first `/docs/components/button`;
- `modal` still first `/docs/components/dialog` (alias rule, plan 566);
- `focus ring` still first `/docs/tokens-api` (promoted-name rule, plan 569);
- a component with **no** live scene (`icon`, `button`) keeps its title rank.

Use the same `MAX_SEARCH_LIMIT` and real index as `search.test.ts`; the suite's
cold budget is 120 s (plan 468).

### 3.3 Two-direction proof

After the new tests pass:

1. Remove `sceneSearchEntries` from `generatedEntries` (keep the previews
   entry), run `nub x vitest run src/lib/scene-search.test.ts`; the six
   instruction queries fail by name. Restore.
2. Remove `scenesIndexEntry`; `live scene` fails. Restore.
3. Rename one `SCENE_INTERACTION` sentence without changing the code; the
   structural test fails on that scene. Restore.
4. Change one gesture `deltaY` sign; `wheel up` fails (the derived words move
   to `wheel down`). Restore.

Record the exact failing lines in the plan's status row / commit message.

## 4. Commands and expected results

Run from the repository root unless stated.

| Command | Expected |
| ------- | -------- |
| `cd apps/docs && nub x vitest run src/lib/live-scenes.test.ts` | all tests pass |
| `cd apps/docs && nub x vitest run src/lib/scene-search.test.ts` | all tests pass |
| `nub run --filter docs test` | 97 files / 684+ tests, exit 0 |
| `nub run --filter docs check-types` | exit 0 |
| `nub run check` | `check:tests`, lint, format and types green |
| `nub run --filter docs build && nub run --filter docs smoke:build` | the 98-page crawl passes; `live scene` answers with `/docs/previews` |

`smoke:build`'s query set should gain `live scene` (the production index, not
only the unit call). Add it to `apps/docs/scripts/smoke-build.ts` beside the
existing production queries and run the smoke.

## 5. STOP conditions

- A gesture sentence is longer than the search index's practical result
  snippet. Do not truncate the sentence in `preview/scenes.ts`; the page prints
  it verbatim. If the result reads badly, index a shorter derived gesture phrase
  as the promoted name and keep the full sentence in `content`.
- A query matches two different scenes equally. Record the measured tie in this
  plan and keep the existing tie-break (shorter title, then index order); do not
  add a hand-written priority list.
- `generatedByUrl` refuses a second entry for a URL. Stop and report; the fix is
  the per-URL name merge described in §2.4, not deleting the Icons document.
- A scene has no page (`href` would be null). That is already a failure in
  `scene-index.test.tsx`; do not invent `/docs/previews` as a fallback. Stop and
  report the scene.
- The new entries change a result the existing suite proves (`Spinner`,
  `chevrons-up-down`, `destructiveSoft`, `modal-focus-trap`). Stop: the names
  are too broad. Narrow the promoted names to the exact interaction phrase.

## 6. Acceptance

- Every gesture scene's instruction reaches the page that mounts it, measured
  through the real `search()`.
- `/docs/previews` is the first result for `live scene`.
- Single plain words are not promoted; the five existing name rules still pass.
- The page that renders the list names the behaviour, and `apps/docs/README.md`
  records the source and the collision rule.
- The production build answers `live scene` from `/api/search`.
