# 046 — `TextArea` must not accept `onSubmit` (primitives workstream)

**Phase:** C (Tier 1 API correctness).
**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** `030`, `040`, `041`.
**Status:** `done` — see §6.

## 1. The bug

`TextAreaProps extends FieldProps`, so a textarea accepted `onSubmit`. Measured
in the runtime (2026-10-17): with `onSubmit` set, typing `a`, Enter, `b` produced
`onChange` values `"a"` then `"ab"` and **one** `onSubmit` — the runtime turned
Enter into a submit and the newline never arrived. Without `onSubmit`, the same
keystrokes insert a newline (`fields.runtime.test.tsx`, "edits a TextArea across
lines").

So a documented "multi-line text field" silently became a single-line field the
moment a caller wired it to submit. That is a trap, not a feature: the caller
wants a form textarea, and the API takes away newlines without saying so.

## 2. Design

`TextAreaProps` is `Omit<FieldProps, "onSubmit"> & { minRows?, maxRows? }`.
`Input` keeps `onSubmit` (Enter there is a submit by definition).

A caller who genuinely wants submit-on-Enter uses `Input`; a caller who wants
Cmd+Enter in a multi-line box needs an event the runtime does not deliver yet —
recorded as the limitation, not faked.

## 3. Files to change

```
packages/primitives/src/components/TextArea.tsx   EDIT props = Omit<FieldProps, "onSubmit">
packages/primitives/src/components/Input.tsx      EDIT the FieldProps doc: onSubmit is the input's
packages/primitives/src/components/fields.test.tsx EDIT one test: the textarea host has no onSubmit
COMPONENTS.md                                     EDIT the Text areas row
```

## 4. Commands and expected results

```sh
nubx vitest run src/components/fields.test.tsx
# before: the new assertion fails (the host carries onSubmit)
# after:  all pass
nub run check     # green (the example does not pass onSubmit to a TextArea)
nub run test      # 153 passed
```

## 5. Two-direction proof

The test renders `renderTextArea` with a would-be `onSubmit` and requires the
host element **not** to carry one. Before the change the spread put the handler
on the host, so the assertion fails; after, it passes and `tsc` rejects the prop
at the call site.

## 6. Measured results

2026-10-17: the runtime probe recorded `{ submits: 1, values: ["a", "ab"] }` for
`"a enter b"` with `onSubmit` — one submit and no newline — versus a newline
without it. After the change the offline test passes and the host carries no
`onSubmit`; gates: 153 offline, 54 runtime.

## 7. STOP conditions

- A documented example or the basic-app needs `onSubmit` on a `TextArea` → stop
  and report the composition instead of keeping the trap.
- `nub run check` cannot stay green.
