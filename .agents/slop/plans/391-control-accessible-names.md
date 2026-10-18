# 391 — Every control carries an accessible name in the 0.10.0 tree

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish: the accessibility half) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110` (harness), `117` (behaviour split), `200` (contract §5), `387` (`MenuItem`'s measured name rule), `390` |
| Status | done — 43 unnamed nodes measured before, none after; 9 pure + 1 native case (behaviour 596); both-direction proof (removing `Button`'s name fails 30 cases) |
| Source | measured by mounting every example and reading the a11y dump on 2026-10-18 |

This plan is self-contained. It adds one shared name rule, applies it to the
interactive parts the measurement names, and lands a behaviour suite that holds
**every example** to the rule.

---

## 1. The measured bug

GPUix 0.10.0 does **not** lift a control's text child into its accessible name
for a `div` with a role. Plan `387` measured this for menu rows and fixed
`MenuItem` by naming a plain-text row itself. The same rule was never applied to
the rest of the package.

Measure it directly: mount every registered example, read
`a11yNodes(renderer)` and collect role-bearing nodes whose `name` is empty.
Roles in the interactive set (`button`, `textbox`, `searchbox`, `combobox`,
`checkbox`, `radio`, `switch`, `slider`, `menuitem*`, `tab`, `link`, `img`)
report **43 unnamed nodes across 22 examples**, including:

- every text `Button` (the local stand-in in `internal/button.tsx` never sets
  `aria-label`, and a text button is not an `IconButton`);
- `TabsTrigger` (`role="tab"`), `AccordionTrigger`, `CollapsibleTrigger`
  (`role="button"`), `BreadcrumbLink` (`role="link"`);
- the components that compose those parts: Confirm dialog, Dialog, Drawer,
  Empty state, Field example, Form, Message, Message scroller, Multi-step form,
  Navigation menu, Popover, Preview card, Toast, Chat, Command menu, Dropdown
  menu, Alert and the Field example.

An assistive-technology user hears "button" with no name for these controls.
The runtime is the constraint, not the app: a `div role="button"` in AccessKit
must carry `aria-label` for the dump to report a name (measured; do not reach for
`aria-labelledby`, which 0.10.0 also lacks).

## 2. The rule

**A part that renders an interactive role names itself from explicit authored
text when it has one, otherwise from the plain text in its children.**

- Authored text wins: `rest["aria-label"]` (or a part's own `label` prop where it
  has one) is never overwritten.
- Only plain text counts. Strings and numbers inside arrays and `<Fragment>`s are
  read; any other element is skipped, so an icon, a spinner or a badge does not
  become part of the name. A composed label that is not plain text keeps
  requiring the caller's `aria-label` — the same rule `MenuItem` documents.
- Trimmed to nothing is no name: set no `aria-label` rather than `""`.
- This is one helper, not a per-part convention: `src/internal/name.ts` exports
  `plainText` (the walker) and `controlName` (authored-first).

Why an `aria-label` equal to the visible text is safe: it is the same string the
name would be in a runtime that computed name-from-contents, so nothing changes
for a user; it only stops the name being empty here.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/components/src/internal/name.ts` | **create** — `plainText(children)` and `controlName(authored, children)` |
| `packages/components/src/internal/button.tsx` | name `Button` from its children; `IconButton` keeps its required `label` |
| `packages/components/src/tabs.tsx` | `TabsTrigger` names itself from children |
| `packages/components/src/accordion.tsx` | `AccordionTrigger` names itself from children |
| `packages/components/src/collapsible.tsx` | `CollapsibleTrigger` names itself from children |
| `packages/components/src/breadcrumb.tsx` | `BreadcrumbLink` names itself from children |
| `packages/components/src/behaviour/accessibility.test.tsx` | **create** — the all-example contract (§4) |
| `packages/components/src/internal/name.test.ts` | **create** — pure rule tests (authored wins, fragments/arrays, elements skipped, blank rejected) |
| `packages/components/docs/card.mdx` … (only pages whose a11y note is now wrong) | update the limitation sentence if it claims no accessible name is possible |
| `COMPONENTS.md` | add the `Button`-shaped name rule to the affected Tier 2 notes; no status changes unless a measured defect is fixed |
| `.agents/slop/plans/README.md` | index this plan |

Any additional part the re-run in §5 names is fixed with the same helper; record
it in the row for that component. Do **not** change a part that already passes.

## 4. Test plan

### 4.1 Pure rule — `src/name.test.ts`

| # | Case | Mutation that must fail it |
| - | ---- | -------------------------- |
| 1 | Authored `aria-label` wins over child text | let children win → the authored assertion fails |
| 2 | A plain string is the name | return `undefined` → fails |
| 3 | A fragment's string children are read (`<>Save</>`) | stop at fragments → fails |
| 4 | Array children are concatenated (`["Save", " draft"]` → `"Save draft"`) | read only the first → fails |
| 5 | An element child contributes nothing (`<Icon/>` + `"Save"` → `"Save"`) | recurse into arbitrary elements → the icon's aria-label leaks in |
| 6 | Numbers are read (`42` → `"42"`) | ignore numbers → fails |
| 7 | Whitespace-only children and no authored label → `undefined` | return `""` → fails |
| 8 | No children and no label → `undefined` | throw → fails |

### 4.2 Native contract — `src/behaviour/accessibility.test.tsx`

Mount every registered example from `examples/index.ts` in the real renderer (the
`examples.test.tsx` pattern), read `a11yNodes(root.renderer)` and assert:

1. **every interactive node has a non-empty name** — the bug in §1;
2. the collected shape is not empty (all examples mounted and named at least one
   control), so the suite cannot pass by reading nothing.

Record the exact failing list in the plan's status when it first runs; after the
fix it must be `[]`.

**Both-direction proof:** before applying the helper, run the suite — it fails
with the measured 43 nodes. After the helper and the five parts, it passes.
Then delete `aria-label` from `Button` alone: exactly the Button-composed
examples fail while the trigger examples stay green, proving the suite names the
right cause. Restore.

### 4.3 Regression

The behaviour suites that assert names today (`MenuItem`, `TabsContent`,
`Dialog`, `IconButton` parts) must stay unchanged and green. The all-example
suite is additive.

## 5. Commands and expected results

```sh
cd packages/components
nub run --filter @gpuixui/components test            # unit: 383 (374 + 9 name cases), green
nub run --filter @gpuixui/components test:behaviour  # behaviour: 596 (595 + the a11y contract), green
nub run --filter @gpuixui/components check-types     # exit 0
cd ../..
nub run check                                        # exit 0
nub run lint                                         # exit 0
```

To reproduce the bug before the fix (and after any new unnamed part), run only
the contract file:

```sh
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/accessibility.test.tsx
```

Expected before the fix: a non-empty list of `<example>: <role>`. Expected after:
`failures` is `[]`.

## 6. STOP conditions

Stop and report if:

- the a11y dump reports a *computed* name for a role that §1 measured empty
  (the runtime changed under us) — re-measure before adding labels that are not
  needed;
- `plainText` would need to read arbitrary elements or React internals — leave
  the composed case to the caller's `aria-label` and record the limitation;
- naming a part changes an existing suite's assertion for any reason other than
  the new `aria-label` — stop and report the part; do not weaken that suite;
- a part's children are not available in the part (the name lives in a provider)
  — record the part as a STOP and leave the rest landed.

## 7. Acceptance criteria

- `plainText` / `controlName` exist once and the five measured parts use them.
- The all-example contract suite passes with zero unnamed interactive nodes, and
  it fails when the `Button` name is removed.
- The 9 pure cases pass and each has the named mutation.
- `nub run check`, `nub run lint` and `nub run test` pass.
- The plan index, the affected component docs and `COMPONENTS.md` are updated;
  `TODO.md` gains and ticks a Phase F row for this work.
