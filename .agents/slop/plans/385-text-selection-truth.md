# 385 — `Text.selectable` is documented, but selection was never proven

| Field | Value |
| ----- | ----- |
| Phase | F (interaction truth) |
| Owner | primitives workstream |
| Depends on | `020`, `030`, `041`, `047`, `059`, `082`, `203`, `365`, `377`, `383` |
| Status | done |

Self-contained: §0 the documented claim and what is actually proven, §1 the
decision, §2 the rule, §3 the files, §4 the commands, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan

`packages/primitives/docs/text.mdx` says, under **Keyboard**:

> Not focusable. Selectable text is pointer-selectable when `selectable` is on;
> there is no copy command binding in the component.

`docs/gpuix-capabilities.md` agrees that the runtime supports selection
(`userSelect` and `selectionColor`), and `textStyle` maps the prop to
`userSelect: "text" | "none"` (`core/style.ts`). `core/style.test.ts:407`
asserts that mapping.

That is the whole proof. No test in this package ever drags across a `Text`; the
runtime harness does not even expose the renderer's selection verbs. So the
documented **interaction** — the only reason the prop exists — rests on a style
property, which is the class plan `377` fixed for `textDecoration`: the runtime
may paint a property and still not behave as the page promises.

The renderer does expose the proof surface (`@gpuix/native/dist/testing.d.ts`):

```ts
dragSelect(x1: number, y1: number, x2: number, y2: number): string | null;
getSelectedText(): string | null;
```

Both are implemented; `dragSelect` flushes between steps because selection
listeners are registered during **paint**.

## 1. The decision

**Prove the interaction with a real drag, and let the measurement decide the
docs.** Two outcomes are acceptable and both are honest:

1. selection works → the docs keep the claim and gain the measured evidence;
2. selection does not work on the pinned runtime → the docs lose the claim, the
   limitation is recorded with the probe that showed it, and the prop is
   documented as a style-only passthrough (the plan `367` shape).

What is not acceptable is the current state: a user-facing promise with no test
behind it.

## 2. The rule

- The harness gains the two renderer verbs (`selection()` / `dragSelection()`),
  because they are the only way to observe what the user selected.
- The runtime case computes its drag endpoints **from the measured bounds of the
  text**, not from the theme's absolute padding origin. `getElementBounds` reports
  a different origin on the main-derived binding currently in the store (plan
  `529`), and a selection test must not depend on that unrelated defect.
- A non-selectable `Text` in the same window is the negative control: dragging
  the same distance over it must select nothing. A positive-only test would pass
  if the runtime selected every text run.
- The element-tree case stays: it proves the prop reaches the style at all, which
  is the component's own contribution.

## 3. Files to change

All paths under `packages/primitives/` unless stated.

| File | Change |
| ---- | ------ |
| `src/testing/runtime.ts` | `Runtime` gains `selection(): string | null` and `dragSelection(from, to): string | null`, wired to `renderer.getSelectedText()` / `renderer.dragSelect(...)`. Document that selection is registered during paint and that the helper flushes. |
| `src/components/presentational.test.tsx` | One case: `renderText({ selectable: true })` paints `userSelect: "text"`, the default paints `"none"`, and a caller's `style` still wins (the documented merge rule). |
| `runtime/text-selection.runtime.test.tsx` | New suite (header names the missing proof): a selectable sentence selects a dragged range; the same drag over a non-selectable copy selects nothing; a selectable run inside a bounded row still selects (the plan `383` composition). |
| `docs/text.mdx` | Replace the unmeasured Keyboard sentence with the measured contract: what selects, what does not, that there is no keyboard selection or copy binding, and the exact runtime evidence. |
| `examples/typography.example.tsx` | The release-notes body becomes `selectable`, so the mounted example shows the interaction and the chrome beside it stays inert. |
| `COMPONENTS.md` | Text row: record the selection evidence (or the limitation) next to the clamp/alignment/decoration notes. |
| `TODO.md` | Add and tick the task; tick the workstream progress if the count changes. |
| `.agents/slop/plans/README.md` | Index this plan after `384`. |

No public API changes. `TextProps` already exposes `selectable`.

## 4. Commands and expected results

From `packages/primitives`:

```sh
nub run test
```

Expected: the existing offline suite plus the new element-tree case, green
(46 files; the count grows by 1).

```sh
nub run check-types
```

Expected: no output.

```sh
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/text-selection.runtime.test.tsx
```

Expected: the new cases pass **if** selection works on the pinned binding. If
they do not, follow §6 before editing anything else.

```sh
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/text.runtime.test.tsx runtime/text-align.runtime.test.tsx \
  runtime/text-overflow.runtime.test.tsx
```

Expected: unchanged, green (this plan touches no text layout rule).

From the repo root:

```sh
nub run check
nub run lint
nub run test
```

Expected: green.

## 5. Test plan and the two-direction proof

**Element tree** (`presentational.test.tsx`):
- `renderText({ selectable: true })` → `userSelect === "text"`.
- `renderText({})` → `userSelect === "none"`.
- `renderText({ selectable: true, style: { userSelect: "none" } })` → `"none"`
  (the caller wins last).

Failure direction: change `textStyle` to always write `"text"` and the default
case fails; drop the branch and the selectable case fails.

**Runtime** (`text-selection.runtime.test.tsx`):
- selectable sentence: drag from just after the first glyph to just before the
  last → `selection()` is a non-empty substring of the painted sentence. This
  fails if `userSelect` never reached the host or the runtime ignores it.
- non-selectable copy: the same drag over it → `selection()` is `null` or empty.
  This fails if the runtime selects every `<text>` run regardless of the prop.
- bounded row: a selectable run inside a `Box` that is narrower than the sentence
  still selects; only the visible lines are expected to contribute.

Two-direction mutations to record in §7:
1. `userSelect` always `"none"` → the selectable runtime case fails (positive
   direction).
2. `userSelect` always `"text"` → the non-selectable runtime case fails
   (negative direction).

If mutation 1 also fails the *negative* case, the two cases are coupled and the
assertions must be sharpened (a text that is not selected must report no text).

## 6. STOP conditions

Stop and report, do not improvise, when:

- the drag selects nothing **and** the same scene selects nothing with
  `userSelect: "text"` written directly through `style` — that is a runtime
  limitation, not a component defect. Record it, correct the docs, and keep the
  element-tree case;
- the harness cannot reach `dragSelect`/`getSelectedText` (a type error against
  the installed binding) — record the binding file and revision; the verbs are
  present in `@gpuix/native/dist/testing.d.ts` as of this plan;
- the live suite is failing for reasons unrelated to this file (the store's
  binding was rebuilt from a newer source than published 0.10.0 — plan `529` and
  the open `TODO.md` row). Run the scoped file only; do not "fix" selection by
  chasing the bounds convention.

## 7. The outcome

Implemented and run on this host, 2026-10-18.

**Selection works, so the docs keep the claim and gain the measurement.**

| Step | Command | Result |
| ---- | ------- | ------ |
| positive + negative cases | `nub exec vitest run --config vitest.runtime.config.ts runtime/text-selection.runtime.test.tsx` | **2 passed** |
| measured selection | drag from `x + 2` to `x + width − 2` across `"Alpha bravo charlie"` | the whole run: `"Alpha bravo charlie"` |
| mutation `userSelect` always `"none"` | same command | **1 failed** — `takes the text under a real drag when selectable is on`: `expected 0 to be greater than 0`; the negative case still passed |
| mutation `userSelect` always `"text"` | same command | **1 failed** — `takes nothing from a text that is not selectable`: `expected { _tag: 'Some', … } to strictly equal { _tag: 'None' }`; the positive case still passed |
| `nub run check-types` | from `packages/primitives` | clean |

The second mutation matters: it proves the negative control is live, i.e. the
runtime honours `userSelect` rather than selecting every `<text>` run, so the
positive case cannot pass for the wrong reason.

The docs now state the measured contract, and one real limitation the probe made
explicit: selection is pointer-only (no keyboard extension, no copy binding, no
`selectionColor` prop).

A second, unrelated defect surfaced while editing the inventory: the Text row in
`COMPONENTS.md` contained an unescaped `|` before its **Row containment (383)**
note, which gave the row six cells against the table's five and dropped that
note from the rendered table. It is escaped now.

## 8. Acceptance

1. The harness exposes selection and a drag.
2. A real runtime drag proves what `selectable` does, in both directions.
3. The docs state the measured contract (or the limitation) instead of an
   unmeasured promise.
4. `COMPONENTS.md`, `TODO.md` and the plan index record the result.
5. Every gate in §4 is green.
