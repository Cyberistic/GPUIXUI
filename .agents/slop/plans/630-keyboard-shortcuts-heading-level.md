# 630 — Keyboard shortcuts: a raw `aria-level` is honoured, and never leaks onto the group

**Phase:** F (consistency and docs truth)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 617 (heading levels belong to the caller), plan 383 (page API
tables), plan 391 (accessible names).
**Status:** done — 2 native cases (Keyboard shortcuts 9); both fail on the old source, docs and `COMPONENTS.md` synced

## 1. The bug

Plan 617 gave the four heading-bearing parts an optional typed `level` (1–6) and
promised that the raw `aria-level` prop still works, with the typed prop winning.
`CardTitle`, `DialogTitle` and `DrawerTitle` implement that rule with
`internal/heading.ts`:

```tsx
aria-level={headingLevel(level, rest["aria-level"], 3)}
```

`KeyboardShortcutsGroup` does not. It computes `const headingAt = level ?? 3` and
renders:

```tsx
<div role="group" aria-label={label} {...rest}>
  <text role="heading" aria-level={headingAt}>{label}</text>
```

So with `<KeyboardShortcutsGroup aria-level={4}>`:

- the heading still announces level **3** — the caller's raw level is ignored;
- the `aria-level={4}` is spread onto the **group** element, where it describes
  nothing (a `group` has no heading level).

The docs and `COMPONENTS.md` row already claim the caller owns the heading level,
so this is also a docs-truth defect. The existing suite only covers the typed
`level` prop (`src/behaviour/keyboard-shortcuts.test.tsx`, "takes each group
heading's level from the caller"), which is why it stayed green.

**Evidence to capture before the fix:** add the regression test from §4 and run
it; the raw-level assertion must fail with `Option.some(3)` against the expected
`Option.some(4)`, and the group-leak assertion must fail with `"4"`/`4` present.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/keyboard-shortcuts.tsx` | Import `headingLevel`; destructure the caller's raw `"aria-level"` out of `rest`; compute the heading level with `headingLevel(level, authoredLevel, 3)`. Remove the `headingAt` constant. |
| `packages/components/src/behaviour/keyboard-shortcuts.test.tsx` | Add one native case proving the raw fallback and the typed-wins rule, and pin that `aria-level` no longer reaches the `role="group"` element. |
| `packages/components/docs/keyboard-shortcuts.mdx` | State the raw fallback beside the typed `level`; refresh the verification test count. |
| `COMPONENTS.md` | Extend the Keyboard shortcuts row: raw `aria-level` is honoured and stays off the group; update the native-test count. |
| `.agents/slop/plans/README.md` | Index this plan as done once the gates pass. |
| `TODO.md` | Add and tick the task under Tier 2 hardening, with the measured result. |

No new module, export, dependency or example is needed: the component and its
example already exist.

## 3. Exact implementation

In `keyboard-shortcuts.tsx`:

1. Replace the `HeadingLevel` type-only import with the shared helper:

   ```ts
   import { headingLevel, type HeadingLevel } from "./internal/heading.js";
   ```

2. Destructure the raw level out of `rest` so it cannot be spread onto the group:

   ```tsx
   export const KeyboardShortcutsGroup = ({
     label,
     level,
     "aria-level": authoredLevel,
     children,
     style,
     ...rest
   }: KeyboardShortcutsGroupProps) => {
   ```

3. Delete `const headingAt = level ?? 3;` and render:

   ```tsx
   aria-level={headingLevel(level, authoredLevel, 3)}
   ```

The typed `level` still wins when both are supplied, exactly as
`internal/heading.ts` documents. Do not change `CardTitle`, `DialogTitle` or
`DrawerTitle`; they already use the helper.

## 4. Test plan

Add two native cases to `src/behaviour/keyboard-shortcuts.test.tsx`:

1. **The fallback and the typed precedence.** Render one group with
   `aria-level={4}` and one with both `level={2}` and `aria-level={4}`; expect
   the headings to report `4` and `2`.
2. **The group stays clean.** Render one group with `aria-level={4}` and
   `testId="raw-group"`; expect the group's rendered props to carry no
   `aria-level`.

Each case is separate so each can fail on its own:

- **Before the fix:** case 1 reports `3` for the raw group; case 2 finds
  `aria-level` on the group. Both fail independently (measured).
- **After the fix:** both pass, and the typed group still reports `2`.
- **Can fail after the fix too:** reverting to `level ?? 3` fails case 1;
  spreading `rest` with the raw prop on the group fails case 2.

Commands:

```sh
# before the source fix — expect 2 failed, 7 passed
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/keyboard-shortcuts.test.tsx

# after the source fix — expect 9/9
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/keyboard-shortcuts.test.tsx

# unit suite + package types (the inventory checks the docs count and API table)
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components check-types
```

The behaviour suite needs a host with a GPUix native binding; on this Intel Mac
plan 140's locally built `darwin-x64` binding is installed. If the binding is
missing, **STOP** and report `unsupported-host` — do not claim a pass.

## 5. Docs, inventory and ledger

- `packages/components/docs/keyboard-shortcuts.mdx`: under the existing
  `level` sentence, add: "A raw `aria-level` is honoured when `level` is absent;
  the typed prop wins when both are supplied, and the raw value is not forwarded
  to the `role="group"` element." Change the verification line from 7 to 9 tests
  and name the raw-level cases.
- `COMPONENTS.md` Keyboard shortcuts row: "each group's heading `level` is the
  caller's (default 3), and a raw `aria-level` is honoured and kept off the
  group; 8 native behaviour tests".
- `.agents/slop/plans/README.md`: add a row for plan 630 between 629 (tokens) and
  631 with `done — …` after the gates pass.
- `TODO.md`: under "Tier 2 hardening after the inventory closed", add a ticked
  entry describing the measured defect, the fix, the new test count and the
  both-direction proof.

## 6. STOP conditions

Stop and report (do not improvise) if any of these happen:

- the new case passes **before** the source fix — the harness or the assertion is
  wrong, so the bug is not proven;
- the accessibility dump reports no `level` for a heading, or `customProps` is
  not exposed for the group (the existing suite already reads both, so a change
  means the binding moved);
- the behaviour suite reports `unsupported-host`;
- `check-types` fails for a reason outside these four files;
- another worktree has already claimed plan 630 (re-check with
  `ls /Users/cyberistic/GPUIXUI/workspaces/*/.agents/slop/plans/630-*`); if so,
  take the next free number and record it in `PLAN.md` D30.

## 7. Acceptance

- [ ] The two new native cases fail at `HEAD` and pass with the fix.
- [ ] A raw `aria-level` reaches the heading; the typed `level` still wins.
- [ ] The `role="group"` element no longer receives `aria-level`.
- [ ] Docs, `COMPONENTS.md`, the plan index and `TODO.md` state the shipped test
      count and the raw fallback.
- [ ] `nub run --filter @gpuixui/components test` (454 unit tests, plus any new
      assertions), `check-types`, and the targeted behaviour file pass.
- [ ] `nub run check` and `nub run lint` pass at the repository root.
- [ ] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.
