# 567 — Live scenes for Color picker and Inline edit

**Workstream:** docs-site (`apps/docs`, `docs/preview-strategy.md`)
**Phase:** F — integration and polish
**Depends on:** 412, 455, 456, 486, 493, 497, 508, 515, 523, 560
**Status:** implemented

## 1. The gap

Two delivered, interactive components show only a labelled **tier-A**
illustration on their component pages:

| Page | Record | Today | Why a still is not enough |
| ---- | ------ | ----- | ------------------------- |
| `/docs/components/color-picker` | `color-picker` | tier A + native suite | the page documents a *selection*: pressing a swatch commits a new hex and repaints the preview. A still shows the initial colour and nothing about the commit. |
| `/docs/components/inline-edit` | `inline-edit` | tier A + native suite | the page documents an *edit state*: a click swaps the display for a real input, Enter commits, Escape cancels. A still shows the resting display only. |

`MISSION.md` asks for "interactive/runnable preview where supported" and
`docs/preview-strategy.md` says a scene is expected "when the state the page
documents is one a still cannot prove". Both pages meet that test and both
components are `done` with real behaviour suites, so the honest tier is L, not
only A.

The guard in `scene-contract.test.ts` cannot see this: it requires a live scene
when a record is `stateful`, and these records are `static` (single component,
no compound parts). So this plan adds the scenes and pins them in the
interaction map so a later edit cannot quietly drop them.

## 2. Exact files to change

All paths are in `apps/docs` unless stated.

| File | Change |
| ---- | ------ |
| `preview/scenes.ts` | two keys in `LIVE_SCENES`; two `SCENE_TEXT`; two `SCENE_GESTURE`; two `SCENE_INTERACTION` |
| `preview/scene-views.tsx` | `ColorPickerScene` and `InlineEditScene`, registered in `LIVE_SCENE_VIEWS` |
| `src/component-meta/entries.ts` | `liveScene: "color-picker"` and `liveScene: "inline-edit"` on the two records |
| `src/components/preview/scene-contract.test.ts` | add both slugs to `interactionScenes` |
| `content/docs/components/color-picker.mdx` | no structural change; confirm it already renders `<NativePreview>` (it does) |
| `content/docs/components/inline-edit.mdx` | same |
| `docs/preview-strategy.md` | tier-L list, scene/composed/gesture totals, two gesture rows |
| `apps/docs/README.md` | record-scene and gesture totals |
| `content/docs/component-pages.mdx` | scene total |

## 3. Scene definitions

### 3.1 `preview/scenes.ts`

Add `"color-picker"` and `"inline-edit"` to `LIVE_SCENES` (after
`"color-picker"`'s alphabetical neighbours is not required; append near the
other Tier 2 input scenes).

```ts
// SCENE_TEXT
"color-picker": "Accent set to red",
"inline-edit": "Renamed Atlas Prime",

// SCENE_GESTURE
"color-picker": [{ kind: "click", testId: "scene-color-swatch-0" }],
"inline-edit": [
  { kind: "click", testId: "scene-inline-edit" },
  { kind: "fill", testId: "scene-inline-edit", text: "Atlas Prime" },
  { kind: "press", testId: "scene-inline-edit", keys: "enter" },
],

// SCENE_INTERACTION
"color-picker": "Press the red swatch to commit it.",
"inline-edit": "Click the name, type a new one and press Enter.",
```

The expectation strings must be unique to the conditional line the scene paints
after the gesture; the smoke asserts **absent before** and **present after**.

### 3.2 `preview/scene-views.tsx`

Import both components by subpath (never the package root — the root pulls the
Toast provider's Effect runtime into the preview bundle):

```ts
import { ColorPicker } from "@gpuixui/components/color-picker";
import { InlineEdit } from "@gpuixui/components/inline-edit";
```

```tsx
const ColorPickerScene = (): ReactElement => {
  const [accent, setAccent] = useState("#3b82f6");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Accent colour</Text>
      <Text role="caption" tone="muted">
        The real ColorPicker. Press the red swatch to commit it.
      </Text>
      <ColorPicker
        label="Accent colour"
        testId="scene-color"
        value={accent}
        onValueChange={setAccent}
        swatches={["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"]}
      />
      {accent === "#ef4444" ? (
        <Text role="body">Accent set to red</Text>
      ) : null}
    </Stack>
  );
};

const InlineEditScene = (): ReactElement => {
  const [name, setName] = useState("Atlas");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Project name</Text>
      <Text role="caption" tone="muted">
        The real InlineEdit. Click the name, type a new one and press Enter.
      </Text>
      <InlineEdit
        label="Project name"
        testId="scene-inline-edit"
        value={name}
        onCommit={setName}
      />
      {name === "Atlas Prime" ? (
        <Text role="body">Renamed Atlas Prime</Text>
      ) : null}
    </Stack>
  );
};
```

Register both in `LIVE_SCENE_VIEWS`.

The swatch keeps the component's own test id convention:
`testId="scene-color"` produces `scene-color-swatch-0` … `-swatch-3` and
`scene-color-preview` / `scene-color-hex`. `scene-inline-edit` is spread onto
the display `<div>` and the editing `<input>` by the component, so the same id
survives the swap — that is what lets `fill` and `press` target it.

### 3.3 `src/component-meta/entries.ts`

In the `color-picker` record options add:

```ts
liveScene: "color-picker",
```

and in `inline-edit`:

```ts
liveScene: "inline-edit",
```

No other record field changes. `registry.test.ts` will then require the scene
key to exist in `LIVE_SCENES`.

### 3.4 `scene-contract.test.ts`

Add to `interactionScenes`:

```ts
["color-picker", "color-picker"],
["inline-edit", "inline-edit"],
```

so the "interaction records declare the live scene that documents them" guard
covers both.

## 4. Document updates

`preview-gaps.test.ts` derives every number below; run it first, read the
failures, then make the prose agree. Expected new values with both scenes:

| Document | Old | New |
| -------- | --- | --- |
| `docs/preview-strategy.md` `N scenes ship today` | 45 | 47 |
| `docs/preview-strategy.md` `N are one per record` | 42 | 44 |
| `docs/preview-strategy.md` `N more are opened by a real gesture` | 22 | 24 |
| `docs/preview-strategy.md` `N scenes document state only a gesture produces` | 22 | 24 |
| `docs/preview-strategy.md` tier-L list | — | add `Color picker` and `Inline edit` |
| `docs/preview-strategy.md` gesture table | 22 rows | add `Color pickers` and `Inline edit` rows with the instructions above |
| `apps/docs/README.md` `(42 today)` and `(22 of those …)` | 42 / 22 | 44 / 24 |
| `content/docs/component-pages.mdx` `45 scenes today` | 45 | 47 |

The tier-L list and the gesture table must use the **registry titles** exactly
(`Color picker`, `Inline edit`), because the guard compares the names with the
registry in both directions.

## 5. Commands and expected results

Run from the repository root:

```sh
nub run --filter docs test
```

Expected: all suites green; `scene-contract.test.ts` and `preview-gaps.test.ts`
pass. If a number is stale the failure names it.

```sh
nub run --filter docs check-types
```

Expected: exit `0` (`fumadocs-mdx`, app `tsc`, preview `tsc`).

```sh
nub run --filter docs smoke:preview
```

Expected: `smoke: ok`, exit `0`; the output includes `color-picker` and
`inline-edit` with their expected text and a sized canvas (> 1×1).

```sh
nub run check
```

Expected: `check:tests`, lint, format and types all green.

## 6. STOP conditions

Stop and report, do not improvise, if:

1. The renderer cannot paint either component (`data-gpuix="failed"` or a
   timeout on a sized canvas). That is a component/runtime defect, not a docs
   defect: record the exact reason and raise the task in `TODO.md` for the
   owning package instead of weakening the scene.
2. `InlineEdit` cannot be driven by a real click → `fill` → `enter` (for
   example because the input is not focused after the swap). Record the measured
   failure and leave the record at tier A with a written reason; do **not** open
   it with a prop.
3. A scene's expectation is present before its gesture. That means the scene
   mounts the documented state directly; rewrite the scene or drop the
   expectation, never the before/after rule.
4. Any document count cannot be derived from `LIVE_SCENES` / `SCENE_GESTURE`.
   Fix the guard, not the prose.

## 7. Test plan and two-direction proof

1. `nub run --filter docs test` after the change: green.
2. **Forced defect A — no scene behind the record.** Remove
   `liveScene: "color-picker"` and run
   `nub run --filter docs test`: `scene-contract.test.ts`'s interaction-record
   check must fail naming `color-picker`. Restore.
3. **Forced defect B — a gesture that does nothing.** Remove the
   `scene-color-swatch-0` step from `SCENE_GESTURE` and run
   `nub run --filter docs smoke:preview`: the run must exit `1` because
   `Accent set to red` is absent after the (empty) gesture. Restore.
4. **Forced defect C — the scene mounts the answer.** Change the Color scene's
   initial value to `"#ef4444"` and run `smoke:preview`: the "absent before"
   assertion must fail by scene name. Restore.
5. Re-run the three commands in §5; record the exact output lines in this plan
   under §8.

## 8. Measured result

Run on 2026-10-19 in `workspaces/docs-site` at this branch:

- `nub run --filter docs test` — `85 passed (85)`, `594 passed (594)`, exit
  `0`.
- `nub run --filter docs smoke:preview` — exit `0`; the two new scenes report
  `scene color-picker opened by 1 step(s) — 640x520 canvas, 4 text nodes` and
  `scene inline-edit opened by 3 step(s) — 640x520 canvas, 5 text nodes`, and
  both pages load their live iframe
  (`/docs/components/color-picker` and `/docs/components/inline-edit`,
  606×358). The light/dark frame pair remains distinct (21 936 vs 21 564
  bytes).
- `nub run check` — exit `0` (`check:tests`, lint, format, all workspace
  types).
- **Forced defect A:** removing `liveScene: "color-picker"` failed five guards,
  including `scene-contract.test.ts › interaction records › declare the live
  scene that documents them` with `expected [ 'color-picker: null' ] to deeply
  equal []`. Restored.
- **Forced defect B:** removing the swatch step failed the smoke with
  `FAIL live scene color-picker: expected "Accent set to red" in the GPUI tree
  (["Press the red swatch to commit it.","Accent colour",…])`, exit `1`.
  Restored.
- **Forced defect C:** starting the scene at `#ef4444` failed the smoke with
  `FAIL live scene color-picker: "Accent set to red" was painted before the
  gesture; the scene opens itself`, exit `1`. Restored.

## 8.1 Deviations

- The scene pins `scene-color-swatch-0` as a **component-owned target** in
  `scene-contract.test.ts`: `ColorPicker` derives the swatch ids from the root
  `testId`, exactly like the time picker's segment ids. The guard's pinned map
  gained the entry with that reason; no assertion was weakened.
- `useState` remains in the two scene components. It is the local presentation
  state of a preview composition, exactly as every existing scene, not shared
  application state; Effect Atom is not a substitute for React-local input
  state.

## 9. Acceptance

- Both pages render a real GPUix surface whose documented state is produced by
  a real gesture, and the resting frame does not already contain the answer.
- `registry.test.ts`, `scene-contract.test.ts` and `preview-gaps.test.ts` pass,
  and each fails when its own fact is removed (proofs in §7).
- `docs/preview-strategy.md`, `apps/docs/README.md` and
  `content/docs/component-pages.mdx` state totals derived from the code.
- `nub run check` and `nub run --filter docs smoke:preview` pass.
