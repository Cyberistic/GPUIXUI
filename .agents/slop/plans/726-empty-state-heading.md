# 726 — An empty state's title is a heading

**Owner:** components workstream · **Phase:** F (Tier 2 hardening) ·
**Depends on:** 110, 111, 117, 391, 617

**Numbering:** `725` is claimed by tokens-theme (`725-scale-ladder-indexes`);
`726` is the first number free across `main` and every worktree on 2026-10-20.
Recorded in `PLAN.md` D30.

## 1. Why

`EmptyState` paints its `title` as a bare `<text>` node. Measured on this host
from `packages/components` (scratch probe, since deleted):

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/zz-probe.test.tsx
# a11y nodes for <EmptyState title="No projects yet" />:
#   label:"No projects yet"
#   window:"GPUIX Test"
```

AccessKit reports the title as a generic `label`, so a screen-reader user gets no
heading for the panel and cannot jump to it with heading navigation. Every other
section title in the package is a caller-levelled heading (`CardTitle`,
`DialogTitle`, `DrawerTitle`, `KeyboardShortcutsGroup`), and plan 617 fixed the
same class of defect there. `EmptyState` is the only titled panel left behind:

| Part | Heading today |
| ---- | ------------- |
| `CardTitle` | yes (`role="heading"`, default level 3) |
| `DialogTitle` | yes (default 2) |
| `DrawerTitle` | yes (default 2) |
| `KeyboardShortcutsGroup` | yes (default 3) |
| `EmptyState` title | **no** — a plain `text` node |

A `<text>` element with `role="heading"` **is** supported and named from its
text child on this binding: the Card probe above reported
`heading:"Pro plan"` in the same session.

Scope of this plan:

- `EmptyState` gains an optional typed `level?: HeadingLevel` (default 3);
- the title becomes `role="heading"` with `aria-level` from
  `internal/heading.ts`, so the raw `aria-level` still works and the typed prop
  wins (the plan-617 rule);
- three native cases, an example that shows a nested level, docs, the inventory
  count and `COMPONENTS.md` synced.

**Out of scope** (do not add): a heading for `AlertTitle` (an alert is a
message, not a section), a `Card`-like `EmptyStateTitle` part (the component's
API is `title: string` by design), an accessible name override for the title
(the caller's text is the name), or any layout/colour change.

## 2. What exists today (read these first)

- `packages/components/src/empty-state.tsx` — one component, `title` /
  `description` / `action` / `icon`; the title is a `<text>` with `textStyle`
  and `colors.foreground`; `emptyStateMeta.focusable` is `true` because the
  caller's action is a control.
- `packages/components/src/internal/heading.ts` — `HeadingLevel` and
  `headingLevel(level, authored, fallback)`; the typed level wins over a raw
  `aria-level` and each part keeps its shipped default.
- `packages/components/src/card.tsx` lines 106–126 — the exact heading shape to
  copy: `<text role="heading" {...rest} aria-level={headingLevel(...)}>`.
- `packages/components/src/behaviour/empty-state.test.tsx` — 6 native cases;
  `internal/a11y.ts` exports `nodesWithRole`.
- `packages/components/docs/empty-state.mdx` — `## API`, `## Accessibility`,
  and the canonical `## Verification` line stating `(6 tests)`.
- `packages/components/examples/empty-state.example.tsx` — two panels, the
  second inside a `Card` under a `CardTitle` (`Runs`), which is exactly the
  nested-outline case the prop exists for.

## 3. Exact changes

### 3.1 `packages/components/src/empty-state.tsx`

1. Import the heading rule:

   ```ts
   import { headingLevel, type HeadingLevel } from "./internal/heading.js";
   ```

2. Extend the props:

   ```ts
   export interface EmptyStateProps extends Props {
     ...
     /** The title's heading level in the document outline. Default `3`. */
     readonly level?: HeadingLevel;
   }
   ```

3. Destructure `level` **and** the raw `aria-level` in the component, so the raw
   prop belongs to the heading and never leaks onto the root panel (the plan-630
   rule for `KeyboardShortcutsGroup`):

   ```tsx
   export const EmptyState = ({
     icon,
     title,
     level,
     "aria-level": authoredLevel,
     description,
     action,
     style,
     ...rest
   }: EmptyStateProps) => {
   ```

   and render the title as:

   ```tsx
   <text
     role="heading"
     aria-level={headingLevel(level, authoredLevel, 3)}
     style={{
       ...textStyle(theme, "bodyStrong"),
       color: theme.colors.foreground,
       textAlign: "center",
     }}
   >
     {title}
   </text>
   ```

   Do **not** spread `...rest` on the title: `rest` belongs to the root panel
   (`testId`, handlers, `style`), and spreading it here would duplicate every
   host prop onto the heading. Do not add `aria-label`: a heading is named from
   its text on this binding (measured above).

4. `emptyStateMeta.limitations`: no new limitation is needed; the heading is
   supported.

### 3.2 `packages/components/src/behaviour/empty-state.test.tsx`

Extend the header comment with the guarded bug (a panel title was not a heading
and could not be reached by heading navigation). Import `nodesWithRole` and
`Option`, then add:

1. **The title is a heading at the default level.** Render
   `<EmptyState title="No projects yet" />`; expect
   `nodesWithRole(empty.renderer, "heading")` to be one node named
   `"No projects yet"` with level `3`. Fails at `HEAD` (no heading node).
2. **The caller owns the level.** Render with `level={4}`; expect level `4`.
   Fails at `HEAD` (no heading node).
3. **A raw `aria-level` still works without the typed prop.** Render with
   `aria-level={2}`; expect level `2`. Fails at `HEAD`, and pins the documented
   raw fallback.

### 3.3 `packages/components/examples/empty-state.example.tsx`

The second card's panels sit under `<CardTitle>Runs</CardTitle>` (a level-3
heading), so give both a `level={4}` and a one-line comment saying the empty
state is nested under the card's section heading. The first panel (inside a
card with no other heading) keeps the default.

### 3.4 `packages/components/docs/empty-state.mdx`

- `## API`: add a `level` row — `1 | 2 | 3 | 4 | 5 | 6`, default `3`.
- `## Accessibility`: replace "The `title` carries the meaning." with a bullet
  that says the title is a heading (`role="heading"`, default level 3), the
  level belongs to the surrounding outline, a raw `aria-level` is honoured, and
  the typed `level` wins.
- `## Verification`: change `(6 tests)` to `(9 tests)` and name the three new
  cases.
- The code sample: add `level={4}` to the empty state inside a card whose title
  is a heading, or leave the top-level sample at the default. Do not change the
  surrounding prose.

### 3.5 `packages/components/COMPONENTS.md`

In the Empty states row, after "title + optional description/action/icon":

> the title is a caller-levelled heading (default 3, raw `aria-level` honoured)

and change `6 native behaviour tests` to `9 native behaviour tests`.

### 3.6 Index and tracking

- Add the row to `.agents/slop/plans/README.md` under the components table.
- Add the measured line to `TODO.md` under "Tier 2 hardening after the inventory
  closed".
- Add `726` to `PLAN.md` D30's overflow sentence.
- Tick nothing else.

## 4. Test plan

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/empty-state.test.tsx
```

Expected **before** the source change: the three new cases fail
(`nodesWithRole(..., "heading")` is empty), the six existing cases pass. Record
the exact totals in the plan/commit.

Measured before the source change on this host, 2026-10-20: **3 failed | 6
passed (9)** — each new case read `[]` for the heading nodes.

Measured after: **9 passed (9)**.

**Both directions** (one at a time, reverting each):

1. Remove `role="heading"` from the title → all three new cases fail
   (measured: 3 failed / 6 passed); restore.
2. Pass a fixed `3` instead of `headingLevel(level, authoredLevel, 3)` → cases
   2 and 3 fail (measured: 2 failed / 7 passed); restore.
3. Ignore the raw prop (`headingLevel(level, undefined, 3)`) → case 3 fails
   (measured: 1 failed / 8 passed); restore.

Then the gates:

```sh
nub run test
nub run check-types
nub run check
nub run lint
```

All four exit 0. The full native suite is the merge gate, not an iteration
check; run it once at the end and confirm the only failures are the recorded
plan-540 binding defects.

The playground smoke registry has no EmptyState scenario (its rows are GPUix
primitives), so the native `TestRenderer` suite is the interaction evidence. No
live window is opened for this change.

## 5. STOP conditions

- The three new cases do **not** fail at `HEAD`: stop and re-measure the a11y
  tree; do not weaken the assertions.
- `nodesWithRole(..., "heading")` also returns the window or another node:
  stop; the fixture must produce exactly one heading.
- The heading is unnamed after the change: stop and re-read §3.1 — this binding
  names a `<text role="heading">` from its text child; do not add `aria-label`
  as a workaround.
- A raw `aria-level` and a typed `level` disagree: stop; `headingLevel` is the
  one rule.
- A recorded plan-540 case changes state: stop and report which one.

## 6. Acceptance

- An empty state announces its title as a heading, named by the title text.
- The level defaults to 3, is caller-owned through `level`, and a raw
  `aria-level` still works.
- The example shows the nested case; docs, `COMPONENTS.md`, the inventory count,
  the plan index, `TODO.md` and `PLAN.md` D30 agree on the counts.
- `empty-state.test.tsx` is **9/9 measured on this host**; the three new cases
  fail without the source change.
