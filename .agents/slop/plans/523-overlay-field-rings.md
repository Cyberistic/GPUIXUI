# 523 — the overlay search fields paint the focus ring

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — the focus ring must be consistent |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `117`, `200`, `201`, `114`, `116`, `301`, `302`, `323`, `388`, `398`, `522` |
| Status | done — 2 native cases (behaviour 688), 3 mutation proofs; measured that the open effect does not dispatch React's `onFocus`, so the field seeds from the root's `open`; docs, `COMPONENTS.md` and the inventory synced |
| Evidence | §1 — measured in the real `TestRenderer` on this host, 2026-10-18 |

This plan is self-contained. Run every command; do not claim a test passed
unless it ran.

---

## 1. Why — the bug, measured

Plan `522` made every focusable part paint `focusRing`. Two search fields were
missed because they live inside overlays rather than being reachable by `Tab`
from the page: `CommandMenuInput` (a palette) and `ComboboxInput` (a popup
field). Both take native focus and paint no ring:

```text
PROBE command-input:     focused=true  shadow=undefined
PROBE combobox-open:     focused=true  shadow=undefined   // focus after opening
PROBE combobox-input:    focused=true  shadow=undefined   // after focusElement
```

The command palette `autoFocus`es its input, and opening the combobox leaves the
input focused, so in both cases a user types into a field with no visual focus
indication — while every other field in the library (`FieldInput`,
`SearchInput`, `TagInput`, `TimePicker`, `MentionInput`, the color HEX field)
paints the ring.

## 2. Root cause

Both fields build their own inline style with no `focused` state:

- `src/command-menu.tsx` → `CommandMenuInput` renders the host `<input>` with
  `autoFocus`, `testId="command-input"`.
- `src/combobox.tsx` → `ComboboxInput` renders GPUix's headless combobox input
  (`ComboboxInputProps extends InputProps`, so `onFocus`/`onBlur` are
  supported), `testId="combobox-input"`.

## 3. Fix

### 3.1 `src/command-menu.tsx`

- `const [focused, setFocused] = useState(true)` — the part is always
  `autoFocus`, and the runtime focuses after React's effects, so `onFocus` never
  runs on mount (plan `388`).
- `onFocus={() => setFocused(true)}`, `onBlur={() => setFocused(false)}`.
- `...(focused ? focusRing(theme) : {})` in the input's style object; import
  `focusRing` from `./internal/theme.js`.
- If the caller re-renders the palette while it stays open, focus is still the
  input's; the state only changes on a real blur.

### 3.2 `src/combobox.tsx`

- `const [focused, setFocused] = useState(false)` in `ComboboxInput`, plus
  `onFocus`/`onBlur` handlers and `...(focused ? focusRing(theme) : {})` in its
  style.
- **Measured outcome:** the root's open effect focuses the input without
  dispatching React's `onFocus` (setting the seed to `useState(false)` leaves
  the ring off, which the test catches). Seed the state from the context's
  `open` flag — the field mounts with the popup and the root focuses it — then
  let `onFocus`/`onBlur` track every later change. The command palette's field
  is always `autoFocus`, so its seed is `useState(true)`.

### 3.3 STOP check for the seed

Do not add a timer, a `requestAnimationFrame` or a renderer poll. If neither
`onFocus` nor an `open` seed can express "the input has focus", stop and report:
that is a runtime focus-notification gap and needs its own plan.

## 4. Tests

One native case per suite:

| File | Case | Assertion |
| --- | --- | --- |
| `src/behaviour/command-menu.test.tsx` | "paints the focus ring on the search field" | the palette opens; `command-input` has `boxShadow` defined (Tab wraps back to it, so it is the only check) |
| `src/behaviour/combobox.test.tsx` | "paints the focus ring on the search field" | opening the popup leaves the field ringed; focusing the trigger clears it; Escape then a reopen rings it again |

### Both-direction proof

1. Remove the ring line from `CommandMenuInput` → the command case fails.
2. Remove the ring line from `ComboboxInput` → the combobox case fails.
3. If `ComboboxInput` seeds from `open`, change the seed to `useState(false)`
   → the combobox case fails (no `onFocus` arrives from the root's open effect).

Record which direction failed in the status line and in `TODO.md`.

## 5. Docs and inventory

- `docs/command-menu.mdx` and `docs/combobox.mdx`: state that the search field
  paints the token focus ring while it holds focus, and bump their
  `## Verification` native counts (Command menu 20 → 21, Combobox 36 → 37).
- `COMPONENTS.md`: the two Tier 2 rows gain the count and one clause naming the
  ring (plan 523).
- `src/inventory.test.ts` checks both counts; run it and fix what it names.

## 6. Commands and expected results

```sh
cd packages/components
nub run --filter @gpuixui/components test:behaviour   # 688 (686 + 2), all green
nub run --filter @gpuixui/components test             # unit + inventory green
nub run --filter @gpuixui/components check-types
cd ../.. && nub run check && nub run lint && nub run test
```

## 7. STOP conditions

- The open effect does not dispatch `onFocus` **and** the root's `open` seed is
  not available in the context — report, do not poll the renderer.
- The ring would be painted while the field is not focused (e.g. after a row
  press) and no blur follows — measure and report before shipping a lie.
- The headless `ComboboxInput` drops `onFocus`/`onBlur` (measured by the test
  failing with no state change) — report.

## 8. Acceptance

- Both fields paint the token ring while focused and not after focus leaves.
- Two native cases fail without the fix and pass with it; the third mutation
  (the seed) is recorded.
- The counts in the docs pages, the inventory records and `COMPONENTS.md` match.
- `nub run check`, `nub run lint` and `nub run test` exit 0.
