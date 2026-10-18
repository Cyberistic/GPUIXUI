# 390 — Select option locators, a pointer-selection guard, and no debug probes in the runtime suite

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | F (test hygiene and automation contract) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `057`, `069`, `074`, `348`, `349`, `386` |
| Evidence | measured on this host, 2026-10-18 23:50 (§1) |

## 1. The gap

Two defects, one file and one API:

### 1.1 A debug probe ships as a runtime test

`packages/primitives/runtime/__probe.runtime.test.tsx` was committed in
`f51c5568` ("docs(primitives): record the host's degraded live suite as an open
task") while the degraded artifact was being diagnosed. It is not a test of the
component contract:

- test 3, *"probe: click the enabled option"*, **fails** —
  `expected [ 'c' ] to strictly equal []`. Clicking the option's painted label
  does select it, which is the correct behaviour; the probe asserts the
  opposite.
- tests 1 and 2 pass by asserting that a normal interaction reports **nothing**
  (`expect(values).toStrictEqual([])`), because they drive keys at the trigger
  while the open list owns focus. They encode probe accidents, not contracts.

So the suite has one failing test that belongs to no bug, and two green tests
that would pass if pointer selection and keyboard commit broke. `AGENTS.md` §3
("a test must test something meaningful") is exactly what this violates; the
file also has no header comment, unlike all 39 real runtime files.

### 1.2 An option row has no locator

The trigger is `${testId}-trigger` and the indicator `${testId}-chevron`
(plans 083, 343), but an option row has no `testId`. Automation — this package's
own pointer tests, the playground's live smoke, a consumer's suite — has to
find the painted label and walk to its parent (`fields.runtime.test.tsx` does
this twice). That is brittle (the option's structure is an implementation
detail) and it is the reason the probe could click the label rather than the
row.

The contract to state once: an option is addressable as
`${testId}-option-${value}`, the same way the trigger and chevron are named.

## 2. The change

1. **Delete** `packages/primitives/runtime/__probe.runtime.test.tsx`.
   It is a diagnostic, its finding (clicking an option's label selects it) is
   kept as a real test in step 3, and its two other cases assert the wrong
   contract.

2. **Name every option row** in `packages/primitives/src/components/Select.tsx`:
   - add one documented helper beside the other placement helpers:
     ```ts
     /** The locator an option row carries: `${testId}-option-${value}`. */
     export const selectOptionTestId = (
       testId: string | undefined,
       value: string,
     ): string | undefined =>
       testId === undefined ? undefined : `${testId}-option-${value}`;
     ```
   - pass `testId={selectOptionTestId(testId, choice.value)}` to `SelectItem`
     in `row`, which both the flat and grouped branches use, so a grouped
     option is named too.

3. **Add** `packages/primitives/runtime/select-pointer.runtime.test.tsx`
   (header comment states both bugs guarded):
   - *"selects the option whose painted label is clicked, and returns focus to
     the trigger"* — open the list, click the **text element** `"Beta"` (not a
     row found by walking parents), assert the reported value is `"b"`, the
     list is gone, and `runtime.focused()` is `"s-trigger"`. This is the case
     the failed probe measured correctly, and the focus half proves a pointer
     commit does not strand native focus (measured 2026-10-18: focus returns to
     the trigger).
   - *"does not select a disabled option and keeps the list open"* — click the
     painted label of a disabled option; assert no report and that the list is
     still painted.
   Both cases read values, focus and presence only — no absolute geometry — so
   they are stable on the degraded artifact (plan 379 §6 / plan 529).

4. **Extend the element-tree suite**
   `packages/primitives/src/components/Select.test.tsx`:
   - the existing *"names the list and every option"* case gains `testId: "sel"`
     and asserts the option `testId`s are `["sel-option-alpha",
     "sel-option-beta"]`;
   - the grouped case asserts the grouped option carries
     `region-option-eu` (a group heading has no locator: it is a caption).
   - a case without `testId` asserts the rows carry none (the wrapper must not
     invent an id).

5. **Add** `packages/primitives/src/runtime-hygiene.test.ts` — an offline guard,
   same shape as `package-manifest.test.ts` (Effect `FileSystem`, `NodeFileSystem`):
   - every file under `packages/primitives/runtime/` matching
     `*.runtime.test.tsx` starts with a `/**` header (the file-level "what this
     guards" comment `AGENTS.md` §3 asks for);
   - no runtime test file name starts with `__` (a scratch probe is not a
     suite);
   - failures report the offending file path by name.

6. **Docs and inventory**
   - `packages/primitives/docs/select.mdx` — the `testId` API row names the
     option locator as well as the trigger and chevron.
   - `COMPONENTS.md` — the Select row appends the locator contract and the
     pointer guard.
   - `TODO.md` — add and tick the task under the primitives section; update the
     section's count.
   - `.agents/slop/plans/README.md` — index this plan.

## 3. STOP conditions

1. `SelectItem` drops `testId` before the host element (check with one runtime
   render: `runtime.element("s-option-b")` is `Some`). If it does, stop: the
   locator cannot be promised and the plan's step 2 is replaced by a TODO row
   naming the runtime gap — do not put the id on a wrapper div instead.
2. A grouped option's value is not unique across groups (plan 075 says it must
   be), so two rows share one locator. Stop and report; do not add an index
   suffix without a decision.
3. `clicking an option's painted label` stops selecting on a clean binding.
   Then that is a real component/runtime defect, and this plan becomes its
   investigation (record the measured failure before changing the test).

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test` | 48 files / 682 tests green, including the new element-tree and hygiene cases |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/select-pointer.runtime.test.tsx` | 1 file, 2 tests, exit `0` |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx` | the select **value** cases still pass; the file's focus-ring and placement cases are red on this artifact for the pre-existing reason (plan `529`) — 44 passed / 30 failed, measured in §6 |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |

### Two-direction proof (run each, then revert)

| Guard | Mutation | Expected |
| ----- | -------- | -------- |
| option locator | remove the `testId` from `SelectItem` | the element-tree locator case fails by value |
| pointer commit reports | pass `onValueChange: () => {}` to `renderSelect` | the pointer case fails on the reported value |
| disabled option | render the disabled option with `disabled={false}` | the disabled case fails on the report |
| pointer commit focus | (observed, not mutable without editing the wrapper) | recorded in §6 |
| runtime hygiene | add a headerless `runtime/__probe3.runtime.test.tsx` | the hygiene case fails by file name; delete it and the suite is green |

## 5. Acceptance

- No `__probe*` file exists; every runtime file has a header and the guard is
  the reason.
- An option row is addressable by `${testId}-option-${value}`, documented and
  asserted, with no id invented when `testId` is absent.
- Pointer selection of a **painted label** is a green runtime test, including
  the disabled half and the focus return.
- All commands in §4 were run; results and measured evidence are in §6.
- Gates green; committed on `agent/primitives` and pushed.

## 6. Results (2026-10-18)

**Measured before writing anything** — the probe alone, on this host:

```
FAIL runtime/__probe.runtime.test.tsx > probe: click the enabled option
AssertionError: expected [ 'c' ] to strictly equal []
Tests 1 failed | 2 passed (3)
```

So clicking an enabled option's painted label *does* select it; the file
asserted the opposite. The two green cases drove keys at the trigger while the
open list owned focus, which is why they saw nothing — probe accidents, not
contracts.

**Changed**

- `runtime/__probe.runtime.test.tsx` deleted.
- `src/components/Select.tsx`: `selectOptionTestId(testId, value)` and
  `testId={selectOptionTestId(testId, choice.value)}` on `SelectItem`. The row
  is the same element the flat and grouped branches already build.
- `runtime/select-pointer.runtime.test.tsx`: the two cases in §2; `2/2` green.
  `runtime.element("s-option-c")` is `Some`, so `SelectItem` forwards `testId`
  to the host element (STOP condition 1 cleared).
- `src/components/Select.test.tsx`: the option-locator assertions in the flat
  and grouped cases, plus the no-`testId` case (`33` tests in the file).
- `src/runtime-hygiene.test.ts`: `2` tests over the `runtime/` directory.
- `docs/select.mdx`, `COMPONENTS.md`, `TODO.md`, this index.

**Two-direction proofs (each mutation applied, observed, reverted)**

| Mutation | Observed |
| -------- | -------- |
| drop `testId={selectOptionTestId(...)}` | `Select.test.tsx`: 2 failed — the flat list read `[undefined, undefined]`, the group read `[undefined, undefined]` for `["region-option-eu", "region-option-us"]` |
| `onValueChange: state.set` → `() => {}` | `select-pointer`: enabled case failed, `expected [] to strictly equal ["c"]` |
| `disabled={choice.disabled}` → `disabled={false}` | `select-pointer`: disabled case failed, `expected ["b"] to strictly equal []` |
| add `runtime/__probe3.runtime.test.tsx` with no header | `runtime-hygiene`: **2** failed by name — `[ "__probe3.runtime.test.tsx" ]` in both the header and the name rule |
| delete it again | both green |

The focus-return half is an observation, not a mutation: after a pointer
commit, `runtime.focused()` is `s-trigger` (the wrapper does not move focus
itself; the runtime restores it, which is what the test records).

**Runs**

- `nub run --filter @gpuixui/primitives test` — **48 files / 682 tests, exit 0**
  (was 47 / 679).
- `nub run --filter @gpuixui/primitives test:runtime -- runtime/select-pointer.runtime.test.tsx`
  — **2/2, exit 0**.
- `nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx runtime/select-pointer.runtime.test.tsx`
  — `select-pointer` 2/2; `fields` 44 passed / 30 failed, and every failure is a
  focus-ring (`boxShadow` `undefined`) or absolute-placement case — the
  pre-existing artifact delta recorded in `TODO.md` and plan `529`, not this
  change (the new `testId` adds no style or layout).
- A full `test:runtime` run on the 23:35 artifact: **656 tests, 544 passed /
  112 failed across 20 of 42 files**; one of the 112 was the deleted probe. After
  the deletion the count is 111 and no assertion was re-baselined. Recorded in
  `TODO.md`.
- `nub run check` — exit `0` (check-tests, lint, format, every workspace type
  check); `nub run lint` — exit `0`; `nub run test` — exit `0` (primitives 682,
  components 308, playground 11, icons and the rest green).
