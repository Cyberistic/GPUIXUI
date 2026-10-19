# 626 — A status list announces whether each item is complete, current or upcoming

**Workstream:** components (Tier 2 composition/feedback)
**Phase:** C/F (hardening after the Tier 2 inventory closed)
**Depends on:** 110, 111, 117, 307, 311, 392, 516, 608, 625
**Touches:** `packages/components/src/internal/state-description.ts`,
`packages/components/src/stepper.tsx`,
`packages/components/src/timeline.tsx`,
`packages/components/src/behaviour/stepper.test.tsx`,
`packages/components/src/behaviour/timeline.test.tsx`,
`packages/components/docs/{stepper,timeline}.mdx`,
`packages/components/COMPONENTS.md`, `docs/component-api.md`, `TODO.md`,
`PLAN.md`, `.agents/slop/plans/README.md`.

## 1. Why

`Stepper` and `Timeline` each derive or accept one of three states per row:
`complete`, `current`, `upcoming`. Visually the state is carried by the marker
fill, the dot fill and the label ink. For assistive technology only the **current**
row says anything today:

- `StepperStep` sets `aria-selected={status === "current"}`;
- `TimelineItem` does the same.

`@gpuix/native@0.10.0` has no `aria-current` (recorded in plans 307/311), so
`aria-selected` is the strongest existing channel for "this is the current one".
It says nothing about the other two rows: a screen-reader user hears three list
items and cannot tell which are already done and which are still ahead. The
status is not otherwise in the accessible name — the name is the step or event
label — and 0.10.0 does not derive a description from text children.

`aria-description` **is** in the verified accessibility subset (plan `020`), and
the package already appends component-owned state to it for disabled controls
(plan `516`). The same channel is the honest place for a list row's status:

- "Complete"
- "Current"
- "Upcoming"

The caller's own `aria-description` must survive, joined the way plan 516 joins
"Disabled": the caller's text first, the component's status second, deduped.

This is a presentation-state fix, not a behaviour rewrite: no key handling, no
selection, no new part and no new prop.

## 2. Exact changes

### 2.1 One shared joiner in `internal/state-description.ts`

File: `packages/components/src/internal/state-description.ts`

Extract the existing join into a private helper so both state descriptions share
one implementation, then add the status helper. The exported
`stateDescription` signature and output must not change.

```ts
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The three states a progress list reports. */
export type ProgressStatus = "complete" | "current" | "upcoming";

const statusText = (status: ProgressStatus): string =>
  Match.value(status).pipe(
    Match.when("complete", () => "Complete"),
    Match.when("current", () => "Current"),
    Match.when("upcoming", () => "Upcoming"),
    Match.exhaustive,
  );

const joined = (
  ...authored: ReadonlyArray<string | undefined>
): StateDescription =>
  pipe(
    authored,
    Arr.map((value) =>
      pipe(
        Option.fromNullishOr(value),
        Option.map(Str.trim),
        Option.filter(Str.isNonEmpty),
      ),
    ),
    Arr.getSomes,
    Arr.dedupe,
    Arr.match({
      onEmpty: () => ({}),
      onNonEmpty: (parts) => ({ "aria-description": Arr.join(parts, ". ") }),
    }),
  );

/** The accessible description a disabled part adds (§516). */
export const stateDescription = (
  disabled: boolean,
  ...authored: ReadonlyArray<string | undefined>
): StateDescription => joined(...authored, disabled ? "Disabled" : undefined);

/** The accessible description a complete/current/upcoming row adds. */
export const statusDescription = (
  status: ProgressStatus,
  authored?: string,
): StateDescription => joined(authored, statusText(status));
```

Update the module's header comment to say it owns the component-owned state
description channel (disabled **and** progress status), not only disabled.

### 2.2 `StepperStep`

File: `packages/components/src/stepper.tsx`

- Import `statusDescription` from `./internal/state-description.js`.
- Destructure the caller's description so the spread cannot overwrite the
  composed value:
  `"aria-description": authoredDescription,` in the props destructure.
- On the row element, after `{...rest}`, spread
  `{...statusDescription(status, authoredDescription)}`; keep `style` last.
- Add one JSDoc sentence on `StepperStep` that the row announces its status.

### 2.3 `TimelineItem`

File: `packages/components/src/timeline.tsx`

Same three edits: import the helper, destructure `"aria-description"`, and spread
`{...statusDescription(status, authoredDescription)}` after `{...rest}` and
before `style`. Keep `aria-selected` exactly as it is.

## 3. Tests (write first, prove they fail)

### 3.1 `packages/components/src/behaviour/stepper.test.tsx`

Add two cases (count 8 → 10). Import `nodesNamed` beside `nodesWithRole`; keep
the existing `Option` import.

```tsx
it("announces complete, current and upcoming on the rows", () => {
  const stepper = renderComponent(<Checkout value={2} />);

  const rows = nodesWithRole(stepper.renderer, "listitem");
  expect(rows).toHaveLength(3);
  expect(
    rows.map((row) => Option.getOrUndefined(row.description)),
  ).toEqual(["Complete", "Current", "Upcoming"]);

  stepper.unmount();
});

it("keeps a caller's description and appends the status", () => {
  const stepper = renderComponent(
    <Stepper value={1} label="Checkout">
      <StepperStep
        value={1}
        label="Account"
        description="Email and password"
        aria-description="Use your work email"
      />
      <StepperStep value={2} label="Billing" />
    </Stepper>,
  );

  expect(
    Option.getOrUndefined(
      nodesNamed(stepper.renderer, "Account")[0]?.description,
    ),
  ).toBe("Use your work email. Complete");
  expect(
    Option.getOrUndefined(
      nodesNamed(stepper.renderer, "Billing")[0]?.description,
    ),
  ).toBe("Upcoming");

  stepper.unmount();
});
```

The first case fails on the old source with `[None, None, None]`; the second
fails with `"Use your work email"` (the status is missing).

### 3.2 `packages/components/src/behaviour/timeline.test.tsx`

Add two cases (count 6 → 8), same shape:

```tsx
it("announces complete, current and upcoming on the events", () => {
  const history = renderComponent(<History />);

  const rows = nodesWithRole(history.renderer, "listitem");
  expect(
    rows.map((row) => Option.getOrUndefined(row.description)),
  ).toEqual(["Complete", "Current", "Upcoming"]);

  history.unmount();
});

it("keeps a caller's description and appends the status", () => {
  const history = renderComponent(
    <Timeline label="Deploy history">
      <TimelineItem
        title="Deploy"
        status="upcoming"
        aria-description="Runs after approval"
      />
    </Timeline>,
  );

  expect(
    Option.getOrUndefined(
      nodesNamed(history.renderer, "Deploy")[0]?.description,
    ),
  ).toBe("Runs after approval. Upcoming");

  history.unmount();
});
```

Import `nodesNamed` beside `nodesWithRole`.

The first case fails on the old source with `[None, None, None]`; the second fails
with the authored text only.

### 3.3 What the tests must catch

- Removing the status spread makes the first case in each suite fail (`None`
  instead of the three labels) — the regression the plan fixes.
- Spreading the helper **before** `{...rest}` makes the second case in each suite
  fail (the caller's description overwrites the composed value, losing the
  status).
- Appending the status before the caller's text makes the second case fail on
  order (`Complete. Use your work email` instead of the documented order).
- No test asserts a colour or a box, so the recorded plan-540 binding defects
  cannot mask these cases.

## 4. Commands and expected results

Run from `workspaces/components`, in this order:

1. Add the four tests only, then:
   `cd packages/components && nub run test:behaviour src/behaviour/stepper.test.tsx src/behaviour/timeline.test.tsx`
   - **Expected before the source change:** 4 failed / 10 passed, the four new
     cases failing on `None` or the authored-only description. Record the exact
     output in this plan. If they pass, STOP: the tests are not guarding the
     change.
2. Apply §2, then rerun the same command.
   - **Expected after:** 14 passed / 0 failed. Any failure on a bounds or focus
     signal is the recorded plan-540 defect; record it instead of weakening the
     assertion.
3. `cd packages/components && nub run test`
   - **Expected:** 45 files, 454 tests, all pass (`inventory.test.ts` re-reads the
     docs counts).
4. `cd packages/components && nub run check-types`
   - **Expected:** exit 0, no output.
5. `nub run check` from the worktree root
   - **Expected:** exit 0. If `fmt` fails, run `nub run fmt:fix` once and rerun;
     record that the first run failed formatting.
6. `nub run lint`
   - **Expected:** exit 0.

## 5. Docs and ledger

- `packages/components/docs/stepper.mdx`
  - Accessibility: add that every row announces its status through
    `aria-description` ("Complete", "Current", "Upcoming") and that a caller's
    description is kept and the status appended.
  - Limitations: replace "No `aria-current` in 0.10.0" with the accurate
    limitation: `aria-selected` marks current and `aria-description` carries all
    three states; there is still no `aria-current`.
  - Verification: 8 → 10 tests and name the two new cases.
- `packages/components/docs/timeline.mdx`
  - Same accessibility sentence and count 6 → 8.
- `docs/component-api.md` §5: one sentence that a component-derived status on a
  non-interactive list row is announced through `aria-description`, joined with
  the caller's text (plan 626).
- `packages/components/COMPONENTS.md`
  - Stepper row: "8 native behaviour tests" → 10, add the status announcement.
  - Timeline row: "6 native behaviour tests" → 8, add the status announcement.
- `TODO.md`
  - Add a ticked Tier 2 hardening line for plan 626 with the exact test counts.
- `PLAN.md` D30
  - Record that plan 626 is the next free number after 625 (checked across every
    worktree).
- `.agents/slop/plans/README.md`
  - Add the 626 row; change its status to `done — …` only after steps 2–6 pass.

## 6. STOP conditions

- The accessibility dump does **not** report `aria-description` on a
  `role="listitem"` node — STOP and record the measured dump. Do not substitute a
  fake name, a hidden text node or an `aria-label` that replaces the label.
- Removing the status spread does not fail a new case — STOP; the tests are not
  proving the fix.
- A target test fails on a focus or bounds signal instead of the description —
  that is the recorded plan-540 binding defect. Record the exact failure; do not
  weaken the assertion.
- The native behaviour config cannot load the GPUix binding — record
  `unsupported-host` and leave the plan unfinished; do not claim a native
  verdict.
- A request to edit `packages/tokens`, `packages/primitives`, `apps/*` or
  `scripts/` — STOP; those are other workstreams. Record the need in `TODO.md`.

## 7. Acceptance

- A `StepperStep` and a `TimelineItem` each report "Complete", "Current" or
  "Upcoming" in the real GPUix accessibility tree, while a caller's
  `aria-description` survives first and is joined with `. `.
- The four new cases fail on the old source and pass on the new source.
- No public prop, part or exported type changes.
- The docs state the real test counts; `COMPONENTS.md`, `TODO.md`, `PLAN.md` and
  the plan index are synced.
- `nub run --filter @gpuixui/components test`, `check-types`, `nub run check`
  and `nub run lint` pass, or the only failures are the classified plan-540
  binding cases with the evidence recorded.
