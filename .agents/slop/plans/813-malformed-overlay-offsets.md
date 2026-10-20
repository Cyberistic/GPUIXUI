# 813 — A malformed overlay offset keeps the documented default

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 112, 116, 119, 317, 320, 323, 398, 565, 568, 583, 602, 649, 650, 651, 652, 677, 706, 718, 732, 763 |
| Status | planned — measured 2026-10-20 on this host; see §1 |
| Claimed number | `813` — `811` and `812` are claimed by the binding workstream; `813` is the first free number across the shared checkout and every `workspaces/*` tree at claim time |

## 1. The bug

Every floating surface takes pixel offsets (`sideOffset`, `alignOffset`,
`collisionPadding`) and passes them straight to GPUix's `anchored` layer. The
runtime coerces a non-finite number to `0` instead of rejecting it, so a
malformed offset silently **removes** the behaviour it configures:

- `sideOffset` — the documented gap between trigger and surface collapses;
- `alignOffset` — the measured centre correction is dropped, so
  `align="center"` renders as `start`;
- `collisionPadding` — the placement rule's `margin` becomes `NaN`, every room
  comparison is false, the surface never flips, and the runtime's own clamp
  leaves a low panel **below the window**.

Measured 2026-10-20 in the real `TestRenderer`
(`src/behaviour/zz-probe.test.tsx`, deleted before commit):

```
# <Popover defaultOpen> in a 40px-padded page
startDefault              panel y=91   (sideOffset 6)
startNaN / startInfinity  panel y=85   # the 6px gap is gone

# <Popover defaultOpen align="center">, trigger at x=41 width=53
centre                    panel x=21   # centred  (alignOffset 0)
centreNaN / centreInfinity panel x=53  # renders as start, 32px off

# <Popover defaultOpen> at the window bottom (trigger y=749, panel h=44)
lowDefault (margin 8)     panel y=709  # flipped above the trigger
lowNaN / lowInfinity      panel y=759  # not flipped; 759+44 is off-window

# the same offset on the other public surfaces
<PreviewCard sideOffset={6}>         preview y=91
<PreviewCard sideOffset={NaN}>       preview y=85
<NotificationCentreContent 8>        panel   y=81
<NotificationCentreContent {NaN}>    panel   y=73
<ComboboxContent 4>                  popup   y=81
<ComboboxContent {NaN}>              popup   y=77
```

A malformed number is reachable without a type error: an offset computed from
configuration (`Number(process.env.OVERLAY_GAP)`), from a density scale
(`base * factor`) or from a layout measurement is a `number`, and `NaN`/
`Infinity` are numbers to the compiler.

This is the established family in this package — a malformed bound must not
remove the behaviour it configures: a non-finite `siblingCount` is no cap
(plan 651), a non-finite `pinThreshold` uses the theme default (plan 652), a
non-finite toast `max` keeps the default queue bound (plan 677), a non-finite
hover delay keeps the component default (plan 763). A zero offset is a caller's
explicit choice; `NaN` is never one.

## 2. The rule

One pure normaliser next to the placement rules in
`src/internal/placement.ts`:

```ts
/**
 * A pixel offset. A caller's explicit `0` or negative value is kept; a
 * non-finite one falls back to the surface's documented default, so a malformed
 * value cannot silently drop a gap, a centre correction or a window margin.
 */
export const offsetOf = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;
```

Each surface resolves its three offsets once, before `usePlacement` and before
rendering the host layer, with the defaults it already documents:

| Surface | `sideOffset` | `alignOffset` | `collisionPadding` |
| ------- | ------------ | ------------- | ------------------ |
| `Popover` (`popover.tsx`) | 6 | 0 | 8 |
| `PreviewCard` (`preview-card.tsx`) | 6 | 0 | 8 |
| `NotificationCentre` (`notification-centre.tsx`) | 8 | 0 | 8 |
| `Combobox` (`combobox.tsx`) | 4 | 0 | 8 |

`DatePickerContent` delegates to `PopoverContent`, so it inherits the rule
without its own copy. The internal fixed offsets (`NavigationMenu` 4,
`MentionInput` 4) are constants and are not touched.

No public API, dependency, timing or placement geometry changes: only a
non-finite value starts behaving like the default it was documented to have.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/placement.ts` | Add and document `offsetOf` |
| `packages/components/src/popover.tsx` | Resolve the three offsets through it (placement margin and host props) |
| `packages/components/src/preview-card.tsx` | Same three |
| `packages/components/src/notification-centre.tsx` | Same three |
| `packages/components/src/combobox.tsx` | Same three |
| `packages/components/src/internal/placement.test.ts` | **New cases** for the pure rule (§4) |
| `packages/components/src/behaviour/popover.test.tsx` | 3 native cases (27 → 30) + header bug list |
| `packages/components/src/behaviour/preview-card.test.tsx` | 1 native case (20 → 21) + header bug list |
| `packages/components/src/behaviour/notification-centre.test.tsx` | 1 native case (32 → 33) |
| `packages/components/src/behaviour/combobox.test.tsx` | 1 native case (69 → 70) |
| `packages/components/docs/popover.mdx` | Prop notes and limitations: a malformed offset keeps the default |
| `packages/components/docs/preview-card.mdx` | Same |
| `packages/components/docs/notification-centre.mdx` | Same |
| `packages/components/docs/combobox.mdx` | Same |
| `COMPONENTS.md` | The four rows: the rule and the new counts |
| `.agents/slop/plans/README.md` | Index this plan |
| `PLAN.md` | Append `813` to the D30 overflow chain |
| `TODO.md` | Tick a new hardening line under the Tier 2 hardening list |

## 4. Test plan

### Pure (`src/internal/placement.test.ts`)

1. **"keeps a caller's finite offset, including zero and a negative one"** —
   `offsetOf(0, 6) === 0`, `offsetOf(-4, 6) === -4`, `offsetOf(2.5, 6) === 2.5`
   (a fractional offset is a real pixel value, not a malformed one).
2. **"falls back for a non-finite offset"** — `NaN`, `Infinity` and
   `-Infinity` return the fallback, for all three documented defaults (`6`, `0`,
   `8`), so one shared helper cannot converge the surfaces' defaults silently.

### Native (`src/behaviour/popover.test.tsx`)

Each case's comment states the bug it guards. Every case compares a malformed
value against the same fixture with the documented default, so it is independent
of the recorded plan-540 box-convention failures:

1. **"keeps the default gap when `sideOffset` is malformed"** — render the
   default and `sideOffset={Number.NaN}` fixtures; assert both panels have the
   same `y` (and that both are finite). **Fails at `HEAD`** (91 vs 85).
2. **"keeps the measured centre when `alignOffset` is malformed"** — render
   `align="center"` with `0` and `NaN`; assert the panels' `x` are equal and the
   NaN one is still centred within the fixture's own measurement. **Fails at
   `HEAD`** (21 vs 53).
3. **"keeps a low panel above its trigger when `collisionPadding` is
   malformed"** — the `LowPopover` fixture with `Number.NaN`; assert
   `panel.y + panel.height <= trigger.y` and that the panel's `y` equals the
   default-margin run. **Fails at `HEAD`** (759 vs 709).

### Native (the other public surfaces)

1. **`preview-card.test.tsx` — "keeps the default gap when `sideOffset` is
   malformed"** — hover the trigger with `sideOffset={NaN}` and with the
   default; the card's `y` is equal. **Fails at `HEAD`** (85 vs 91).
2. **`notification-centre.test.tsx` — "keeps the default gap when `sideOffset`
   is malformed"** — `defaultOpen` with `NaN` vs `8`; the panel's `y` is equal.
   **Fails at `HEAD`** (73 vs 81).
3. **`combobox.test.tsx` — "keeps the default gap when `sideOffset` is
   malformed"** — `defaultOpen` with `NaN` vs `4`; the popup's `y` is equal.
   **Fails at `HEAD`** (77 vs 81).

### Commands and expected results

```sh
# 0. Delete the transient probe; it must not reach the commit
rm packages/components/src/behaviour/zz-probe.test.tsx

# 1. Prove the six new native cases fail on the old source
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/popover.test.tsx src/behaviour/preview-card.test.tsx \
  src/behaviour/notification-centre.test.tsx src/behaviour/combobox.test.tsx
# EXPECT: the six new cases fail for the recorded reason; the files' recorded
# plan-540 failures (2 popover, 7 preview-card, 0 notification, 0 combobox) stay
# unchanged and no other case flips.

# 2. The pure suite (after the helper lands)
nub run --filter @gpuixui/components test
# EXPECT: exit 0; unit count +2 cases (the current baseline is 512 in 48 files).

# 3. The four affected native files after the fix
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/popover.test.tsx src/behaviour/preview-card.test.tsx \
  src/behaviour/notification-centre.test.tsx src/behaviour/combobox.test.tsx
# EXPECT: every new case passes; only the recorded plan-540 failures remain.

# 4. End-of-task native run (the change touches four components)
nub run --filter @gpuixui/components test:behaviour
# EXPECT: 6 more passing than the baseline measured this turn
# (1035 passed / 20 failed of 1055) → 1041 passed / 20 failed of 1061, with
# exactly the same 20 recorded plan-540 failures. Record the exact totals.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

## 5. STOP conditions

- Any of the six new native cases passes at `HEAD`. Stop and re-measure: a test
  that cannot fail is not evidence.
- A malformed offset starts behaving like a *different* default (for example a
  popover gap of 8 instead of 6). Stop; each surface owns its documented value.
- A finite offset changes: `0` and a negative offset still mean what they meant,
  and a fractional one is still passed through. Stop and fix the helper.
- `DatePicker`'s popup changes behaviour beyond the inherited normalisation, or
  a fixed internal offset (`NavigationMenu`, `MentionInput`) moves. Stop.
- A native failure appears outside the recorded plan-540 classes, or a case in
  another file changes. Stop and record it.
- `813` is taken by another worktree before this plan is committed. Renumber to
  the next free number, rename the file and update the index, D30 and this
  header.

## 6. Acceptance criteria

- A non-finite `sideOffset`, `alignOffset` or `collisionPadding` on `Popover`,
  `PreviewCard`, `NotificationCentre` or `Combobox` keeps that surface's
  documented default; a finite value (including `0`, negative and fractional) is
  unchanged.
- A malformed `collisionPadding` still flips a low popover above its trigger;
  a malformed `alignOffset` still centres a `center`-aligned surface.
- The six native cases fail on the old source and pass after; the pure rule has
  both-direction cases.
- The four docs pages, `COMPONENTS.md` and the inventory agree with the suite
  counts; `inventory.test.ts` passes.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
