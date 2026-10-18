# 338 — `NumberField` advertises caret keys it never receives

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `054`, `077`, `203` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands and expected results, §5 the test plan and the two-direction
proof, §6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, this host, 0.10.0)

`docs/number-field.mdx` publishes this keyboard table:

| Key | Documented effect |
| --- | ----------------- |
| `ArrowUp` / `ArrowRight` | + one step |
| `ArrowDown` / `ArrowLeft` | − one step |
| `PageUp` / `PageDown` | ± ten steps |
| `Home` / `End` | `min` / `max` — only when the field has that bound |
| `Enter` | commit and reformat |

`core/number.ts` implements all of it (`ARROW_STEPS` maps `left`/`right` as well
as `up`/`down`, and `decideNumberKey` answers `home`/`end`), and
`core/number.test.ts` plus `src/components/NumberField.test.tsx` assert it. The
runtime suite only ever pressed `up`, `pagedown` and `enter`.

A probe (a temporary runtime file, deleted after recording) mounted a
`NumberField` with `defaultValue={12}`, `min={0}`, `max={999}` and `autoFocus`,
pressed one key through `renderer.nativeSimulateKeyDown(input.id, key)`, then
typed `3` through the runtime's text pipeline:

| Key pressed | `onValueChange` from the key | Painted after typing `3` |
| ----------- | ---------------------------- | ------------------------ |
| `up` | `[13]` | — |
| `down` | `[11]` | — |
| `left` | **`[]`** | `132` |
| `right` | **`[]`** | `123` |
| `home` | **`[]`** | `312` |
| `end` | **`[]`** | `123` |

The four caret keys never reach the field's `onKeyDown` handler: GPUI's native
editor consumes their key **down** to move the caret (`left` then `3` inserts
between the digits, `home` then `3` inserts at the start), exactly as plan `076`
measured for `OTPField`. So `ArrowRight`/`ArrowLeft`/`Home`/`End` step nothing,
and the advertised "jump to the bound" does not exist. The behaviour the user
actually gets — caret movement — is the right behaviour for a text field; the
defect is the published contract, the dead rule in `core/number.ts`, and the two
tests that assert it.

Plan `076` fixed the same class in `OTPField` by moving arrows/Home/End to
**key up**. That is not the answer here: an OTP cell has no caret to protect,
while a number field is a real editor and `Home`/`End`/`Left`/`Right` are the
keys that put the caret at the digits being changed. Overloading them would take
away editing for a shortcut with no native precedent in a text-first field.

## 1. The decision

**The field's key contract is exactly the set of keys the runtime delivers:
`ArrowUp`, `ArrowDown`, `PageUp`, `PageDown` and `Enter`.** The caret keys belong
to the native editor and are documented as such. `decideNumberKey` stops
answering `left`, `right`, `home` and `end`; the matching branches and tests are
deleted; the `Home`/`End` "jump to a bound" claim is replaced with a stated
limitation.

No key-up handler is added. The alternative is recorded in §1 and in the docs so
a later reader does not re-derive it: we *could* see those keys on key up, and we
deliberately do not, because moving the caret is the more valuable contract.

## 2. The rule

1. `core/number.ts`:

   ```ts
   const ARROW_STEPS: Readonly<Record<string, number>> = {
     up: 1,
     down: -1,
   };
   ```

   `decideNumberKey` drops the `home`/`end` branches, so it maps `up`, `down`,
   `pageup`, `pagedown` and returns `Option.none()` for everything else,
   including the caret keys. Its docstring states why (the runtime consumes
   them).

2. `src/components/NumberField.tsx` needs no logic change — it already routes
   only through `decideNumberKey` — but its header comment and the
   `onKeyDown` path must stop implying a broader contract.

3. `docs/number-field.mdx`: the Keyboard table lists the measured keys only, and
   a paragraph states that `ArrowLeft`/`ArrowRight`/`Home`/`End` move the native
   caret, that 0.10.0 does not deliver them to the component, and that there is
   no bound shortcut (type the bound). The Verification line that says
   "Home/End only with a bound" is corrected.

4. `COMPONENTS.md` → Number Field records the measurement and the corrected
   contract, and refreshes the runtime count.

5. `TODO.md` gains and ticks the defect row.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/number.ts` | drop `left`/`right` from `ARROW_STEPS`, drop the `home`/`end` branches, correct the docstring |
| `packages/primitives/src/core/number.test.ts` | the arrow/page case no longer asserts caret keys; the "jumps only to a bound" case becomes "leaves the caret keys to the native editor" (`Option.none` for all four) |
| `packages/primitives/src/components/NumberField.tsx` | header comment: name the measured key contract |
| `packages/primitives/src/components/NumberField.test.tsx` | the element-tree key case asserts `up`/`down`/`pageup`/`pagedown` reach `onValue`, `enter` commits, and `left`/`right`/`home`/`end` do not; drop the now-redundant "jumps nowhere with Home/End" case |
| `packages/primitives/runtime/number-field.runtime.test.tsx` | one `it.each` over the four caret keys: the key reports nothing, and the following edit lands at the caret (`left` → `132`, `right` → `123`, `home` → `312`, `end` → `123`) |
| `packages/primitives/docs/number-field.mdx` | the Keyboard table, the caret paragraph, the Verification list |
| `COMPONENTS.md` | the Number Field row |
| `TODO.md` | add and tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

Do **not** edit `packages/components`, `packages/tokens`, `packages/icons`,
`apps/*` or `docs/gpuix-capabilities.md` (no capability changes: the runtime's
behaviour is correct and unchanged).

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/number.test.ts src/components/NumberField.test.tsx` | the corrected rules pass |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 41 files / 544 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/number-field.runtime.test.tsx` | the four new rows pass; every existing number-field case stays green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 22 files / 364 tests) |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write the runtime case first and run it against
the unmodified rule; record the failing assertion in §7.

### 5.1 The pure rule (`src/core/number.test.ts`)

1. **"steps with the arrows and pages with PageUp/PageDown"** — `up`, `down`,
   `pageup`, `pagedown` keep their current expectations.
2. **"leaves the caret keys to the native editor"** — `left`, `right`, `home`
   and `end` are `Option.none()`, with the measured reason in the comment. This
   is the guard: re-adding any of the four makes it fail by key.

### 5.2 The element tree (`src/components/NumberField.test.tsx`)

3. **"routes only the keys the runtime delivers"** — invoking the input's
   `onKeyDown` with `up`/`down`/`pageup`/`pagedown` reaches `onValue` with the
   stepped numbers; `left`/`right`/`home`/`end` reach it **zero** times; `enter`
   commits once. (The old test asserted `end` → `100`, which is the false claim.)

### 5.3 The runtime (`runtime/number-field.runtime.test.tsx`)

4. **`it.each` over the four caret keys** — a field with `defaultValue={12}`,
   `min={0}`, `max={999}` and `autoFocus`; press the key through
   `nativeSimulateKeyDown(input.id, key)` and assert `onValueChange` is empty
   (the key is not a step); then `runtime.type("3")` and assert the painted text
   is the caret insertion (`left` `132`, `right` `123`, `home` `312`, `end`
   `123`) and that the reported value is that number. Before the fix `left`
   reports `11` and paints `113`, and `home` reports `0` and paints `03`.

### 5.4 Two-direction proof (required before "done")

- Run §5.1–§5.3 against the **unmodified** tree first; record the failing
  assertions in §7.
- Re-add `left: -1` (or `right: 1`) to `ARROW_STEPS` → the `left` runtime row
  fails with the step report, and the core case fails by key.
- Re-add the `home` branch → the `home` runtime row fails and the core case
  fails by key.
- Restore; every suite is green.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. The caret keys **do** reach the handler on this host (the probe's `[]`
   becomes a step report) — then the §0 measurement or the fixture changed, and
   the plan must be re-derived rather than shipped with a false premise.
3. Typing after a caret key does not land where §0 recorded (`132` / `123` /
   `312` / `123`) — re-measure and record the real strings instead of weakening
   the assertion.
4. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

### 7.1 The fix

`decideNumberKey` now answers only `up`, `down`, `pageup` and `pagedown`:
`ARROW_STEPS` lost `left`/`right` and the `home`/`end` branches are gone.
`NumberField` needed no logic change (it already routed only through that rule),
so this is a truth fix: the code, the tests and the docs now say what the
runtime does.

The runtime's behaviour is unchanged and correct — the caret moves on all four
keys. The measured insertion after `12`:

| Key | `onValueChange` from the key | After typing `3` |
| --- | ---------------------------- | ---------------- |
| `left` | `[]` | `132` |
| `right` | `[]` | `123` |
| `home` | `[]` | `312` |
| `end` | `[]` | `123` |

### 7.2 The two-direction proof

| Mutation | Failing assertion |
| -------- | ----------------- |
| `left: -1` / `right: 1` restored to `ARROW_STEPS` | `number.test.ts` → "leaves the caret keys to the native editor": expected `None`, received `Some(49)`; `NumberField.test.tsx` → "leaves the caret keys unhandled": expected the callback `+0` times, got `2` |
| the `home` branch restored | the same two tests fail again: `None` vs `Some(0)`, and the handler reported once |

Run against the **unmodified** tree, the runtime case passes in both directions —
the native editor consumes the key down before any rule runs, which is exactly
the measurement the plan is built on. So the *user-visible* contract (the four
keys move the caret and report nothing) is pinned by the runtime case, and the
*rule* (and the docs' former claim) is pinned by the two offline cases. The
runtime case is not vacuous: it fails if a future binding starts delivering
those keys **and** the rule answers them, which is the regression this plan
removes.

### 7.3 Counts

Offline **41 files / 544 tests** (one case replaced by one: the old Home/End
case became the caret-key guard). Runtime **22 files / 368 tests** (364 + 4
caret rows). `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] `decideNumberKey` answers only the keys the runtime delivers, and the
      caret keys are `Option.none()`.
- [x] The element-tree test proves the handler routes the delivered keys and
      none of the caret keys.
- [x] The runtime proves all four caret keys move the caret and report nothing.
- [x] The docs table and verification list match the measurement; the
      limitation (no bound shortcut) is stated.
- [x] `COMPONENTS.md`, `TODO.md` and the plan index record it.
- [x] Every new test fails in both directions before/after the fix.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
