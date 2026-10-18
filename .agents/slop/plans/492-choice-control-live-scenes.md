# 492 — Live scenes for the three choice controls

**Phase:** F (docs showcase completeness) · **Owner:** docs-site
**Depends on:** 455 (live wasm surface), 456 (interaction scenes), 486 (gesture
proof), 475 (sized canvas), 451 (tier-A previews for the controls)
**Status:** implemented

## 1. Why this plan exists

`Select`, `Checkbox` and `Switch` are Tier 1 controls, already runtime-verified by
`packages/primitives` and documented on real pages. Their pages carry a tier-A
illustration (plan 451) because the illustration shows a **rest state** only:
a closed select and an unchecked box. The thing a reader needs to judge — the
opened list, the checked paint, the thumb position — is exactly the state a
still cannot prove.

The gesture machinery already exists (plan 486): `SCENE_GESTURE` drives the
published renderer's own automation API and `smoke:preview` asserts the scene's
text is **absent before** the gesture and **present after** it. `TODO.md` already
records that a Select live scene "can be added the same way, without a new prop".

This plan adds the three scenes. It does not touch `packages/primitives` and does
not add a prop to any component.

## 2. Goal and acceptance

| Scene / page | Composition | Gesture the smoke drives | Text the smoke expects |
| ------------ | ----------- | ----------------------- | ---------------------- |
| `select` | a region `Select` with three options, no initial value | `click` `scene-select` | `Europe — West` |
| `checkbox` | a `Checkbox` bound to state, plus a line rendered only when checked | `click` `scene-checkbox` | `Release notes enabled` |
| `switch` | a `Switch` bound to state, plus a line rendered only when on | `click` `scene-switch` | `System theme applied` |

Acceptance:

- the three pages render tier **L** (`<NativePreview>` picks it from the record's
  `liveScene`) and keep their tier-A illustration beneath it;
- `smoke:preview` prints `scene select opened by 1 step(s)`, likewise `checkbox`
  and `switch`, and exits `0`;
- every gesture scene's expected text is proven absent **before** the click and
  present after it;
- `docs/preview-strategy.md` and `apps/docs/README.md` name the three scenes and
  the real count (24);
- `nub run --filter docs test`, `nub run check`, `nub run lint`,
  `nub run test` and `nub run --filter docs smoke:preview --no-build` pass.

## 3. Exact changes

### 3.1 `apps/docs/preview/scenes.ts`

Add three keys to `LIVE_SCENES` — `"select"`, `"checkbox"`, `"switch"` — after
`"hotkey-input"`, and their `SCENE_TEXT`:

```ts
select: "Europe — West",
checkbox: "Release notes enabled",
switch: "System theme applied",
```

Add their gestures and instructions:

```ts
select: [{ kind: "click", testId: "scene-select" }],
checkbox: [{ kind: "click", testId: "scene-checkbox" }],
switch: [{ kind: "click", testId: "scene-switch" }],

select: "Click the region field to open its list.",
checkbox: "Click the box to subscribe.",
switch: "Click the switch to turn the system theme on.",
```

Rules the existing guards enforce: the instruction must not contain the expected
text, and each `testId` must occur in `scene-views.tsx`.

### 3.2 `apps/docs/preview/scene-views.tsx`

Import `Select` and `Switch` from `@gpuixui/primitives` (Checkbox is already
imported) and add three views, each mapped in `LIVE_SCENE_VIEWS`:

```tsx
const SelectScene = (): ReactElement => {
  const [region, setRegion] = useState<string | undefined>(undefined);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Region</Text>
      <Text role="caption" tone="muted">
        The real `@gpuixui/primitives` Select. Open it to see the list surface,
        the selected item and a disabled option.
      </Text>
      <Select
        label="Region"
        placeholder="Choose a region"
        value={region}
        onChange={setRegion}
        testId="scene-select"
        options={[
          { value: "eu-west", label: "Europe — West" },
          { value: "us-east", label: "United States — East" },
          { value: "legacy", label: "Legacy region", disabled: true },
        ]}
      />
    </Stack>
  );
};
```

- The expected text is one option label. It is absent while the list is closed
  (`SelectContent` returns `null`), so the before/after proof is real.
- Do **not** pass `defaultValue`; a selected label would paint before the click.
- No `defaultOpen`: the primitive's wrapper does not expose it, and the point is
  the real gesture.

`CheckboxScene` and `SwitchScene` follow the same shape: controlled state starts
`false`, the visible expectation is a `<Text role="body">` rendered only when the
state is `true`, and the control carries the test id. Use the caption to say the
line appears when the control is toggled. Neither scene passes `defaultChecked`.

### 3.3 `apps/docs/src/component-meta/entries.ts`

Add `liveScene: "select"`, `liveScene: "checkbox"` and `liveScene: "switch"` to
the three `delivered(...)` records. Nothing else on the records changes: the
native suite, source and props types stay as they are, and the native evidence
still renders beneath the live surface (plan 455).

### 3.4 `apps/docs/src/components/preview/scene-contract.test.ts`

Add the three slug→scene pairs to `interactionScenes`. The existing rules then
prove the record declares the scene, the page slug equals the scene key, the
expectation occurs in the view, the gesture target exists, the reader instruction
exists and does not leak the expectation.

### 3.5 `docs/preview-strategy.md`

- Tier L row: add Selects, Checkboxes and Switches to the parenthetical list.
- `Twenty-one scenes ship today` → `Twenty-four scenes`, adding the three names.
- Gesture table: add the three rows (click the field/box/switch → the opened
  list paints, the check paints, the thumb moves). Keep the two-direction sentence.
- Reword "Five scenes document a component that owns its open state and exposes
  no `defaultOpen`" to name the set generally: the smoke drives the gesture for
  every scene whose documented state only a gesture produces. Keep the exact
  measured limitation for Tooltip.

### 3.6 `apps/docs/README.md`

Update the tier-L bullet: add the three scenes to the list, and state that the
gesture set now includes a select, a checkbox and a switch, all driven through
`globalThis.gpuix` with the before/after assertion.

## 4. Test plan

Unit guards (source-level, no browser):

1. `scene-contract.test.ts` — fails when a scene's expectation is removed from
   its view, when a gesture target is renamed, when a record loses `liveScene`,
   or when an instruction names the expected text.
2. `registry.test.ts` — a record may only name a scene in `LIVE_SCENES`.
3. `docs-checks.test.ts` / `preview-gaps.test.ts` — the page still has a live
   scene or illustration; the gap set stays empty.

Runtime proof:

4. `nub apps/docs/scripts/smoke-live-preview.ts --no-build` — each new scene
   prints `opened by 1 step(s)`; the text is absent before the click; exit `0`.

Two-direction proofs to run and record in §6:

- **Remove the checkbox gesture** from `SCENE_GESTURE`, rebuild the preview
  (the scene table is part of the preview bundle) and run `smoke:preview`: the
  run must fail naming `checkbox` and the text it saw. Restore → exit `0`.
- **Rename a target** (`scene-select` → `scene-select-missing`) in the gesture
  table: `scene-contract.test.ts` must fail on the missing test id. Restore.
- **Make a scene open itself** (start `checked` at `true` in `CheckboxScene`):
  `smoke:preview` must fail with the before-absence assertion. Restore.

## 5. Commands and expected results

```sh
nub run --filter docs test                 # all suites pass, including the new pairs
nub run --filter docs check-types          # 0
nub run --filter docs build:preview        # emits public/gpuix-preview
nub apps/docs/scripts/smoke-live-preview.ts --no-build
# expected: 24 scenes; select/checkbox/switch "opened by 1 step(s)"; exit 0
nub run check                              # test quality, lint, format, types
nub run lint                               # 0
nub run test                               # every workspace suite
```

## 6. Measured results

Run on this host (Intel macOS, wasm renderer in headless Chrome), 2026-10-18.

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 52 files / **342 tests** pass |
| `nub run --filter docs check-types` | pass |
| `nub run --filter docs smoke:preview` | **exit 0** — 24 scenes; `select`, `checkbox` and `switch` each `opened by 1 step(s)` on a 640×520 canvas; 24 page iframes loaded |
| `nub run check` | pass (test quality, oxlint, oxfmt, types) |
| `nub run lint` | pass |
| `nub run test` | pass (every workspace suite) |

Two-direction proofs, each run against a rebuilt preview:

1. **A gesture target that drifts.** Renaming the switch target to
   `scene-switch-missing` → `scene-contract.test.ts` failed
   `targets a test id the scene really renders` with
   `["switch: scene-switch-missing"]`. Restored → pass.
2. **A scene that opens itself.** Starting the switch scene checked →
   `smoke:preview` failed
   `FAIL live scene switch: "System theme applied" was painted before the gesture; the scene opens itself`.
   Restored → exit 0.
3. **A gesture that is removed.** Dropping the switch gesture and its
   instruction → `smoke:preview` failed
   `FAIL live scene switch: expected "System theme applied" in the GPUI tree (["Appearance","The real Switch, off. Click it to see the thumb move."])`.
   Restored → exit 0.

One measured fact shaped the Select scene: **the trigger does not fill the
Select root**. A click at the root's centre landed on the root div (bounds
616×32) outside the trigger (117×30), so nothing opened — the tree showed the
root with one narrow child. Passing `fullWidth` gives the trigger `width: 100%`,
which is also the realistic form-field shape, and the root-centre click then hits
the trigger. No component change was needed.

## 7. STOP conditions

- **The Select root click does not open the list** (measured, not assumed): keep
  `select` at its tier-A illustration, remove its scene and gesture from this
  plan's tables, record the measurement here with the text the tree painted, and
  raise a cross-team `TODO.md` row asking for a `testId` on `SelectTrigger` or a
  `defaultOpen` pass-through. Do not hardcode `open`, and do not swap the real
  component for a raw GPUix `Select`.
- **A control paints the expected text before the gesture**: the scene is wrong,
  not the guard. Remove the initial value/checked state; never delete the
  before-absence assertion.
- **The opened list is clipped** in the 606×358 page frame or the 640×520 scene
  canvas: move the control up or shorten the list; never assert on text outside
  the painted frame.
- **A component lacks the test id** the scene needs: stop and record the ask in
  `TODO.md`; do not edit `packages/primitives` from this workstream.

## 8. Acceptance checklist

- [ ] three scenes, three record changes, three contract pairs
- [ ] expectation text absent before / present after, proven by `smoke:preview`
- [ ] `preview-strategy.md` and `apps/docs/README.md` agree with `LIVE_SCENES`
- [ ] two-direction proofs recorded in §6
- [ ] `TODO.md` row ticked and the plan index updated
