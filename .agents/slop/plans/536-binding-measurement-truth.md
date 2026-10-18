# 536 — Behaviour truth on the rebuilt binding: reported boxes and focus signals

| Field | Value |
| ----- | ----- |
| Phase | F (verification truth) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `116`, `117`, `323`, `523`, `535`; the binding provenance in `apps/playground` plan `529` |
| Status | done (components half) — the two cases are green and both mutations proven; the full suite (59 cases in 19 files) is recorded against the same binding for the owner |
| Evidence | §1 — measured on this host, 2026-10-18, binding md5 `c0e554bab26858296faa295dbbe65c21` |

This plan is self-contained. Run every command; do not claim a test passed
unless it ran.

---

## 1. Why — two red cases after the shared binding was rebuilt

The shared store's `@gpuix/native` binding was rebuilt in place by the
`gpuix-zindex` workstream (plan `530` there) from `references/gpuix` **main**,
not the published 0.10.0 tag. The playground workstream has already recorded
that this is a different source than the release (their plan `529`). Two
`combobox.test.tsx` cases fail at `HEAD` under it, with no component change:

```
× centres a requested popup on its trigger        expected 4 to be <= 1
× paints the focus ring on the search field       input still ringed after focusElement(trigger)
```

Both were green on the previous build. This plan records what the new build
actually reports and makes the two cases assert something the runtime can
honestly be asked for.

### 1.1 `getElementBounds` now reports a **content-box origin** with a **padding-box size**

A probe rendered six divs at `x = 100`, width `200`, with different borders and
horizontal padding (`src/behaviour/zz-box.test.tsx`, deleted after the probe):

| border | padding | reported |
| ------ | ------- | -------- |
| 0 | 0 | `x 100, width 200` |
| 1 | 0 | `x 101, width 198` |
| 0 | 8 | `x 108, width 200` |
| 1 | 8 | `x 109, width 198` |
| 1 | 12 | `x 113, width 198` |
| 2 | 12 | `x 114, width 196` |

The origin moves by `border + padding` (content-box origin); the width shrinks
by `2 * border` only (padding-box width). The source explains the direction —
main's `track_host_bounds` replaced `bounds_tracker`, and its doc comment says
the box is the border box, which the measurement above contradicts for padded
elements.

The two boxes the centring case compares have different padding:

```
trigger (padding 8, border 1):  reported x 549, width 738
surface (padding 4, border 1):  reported x 741, width 346   (centred)
```

Both start 9 px / 5 px inside their own padding, so the reported **centres**
differ by `(8 - 4) = 4 px` even though the laid-out boxes are exactly centred:
the runtime anchors `start` at the trigger's layout x, and the component adds
`(trigger.width - surface.width) / 2 = 196`, so the surface's layout centre is
the trigger's layout centre. **The component is correct; the assertion mixes
two box conventions.**

### 1.2 The binding delivers no focus/blur events for a focus change

A probe rendered two `tabIndex={0}` divs with `onFocus`/`onBlur` logging. After
`focusElement(first)`, `focusNext()`, and a pointer click on the second div,
`getFocusedElementId()` moved (`1` → `2`) but the log stayed empty. The same is
true for the combobox input: `focusElement(trigger)` moves native focus to the
trigger and the input keeps painting its ring because React's `onBlur` never
runs. `@gpuix/react` exposes no focus subscription and `renderer` has no event
dispatch, so a component cannot observe the change.

Plan `523` §7 anticipated exactly this: *"The ring would be painted while the
field is not focused … and no blur follows — measure and report before shipping
a lie."* This is that report.

## 2. What changes

### 2.1 `src/behaviour/combobox.test.tsx` — the centring case

Replace the absolute-centre comparison with the rule the component owns,
measured from the same layout:

1. Parameterise `CentredPicker` with `align?: "start" | "center"` (default
   `"center"`) and pass it to `ComboboxContent`.
2. Mount the start variant, open it, and record the trigger and surface bounds;
   unmount. Mount the centre variant, open it, and record the surface bounds.
3. Assert the **shift** is half the width difference:

```ts
it("centres a requested popup on its trigger", async () => {
  const start = renderComponent(<CentredPicker align="start" />);
  await open(start);
  const trigger = requireBounds(start, "combobox-trigger");
  const startSurface = requireBounds(start, "combobox-content");
  start.unmount();

  const centred = renderComponent(<CentredPicker align="center" />);
  await open(centred);
  const surface = requireBounds(centred, "combobox-content");
  centred.unmount();

  // The runtime anchors `start` to the trigger's layout edge; `center` must add
  // half the width difference. Compared as a shift, the reported content-box
  // origins cancel (their padding inset is the same on both surfaces); plan 536
  // measured that a padded element's `getElementBounds` origin is its content box.
  expect(surface.width).toBe(startSurface.width);
  expect(
    Math.abs(
      surface.x -
        startSurface.x -
        (trigger.width - surface.width) / 2,
    ),
  ).toBeLessThanOrEqual(1);
});
```

Add a sentence to the test header naming the binding-measurement bug this guards
(a stale absolute-centre assertion and a lost offset both fail).

### 2.2 `src/behaviour/combobox.test.tsx` — the ring case

Keep the seeded ring and the close/reopen path; drop the unobservable
programmatic-focus step:

```ts
it("paints the focus ring on the search field", async () => {
  const picker = renderComponent(<Picker />);
  await open(picker);

  expect(focusedTestId(picker)).toEqual(Option.some("combobox-input"));
  expect(
    picker.renderer.findByTestId("combobox-input")?.style.boxShadow,
  ).toBeDefined();

  picker.renderer.simulateKeystrokes("escape");
  await settle();
  expect(picker.renderer.findByTestId("combobox-input")).toBeUndefined();
  expect(focusedTestId(picker)).toEqual(Option.some("combobox-trigger"));

  await open(picker);
  expect(
    picker.renderer.findByTestId("combobox-input")?.style.boxShadow,
  ).toBeDefined();

  picker.unmount();
});
```

The comment above the case must state the measured limit: this binding delivers
no `focus`/`blur` for `focusElement`/`focusNext`/pointer focus, so "the ring
leaves while the popup stays open" cannot be observed here; the live-window
check is recorded in `TODO.md` → Interlocks for `playground`.

### 2.3 `docs/combobox.mdx`

- `## Verification` says the ring "follows focus away and returns on reopen".
  Change it to the observable contract: the field is ringed on open and after a
  reopen, and the field unmounts on close — and add one sentence to the
  limitations: under the locally built binding no focus/blur event is delivered
  for a programmatic focus change, so "the ring leaves while the popup stays
  open" is a live-window check, not a TestRenderer assertion.
- Keep the count at **39**; this plan replaces assertions, it does not add cases.

### 2.4 `TODO.md`

- Add the task under “Tier 2 hardening after the inventory closed”: plan 536.
- Update the binding interlock row with the two new measurements (content-box
  origin; no focus/blur events) and name `playground` as the owner of the
  live-window check.

### 2.5 No component change

`internal/placement.ts` and `combobox.tsx` stay as they are. The centring rule is
correct on the laid-out boxes; changing it to chase a measurement bug would move
a correct popup 4 px off-centre on a binding that reports border boxes.

## 3. Commands and expected results

```sh
cd packages/components
./node_modules/.bin/vitest run --config vitest.behaviour.config.ts \
  src/behaviour/combobox.test.tsx        # 1 file, 39 tests, all green
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test          # unit + inventory green
nub run --filter @gpuixui/components test:behaviour # full suite, 712 green
cd ../.. && nub run check && nub run lint && nub run test
```

## 4. STOP conditions

- The start variant and the centre variant report **different surface widths**:
  stop and report — the fixture is not comparable, do not relax the equality.
- The shift is not `(trigger.width - surface.width) / 2` on the start/centre
  pair: stop; that means the component's offset is not being applied, and the
  case must fail for the right reason before the code is touched.
- `Escape` does not restore focus to `combobox-trigger` in the ring case: stop
  and report; the focus-restore contract is a different bug.
- A test is reduced to asserting only that an element exists where it used to
  assert the ring's presence: stop — the ring assertion must survive on open and
  after reopen.
- `nub run check` reports a test that asserts nothing: stop and fix the test.

## 5. Test plan and both-direction proof

1. Rewrite the two cases; run `combobox.test.tsx` → 39 green.
2. **Shift proof:** in `combobox.tsx`, replace
   `alignOffset={placement.alignOffset + alignOffset}` with `alignOffset={0}` →
   the centring case fails with a shift of `0` against `196`; restore.
3. **Ring proof:** remove `...(focused ? focusRing(theme) : {})` from
   `ComboboxInput` → the ring case fails on both the opening and the reopen
   assertion; restore.
4. Run the full behaviour suite to prove no other case depended on the
   programmatic-focus step.

## 6. Acceptance

- Both cases pass on the rebuilt binding with the component unchanged.
- The centring case measures the rule (a shift), not two box conventions, and
  fails when the offset is removed.
- The ring case proves the seeded ring and the reopen path; the unobservable
  half is measured and recorded, not silently deleted.
- `docs/combobox.mdx` no longer claims a behaviour this host cannot verify, and
  the counts agree (`COMPONENTS.md` 39, inventory, docs).
- `nub run check`, `nub run lint` and `nub run test` exit 0.

## 7. Results

**Measured** (2026-10-18, binding `c0e554b…`)

- Reported box semantics, six divs at `x 100`, width `200`:

  | border | padding | reported |
  | ------ | ------- | -------- |
  | 0 | 0 | `x 100, width 200` |
  | 1 | 0 | `x 101, width 198` |
  | 0 | 8 | `x 108, width 200` |
  | 1 | 8 | `x 109, width 198` |
  | 1 | 12 | `x 113, width 198` |
  | 2 | 12 | `x 114, width 196` |

  The origin is the content box; the size is the padding box.
- The centred fixture reports `trigger {x 549, width 738}` and
  `surface {x 741, width 346}`; the layout boxes are centred (`549 - 9 = 540`
  and `741 - 5 = 736`; `540 + 369 = 736 + 173 = 909`). The old assertion read
  the 4 px inset difference as a defect.
- `focusElement(first)`, `focusNext()` and a pointer press on a second
  `tabIndex={0}` div all moved `getFocusedElementId()` (`1` → `2`) with an empty
  `onFocus`/`onBlur` log. For the combobox input, focusing the trigger left its
  `boxShadow` painted.

**What landed**

- The centring case mounts a `start` and a `center` fixture and asserts
  `surface.x - startSurface.x === (trigger.width - surface.width) / 2` (±1),
  plus equal surface widths.
- The ring case asserts the seeded ring, that the field unmounts on Escape with
  focus back on the trigger, and that a reopen rings it again.
- `docs/combobox.mdx` no longer claims the unobservable half and records the
  binding limit; `TODO.md` carries the live-window follow-up for `playground`.

**Verified**

- `combobox.test.tsx`: **39/39**.
- Shift mutation (`alignOffset={0}`): the centring case fails with **196**
  against 1; restored.
- Ring mutation (the `focusRing` line removed from `ComboboxInput`): the ring
  case fails with `undefined`; restored.
- Unit suite stays **411**; the package's `check-types` is green.

## 8. Full-suite evidence under the same binding — 59 cases are red

Running the whole behaviour suite (`nub run --filter @gpuixui/components
test:behaviour`, 51 files) on the same `c0e554b…` binding: **712 tests, 653
passed, 59 failed across 19 files**. The combobox file is green; the failures are
all in files this plan does not change, and they fall into the two measured
causes plus a few anchor-dependent distances:

| File | Failures | Shape |
| ---- | -------- | ----- |
| `list` | 14 | `focusedTestId` returns `None`/the wrong row after a focus move; activation counts 0 |
| `message-scroller` | 9 | anchored scroll distances (`-1128` vs `-1080`), unread text |
| `preview-card` | 7 | focus/pointer open paths |
| `tabs` | 5 | focused tab identity |
| `time-picker` | 3 | `'9'` vs `'09'` plus focus |
| `popover` | 3 | contrast/bounds and focus |
| `mention-input`, `inline-edit`, `hotkey-recorder`, `dropdown-menu`, `color-picker` | 2 each | blur commits never run; centre off by 4 px |
| `tag-input`, `drawer`, `context-menu`, `command-menu`, `collapsible`, `carousel`, `button`, `accordion` | 1 each | ring or `focusElement` id, anchored width ±2, scroll reveal |

Two representative messages:

```
list > moves real focus down and up, skipping disabled rows and wrapping
  expected Some("list-row-b") to deeply equal Some("list-row-a")
inline-edit > commits a changed draft on blur
  expected "vi.fn()" to be called with arguments: [ 'blurred' ]   (0 calls)
drawer > opens from the right, left or bottom at the requested size
  expected 398 to be 400                                           // 2 px padding
dropdown-menu > centres a requested menu on its trigger
  expected 4 to be less than or equal to 1                         // content-box origin
```

This is **not** a component regression: the same tree passes the affected files
on the 21:47 build, and the failures line up with the two semantics this plan
measured. Adapting 59 cases to the content-box origin would bake a non-release
behaviour into the suite and break again on a published binding.

**Recommendation (owner: `playground` / `gpuix-zindex`).** Rebuild the x64
binding from the **release tag** `9fcd628863e354e9c58019fc3bf38981a1e64158`
with `gpui_macos/runtime_shaders`, as plan `140` did from the moving clone, and
pin that artifact per run (plan `529` there). Until then, the native behaviour
suite cannot support a `verified` verdict on this host, and `COMPONENTS.md`
carries evidence taken on the old build.

**Gates.** The non-native gates (`nub run check`, `nub run lint`, `nub run test`)
are unaffected by this binding; they are run and recorded in the commit.
