# 508 — Every stateful page shows a live state

**Status:** planned (2026-10-18) · **Phase:** F (showcase completeness) ·
**Owner:** docs-site
**Depends on:** `410`, `412`, `455`, `456`, `471`, `486`, `492`, `493`, `497`,
`505`; the shipped `@gpuixui/components` records.

## 1. The defect this plan fixes

Twenty-one delivered records declare `pattern: "stateful"`: a component whose
whole point is a state it owns or drives. **Six of them have no live scene**, so
the page shows a tier-A rest illustration, a tier-V native-coverage notice, and
no interactive proof of the state the page is about.

Measured from `apps/docs/src/component-meta/entries.ts` on 2026-10-18:

| Record | `pattern` | `liveScene` | The state a still cannot prove |
| ------ | --------- | ----------- | ------------------------------ |
| `list` | stateful | `null` | a selected row (and the caller's selection change) |
| `collapsible` | stateful | `null` | the content that only exists while open |
| `pagination` | stateful | `null` | the current page and the window moving |
| `time-picker` | stateful | `null` | a value an arrow key commits |
| `carousel` | stateful | `null` | the next slide replacing the first |
| `message-scroller` | stateful | `null` | pinned follow after a scroll and an append |

The site already proves the same kind of state for Tabs, Dialog, Combobox,
Slider, Text input and 31 other scenes (plans 456, 486, 492, 493, 497). A
stateful page without one is the same defect plan 486 fixed for interaction
pages: the reader is told what the component does and shown a frame in which the
state does not exist.

`message-scroller` is the one record that cannot gain a scene today. Its
documented state needs **two** events the scene grammar cannot express in one
run — the viewport must first be scrolled away from the tail, then an arrival
must increment the unread count before `MessageScrollerJumpToLatest` appears.
There is no `defaultScrollOffset`, and `SceneStep` has no wheel step. Its native
suite (`src/behaviour/message-scroller.test.tsx`) already drives the rule set.
The exception is written down rather than pretended away.

**One sentence for the plan's result:** five scenes ship; the sixth is a pinned,
reasoned exception; a new `stateful` record cannot ship without one or the other.

## 2. Files to change

All paths relative to the worktree root. **Do not edit `packages/*`,
`examples/*`, `apps/playground` or `docs/*` outside the one document named in
§2.7** — record those asks in `TODO.md` instead.

### 2.1 `apps/docs/preview/scenes.ts`

The scene table is JSX-free and three guards read it. Add five keys and their
rows; keep the existing style (double quotes, one key per line, alphabetical
where the current list is alphabetical).

1. `LIVE_SCENES` — append, after `"toggle"`:

   ```ts
   "list",
   "collapsible",
   "pagination",
   "time-picker",
   "carousel",
   ```

2. `SCENE_TEXT` — the exact string the smoke must find **after** the gesture and
   must not find before:

   | Scene | `SCENE_TEXT` |
   | ----- | ------------ |
   | `list` | `"Weekly report opened"` |
   | `collapsible` | `"Only failed runs are reported."` |
   | `pagination` | `"Showing results 31–40"` |
   | `time-picker` | `"Reminder at 10:30"` |
   | `carousel` | `"Pricing details on screen"` |

3. `SCENE_GESTURE` — the real gesture, through the renderer's automation API:

   ```ts
   list: [{ kind: "click-text", text: "Weekly report", within: "scene-list" }],
   collapsible: [{ kind: "click", testId: "scene-collapsible-trigger" }],
   pagination: [
     { kind: "click", testId: "scene-pagination-next" },
     { kind: "click", testId: "scene-pagination-next" },
     { kind: "click", testId: "scene-pagination-next" },
   ],
   "time-picker": [
     { kind: "click", testId: "scene-time-hours" },
     { kind: "press", testId: "scene-time-hours", keys: "up" },
   ],
   carousel: [{ kind: "click", testId: "scene-carousel-next" }],
   ```

   `press` keys go through `toKeystrokes`, which maps `up` to `ArrowUp`; the
   time picker's `handleKeyDown` matches `event.key === "up"` and adds an hour
   (`time-picker.tsx` lines 204–210). Do not invent a new step kind: every step
   above is one the smoke already drives for another scene.

4. `SCENE_INTERACTION` — one sentence per scene. It **must not contain** its own
   `SCENE_TEXT` (`scene-contract.test.ts` fails on a leak):

   ```ts
   list: "Click the weekly report to open it.",
   collapsible: "Open the advanced section.",
   pagination: "Press next three times to reach page four.",
   "time-picker": "Click the hour field, then press Up.",
   carousel: "Press the next control to see the second slide.",
   ```

### 2.2 `apps/docs/preview/scene-views.tsx`

Add five imports by **subpath** (never the package root — it re-exports Toast,
whose provider builds an Effect runtime):

```ts
import {
  Carousel,
  CarouselControl,
  CarouselSlide,
  CarouselTrack,
} from "@gpuixui/components/carousel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gpuixui/components/collapsible";
import { List, ListItem, ListItemTitle } from "@gpuixui/components/list";
import {
  Pagination,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@gpuixui/components/pagination";
import {
  TimePicker,
  TimePickerSegment,
  TimePickerSeparator,
} from "@gpuixui/components/time-picker";
```

Each view is a full surface: a `Stack` with an `h3`, a muted caption, the real
control and a state line that exists **only** in the documented state. The
surface is 640×360; keep every composition to three rows or fewer.

```tsx
const ListScene = (): ReactElement => {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Saved views</Text>
      <Text role="caption" tone="muted">
        The real List, with row selection. Click a view to open it.
      </Text>
      <List
        selectionMode="single"
        aria-label="Saved views"
        testId="scene-list"
        onValueChange={setOpened}
      >
        <ListItem value="weekly" textValue="Weekly report">
          <ListItemTitle>Weekly report</ListItemTitle>
        </ListItem>
        <ListItem value="blockers" textValue="Open blockers">
          <ListItemTitle>Open blockers</ListItemTitle>
        </ListItem>
        <ListItem value="releases" textValue="Release notes">
          <ListItemTitle>Release notes</ListItemTitle>
        </ListItem>
      </List>
      {opened === "weekly" ? (
        <Text role="body">Weekly report opened</Text>
      ) : null}
    </Stack>
  );
};

const CollapsibleScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Notification rules</Text>
    <Text role="caption" tone="muted">
      The real Collapsible. Its content does not exist while closed.
    </Text>
    <Collapsible>
      <CollapsibleTrigger testId="scene-collapsible-trigger">
        Advanced settings
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Text role="body">Only failed runs are reported.</Text>
      </CollapsibleContent>
    </Collapsible>
  </Stack>
);

const PaginationScene = (): ReactElement => {
  const [page, setPage] = useState(1);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Search results</Text>
      <Text role="caption" tone="muted">
        The real Pagination. Its window is derived from the page.
      </Text>
      <Pagination
        page={page}
        pageCount={5}
        onPageChange={setPage}
        testId="scene-pagination"
      >
        <PaginationPrevious testId="scene-pagination-previous" />
        <PaginationList />
        <PaginationNext testId="scene-pagination-next" />
      </Pagination>
      {page === 4 ? <Text role="body">Showing results 31–40</Text> : null}
    </Stack>
  );
};

const TimePickerScene = (): ReactElement => {
  const [time, setTime] = useState<string | null>("09:30");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Daily reminder</Text>
      <Text role="caption" tone="muted">
        The real TimePicker. Its arrows commit a new time.
      </Text>
      <TimePicker
        label="Reminder"
        value={time}
        onValueChange={setTime}
        testId="scene-time"
      >
        <TimePickerSegment segment="hours" />
        <TimePickerSeparator />
        <TimePickerSegment segment="minutes" />
      </TimePicker>
      {time === "10:30" ? <Text role="body">Reminder at 10:30</Text> : null}
    </Stack>
  );
};

const CarouselScene = (): ReactElement => {
  const [index, setIndex] = useState(0);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">What changed</Text>
      <Text role="caption" tone="muted">
        The real Carousel. Slides stay mounted; only the active one is displayed.
      </Text>
      <Carousel
        label="Release notes"
        value={index}
        onValueChange={setIndex}
        testId="scene-carousel"
      >
        <CarouselTrack>
          <CarouselSlide>
            <Text role="body">A new colour picker and a stepper.</Text>
          </CarouselSlide>
          <CarouselSlide>
            <Text role="body">Keyboard shortcuts in every menu.</Text>
          </CarouselSlide>
        </CarouselTrack>
        <CarouselControl
          direction="previous"
          testId="scene-carousel-previous"
        />
        <CarouselControl direction="next" testId="scene-carousel-next" />
      </Carousel>
      {index === 1 ? <Text role="body">Pricing details on screen</Text> : null}
    </Stack>
  );
};
```

Then add the five keys to `LIVE_SCENE_VIEWS`:

```ts
list: ListScene,
collapsible: CollapsibleScene,
pagination: PaginationScene,
"time-picker": TimePickerScene,
carousel: CarouselScene,
```

The type is `Readonly<Record<LiveScene, () => ReactElement>>`, so a missing view
is a type error, not a blank frame.

**Do not** assert text inside an inactive slide: `CarouselSlide` keeps every
slide mounted and hides the inactive ones with `display: none`. The state line is
the assertion, exactly as the checkbox and switch scenes already work.

### 2.3 `apps/docs/src/component-meta/entries.ts`

Add one option to each of the five `delivered(...)` records — in the options
object, beside `pattern` and before `runtime`:

| Slug | Line to add |
| ---- | ----------- |
| `list` | `liveScene: "list",` |
| `collapsible` | `liveScene: "collapsible",` |
| `pagination` | `liveScene: "pagination",` |
| `time-picker` | `liveScene: "time-picker",` |
| `carousel` | `liveScene: "carousel",` |

`scene-contract.test.ts` requires `liveScene === slug`, so the key is not free
choice. Find each record by its `delivered(` block; do not touch `status`,
`limitations` or `runtime`.

### 2.4 `apps/docs/src/components/preview/gaps.ts`

Add the measured exception beside the existing (empty) gap map:

```ts
/**
 * Stateful pages whose documented state no gesture step can reach yet (plan
 * 508). The map is the exception list, not a parking space: a scene that becomes
 * possible must move out of it, and `scene-contract.test.ts` proves both
 * directions against the real registry.
 */
export const STATEFUL_NO_LIVE_SCENE: ReadonlyMap<string, string> = new Map([
  [
    "message-scroller",
    "The pinned follow needs a scroll away from the tail and then an arrival; SceneStep has no wheel step and the viewport has no initial offset.",
  ],
]);
```

Update the file's header comment: the module now owns two measured sets — pages
with neither preview, and stateful pages with no scene.

### 2.5 `apps/docs/src/components/preview/scene-contract.test.ts`

Import `STATEFUL_NO_LIVE_SCENE` and add a `describe("stateful records")` block.
The first test is the measure that fails today (all six slugs); the second is the
stale-exception direction.

```ts
describe("stateful records", () => {
  const statefulWithoutScene = components.filter(
    (entry) => entry.pattern === "stateful" && entry.liveScene === null,
  );

  it("give every stateful record a live scene or a measured reason", () => {
    const missing = statefulWithoutScene.map((entry) => entry.slug);
    expect(missing.toSorted()).toEqual(
      [...STATEFUL_NO_LIVE_SCENE.keys()].toSorted(),
    );
  });

  it("write a reason for every stateful exception", () => {
    const empty = [...STATEFUL_NO_LIVE_SCENE].flatMap(([slug, reason]) =>
      reason.trim().length === 0 ? [slug] : [],
    );
    expect(empty).toEqual([]);
  });
});
```

### 2.6 `docs/preview-strategy.md` (the document this workstream owns)

1. Tier **L** row: append Lists / list items, Collapsible sections, Pagination,
   Time pickers and Carousels to the component list.
2. In "What is explicitly not claimed", the scene-total sentence becomes **41**
   (`41 scenes ship today — …`), and the component list gains the five names.
3. **Gestures are proved, not implied**: `14 scenes document state only a gesture
   produces` becomes **19**, and the table gains one row per new gesture scene:

   | Scene | Gesture the smoke drives | What it proves |
   | ----- | ------------------------ | -------------- |
   | Lists / list items | click a row by its label | the row paints selected and the caller sees the value |
   | Collapsible sections | click the trigger | the content is mounted only in the open state |
   | Pagination | press next three times | the current page and its window move |
   | Time pickers | click the hour field, press Up | an arrow key commits a new value |
   | Carousels | press the next control | the active slide replaces the first |

   `preview-gaps.test.ts` fails unless the row count equals the gesture count, so
   a missing row fails the suite.

4. Add one paragraph after the table:

   > **Message scroller is the one stateful page without a live scene.** Its
   > documented state is pinned follow after a scroll away from the tail and a
   > new arrival; the scene grammar has no wheel step and the viewport has no
   > initial offset, so a scene would be a frame that never leaves the tail. The
   > native suite proves the rule set; the exception is pinned in
   > `src/components/preview/gaps.ts`.

   Do **not** write a scene or gesture total in that paragraph; the counts above
   are derived by test.

### 2.7 `apps/docs/README.md`

In "Live GPUix surface (tier L)":

- append Lists / list items, Collapsible sections, Pagination, Time pickers and
  Carousels to the scene list;
- change `14 of those document state only a gesture produces` to **19**
  (`preview-gaps.test.ts` compares this digit with the code);
- leave the static-preview paragraph alone: those five pages keep their tier-A
  illustration, which the live scene sits above.

### 2.8 Ledgers

- `TODO.md`: one row under **Docs site workstream** (the text in §6), and the
  section counter `108/108` → `109/109`.
- `.agents/slop/plans/README.md`: add `508` to the docs-site table with the
  status `implemented` once the gates pass, and extend the free-number note to
  `500–508`.
- `PLAN.md` §4: decision **D35** — *a `stateful` record ships a live scene or a
  pinned, reasoned exception; the exception set is compared with the registry,
  not remembered.*

## 3. Commands and expected results

Run from the worktree root, in order. Do not claim a check passed without
running it.

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass, including the new stateful guard; previously 62 files / 424 tests |
| `nub run --filter docs check-types` | `fumadocs-mdx` + both `tsc --noEmit` runs exit `0`; a missing view is a type error |
| `nub run check` | exit `0` (test quality, lint, format, every workspace's types) |
| `nub run --filter docs smoke:build` | build + crawl exit `0` (the five pages already exist; no route changes) |
| `nub run --filter docs build:preview` | the five scenes compile into `public/gpuix-preview/` |
| `nub run --filter docs smoke:preview` | exit `0`; `list`, `collapsible`, `pagination`, `time-picker` and `carousel` each report `opened by N step(s)` with a sized canvas; 41 scenes and 41 component pages |
| `nub run --filter docs smoke:browser --no-build` | exit `0` — the five pages hydrate with the page's mode and platform |

`smoke:preview` needs Chrome; it is the only command that can prove the gesture
reaches the real renderer. If Chrome is missing it exits `2` — that is
**unverified**, never a pass.

## 4. Test plan

### 4.1 The new guard can fail today

Before any scene exists, `scene-contract.test.ts`'s stateful suite must fail with
the six current slugs:

```text
expected [ 'carousel', 'collapsible', 'list', 'message-scroller', 'pagination', 'time-picker' ]
to deeply equal [ 'message-scroller' ]
```

Record the exact message in §8. It is the measure this plan closes.

### 4.2 Two-direction proofs (make the break, run, restore, record the message)

1. **The guard catches a dropped record.** Remove `liveScene: "carousel"` →
   `give every stateful record a live scene or a measured reason` fails naming
   `carousel`. Restore.
2. **The guard catches a stale exception.** Add `"list"` to
   `STATEFUL_NO_LIVE_SCENE` while `list` has a scene → the same test fails with
   an extra key. Restore.
3. **A scene target cannot drift.** Rename `testId="scene-collapsible-trigger"`
   in the view only → `targets a test id the scene really renders` fails naming
   `collapsible: scene-collapsible-trigger`. Restore.
4. **The expectation cannot drift.** Change the list scene's state line to
   `Weekly view opened` → `keeps every expectation in the view that renders it`
   fails naming the stale string. Restore.
5. **A gesture cannot be forgotten.** Remove `SCENE_GESTURE.carousel` while
   keeping its interaction sentence → `tells the reader what to do for exactly
   the scenes that need it` fails (`described` has one more entry). Restore.
6. **The renderer proves the gesture.** With everything restored, run
   `smoke:preview`; then change the time-picker step key from `up` to `down` and
   run it again → `FAIL live scene time-picker: expected "Reminder at 10:30"
   after 2 gesture step(s)`; restore and re-run green.
7. **The before/after rule holds.** Temporarily initialise the list scene with
   `defaultValue="weekly"` and `opened` state `"weekly"` → the smoke reports
   `"Weekly report opened" was painted before the gesture`; restore.

### 4.3 What the tests must be able to catch

- a `stateful` record that loses its scene silently (guard, direction 1);
- an exception that outlives its reason (guard, direction 2);
- a smoke target or expectation that drifts from the view (directions 3, 4);
- a scene that opens itself, making its gesture prove nothing (direction 7);
- a gesture that does not reach the renderer (direction 6).

## 5. STOP conditions

- **A component does not mount on the wasm renderer** (the scene reports
  `failed` or `timeout`): STOP, record the scene and the renderer reason, and
  leave that record in `STATEFUL_NO_LIVE_SCENE` with that measured reason. Do not
  fake the state with a prop.
- **A gesture cannot reach the state with the five step kinds** (`hover`,
  `click`, `click-text`, `press`, `fill`): STOP for that scene; add a reason. Do
  not add a new step kind inside this plan — that is a separate change with its
  own smoke proof.
- **The state line is painted before the gesture** (a controlled value or a
  default opens the state): STOP; the scene must start in the rest state, or the
  gesture proves nothing.
- **A scene's text is not exactly one painted text node** (`getAllText` returns
  whole nodes, not substrings): split the line into its own `<Text>`; do not
  loosen the smoke.
- **A page with a new scene contradicts its prose** (a limitation says the state
  is not shown): correct the prose; `scene-contract.test.ts` already fails on the
  two denial phrases.
- **The change needs a path outside `apps/docs`, `docs/preview-strategy.md`,
  `TODO.md`, `PLAN.md` or `.agents/slop/plans/`**: record a TODO row; do not edit
  it.

## 6. Acceptance criteria

- Lists, Collapsible sections, Pagination, Time pickers and Carousels each open
  on the real wasm renderer in their documented state after a real gesture;
  the smoke proves the state is absent before the gesture and present after it.
- `message-scroller` is the only `stateful` record without a live scene, it has
  a written measured reason in `gaps.ts`, and a new `stateful` record cannot
  ship without one or the other (a failing test, proven in both directions).
- Every page that gained a scene keeps its native evidence (tier V) and its
  labelled tier-A illustration beneath it.
- `docs/preview-strategy.md` and `apps/docs/README.md` state the derived totals
  (41 scenes / 19 gestures) and list the new scenes; one gesture-table row exists
  per gesture scene.
- `nub run --filter docs test`, `check-types`, `check`, `smoke:build`,
  `smoke:preview` and `smoke:browser` pass; `TODO.md`, `PLAN.md` and the plan
  index are updated; commits are pushed to `origin/agent/docs-site`.

## 7. Why no `COMPONENTS.md` row

Every one of the five components already has an inventory row with `done`
status and a native suite; this plan adds documentation layers (a live scene and
a record field), not a library surface. No verdict in `COMPONENTS.md` changes.

## 8. Results

Implemented on `agent/docs-site`.

### What shipped

- Five live scenes, all gesture-driven: **Lists / list items** (click a row),
  **Collapsible sections** (click the trigger), **Pagination** (next three
  times), **Time pickers** (click the hour field, press Up) and **Carousels**
  (press the next control). Each composition is the real component; each page
  keeps its tier-V native coverage and tier-A illustration beneath the live
  surface.
- The five records declare `liveScene: "<slug>"`; `scene-contract.test.ts`
  gained a `stateful records` suite that compares the stateful records without a
  scene with `STATEFUL_NO_LIVE_SCENE` in both directions.
- `message-scroller` is the pinned exception: pinned follow needs a scroll away
  from the tail plus an arrival, `SceneStep` has no wheel step and the viewport
  has no initial offset. The reason lives in
  `apps/docs/src/components/preview/gaps.ts` and the paragraph on
  `docs/preview-strategy.md` points at it.
- `docs/preview-strategy.md` and `apps/docs/README.md` state the derived totals
  (**41 scenes / 19 gestures**), list the five scenes and carry one gesture-table
  row per gesture scene.

### Two-direction proofs

Each break was made, the suite or smoke run, and the file restored immediately.

| Break | Failure |
| ----- | ------- |
| `liveScene: "carousel"` removed from its record | `give every stateful record a live scene or a measured reason` — `expected [ 'carousel', 'message-scroller' ] to deeply equal [ 'message-scroller' ]` |
| `"list"` added to `STATEFUL_NO_LIVE_SCENE` | the same test — `expected [ 'message-scroller' ] to deeply equal [ 'list', 'message-scroller' ]` |
| Collapsible trigger `testId` renamed in the view | `targets a test id the scene really renders` — `[ "collapsible: scene-collapsible-trigger" ]` |
| The list state line renamed to `Weekly view opened` | `keeps every expectation in the view that renders it` — `[ 'list: Weekly report opened' ]` |
| `SCENE_GESTURE.carousel` removed while its instruction stayed | `tells the reader what to do for exactly the scenes that need it` — the described list gains `"carousel"` |
| Time-picker step key changed `up` → `down` | `FAIL live scene time-picker: expected "Reminder at 10:30" after 2 gesture step(s) (["Click the hour field, then press Up.","Daily reminder","The real TimePicker. Its arrows commit a new time.",":"])` |
| List scene opened itself (`defaultValue="weekly"`, initial state `"weekly"`) | `FAIL live scene list: "Weekly report opened" was painted before the gesture; the scene opens itself` |

### What changed beyond the plan

- **Three pages carried a stale denial.** The widened registry guard failed on
  `list.mdx`, `collapsible.mdx` and `pagination.mdx` — each ended its
  accessibility list with "No live scene ships for this component yet" — before
  the scenes existed. The bullets are removed; the guard is the same one plan
  493 added.
- **A scene's input test id is derived, not written.** `TimePickerSegment` builds
  `${testId}-${segment}`, so `scene-time-hours` never occurs as a literal
  `testId="…"` in the view. The target is pinned in `componentOwnedTargets`
  beside the date picker's `date-day-<iso>` exemption, and the guard proves the
  exemption is used.
- **`smoke:preview --no-build` cannot verify a preview-only edit.** The preview
  document is copied into `dist/` when the docs app builds, so a changed
  `preview/*.tsx` needs a full `smoke:preview` (or `build` first). The first
  proof attempt passed against the old `dist`; re-running without `--no-build`
  produced the expected before-gesture failure. Future plans that touch the
  preview project must not use `--no-build` to prove the change.

### Commands

- `nub run --filter docs test` → `62 passed (62)`, `426 passed (426)`
  (was `424`; two stateful tests added).
- `nub run --filter docs check-types` → exit `0` (both `tsc` runs).
- `nub run check` → exit `0` (test quality, lint, format, every workspace's
  types).
- `nub run lint` → exit `0`.
- `nub run test` → exit `0` (every workspace).
- `nub run --filter docs smoke:preview` → exit `0`; the five scenes report
  `opened by 1/1/3/2/1 step(s)` on a `640x520` canvas, and every scene page loads
  the iframe.
- `nub run --filter docs smoke:build` → exit `0`.
- `nub run --filter docs smoke:browser --no-build` → exit `0` (every preview
  page, both schemes; `?platform=win32` and `?platform=linux` included).
