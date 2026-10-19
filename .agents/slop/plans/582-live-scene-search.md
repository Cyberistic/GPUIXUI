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

### 2.0 `apps/docs/preview/scene-contract.ts` (new) and `preview/scenes.ts`

`preview/scenes.ts` imports `FORM_MESSAGE` from `form-scene.ts`, which imports
`effect/Schema`. The search route is server code, so importing `scenes.ts`
there puts `effect` in the server bundle. Move the dependency-free half to
`preview/scene-contract.ts`:

- `LIVE_SCENES`, `LiveScene`, `isLiveScene`;
- `SCENE_PAGE`, `SCENE_LABEL`;
- `SceneStep`, `SCENE_GESTURE`, `SCENE_INTERACTION`;
- `SCENE_TEXT_IS_SCENE_PROSE`.

`scenes.ts` keeps `SCENE_TEXT` and `SCENE_STEP_TEXT` (which needs
`FORM_MESSAGE`) and re-exports every moved symbol, so no existing importer
changes. `live-scenes.ts` imports the contract module. Update the two tests and
the template page that name `preview/scenes.ts` as a scene file (§3).

### 2.1 `apps/docs/src/lib/live-scenes.ts` (new)

Move the scene-row derivation out of the React component so both the page table
and the search document read one function:

```ts
export interface LiveSceneRow {
  readonly scene: LiveScene;
  readonly title: string;
  readonly href: string | null;
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
- `href` stays nullable because `SCENE_PAGE` is partial; `scene-index.test.tsx`
  and the new suite both fail when a scene has no page, and the search document
  filters null rather than inventing a URL.
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

```ts
/** `/docs/previews` itself, which lists every scene. */
export const scenesIndexEntry: GeneratedSearchEntry;

/** The instruction each gesture scene's page shows, keyed by that page. */
export const sceneInstructionByUrl: ReadonlyMap<string, string>;

/** One page candidate per scene whose instruction matches the query. */
export const sceneInstructionHits: (
  query: string,
) => ReadonlyArray<SortedResult>;

/** `3` when every meaningful query word prefixes a word of the instruction. */
export const sceneInstructionRank: (
  instruction: string | undefined,
  query: string,
) => number | undefined;
```

`scenesIndexEntry` is the generated surface's **one** document, at
`/docs/previews`:

- `title: "Live scenes"`, names `["Live scenes"]`;
- content = every row (`scene` key, title, interaction, gesture), including the
  static scenes;
- keywords = every scene key and title.

There is deliberately **no document per scene**. The registry search index
uses `url` as the document key, and a component page already has its registry
document; adding a second one at the same URL made the built server answer
**HTTP 500 on every query** (measured in §3.3). The per-page answer comes from
the synthesized candidate below, not a duplicate document.

`sceneInstructionRank`:

- lowercases and splits both strings into words;
- drops words of one character and stop words (`the`, `to`, `then`, …) so
  `click the` cannot rank 26 scenes;
- requires at least two meaningful query words, so a single plain word is never
  promoted;
- returns `SCENE_MATCH_RANK = 3` when every query word prefixes an instruction
  word, otherwise `undefined`.

Rank `3` is deliberate: it beats prose and a page title's **token** match
(`TOKEN_MATCH_RANK` is 4, which is why `type the workspace name` reached
Workspace), but loses to an exact or prefix title. `sceneInstructionHits`
synthesizes a page candidate for each matching scene, the rule
`pageDescriptionHits` uses, so **the lexical index does not need to return the
document** for the query to find the page.

All titles, interactions and gestures come from `preview/scene-contract.ts`
and the registry. No sentence is authored twice.

### 2.4 `apps/docs/src/lib/search.ts`

- Append `scenesIndexEntry` to `generatedEntries`, so `live scene` reaches the
  index page.
- `mergeResults` takes an optional `scenes: ReadonlyMap<string, string>` (an
  empty default keeps the fixture tests independent of the content tree) and
  adds `sceneInstructionRank(scenes.get(result.url), query)` to a candidate's
  ranks.
- `search()` passes `sceneInstructionByUrl` and appends
  `sceneInstructionHits(query)` before the registry results.
- **No duplicate URL:** the scene index is the only added document. The Icons
  catalogue keeps `/docs/components/icon`, and no scene document competes for
  it. If a future scene needs its own document, it must merge into the existing
  URL's document rather than insert a second one.
- Do **not** add these words to `componentSearchIndex` as a second path: the
  synthesized candidate is the one mechanism, and the index page carries the
  full list.

### 2.5 `apps/docs/content/docs/previews.mdx`

Add one paragraph under `## Every live scene`:

> The sentence above each surface is indexed, so a reader who remembers the
> gesture can search for it: `wheel up` reaches Message scroller, `press end`
> reaches Slider and `right click` reaches Context menu. A single word is never
> promoted by this rule, so `input` and `click` keep the page that owns them.

### 2.6 `apps/docs/README.md`

Add a paragraph to the **Search** section after plan 578's scene-index
paragraph: the scene instruction is indexed from the pure scene contract, the
`/docs/previews` document is the generated surface's one document,
`sceneInstructionRank` scores the phrase above prose, and a second document at a
component URL is never added (the duplicate URL 500 is recorded).

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

- `scenesIndexEntry.index.content` contains every `LIVE_SCENES` key and every
  `SCENE_INTERACTION` sentence, including static scenes.
- `sceneInstructionHits(row.interaction)` returns one candidate at the page
  that mounts every gesture scene.
- The generated document is not at a component-page URL (no duplicate document
  in the registry index).
- `sceneInstructionRank` returns `undefined` for a one-word query and for
  `click the` (stop words only), `3` for two meaningful words that both match,
  and `undefined` when one word does not.

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

- `button` still first `/docs/components/button`;
- `modal` still first `/docs/components/dialog` (alias rule, plan 566);
- `focus ring` still first `/docs/tokens-api#functions` (promoted-name rule,
  plan 569);
- a component with **no** live scene (`icon`, `button`) keeps its title rank.

Use the same `MAX_SEARCH_LIMIT` and real index as `search.test.ts`; the suite's
cold budget is 120 s (plan 468).

### 3.3 Two-direction proof

Measured on `afdd7626` with the implementation below:

1. Force `sceneInstructionRank` to return `undefined`: **9 tests fail** — the
   synthesized-candidate case, the phrase-rank unit case and the six instruction
   queries plus the one-result-per-page case. Restore, 14/14 pass.
2. Remove `scenesIndexEntry` from `generatedEntries`: `live scene` fails.
   Restore, 14/14 pass.
3. Rename Slider's `SCENE_INTERACTION` from "press End" to "press Home":
   `press end` fails by query. Restore.
4. Flip Message scroller's wheel `deltaY` to negative: the gesture-words test
   fails because the derived phrase becomes `wheel down`. Restore.
5. Add a second document at a component page's URL (the first implementation):
   the unit suite passed but the built server answered **HTTP 500 on every
   query**, because the registry index keys documents by URL. The fix is the
   single index page plus synthesized candidates; `smoke:build` is the proof.

Record the exact failing lines in the status row / commit message.

## 4. Commands and expected results

Run from the repository root unless stated.

| Command | Expected |
| ------- | -------- |
| `cd apps/docs && nub x vitest run src/lib/live-scenes.test.ts` | all tests pass |
| `cd apps/docs && nub x vitest run src/lib/scene-search.test.ts` | all tests pass |
| `nub run --filter docs test` | 97 files / 696 tests, exit 0 |
| `nub run --filter docs check-types` | exit 0 |
| `nub run check` | `check:tests`, lint, format and types green |
| `nub run --filter docs build && nub run --filter docs smoke:build` | the 98-page crawl passes; `wheel up` and `live scene` answer in the production index |

`smoke:build`'s query set gains `wheel up` (a scene instruction) and
`live scene` (the scene index) beside the existing production queries.

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
