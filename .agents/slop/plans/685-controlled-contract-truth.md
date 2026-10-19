# 685 — The controlled/uncontrolled contract is the shipped rule

**Owner:** components workstream · **Phase:** G (release truth) · **Depends on:**
110, 117, 200, 201, 517, 676; docs-site plan 482 (the hand-off)

**Numbering:** `681`–`684` are claimed by the tokens workstream; this is the
first free number across every worktree, recorded in `PLAN.md` D30.

## 1. The hand-off

The docs-site workstream recorded this open item (their `TODO.md`, cross-team
section):

> **Components / repo docs**: `docs/component-api.md` §2 promises a warning when
> `value` and `defaultValue` are both supplied, and §4 promises
> `defaultPrevented` is respected. `packages/components/src/internal/controllable.ts`
> logs no warning, and `packages/primitives/src/core/keyboard.ts` records that
> GPUix 0.10.0 carries no `defaultPrevented` and no preventDefault. Plan 482
> documents the shipped truth on `/docs/component-api`; correct the contract or
> the code, then align the page. Owner: components (the contract doc is outside
> `apps/docs`)

## 2. What is true today (measured before changing anything)

Run these from the components worktree:

```sh
grep -n "mutually exclusive" docs/component-api.md
grep -n "defaultPrevented" docs/component-api.md
grep -n "useControllableState" -A 30 packages/components/src/internal/controllable.ts
```

Observed at `HEAD` (2026-10-19):

| Claim | Shipped code | Verdict |
| ----- | ------------ | ------- |
| §2: "`value` and `defaultValue` are mutually exclusive" + plan 200's "logs one `Effect.logWarning`" | `controlled = value !== undefined`; `useState(defaultValue)`; no warning path | **contract is wrong**; the code already behaves correctly (controlled value wins, `defaultValue` is inert) |
| §4: "`defaultPrevented` is respected" | §4 already says **"No default suppression"** and explains that `EventPayload` has neither `preventDefault` nor `defaultPrevented` (line 162) | **already corrected**; the hand-off checked an older revision — no edit needed |

Why the code, not the warning, is right:

- A warning cannot be emitted without `console.*`, which `AGENTS.md` §5 forbids,
  or `Effect.runFork(Effect.logWarning(...))` inside a React hook, which puts
  runtime execution outside the boundary and needs a runtime the package does
  not own.
- Controlled-wins is the standard React contract and what every consumer
  expects; making a second prop an error would be a new, unmeasured behaviour.
- §2 in the living contract already says the receiving component "ignores
  `defaultValue`". Only the "mutually exclusive" framing (inherited from
  `base-gpui` via plan 200 §2.2) implies a diagnostic that never existed.

## 3. The change

### 3.1 `docs/component-api.md` §2

Replace the `defaultValue` bullet (currently lines 60–61) with:

```md
- `defaultValue` is the uncontrolled initial value. Supplying both props is
  tolerated: `value` is authoritative and `defaultValue` is ignored — no warning
  or error is emitted, because the hook cannot log through the Effect runtime and
  this package does not use `console.*`.
```

Leave every other line of §2 untouched.

### 3.2 `packages/components/src/internal/controllable.ts`

Extend the JSDoc (no behaviour change):

```ts
/**
 * ...
 * Supplying both `value` and `defaultValue` is tolerated: the controlled value
 * wins and `defaultValue` seeds only the uncontrolled state. No diagnostic is
 * emitted — this hook owns no logger (plan 685).
 */
```

### 3.3 `packages/components/docs/tabs.mdx` — the page consumers read

In `## Controlled and uncontrolled`, after the "Pressing the tab that is
already selected" sentence, add:

```md
Supplying both `value` and `defaultValue` is tolerated: `value` wins and
`defaultValue` seeds only the uncontrolled case, with no warning.
```

This is the page that publishes the contract to consumers; it must say the same
thing as `docs/component-api.md` and the code.

## 4. Test plan

### 4.1 A behaviour pin — `packages/components/src/behaviour/controllable.test.tsx`

Add one case, in the real GPUix renderer (the file's existing harness):

```ts
it("lets the controlled value win when both props are supplied", () => {
  const onChange = vi.fn();
  const probe = renderComponent(
    <Probe value="alpha" defaultValue="beta" onChange={onChange} />,
  );

  expect(probe.renderer.getAllText()).toContain("value:alpha");

  clickCentreOf(probe, "set-beta");
  expect(onChange.mock.calls).toEqual([["beta"]]);
  expect(probe.renderer.getAllText()).toContain("value:alpha");

  probe.rerender(<Probe value="beta" defaultValue="beta" onChange={onChange} />);
  expect(probe.renderer.getAllText()).toContain("value:beta");

  probe.unmount();
});
```

The header comment gains one sentence naming the contract this pins.

**It can fail:** mutate `const controlled = value !== undefined;` to
`const controlled = value === undefined;` (or `const current = controlled ? internal : value`)
and the two `value:alpha` assertions fail; revert the mutation.

### 4.2 A contract pin — `packages/components/src/inventory.test.ts`

In `describe("component API contract")`, add:

```ts
it("states the shipped controlled precedence, with no promised warning", () => {
  const markdown = contract();

  expect(markdown).toContain("Supplying both props is");
  expect(markdown).toContain("no warning");
  expect(markdown).not.toContain("are mutually exclusive");
});
```

**It can fail:** at `HEAD` the first two assertions fail and the third fails;
after §3.1 all three pass. That is the both-direction proof for the doc fix.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`:

```sh
nub run --filter @gpuixui/components test -- inventory
# expected: inventory.test.ts passes, including the two new assertions

nub run --filter @gpuixui/components test:behaviour -- controllable
# expected: 4/4 in src/behaviour/controllable.test.tsx on this host

nub run --filter @gpuixui/components check-types
# expected: exit 0

nub run check && nub run lint && nub run test
# expected: exit 0 for all three (the repo gate)
```

Do **not** run the full native behaviour suite for this change; the pin is in one
file and the contract is prose. The release gate re-runs it.

## 6. STOP conditions

Stop and report instead of improvising if:

- `docs/component-api.md` no longer contains "are mutually exclusive" at §2
  (someone else corrected it first — then only add the two tests and the Tabs
  sentence, and record the overlap);
- the behaviour case fails with `value:beta` at `HEAD` (the shipped hook does
  not honour controlled precedence — that is a code defect, not a docs fix, and
  needs its own plan);
- `nub run check` or `nub run lint` reports a finding outside
  `docs/component-api.md`, `packages/components/src/behaviour/controllable.test.tsx`,
  `packages/components/src/inventory.test.ts`,
  `packages/components/src/internal/controllable.ts` or
  `packages/components/docs/tabs.mdx` that this change caused;
- any command above cannot run (report the exact error; do not claim a pass).

## 7. Acceptance

- §2 states the shipped rule (both props tolerated, `value` wins, no warning);
  §4 is verified and left as-is.
- The hook's JSDoc and the Tabs page say the same thing.
- The new behaviour case and the contract pin both pass, and both were proven
  to fail on the pre-fix source/mutation.
- `TODO.md` records the resolved docs-site hand-off, `COMPONENTS.md` gains no
  component row (this is not a component), and the plan is indexed in
  `.agents/slop/plans/README.md`.
- Committed on `agent/components` and pushed; no file outside the components
  workstream was edited.
