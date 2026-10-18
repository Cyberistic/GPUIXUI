# 493 — Live scenes for the remaining interactive form controls

**Phase:** F (docs showcase completeness) · **Owner:** docs-site
**Depends on:** 455 (live wasm surface), 456 (interaction scenes), 475 (sized
canvas), 486 (gesture proof), 492 (choice-control scenes), 451 (tier-A previews)
**Status:** implemented

## 1. Why this plan exists

`TODO.md` records the one docs-site gap plan 492 left open: **radio group,
slider, range slider, search input and the two text fields still show only their
tier-A rest state.** The renderer, the gesture machinery and the
before/after assertion already exist (plans 486, 492); what those pages lack is
a composition whose documented state only a real gesture produces.

The 492 scenes drive a click. These six need two more real inputs the published
renderer's automation API already exposes and the smoke does not yet use:

- **keyboard** — a slider's documented "keyboard" path (`press` exists; the
  slider's own contract is `Home`/`End`/arrows in `core/value.ts`);
- **typing** — a text field's whole point (`Locator.fill` types through GPUI's
  keyboard/IME path; `press` already proves that path works in the hotkey
  scene).

This plan extends `SceneStep` with those two step kinds, adds six scenes, and
leaves every component untouched.

## 2. Goal and acceptance

| Scene / page | Composition | Gesture the smoke drives | Text the smoke expects |
| ------------ | ----------- | ----------------------- | ---------------------- |
| `radio-group` | a controlled `RadioGroup` with three options, nothing selected | click the **Team** option by its text | `Team plan selected` |
| `slider` | a controlled `Slider` (`defaultValue` 40, `label="Volume"`, `testId="scene-slider"`), plus a line when the value is `100` | `press` `end` on `scene-slider` | `Volume at maximum` |
| `range-slider` | a controlled `RangeSlider` (`[0, 100]`, `testId="scene-range"`), plus a line when the lower bound is above the minimum | click `scene-range` (the track centre moves the nearer thumb) | `Range narrowed` |
| `search-input` | a controlled `SearchInput` (`testId="scene-search"`), plus a line when the query is `grid` | `fill` `grid` into `scene-search` | `Searching for grid` |
| `text-input` | a controlled `Input` (`label="Name"`, `testId="scene-name"`), plus a line when the value is `ada` | `fill` `ada` into `scene-name` | `Typed ada` |
| `text-area` | a controlled `TextArea` (`label="Note"`, `testId="scene-note"`), plus a line when the value is `ship it` | `fill` `ship it` into `scene-note` | `Draft saved` |

Acceptance:

- the six pages render tier **L** (the record declares `liveScene`) and keep
  their tier-A illustration beneath it;
- `smoke:preview` prints `scene radio-group opened by 1 step(s)`, likewise the
  other five, and exits `0`;
- every expectation is proven absent **before** the gesture and present after
  it;
- `docs/preview-strategy.md`, `apps/docs/README.md` and the smoke script's
  header name the real scene counts (30 scenes, 14 gesture-driven);
- `nub run --filter docs test`, `nub run check`, `nub run lint`,
  `nub run test` and `nub run --filter docs smoke:preview --no-build` pass.

## 3. Exact changes

### 3.1 `apps/docs/preview/scenes.ts`

Add six keys to `LIVE_SCENES` after `"switch"`, in this order:

```ts
"radio-group",
slider,
"range-slider",
"search-input",
"text-input",
"text-area",
```

Add their `SCENE_TEXT`:

```ts
"radio-group": "Team plan selected",
slider: "Volume at maximum",
"range-slider": "Range narrowed",
"search-input": "Searching for grid",
"text-input": "Typed ada",
"text-area": "Draft saved",
```

Extend `SceneStep` with the two kinds the smoke is missing. The existing three
stays as they are; the new arms are additive:

```ts
  | { readonly kind: "click-text"; readonly text: string; readonly within: string }
  | { readonly kind: "fill"; readonly testId: string; readonly text: string };
```

Add their gestures and instructions:

```ts
"radio-group": [
  { kind: "click-text", text: "Team", within: "scene-radio" },
],
slider: [{ kind: "press", testId: "scene-slider", keys: "end" }],
"range-slider": [{ kind: "click", testId: "scene-range" }],
"search-input": [{ kind: "fill", testId: "scene-search", text: "grid" }],
"text-input": [{ kind: "fill", testId: "scene-name", text: "ada" }],
"text-area": [{ kind: "fill", testId: "scene-note", text: "ship it" }],

"radio-group": "Click the Team option to select it.",
slider: "Focus the volume slider and press End.",
"range-slider": "Click the track to move its nearer thumb.",
"search-input": "Type a search term into the field.",
"text-input": "Type a name into the field.",
"text-area": "Type a note into the field.",
```

Rules the existing guards enforce: an instruction must not contain the expected
text, and every `testId` step must occur in `scene-views.tsx`. The new
`click-text` step gets the matching rule (§3.5).

### 3.2 `apps/docs/scripts/smoke-live-preview.ts`

`runStep` currently builds one locator (`getByTestId`). Resolve the locator by
kind, then the action:

```ts
const target =
  step.kind === "click-text"
    ? `globalThis.gpuix.getByText(${JSON.stringify(step.text)})`
    : `globalThis.gpuix.getByTestId(${JSON.stringify(step.testId)})`;
const action =
  step.kind === "hover"
    ? `await ${target}.hover()`
    : step.kind === "fill"
      ? `await ${target}.fill(${JSON.stringify(step.text)})`
      : step.kind === "press"
        ? `await ${target}.press(${JSON.stringify(step.keys)})`
        : `await ${target}.click(${step.button === undefined ? "" : `{ button: ${step.button} }`})`;
```

`click-text` falls into the click arm. Update the file's header comment and the
final timeout comment: **30 scenes, 14 of them gesture-driven**.

### 3.3 `apps/docs/preview/scene-views.tsx`

Import `RadioGroup`, `Slider`, `RangeSlider`, `Input`, `TextArea` from
`@gpuixui/primitives` (extend the existing import) and `SearchInput` from
`@gpuixui/components/search-input`.

Add six views after `SwitchScene`. Every one is controlled, starts in the
resting state a still shows, and paints the expected line **only** in the state
the gesture produces:

```tsx
const RadioGroupScene = (): ReactElement => {
  const [plan, setPlan] = useState("");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Billing plan</Text>
      <Text role="caption" tone="muted">
        The real RadioGroup, nothing selected. Pick an option to see the check
        and the caller's line.
      </Text>
      <RadioGroup
        label="Plan"
        value={plan}
        onChange={setPlan}
        testId="scene-radio"
        options={[
          { value: "free", label: "Free" },
          { value: "team", label: "Team" },
          { value: "enterprise", label: "Enterprise" },
        ]}
      />
      {plan === "team" ? <Text role="body">Team plan selected</Text> : null}
    </Stack>
  );
};

const SliderScene = (): ReactElement => {
  const [volume, setVolume] = useState(40);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Playback</Text>
      <Text role="caption" tone="muted">
        The real Slider at 40. Press End on it to reach the maximum.
      </Text>
      <Slider
        label="Volume"
        value={volume}
        onChange={setVolume}
        testId="scene-slider"
        formatValue={(value) => `${value}%`}
      />
      {volume === 100 ? <Text role="body">Volume at maximum</Text> : null}
    </Stack>
  );
};

const RangeSliderScene = (): ReactElement => {
  const [band, setBand] = useState<readonly [number, number]>([0, 100]);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Price filter</Text>
      <Text role="caption" tone="muted">
        The real RangeSlider at its full span. Click the track to move the
        nearer thumb.
      </Text>
      <RangeSlider
        label="Price"
        value={band}
        onChange={setBand}
        testId="scene-range"
      />
      {band[0] > 0 ? <Text role="body">Range narrowed</Text> : null}
    </Stack>
  );
};

const SearchInputScene = (): ReactElement => {
  const [query, setQuery] = useState("");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Component search</Text>
      <Text role="caption" tone="muted">
        The real SearchInput, empty. Type into it to see the clear control and
        the caller's line.
      </Text>
      <SearchInput
        testId="scene-search"
        placeholder="Search components"
        value={query}
        onValueChange={setQuery}
      />
      {query === "grid" ? <Text role="body">Searching for grid</Text> : null}
    </Stack>
  );
};

const TextInputScene = (): ReactElement => {
  const [name, setName] = useState("");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Account</Text>
      <Text role="caption" tone="muted">
        The real Input, empty. Type a name into it.
      </Text>
      <Input
        label="Name"
        testId="scene-name"
        value={name}
        onChange={setName}
      />
      {name === "ada" ? <Text role="body">Typed ada</Text> : null}
    </Stack>
  );
};

const TextAreaScene = (): ReactElement => {
  const [note, setNote] = useState("");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Release note</Text>
      <Text role="caption" tone="muted">
        The real TextArea, empty. Type a note into it.
      </Text>
      <TextArea
        label="Note"
        testId="scene-note"
        minRows={3}
        value={note}
        onChange={setNote}
      />
      {note === "ship it" ? <Text role="body">Draft saved</Text> : null}
    </Stack>
  );
};
```

Map all six in `LIVE_SCENE_VIEWS`. Fix the stale comment above `TooltipScene`
("The five gesture scenes (plan 486)") to say the gesture scenes are those
`SCENE_GESTURE` lists, so it cannot go stale again.

Lower-case fill text is deliberate: `Locator.fill` types each character as a
key without a shift modifier, so an upper-case letter would arrive folded. The
`click-text` target is a **label**, not typed text, so `Team` keeps its case.

### 3.4 `apps/docs/src/component-meta/entries.ts`

Add `liveScene` to six `delivered(...)` records, changing nothing else:

| slug | line to add |
| ---- | ----------- |
| `radio-group` | `liveScene: "radio-group",` |
| `slider` | `liveScene: "slider",` |
| `range-slider` | `liveScene: "range-slider",` |
| `search-input` | `liveScene: "search-input",` |
| `text-input` | `liveScene: "text-input",` |
| `text-area` | `liveScene: "text-area",` |

### 3.5 `apps/docs/src/components/preview/scene-contract.test.ts`

- Add the six slug→scene pairs to `interactionScenes`.
- The existing "targets a test id the scene really renders" rule must skip
  `click-text` steps (they carry no `testId`): filter the steps by
  `step.kind !== "click-text"` before reading `step.testId`.
- Add one rule beside it:

  ```ts
  it("targets text the scene really renders, inside the control it names", () => {
    // A quoted literal or a JSX child — not a substring of a longer string.
    const painted = (text: string): boolean =>
      viewSource.includes(`"${text}"`) || viewSource.includes(`>${text}<`);
    const missing = LIVE_SCENES.flatMap((scene) =>
      (SCENE_GESTURE[scene] ?? []).flatMap((step) =>
        step.kind !== "click-text" ||
        (painted(step.text) && viewSource.includes(`testId="${step.within}"`))
          ? []
          : [`${scene}: ${step.within} / ${step.text}`],
      ),
    );
    expect(missing).toEqual([]);
  });
  ```

  The substring form was measured weak: a target of `Team plan` passed on the
  literal `Team plan selected` the gesture is meant to reveal, so the rule
  accepts only a whole quoted literal or JSX child. The `within` scope is also
  load-bearing: measured 2026-10-18, the reader's instruction ("Click the Team
  option…") is itself a painted text node, so an unscoped `getByText("Team")`
  matched the instruction and the label.

- The "never names the text the gesture is supposed to reveal" rule keeps
  working: no instruction contains its expectation.

### 3.6 `docs/preview-strategy.md`

- Tier L row: add Radio groups, Sliders, Range sliders, Search inputs, Text
  inputs and Text areas to the parenthetical list.
- `Twenty-four scenes ship today` → `Thirty scenes`, adding the six names.
- "Eight scenes document state only a gesture produces" → `Fourteen scenes`, and
  reword the sentence so it covers opened surfaces, checked paints, a value a
  key reaches and text a reader types.
- Gesture table: add six rows —
  radio group (click an option → the selection and the caller's line),
  slider (focus the track, press End → the maximum),
  range slider (click the track → the nearer thumb moves),
  search input (type → the query reaches the caller),
  text input (type → the value reaches the caller),
  text area (type → the draft reaches the caller).
- Add one sentence: the smoke types through the renderer's own keyboard/IME
  path (`Locator.fill`), and lower-case text is deliberate because a typed
  character arrives without a shift modifier.

### 3.7 `apps/docs/README.md`

Update the tier-L bullet: the six new pages, `Thirty` scenes, and that the
gesture set now also covers keyboard and typed input (with the `click-text`
locator for an option that owns no test id).

### 3.8 `TODO.md` and the plan index

- Tick the open docs-site row ("Live scenes for the remaining interactive form
  controls …"), naming this plan and the new counts.
- Bump the docs-site progress count (`93/93` → `94/94`) — or leave the
  denominator unchanged if the row was already counted as an open item.
- Add this plan to `.agents/slop/plans/README.md` (docs block), then set its
  status to implemented when §6 is filled.

## 4. Test plan

Unit guards (source-level, no browser):

1. `scene-contract.test.ts` — fails when a scene's expectation is removed from
   its view, when a `testId` target is renamed, when a `click-text` target is
   absent from the view, when a record loses `liveScene`, or when an instruction
   names the expected text.
2. `registry.test.ts` — a record may only name a scene in `LIVE_SCENES`.
3. `docs-checks.test.ts` / `preview-gaps.test.ts` — every page still has a live
   scene or illustration; the gap set stays empty.

Runtime proof:

4. `nub apps/docs/scripts/smoke-live-preview.ts --no-build` — the six new scenes
   print `opened by 1 step(s)`, their text is absent before the gesture and
   present after, and every page loads its iframe; exit `0`.

Two-direction proofs to run and record in §6:

- **A gesture that is removed** — drop `slider`'s step and instruction, rebuild
  the preview, run `smoke:preview`: it must fail naming `slider` and the text it
  saw in the tree. Restore → exit `0`.
- **A scene that starts in the revealed state** — start `TextInputScene` at
  `"ada"`, rebuild, run: the before-absence assertion must fail. Restore.
- **A typed target that drifts** — rename `scene-search` in the fill step:
  `scene-contract.test.ts` must fail on the missing test id. Restore.
- **A `click-text` target that is not rendered** — change the radio step text to
  `Team plan` (not a label): `scene-contract.test.ts` must fail on the text
  rule. Restore.

## 5. Commands and expected results

```sh
nub run --filter docs test                 # all suites pass, including the new pairs
nub run --filter docs check-types          # 0
nub run --filter docs build:preview        # emits public/gpuix-preview
nub apps/docs/scripts/smoke-live-preview.ts --no-build
# expected: 30 scenes; six new scenes "opened by 1 step(s)"; exit 0
nub run check                              # test quality, lint, format, types
nub run lint                               # 0
nub run test                               # every workspace suite
```

## 6. Measured results

Run on this host (Intel macOS, wasm renderer in headless Chrome), 2026-10-18.

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 52 files / **343 tests** pass (one new guard) |
| `nub run --filter docs check-types` | pass |
| `nub run --filter docs smoke:preview` | **exit 0** — 30 scenes, **14 gesture-driven**; the six new scenes each `opened by 1 step(s)` on a 640×520 canvas; 30 page iframes loaded (606×358) with `mode=dark`; light/dark Button capture differs; the platform toggle reaches the iframe |
| `nub run check` | pass (test quality, oxlint, oxfmt, types) |
| `nub run lint` | pass |
| `nub run test` | exit 0 (docs 343; every workspace suite) |
| `nub run --filter docs smoke:build` | exit 0 (production crawl) |
| `nub run --filter docs smoke:browser` | exit 0 (hydrated previews) |

Per-scene output from the green run:

```
scene radio-group opened by 1 step(s) — 640x520 canvas, 7 text nodes
scene slider opened by 1 step(s) — 640x520 canvas, 4 text nodes
scene range-slider opened by 1 step(s) — 640x520 canvas, 4 text nodes
scene search-input opened by 1 step(s) — 640x520 canvas, 6 text nodes
scene text-input opened by 1 step(s) — 640x520 canvas, 4 text nodes
scene text-area opened by 1 step(s) — 640x520 canvas, 4 text nodes
```

Two-direction proofs, each measured:

1. **A gesture that is removed.** Dropping `slider`'s step and instruction (and
   rebuilding the preview) → `smoke:preview` failed
   `FAIL live scene slider: expected "Volume at maximum" in the GPUI tree (["Playback","The real Slider at 40. Press End on it to reach the maximum."])`,
   exit `1`. Restored → exit `0`.
2. **A scene that starts in the revealed state.** Starting `TextInputScene` at
   `"ada"` → `FAIL live scene text-input: "Typed ada" was painted before the
   gesture; the scene opens itself`, exit `1`. Restored → exit `0`.
3. **A typed target that drifts.** Renaming the fill target to
   `scene-search-missing` → `scene-contract.test.ts` failed
   `targets a test id the scene really renders` with
   `["search-input: scene-search-missing"]`. Restored → pass.
4. **A `click-text` target that is only a substring.** Pointing the radio step at
   `"Team plan"` (a substring of the expectation `Team plan selected`) first
   *passed* the substring form of the guard. The rule now accepts only a whole
   quoted literal or JSX child; the same change then failed
   `["radio-group: scene-radio / Team plan"]`. Restored → pass.

Three measured facts shaped the implementation:

- **`getByText` is substring-based and the reader's instruction is painted
  text.** `getByText("Team")` matched both the label and the instruction
  "Click the Team option to select it." (`Locator matched 2 elements`), so a
  `click-text` step carries a `within` test id and the locator is scoped to the
  control. Measured tree: `[{"id":1,"type":"text","text":"Click the Team option
  to select it."},…,{"id":16,"type":"text","text":"Team"}]`.
- **Typing works through GPUI's own keyboard/IME path.** `Locator.fill` focuses
  the field, sends select-all then one keystroke per character; all three text
  scenes reached their exact values (`grid`, `ada`, `ship it`). A character
  arrives without a shift modifier, hence lower-case fill text.
- **Keyboard reaches the slider.** `press` `end` on `scene-slider` focused the
  track and the component's own `decideValueKey` moved the value to `max`, so
  the keyboard path is proven rather than assumed. The range slider is driven by
  a click on the track: the nearest end to the pointer is the lower bound, which
  is the documented `nearestEnd` rule; the scene's predicate is
  `band[0] > 0`, so it does not depend on the exact clicked value.

## 7. STOP conditions

- **`Locator.fill` does not reach the field** (measured, not assumed): keep that
  page at its tier-A illustration, remove its scene/gesture from this plan's
  tables, record the measurement (the tree the scene painted) and raise a
  cross-team `TODO.md` row. Do not type by hard-coding `defaultValue` and call
  it a gesture; do not swap the real component for a raw GPUix `<input>`.
- **`click-text` cannot hit the radio option** (ambiguous or unpainted text):
  keep `radio-group` at tier A, record the tree, and raise a `TODO.md` row
  asking `packages/primitives` for a per-option `testId`. Do not edit
  `packages/primitives` from this workstream and do not fall back to clicking
  the group centre, whose row under the pointer is a layout accident.
- **`press` `end` does not move the slider**: measure whether the key reaches
  the focused track; if it does not, record it and fall back to the documented
  click path (a click on the track) with an expectation that click alone
  produces. Never remove the before-absence assertion.
- **The range slider's clicked value is not above the minimum**: the scene's
  predicate is `band[0] > 0`; if a click does not move the nearer thumb, record
  the tree and leave the page at tier A.
- **A scene paints its expectation before the gesture**: the scene is wrong, not
  the guard. Remove the initial value; never delete the before check.
- **A component lacks the test id the scene needs**: stop and record the ask in
  `TODO.md`.

## 8. Acceptance checklist

- [ ] six scenes, six record changes, six contract pairs
- [ ] `SceneStep` gains `click-text` and `fill`, and `runStep` drives both
- [ ] expectation text absent before / present after, proven by `smoke:preview`
- [ ] `preview-strategy.md`, `apps/docs/README.md` and the smoke header agree
      with `LIVE_SCENES` (30 scenes, 14 gesture-driven)
- [ ] two-direction proofs recorded in §6
- [ ] `TODO.md` row ticked and the plan index updated
