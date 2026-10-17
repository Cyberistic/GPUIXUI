# 064 — `autoFocus` fields take focus but paint no ring

**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** 030, 041, 047, 054 (the fields), 025 (the field focus contract).
**Status:** done (2026-10-17) — see §6 for the measured outcome and both proofs.

---

## 0. The bug, measured

Every field tracks focus in React state and paints the `focusRing` from it. The
runtime's `autoFocus` moves native focus **without dispatching `onFocus`**
(measured in plan 041 §9, recorded in `COMPONENTS.md`), so the state stays
`false` and a field that genuinely holds focus on mount looks unfocused:

| Mount | Native focus | Painted ring |
| ----- | ------------ | ------------ |
| `<Input label="Name" autoFocus />` | the input (verified with `runtime.focused()`) | **none** |
| `<TextArea label="Notes" autoFocus />` | the textarea | **none** |

Expected: the field that holds focus paints the ring, as it does after a click
or Tab. This is the same defect documented as a limitation in
`docs/number-field.mdx`, `docs/otp-field.mdx` and the Number Field row of
`COMPONENTS.md` — the runtime fact is true, the missing ring is not acceptable.

## 1. Decision

The `autoFocus` prop **is** the signal that the runtime will focus the field on
mount, so the component starts its focus state from it:

- `useFocus(initiallyFocused = false)` — one parameter, initial `useState`.
- A field passes `autoFocus === true && disabled !== true`, because a disabled
  field never receives `autoFocus` (`fieldHostProps`/`NumberField` already omit
  the prop then, so the two cannot disagree).
- `Input`, `TextArea`, `NumberField` use it; `OTPField` initialises its
  `focusedIndex` to `Some(0)` when `autoFocus` is set (the first cell is the one
  that gets native focus).
- `onBlur` still clears it: the runtime dispatches blur when focus leaves
  (verified in plan 041 §9), so the ring cannot stick.

The alternative — a post-mount `getFocusedElementId()` check against a ref — is
more code across four components for the same result, and it needs a host ref on
controls that do not have one. The prop is deterministic: the runtime either
honours `autoFocus` on mount or the field is not mounted at all.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/internal.ts` | `useFocus(initiallyFocused = false)` |
| `packages/primitives/src/components/Input.tsx` | wrapper passes `props.autoFocus === true && props.disabled !== true` |
| `packages/primitives/src/components/TextArea.tsx` | same |
| `packages/primitives/src/components/NumberField.tsx` | same |
| `packages/primitives/src/components/OTPField.tsx` | initial `focusedIndex` from `autoFocus` (first cell) |
| `packages/primitives/src/components/fields.test.tsx` | the render functions receive the focus state, so no new element-tree assertion is needed; keep the suite unchanged unless the wrapper type changes |
| `packages/primitives/runtime/fields.runtime.test.tsx` | ring on mount for `Input` and `TextArea`, and it clears when focus leaves |
| `packages/primitives/runtime/number-field.runtime.test.tsx` | ring on mount for `NumberField` |
| `packages/primitives/runtime/otp.runtime.test.tsx` | ring on mount for the first `OTPField` cell |
| `packages/primitives/docs/input.mdx`, `docs/textarea.mdx`, `docs/number-field.mdx`, `docs/otp-field.mdx` | delete the "paints no ring on mount" limitation; the `autoFocus` row says the ring paints from mount |
| `COMPONENTS.md` | Number Field row: `autoFocus` now paints the ring; add the new runtime count |
| `packages/primitives/README.md` | runtime count |
| `.agents/slop/plans/README.md`, `TODO.md` | index row, task |

## 3. Steps and exact commands

From `/Users/cyberistic/GPUIXUI/workspaces/primitives`.

### 3.1 The focus state

```ts
export const useFocus = (initiallyFocused = false): FocusState => {
  const [focused, setFocused] = useState(initiallyFocused);
  return {
    focused,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
};
```

Update the doc comment: the runtime's `autoFocus` does not dispatch `onFocus`,
so a field that mounts focused starts its state from the prop.

In each of `Input`, `TextArea`, `NumberField`:

```ts
const focus = useFocus(props.autoFocus === true && props.disabled !== true);
```

In `OTPField`:

```ts
const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
  props.autoFocus === true && props.disabled !== true
    ? Option.some(0)
    : Option.none(),
);
```

### 3.2 The runtime tests

Use the existing `paintedStyle`/element-style helpers in the suites (a field's
ring is `boxShadow` on its host element). For each test:

1. mount the field with `autoFocus` inside `Surface` with a `Button` after it;
2. assert `runtime.focused()` is the field's `testId`;
3. assert the host element's `style.boxShadow` is present;
4. click the `Button`, `runtime.flush()`, and assert the shadow is gone.

The OTP test asserts the first cell's ring (the cells have no `testId`; find
them through the suite's existing cell helper).

### 3.3 Two-direction proof

1. Restore `useFocus()` (no argument) in `Input` and `TextArea` and re-run the
   two field tests: they must fail on the missing shadow. Record the message.
2. Restore the change and re-run the whole runtime suite:
   `nub run --filter @gpuixui/primitives test:runtime` → expected **14 files,
   150 tests** (145 + 5).
3. `nub run --filter @gpuixui/primitives test` (offline, unchanged at 306),
   `nub run check`, `nub run lint`, `nub run test`.

### 3.4 Docs truth pass

- `docs/input.mdx`: the `autoFocus` row — "takes focus on mount; the ring paints
  from mount, because the runtime focuses without dispatching `onFocus`".
- `docs/textarea.mdx`, `docs/number-field.mdx`, `docs/otp-field.mdx`: same, and
  delete the limitation bullet that says the ring appears late.
- `COMPONENTS.md`: Number Field (`autoFocus` paints the ring) and the runtime
  count footnote; OTP Field if its row mentions the ring.
- README count.

## 4. Acceptance

- An `Input`, `TextArea`, `NumberField` or `OTPField` (first cell) mounted with
  `autoFocus` paints its focus ring immediately, measured in the real runtime,
  and the ring clears when focus leaves.
- A disabled field with `autoFocus` paints no ring and takes no focus.
- The four docs pages and the inventory agree; no "paints no ring on mount"
  claim remains.
- Both directions proven; all gates green.

## 5. STOP conditions

- `autoFocus` does not actually take native focus in the runtime under a
  `ThemeProvider`/`Surface` (the probe shows it does) — stop and record the
  focus id.
- The ring paints but does **not** clear after focus leaves (blur not delivered)
  — stop, keep the old behaviour, and record the event sequence; a permanent
  ring would be worse than none.
- The disabled path paints a ring — stop; the `disabled !== true` guard is
  wrong somewhere upstream (`fieldHostProps` omits `autoFocus` when disabled).

## 6. Outcome (executed on this host, 2026-10-17)

**The fix.** `useFocus(initiallyFocused = false)`; `Input`, `TextArea` and
`NumberField` pass `autoFocus === true && disabled !== true`; `OTPField`
initialises `focusedIndex` to `Option.some(0)` under the same condition.
`onBlur` still clears the state, so the ring cannot stick.

**The tests.** Five added (145 → **150** runtime tests, 14 files):

| File | Test | Guards |
| ---- | ---- | ------ |
| `fields.runtime.test.tsx` | `paints an autoFocus Input's ring on mount, and clears it when focus leaves` | the missing `onFocus`; and that blur still clears it |
| same | `paints an autoFocus TextArea's ring on mount` | the same wiring through `fieldChrome` |
| same | `paints no ring on a disabled autoFocus field` | the `disabled !== true` guard; focus is `None` and no ring paints |
| `number-field.runtime.test.tsx` | `paints the chrome ring from mount when autoFocus is set` | the wrapper ring, which a native focus event would otherwise be needed for |
| `otp.runtime.test.tsx` | `paints the first cell's ring from mount when autoFocus is set` | the per-cell focus index starts on cell 0 and clears on blur |

**Both directions proven, then restored green.** Reverting the four initialisers
to their previous form (`useFocus()`, `Option.none()`):

| Guard removed | Failing tests | Measured failure |
| ------------- | ------------- | ---------------- |
| all four initialisers | the four ring-on-mount tests | `expected false to be true` (four times) |

The disabled test still passed, which is the point of the guard. Restored:
`nub run --filter @gpuixui/primitives test:runtime` → **14 files, 150 tests, all
passing**; `nub run --filter @gpuixui/primitives test` → **306 tests**
(unchanged); `nub run check`, `nub run lint` and `nub run test` green.

**Docs corrected.** `docs/input.mdx` (the `autoFocus` row), `docs/number-field.mdx`
and `docs/otp-field.mdx` (the limitation bullets removed, verification updated),
`COMPONENTS.md` (Number Field and OTP Field rows, runtime count),
`packages/primitives/README.md` (count).
