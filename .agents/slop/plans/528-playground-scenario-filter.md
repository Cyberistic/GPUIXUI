# 528 — The playground finds its scenarios: a filter over the registry

| Field | Value |
| ----- | ----- |
| Status | landed — `shell-filter` 16 checks + `live-shell-filter` 13; suite `100 → 101` (3522 → 3538 checks), live `49 → 50` (999 → 1012), exit `0`; six mutation proofs (§5), results in §8 |
| Phase | F (playground usability; the app's own navigation) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `120` (the shell + registry), `151` (the sidebar is a scroll container), `182` (shell selection), `188` (native text entry), `345`/`390` (live key delivery), `526` (the window is the layout root) |
| Answers | the last usability gap in the playground's own deliverable: with 100 scenarios a flat sidebar is unscannable, and no probe has driven a **filtered registry** through the native editor |

## 1. Question

The playground's sidebar **is** the scenario registry (`src/scenarios/index.ts`),
which is what makes a drift between the UI and the smoke suite impossible. It
also means the sidebar has grown to 100 entries in a 260 px column: a human
looking for the crop probe scrolls and reads every title, and the docs'
scenario ids are the only way to jump.

A search field is the obvious answer, but the app is a GPUix tree, not a web
page, so the question is not "add an input" — it is:

1. Does a **controlled native `<input>`** in the shell update its value from
   synthetic keys, exactly as the shipped `TextInput` does (plan `188`)?
2. Can a filter over the registry mount/unmount sidebar entries without
   breaking the shell's selection, the stage, or the native scroll container
   (plans `151`, `182`)?
3. What happens when the selection is filtered out or nothing matches?
4. Does the same path hold in a **real window** (plans `189`, `345`), where the
   key goes to the focused editor and React runs its `onChange`?

The filter itself is a pure rule, so it gets unit tests; the two interactions
(typing + clearing, and selecting a filtered entry) get a headless scenario and
a live twin.

## 2. Source evidence (confirm in the run, do not assume)

- `apps/playground/src/app.tsx`: `Shell` owns `selected`, derives `current`
  with `Arr.findFirst` + `Option.orElse(Arr.head)`, and maps `list` into
  `nav-<id>` rows. The nav list is `overflowY: "scroll"` with `flexGrow: 1` and
  `minHeight: 0`; `shell-navigation` proves it scrolls.
- `apps/playground/src/scenarios/data-toolbar.tsx:284`: the working native
  search is a controlled `<input testId value aria-label placeholder onChange>`
  with a token style (`height: 26`, `input` role, `border` role, radius `sm`).
- `apps/playground/src/scenarios/grid-editor.tsx:136`: an `<input>` also takes
  `onKeyDown` (`escape`) and `onSubmit` (`enter`).
- `apps/playground/src/shell-filter.ts` (new) is pure; `effect/Array`,
  `effect/String` are the only imports. `Str.toLowerCase`, `Str.trim`,
  `Str.includes(needle)(haystack)` and `Str.isEmpty` are the API the other
  filters in this repo already use (`data-toolbar.tsx:85`,
  `command-palette-state.ts:17`).
- The headless host types with `host.key("<one key>")` after a click focuses
  the editor (`workspace-panes.tsx:371`, `pointer-entry.tsx:101`); the live host
  types with `host.key("c r o p")` (`live-input`, `plan 189`).

**STOP** and amend this plan if a run contradicts any of these (§7).

## 3. Design

One pure module with unit tests, one shell change, one headless scenario and one
live twin. No new capability (the shell is `layout`, already covered), no new
host verb, no dependency.

### 3.1 `apps/playground/src/shell-filter.ts` (new)

```ts
/**
 * The sidebar's filter rule. The registry is the sidebar, so this is the only
 * place a scenario can be hidden from the UI while the smoke suite still runs
 * it — a pure function keeps that decision testable without a renderer.
 */
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { PlaygroundScenario } from "./types.js";

/** The fields a query is matched against: the id, the title and the capability. */
const fieldsOf = (scenario: PlaygroundScenario): ReadonlyArray<string> => [
  scenario.id,
  scenario.title,
  scenario.capability,
];

/** Case-insensitive substring match; an empty or whitespace query matches all. */
export const scenarioMatches = (query: string) => (scenario: PlaygroundScenario): boolean =>
  pipe(
    Str.toLowerCase(Str.trim(query)),
    (needle) =>
      Str.isEmpty(needle) ||
      Arr.some(fieldsOf(scenario), (field) => Str.includes(needle)(Str.toLowerCase(field))),
  );

/** The scenarios whose id, title or capability contains `query`, in registry order. */
export const filterScenarios = (
  list: ReadonlyArray<PlaygroundScenario>,
  query: string,
): ReadonlyArray<PlaygroundScenario> => Arr.filter(list, scenarioMatches(query));
```

(Use `pipe` from `"effect"`, as the rest of the app does. A direct
`Str.toLowerCase`/`Str.trim` composition is equally fine; keep the file under
~30 lines.)

### 3.2 `apps/playground/src/app.tsx` (change)

State and derivation:

```tsx
const [selected, setSelected] = useState(/* unchanged */);
const [query, setQuery] = useState("");
const visible = filterScenarios(list, query);
const current = pipe(
  Arr.findFirst(visible, (scenario) => scenario.id === selected),
  Option.orElse(() => Arr.head(visible)),
);
const activeId = Option.map(current, (scenario) => scenario.id);
```

- The nav maps **`visible`**, not `list`; the highlight compares
  `Option.exists(activeId, (id) => id === scenario.id)` instead of
  `selected === scenario.id`, so the painted row and the stage never disagree.
- `selected` is **not** rewritten by the filter. Filtering is transient: clear
  it and the previous pick returns. A filter that hides the current view falls
  back to the first match (or `None`).
- Replace the `Scenarios` heading with one row (same vertical space, so the
  list keeps its height). `Escape` belongs to the **sidebar container**, not
  the input: a key bubbles from the focused entry as well as from the field
  (plan `345`), so a reader who just clicked a row can still clear the filter.

```tsx
<div
  onKeyDown={(event) => {
    if (event.key === "escape") setQuery("");
  }}
  style={{ /* the existing 260 px sidebar column */ }}
>
```

The filter row itself:

```tsx
<div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: theme.spacing.md }}>
  <input
    testId="shell-filter"
    value={query}
    aria-id="shell-filter"
    aria-label="Filter scenarios"
    placeholder="Filter scenarios"
    onChange={(event) => setQuery(event.value ?? "")}
    style={{
      height: 26,
      flexGrow: 1,
      minWidth: 0,
      paddingLeft: theme.spacing.sm,
      fontSize: 12,
      color: theme.colors.inputForeground,
      backgroundColor: theme.colors.input,
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
    }}
  />
  <text
    testId="shell-filter-count"
    style={{ ...textStyle(theme, "caption"), color: theme.colors.mutedForeground }}
  >
    {`${Arr.length(visible)} of ${Arr.length(list)}`}
  </text>
</div>
```

- Inside the nav list, when `Arr.isEmpty(visible)`, paint
  `<text testId="shell-filter-empty">No scenarios match</text>` (a `Readout`-style
  muted row is fine). The stage already paints `no scenarios` through
  `Option.match(current, { onNone: ... })`.

### 3.3 `apps/playground/src/shell-filter.test.ts` (new)

Pure vitest tests over a small fixture list (two or three scenarios with
distinct ids, titles and capabilities). Each assertion reads a derived value:

1. `filterScenarios(list, "")` and `"   "` return every scenario, in order.
2. An id matches **case-insensitively** (`"TEXT-NATIVE"` → the one entry).
3. A word from the **title** matches (`"playground shell"` → its entry).
4. A **capability** matches (`"layout"` → the shell entries).
5. A query with no match returns `[]`.
6. Surrounding whitespace is trimmed (`"  text-native  "` → the entry).
7. Order follows the input list, not the match position.

### 3.4 `apps/playground/src/scenarios/shell-filter.tsx` (new)

`shellFilterScenario`, `id: "shell-filter"`, `capability: "layout"`,
`title: "Playground shell: the scenario filter"`, `view: () => <App list={scenarios} />`.
Steps, using the existing `readout`/`bounds` helpers:

1. Click `shell-filter`; type `c r o p` one key at a time.
2. `shell-filter-count` paints `1 of <count>` (count read from the registry, not
   from the filter); `nav-crop-area` has bounds and paints `colors.accent` (the
   row the stage shows), `nav-window-layout` has none (`bounds` is null for an
   unmounted entry), and `stage-title` names the crop scenario (the first match,
   because the prior selection was filtered out).
3. Click `nav-crop-area`; the stage stays on it and the entry paints
   `colors.accent` (the shell highlight follows the filter's `activeId`).
4. `escape` clears it while focus is still in the filter: the count is
   `<count> of <count>`, `nav-window-layout` is painted again, and the stage
   returns to the **crop** selection (the filter did not rewrite `selected`).
   The same `escape` from a focused nav row clears it too (the handler is on the
   sidebar).
5. Type `C R O P` in upper case: still one match (case-insensitive), so the
   count is `1 of <count>`.
6. Clear, then type `z z z`: `0 of <count>`, `shell-filter-empty` paints its
   text, and `stage-title` is `no scenarios`.
7. Clear; click `nav-window-layout`, then type `crop`: the stage shows the
   crop match (the pick is hidden, so the derived `current` falls back to the
   first match); clearing the filter restores the **window-layout** pick — the
   filter never rewrites `selected`.

### 3.5 `apps/playground/src/live/scenarios.tsx` (change)

`liveShellFilter`, `id: "live-shell-filter"`, `capability: "layout"`,
`view: shellFilterScenario.view`, `ready: "app-shell"`. Steps:

1. Click `shell-filter`; `key("c r o p")`; settle.
2. `textOf(ctx, "shell-filter-count")` is `1 of <count>`; `nav-crop-area` has
   bounds; `bounds("nav-window-layout")` is `null` (the live `bounds` verb
   returns null for an unmounted or unpainted locator — plans `192`, `389`).
3. Click `nav-crop-area`; `waitFor` the stage title via the existing `textOf`
   helper + `settle`; the stage is `Crop area: …`.
4. `key("escape")`; settle; count is `<count> of <count>`, the window-layout
   entry is painted again and the stage stays on crop.
5. Screenshot to `${LIVE_ARTIFACTS}/live-shell-filter.png`.

Register it in `liveScenarios` immediately after `shell`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground test` | unit tests pass, including the seven new `shell-filter` cases (30 → 31 files) |
| `nub run --filter playground check-types` | no type errors (the compiled `/tmp` output is not part of the tree) |
| `nub run --filter playground build` | `dist/smoke/run.js` and `dist/live/run.js` rebuilt |
| `nub apps/playground/dist/smoke/run.js --only shell-filter` | `1/1 scenarios passed`, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only shell-navigation` then `--only shell-selection` | both green, exit `0`; the filter row did not break the scroll guard or selection (the headless CLI takes **one** id; repeatable `--only` is the live CLI's, plan `517`) |
| `nub apps/playground/dist/live/run.js --only live-shell-filter` | `1/1 scenarios passed`, exit `0`, one screenshot |
| `nub apps/playground/dist/live/run.js --only live-shell` | green, exit `0` (the shell still fills the window and navigates) |
| `nub run check` | every gate green |
| `nub run test` | every package green |
| `nub apps/playground/dist/smoke/run.js` | `101/101` scenarios, exit `0` |
| `nub apps/playground/dist/live/run.js --all` | the merge gate: `50/50`, exit `0` (record the total; do not claim it before it runs) |

## 5. Test plan and the two-direction proofs

The unit tests are the rule's guard; the two scenarios are the interaction's.
Each mutation below must fail, and the failure is named:

- **M1 — case:** delete `Str.toLowerCase` around the needle. The upper-case
  unit test and `shell-filter`'s step 5 fail (query `CROP` matches nothing).
- **M2 — fields:** drop the title from `fieldsOf`. The title unit test fails;
  the scenario still passes (its query is an id), which is why both exist.
- **M3 — nav source:** map `list` instead of `visible` into the nav. The
  scenario's `nav-window-layout` bounds assertion fails with the painted entry.
- **M4 — change handler:** remove `onChange` from the input. The first count
  assertion fails (`100 of 101`).
- **M5 — selection:** derive `activeId` from `selected` instead of `current`.
  Step 2 fails: after filtering, the highlighted row is the hidden old
  selection, so the crop row the stage shows paints the shell surface.
- **M6 — live clear:** remove the sidebar's `onKeyDown` Escape branch.
  `live-shell-filter` step 4 fails (the count stays `1 of 50`), and so does the
  headless scenario's clear step.

Deliberately **not** proven: that a filtered-out entry is destroyed (as opposed
to hidden). It is unmounted by the list map, and the suite's honest evidence is
"no bounds, no painted text", not a retained-node count (that is `scale-cost`).

## 6. STOP conditions

- STOP if the `<input>` does not receive synthetic keys after a click in the
  headless renderer, or if `onChange` does not fire per key. That would
  contradict plan `188`; record the measurement and use the shipped
  `TextInput`-style route instead — do not fake the value.
- STOP if filtering re-renders the nav in a way that loses the native scroll
  offset in a way that breaks `shell-navigation`; report the measurement rather
  than loosening that scenario.
- STOP if the live window's `bounds` verb returns a box for an unmounted
  filtered entry. Record it as a live-host mapping bug (D45) and fix the host,
  not the assertion.
- Do **not** add a new capability to the smoke model for an app-only feature.
- Do **not** edit `apps/docs` or `packages/components`; if the docs capability
  matrix needs this id, record it in `TODO.md` as a cross-team row.

## 7. Acceptance

- The filter is a pure rule with unit tests; the shell uses it; `selected` is
  preserved across a filter and the highlight follows the stage.
- `shell-filter` and `live-shell-filter` pass, and the shell's existing two
  headless scenarios plus `live-shell` still pass.
- The suite is `101/101` headless and `50/50` live, exit `0`, with the exact
  ids recorded in `TODO.md` and the README.
- `nub run check` and `nub run test` are green.
- `TODO.md` ticks the task; the plan index and `PLAN.md` record the decision.

## 8. What ran

| Run | Result |
| --- | ------ |
| `nub run --filter playground test` | 31 files, **397 tests** (+8) |
| `nub run --filter playground check-types` | clean |
| `nub apps/playground/dist/smoke/run.js --only shell-filter` | `1/1`, **16 checks**, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only shell-navigation` / `--only shell-selection` | `1/1` each, exit `0` — the filter row did not break the scroll guard or the selection |
| `nub apps/playground/dist/live/run.js --only live-shell-filter --only live-shell` | `2/2`, **13 + 9 checks**, exit `0` |
| `nub run check` / `nub run test` | green after `fmt:fix` |
| `nub apps/playground/dist/smoke/run.js` | **101/101**, **3538 checks**, 137 s, exit `0` |
| `nub apps/playground/dist/live/run.js --all` | **50/50**, **1012 checks**, 555 s, exit `0` (the merge gate) |

The six mutations failed exactly as §5 predicted:

- M1 — `the match is case-insensitive: expected "1 of 101", got "0 of 101"`
  (and the unit test `matches an id case-insensitively`);
- M2 — the unit test `matches a word from the title` (the scenario still
  passes, because its query is an id: this is why both guards exist);
- M3 — `a filtered-out entry leaves the sidebar: expected true, got false`;
- M4 — `the filter counts only its match: expected "1 of 101", got "101 of 101"`;
- M5 — `the row the stage shows paints the accent: expected "#2E2370", got "#11141A"`;
- M6 — headless `Escape clears the query: expected "101 of 101", got "1 of 101"`
  and live `Escape clears the live filter from the focused row` with the same
  numbers.

Measured implementation note: the live module must **not** import
`shell-filter.tsx` directly. That scenario imports the registry (it mounts the
whole `App`), so the extra import edge evaluates the registry while the live
module's import of the scenario is still in progress and `scenarios` is in a
temporal dead zone (`ReferenceError: Cannot access 'shellFilterScenario' before
initialization`). The live `view` looks the scenario up from the registry
inside the render callback instead — the registry is the single source of
truth, so this is also the honest composition.

Not proven, deliberately: that a filtered-out row is destroyed rather than
hidden. It is unmounted by the map, and the evidence is "no bounds, no painted
text" — a retained-node count belongs to `scale-cost`.
