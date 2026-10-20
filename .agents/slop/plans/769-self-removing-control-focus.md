# 769 — A control that removes itself hands focus on

| Field | Value |
| ----- | ----- |
| Workstream | components (Tier 2 composition and feedback) |
| Phase | F — integration and polish |
| Depends on | 110, 111, 314, 316, 332, 334, 522, 613, 659, 680, 693, 754, 755 |
| Status | pending |
| Claimed number | `769` — the first free number across every worktree at claim time (`766`/`767` are the tokens theme's, `768` the playground's; checked in the shared checkout and every `workspaces/*` tree) |

## 1. The bug

Two parts render a control that **unmounts itself** when it is activated:

- `TagInputChip`'s removal control calls `remove(value)`, the caller drops the
  token, and the whole chip — including the focused control — leaves the tree.
- `HotkeyRecorder`'s clear control calls `onChange(null)`, the binding becomes
  `null`, and the control is no longer rendered (`value === null` branch).

Native focus is left on an element that no longer exists, so the runtime reports
no focused host at all. A keyboard user who removes a chip or clears a shortcut
is dropped out of the tab order: the next `Tab` starts from the beginning of the
window, not from where they were.

Measured 2026-10-20 in the real `TestRenderer` (the inherited scratch probe
`src/behaviour/zz-probe.test.tsx`, run with console un-interception):

```
# focus chip-b-remove, real press on its centre
AFTER REMOVE { _id: 'Option', _tag: 'None' }   TEXT [ 'a', 'c' ]
# focus recorder-clear, real press on its centre
AFTER CLEAR   { _id: 'Option', _tag: 'None' }
```

The value change itself is correct (the token list and the binding update); only
focus is lost.

This is the same family the package already fixed three times: a `List` row that
is removed hands its focus to the live tab stop (plan 708), a `Tabs` tab that is
removed or disabled hands focus on (plans 712/646), and a notification row
removed under the reading cursor reveals the next live row (plan 746). The
package also already owns the inverse rule for a control that *stays* mounted:
`SearchInput`'s clear control puts focus back in its input (`search-input.tsx`
`clear`). The two self-removing controls were the only remaining gap.

## 2. The rule

**Activating a control that removes itself hands focus to the next stop in its
own group.** One stop per component, chosen because it always exists:

- `TagInputChip` → the tag **field** (`TagInput` already registers the field's
  host id for the group ring). Removing a token leaves the user where the next
  token is typed, which is also what `SearchInput`'s clear does.
- `HotkeyRecorder`'s clear control → the **recorder** root, which is a
  `role="button"` tab stop. The user can record again or `Tab` onwards.

The handover lives in the activation handler, not in an effect, so a
programmatic value change (`onValueChange` from the app, `onChange(null)` from
somewhere else) never moves focus. There is no new public prop and no new state:
each component reads an id it already holds.

`TagInput`:

```ts
// context gains the field's focus action next to the field registration
readonly focusField: () => void;
// root
const renderer = useGpuix().renderer;
const focusField = (): void => {
  if (fieldId !== null) renderer?.focusElement?.(fieldId);
};
// chip, both activation paths
const removeAndFocus = (): void => {
  remove(value);
  focusField();
};
```

`HotkeyRecorder`:

```ts
const clear = (skip: boolean): void => {
  skipStart.current = skip;
  onChange(null);
  if (rootInstance !== undefined) renderer?.focusElement?.(rootInstance.id);
};
```

Both handlers keep their existing order: the state request first (so the caller
owns the value), the focus move second (the target survives the update). A
pointer clear still consumes its own bubbled click (plan 693) and a keyboard
clear still claims its key, so the handover cannot start a recording.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/tag-input.tsx` | `focusField` on the context, the root's `useGpuix`, the chip's one `removeAndFocus` for both activation paths |
| `packages/components/src/hotkey-recorder.tsx` | `useGpuix`, focus the root after `onChange(null)` |
| `packages/components/src/behaviour/tag-input.test.tsx` | 2 native cases (17 → 19) and the header's bug list |
| `packages/components/src/behaviour/hotkey-recorder.test.tsx` | 2 native cases (16 → 18) and the header's bug list |
| `packages/components/docs/tag-input.mdx` | One accessibility bullet, the limitations note, the verification count/list |
| `packages/components/docs/hotkey-recorder.mdx` | One accessibility bullet, the verification count/list |
| `COMPONENTS.md` | Tag / token input and Hotkey-recorder rows: the rule and the counts |
| `.agents/slop/plans/README.md` | Index this plan |
| `PLAN.md` | Append `769` to the D30 overflow list |
| `TODO.md` | Tick the hardening line under the Tier 2 hardening list |

No public API change, no dependency, no other package, no example change (the
existing examples already exercise both controls).

## 4. Test plan

### Native (`src/behaviour/tag-input.test.tsx`)

Each case states the bug it guards in its comment:

1. **"hands focus to the field when a chip's control removes it"** — render two
   tokens, focus `chip-design-remove`, send a real `Space` key **down** then
   **up**, assert the chip is gone, `onValueChange` saw `["docs"]`, and
   `focusedTestId` is `Some("tag-field")`. **Fails at `HEAD`** (`None`).
2. **"hands focus to the field when a pointer press removes a chip"** — focus the
   same control, `clickCentreOf` it, assert the chip is gone and focus is
   `Some("tag-field")`. **Fails at `HEAD`** (`None`).

The existing removal cases (`removes a chip through its removal control`,
`removes a chip on Space release, not on press`) stay unchanged: they are the
pins that prove the value contract and the activation split are untouched.

### Native (`src/behaviour/hotkey-recorder.test.tsx`)

1. **"hands focus to the recorder when its control clears the binding"** — focus
   `recorder-clear`, send `Enter`, assert the binding is `null` and
   `focusedTestId` is `Some("recorder")`. **Fails at `HEAD`** (`None`).
2. **"hands focus to the recorder when a press clears the binding"** — focus the
   control, `clickCentreOf` it, assert `null` and `Some("recorder")`.
   **Fails at `HEAD`** (`None`).

The existing `starts recording on the next click after a keyboard clear` case is
the pin: the handover must not consume the pointer guard or start a recording,
and that case fails if it does.

### Commands and expected results

```sh
# 1. Prove the four new native cases fail on the old source
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/tag-input.test.tsx src/behaviour/hotkey-recorder.test.tsx
# EXPECT: 4 failed | the rest passed, the failures exactly the four new cases
# (tag-input also carries its recorded plan-540 caller-handler failure).

# 2. After the fix, the same two files
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/tag-input.test.tsx src/behaviour/hotkey-recorder.test.tsx
# EXPECT: only the recorded plan-540 failures remain (the tag-input
# caller-handler case); every new case passes.

# 3. The pure suite (the docs/inventory count check lives here)
cd ../../ && nub run --filter @gpuixui/components test
# EXPECT: exit 0, the same number of tests as the baseline this turn.

# 4. End-of-task native run
nub run --filter @gpuixui/components test:behaviour
# EXPECT: 4 more passing than the baseline measured this turn, with the same
# recorded plan-540 failures. Record the exact totals.

# 5. Gates
nub run check && nub run lint && nub run test
# EXPECT: all exit 0.
```

Delete the inherited `src/behaviour/zz-probe.test.tsx` before the first commit
(it is the scratch probe this plan measured with, never tracked).

## 5. STOP conditions

- Any of the four new native cases passes at `HEAD`. Stop and re-measure: a test
  that cannot fail is not evidence.
- The handover fires for a value change the app made without activating the
  control (for example a harness button that calls `onValueChange` directly).
  Stop: the move belongs to the activation handler, not to an effect.
- A pointer clear starts a recording, or a keyboard clear consumes the pointer
  guard: the plan-693 pin must stay green. Stop and fix the order, not the test.
- Focus lands on a host that is about to unmount (the chip again, or the clear
  control). Stop: the target must be the surviving stop named in §2.
- Any other tag-input or hotkey-recorder report changes, or a full-suite failure
  appears outside the recorded plan-540 classes. Stop and record it.
- `769` is taken by another worktree before the plan is committed. Renumber to
  the next free number, rename the file, and update the index, D30 and this
  header.

## 6. Acceptance criteria

- Activating the chip removal control (Enter/key, Space release or a pointer
  press) leaves focus on the tag field; activating the recorder's clear control
  leaves focus on the recorder. Both are proven natively, in both directions.
- A value change that did not come from the control never moves focus.
- `docs/tag-input.mdx`, `docs/hotkey-recorder.mdx`, `COMPONENTS.md` and the
  inventory agree with the suites' counts; `inventory.test.ts` passes.
- `nub run check`, `nub run lint` and `nub run test` exit `0`; the full native
  suite has no failure outside the recorded plan-540 classes.
- The plan is indexed, `TODO.md` is ticked, and the work is committed on
  `agent/components` and pushed.
