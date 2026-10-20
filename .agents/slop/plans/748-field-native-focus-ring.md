# 748 — A field's focus ring follows native focus, and gives it up when focus leaves

**Phase:** F (integration and polish, Tier 2 hardening)
**Owner:** `components` workstream (`packages/components`)
**Depends on:** 110, 117, 200, 201, 388, 394, 522, 523, 536, 540, 552, 608, 613,
659, 660, 672, 680
**Number:** `748` is the first free number across every worktree — the highest
plan anywhere is `747` (primitives' disabled-fill exemption claims), and no
`748+` exists in the shared checkout or any workspace (`PLAN.md` D30).

**Status: done** (2026-10-20) — Field 12/12 in the real renderer; the two new
cases fail at `HEAD` (`boxShadow: undefined` on the focused field, and the seeded
ring staying after `focusNext()`), the disabled pin passes, and the two
mutations fail the expected cases. `fieldset`/`form`/`multi-step-form`/
`accessibility` are 50/50; `check`, `lint` and `test` exit `0` (unit 488 in 46
files).

---

## 1. The defect

`FieldInput` is the only input a consumer reaches for in a form, a dialog or a
validation flow. Its focus cue is the token focus ring. It currently derives
`focused` from two things only:

```tsx
const [focused, setFocused] = useState(autoFocus && !isDisabled);
// …onFocus={() => setFocused(true)}  onBlur={() => setFocused(false)}
```

`@gpuix/native@0.10.0` delivers **no React `focus`/`blur` for a native focus
change** (plans 536/540; measured again by plans 613, 659, 660 and 672). So:

- a field reached by `Tab` / `renderer.focusNext()` / `renderer.focusElement()`
  holds native focus and paints **no ring** (the keyboard user cannot see where
  they are);
- a field seeded by `autoFocus` keeps its ring **after focus leaves** (no
  `blur` arrives), so two fields can look focused at once.

`SearchInput` (plans 659/660) and `ComboboxTrigger` (plan 672) were already
fixed the same way: sample the renderer's own focused host while the part is
enabled, seed from `autoFocus` only until a host is reported, and paint nothing
while disabled (plan 680). `FieldInput` was left behind.

Measured on this host (2026-10-20) with a throwaway
`src/behaviour/zz-field-probe.test.tsx` (deleted before this plan lands), against
the real `TestRenderer`, two fields, light theme:

| step | observation | verdict |
| ---- | ----------- | ------- |
| render, no focus | `email.style.boxShadow = undefined` | correct |
| `focusElement(email)` | `focusedTestId = Some("email")`, `email.style.boxShadow = undefined` | **defect** |
| render `<FieldInput autoFocus>` | seeded ring painted on `email` | correct |
| `focusNext()` to the second field | `focusedTestId = Some("other")`, `email.style.boxShadow` **still the ring** | **defect** |

The probe run was `2 failed / 2` — both cases above — while the rest of the
native suite was `928 passed / 30 failed of 958` (28 recorded plan-540 binding
failures + the 2 probe cases).

## 2. The rule and the fix

**Rule.** While a `FieldInput` is enabled it samples
`renderer.getFocusedElementId()` (the shared
`internal/native-focus.ts`, 50 ms, one interval per mounted consumer). Its ring
is painted only while **its own host** is the focused host; the `autoFocus` seed
stands only until the sample reports a host, because the runtime applies
`autoFocus` after React's effects (plan 388). A disabled field paints no ring
and does not sample. The public `StateStyle<FieldInputState>.focused` reports the
same truth, so a caller's state function cannot disagree with the paint.

This is exactly the `SearchInput` rule (`src/search-input.tsx` lines 98–109);
`FieldInput` paints the ring on the `<input>` itself rather than on a wrapper, so
the comparison is against the input's own host id.

### 2.1 `packages/components/src/field.tsx`

1. Imports: add `PublicInstance` to the `@gpuix/react` type import, add
   `useCallback`/`useRef` to the React import, drop `useState`, and import the
   two internal helpers:

   ```ts
   import { useNativeFocusId } from "./internal/native-focus.js";
   import { useMergedRef } from "./internal/ref.js";
   ```

2. In `FieldInput`, destructure the caller's `ref` out of `rest` and stop
   destructuring `onFocus`/`onBlur` (they flow through `...rest` unchanged, so a
   caller's handlers still run — no wrapper is needed once the component no
   longer owns a `focused` setter):

   ```tsx
   export const FieldInput = ({
     invalid,
     disabled = false,
     autoFocus = false,
     style,
     ref,
     ...rest
   }: FieldInputProps) => {
   ```

3. Replace the seeded `useState` with the sample:

   ```tsx
   const input = useRef<PublicInstance | null>(null);
   const attach = useCallback((next: PublicInstance | null) => {
     input.current = next;
   }, []);
   const setInput = useMergedRef<PublicInstance | null>(attach, ref);
   // The sample is the only focus signal: 0.10.0 delivers no React focus/blur
   // for a native move (plans 536/540). The `autoFocus` seed stands until it
   // reports a host, because the runtime applies that focus after React's
   // effects (plan 388).
   const focusedId = useNativeFocusId(!isDisabled);
   const focused =
     !isDisabled &&
     ((focusedId === null && autoFocus) ||
       focusedId === (input.current?.id ?? null));
   ```

   `!isDisabled` already makes the seed safe, so the old
   `autoFocus && !isDisabled` guards on the state and the `autoFocus` prop stay
   as they are (`autoFocus={autoFocus && !isDisabled}`), and the disabled branch
   (`readOnly`, `tabIndex: -1`) is untouched.

4. On the `<input>`: add `ref={setInput}`; delete the two `onFocus`/`onBlur`
   wrappers that called `setFocused`. Keep `state`,
   `resolveStyle(style, state)` and the ring line, dropping its now-redundant
   `!isDisabled` so the derivation is the single source of the rule:
   `...(focused ? focusRing(theme) : {})`. The invalid + focused case (plan 552)
   must still paint both the destructive border and the ring.

### 2.2 What must not change

- `Field`'s label/description/error wiring, `role="alert"` on `FieldError`,
  `stateDescription` (`Disabled`, `Required`, the message), the destructive
  border and the `aria-label` from the field label.
- A disabled field stays `readOnly`, out of the tab order, and ring-free
  (plans 394/680).
- `FieldInput` still accepts and composes the caller's `ref` (plan 696's rule
  applies even where the caller's ref was previously just spread).
- Every caller `onFocus`/`onBlur` still runs exactly once per real event.
- `Form`, `MultiStepForm`, `Fieldset` and the mounted examples keep their
  behaviour; no other component changes.

## 3. Test plan

File: `packages/components/src/behaviour/field.test.tsx` (real GPUix renderer).

Add the imports the new cases need: `until` from `../internal/interaction.js`
(alongside `focusedTestId`); the form fixture already takes `error`, `required`
and `onChange` — extend it or render the two-field fixture inline.

1. **New** `paints the token ring on a field focused by code`:
   - render two `Field`/`FieldInput` pairs in a `div` (`email`, `other`), light
     theme;
   - `form.renderer.focusElement(email.id)`;
   - `await until(() => form.renderer.findByTestId("email")?.style.boxShadow !== undefined)`;
   - assert `focusedTestId(form)` is `Some("email")` **and**
     `email.style.boxShadow` equals `focusRing(lightTheme).boxShadow`.
   - **At `HEAD` this fails**: focus is on `email`, the ring is `undefined`
     (the probe's measurement).

2. **New** `clears the seeded ring when native focus leaves, and reports it in
   the state`:
   - render `<FieldInput testId="email" autoFocus>` and a second field
     `testId="other"`, with a `style` callback that records
     `state.focused`;
   - assert the seeded ring is painted and the last recorded state is `true`;
   - `form.renderer.focusNext()` (email → other);
   - `await until(() => email.style.boxShadow === undefined)`;
   - assert `focusedTestId(form)` is `Some("other")` and the last recorded
     `state.focused` is `false`.
   - **At `HEAD` this fails**: the ring stays because no `blur` arrives.

3. **New pin** `paints no ring on a disabled field, even when seeded`:
   - render `<Field label="Email"><FieldInput testId="email" disabled autoFocus /></Field>`;
   - assert `email.style.boxShadow` is `undefined` immediately (the seed is
     guarded) and stays undefined after one sample tick
     (`await until(() => true)` is pointless — assert again after
     `await until(() => form.renderer.getFocusedElementId() !== email.id)` or
     simply assert once after `focusNext()` to a sibling);
   - **passes at `HEAD`**; it fails if `!isDisabled` is dropped from the
     derivation.

Suite 9 → 12 cases. The existing plan-552 cases (`keeps the focus ring on an
invalid control in both themes`, `paints no ring on an invalid control that does
not hold focus`, `reflects autoFocus in its focus state`) must stay green: the
seeded ring is painted immediately because `focusedId` starts `null`.

### Both-direction proof (run and record)

- New tests + the old `field.tsx`: **2 failed / 10 passed** (cases 1 and 2),
  case 3 passes.
- New tests + the fix: **12 passed**.
- Replace the derivation with `const focused = !isDisabled && autoFocus`
  (the seed only, ignoring the sample) → cases 1 and 2 fail; case 3 passes.
- Remove only `!isDisabled &&` from the derivation → case 3 fails (a disabled
  auto-focused field rings); the other two pass. The paint line no longer
  repeats the guard, so the derivation is the single source of the rule.

## 4. Documentation and inventory sync (all required before "done")

1. `packages/components/docs/field.mdx`
   - **Accessibility and limitations**: replace the last bullet with the
     measured rule, keeping the exact contract sentence the inventory check
     requires: *"Focus cues are seeded by `autoFocus`; `FieldInput` then samples
     the renderer's focused host every 50 ms while it is enabled, because the
     binding delivers no React `focus`/`blur` for a native move, so its ring
     follows native focus and clears when focus leaves. A disabled field paints
     no ring."*
   - **Verification**: 9 → 12 and name the native-focus ring, the clearing and
     the disabled pin.
2. `COMPONENTS.md` → **Inline validation** row: state that the ring follows the
   renderer's focused host (50 ms sample) and that the seeded ring clears when a
   native focus move leaves the field; 9 → 12 native tests.
3. `COMPONENTS.md` → cross-cutting focus paragraph: the list of parts that read
   the renderer's focused host gains `FieldInput` (plan 748), and the "No
   component fakes it with a timer or poll" sentence is replaced with the shipped
   truth: a part that owns a ring samples the renderer's own focused host where
   the binding delivers no signal; it never invents focus from colour or hover.
4. `docs/component-api.md` §5: same correction — the "Components never fake it
   with a timer or a poll" sentence contradicts the listed samplers; state the
   measurement rule and name `FieldInput` with `SearchInput` and
   `ComboboxTrigger`.
5. `src/field.tsx` → `fieldMeta.limitations`: add *"the focus ring follows a
   50 ms sample of the renderer's focused host until a shared native-focus
   tracker exists"* (the same wording `SearchInput` uses).
6. `TODO.md` → under *Tier 2 hardening after the inventory closed*, add the
   ticked row for plan 748 with the measurement, counts and gates.
7. `.agents/slop/plans/README.md` → add the 748 row with its status.
8. `PLAN.md` D30 → append that `748` is this plan and the next components
   overflow plan number is `749`.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

| Command | Expected |
| ------- | -------- |
| `cd packages/components && nub run test:behaviour field` | **before**: 9 passed. **after**: 12 passed. |
| the same with the old `field.tsx` and the new tests | cases 1 and 2 fail (ring `undefined`; seeded ring stays), case 3 passes |
| `cd packages/components && nub run test:behaviour form multi-step-form fieldset` | unchanged green (the three consumers of `FieldInput`) |
| `cd packages/components && nub run test:behaviour accessibility` | green: every mounted example still has one named control per role (no unnamed or double-named field) |
| `nub run check` | exit 0 (types, unit suite, inventory count check agreeing with 12) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

The full native suite is **not** required for this change (not cross-cutting),
but it was run as the end-of-task check and is **931 passed / 28 failed of 959**;
all 28 are the recorded plan-540 binding classes (the same failing files as
before, no new file). The pre-change baseline with the throwaway probe was 928
passed / 30 failed of 958 — 28 binding failures plus the two probe cases — so the
change adds three cases, removes the two probes and introduces no failure.

## 6. STOP conditions

Stop and report with evidence if any of these happen:

- `getFocusedElementId()` reports no host after `renderer.focusElement(email)`
  (the sampler has nothing to compare against) — do not fake the ring; report the
  binding.
- The `<input>` host id changes on every render, so the comparison never holds —
  the sampler approach is wrong for this host element; report the measurement
  instead of switching to a prop on the field wrapper.
- A caller's `onFocus`/`onBlur` stops firing after the wrapper removal (e.g. the
  host swallows the prop) — inspect the spread order before changing the test.
- The existing plan-552 cases go red: the invalid border/ring relationship is
  part of the contract; fix the derivation rather than weakening the test.
- `Form` / `MultiStepForm` / `Fieldset` behaviour changes (their suites are the
  scoped check).

## 7. Acceptance

- A field focused by code, `Tab` or a modal's focus entry paints the token ring;
  a focused invalid field keeps both the destructive border and the ring.
- A field that loses native focus clears its ring and reports
  `state.focused === false`; a disabled field never paints a ring.
- Both-direction proof recorded: the two new cases fail at `HEAD` for the
  measured reason, and each half of the derivation has a mutation that fails a
  case.
- Docs, `COMPONENTS.md`, `docs/component-api.md`, `TODO.md`, the plan index and
  `PLAN.md` D30 are synced; the docs' stated count is the suite's real count.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
- The change is committed on `agent/components` and pushed (never to `master`).
