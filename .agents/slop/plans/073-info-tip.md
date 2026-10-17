# 073 — The info-icon tooltip trigger is hand-rolled, and `basic-app` ships it broken

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 feedback; example app) |
| Owner | primitives workstream |
| Depends on | `041`, `047`, `060`, `067`, `071` |
| Status | **done** |

Self-contained: §1 the gap, §2 the rule, §3 files, §4 tests, §5 STOP list,
§6 outcome.

---

## 1. The gap

`Tooltip` requires a **single focusable host element with a role and a name**
(plan 071). After plan 071 this package's feedback example hand-rolls that
shape — a `div` with `role="img"`, `aria-label`, `tabIndex={0}`, the icon
padding and the icon tint — while `examples/basic-app` still wraps a bare
`Box` (recorded in `TODO.md`). Two consumers, one of them wrong, and a docs
snippet that teaches the wrong shape to every reader:

- a `Box` forwards neither `tabIndex` nor a role, so the tip is **hover-only**
  and absent from the accessibility tree;
- even the correct shape paints **no focus ring**, because a bare `div` has no
  focus state, so the keyboard path is invisible;
- the ~15 lines of accessibility boilerplate are duplicated per consumer and
  easy to get subtly wrong (a live bug proves it).

This is the second consumer of the same markup, so the repo rule applies:
hoist it.

## 2. The rule

Add `InfoTip` to `packages/primitives`: one small, single-purpose component —
"an information icon that explains a nearby term".

| Part | Contract |
| ---- | -------- |
| trigger | `div role="img"` with `aria-label={label}` and `tabIndex={0}`; the icon is decorative (`presentation`) so the trigger is the one node |
| tip | a string `content`; `Tooltip` turns it into the trigger's `aria-description` and a named `role="tooltip"` node (plan 071) |
| focus | the trigger paints `focusRing(theme)` while focused |
| style | padding `2xs`, radius `sm`, icon at `iconSize.sm` in `colors.mutedForeground` — no literals |
| props | `content`, `label`, `icon?` (default `"info"`), `side?`, `testId?` (the trigger), `tipTestId?` |

`content` is a string on purpose: a non-string tip has no description to
announce (plan 071's rule), and an info tip is prose by definition. The trigger
keeps its own test id and the tip gets an explicit one, so a runtime test can
address both without deriving ids.

Then use it in the feedback example, the `Tooltip` docs snippet, and
`examples/basic-app`. Refresh `examples/basic-app/README.md`, which still says
`src/theme.ts` is a stand-in and the app has never run while the tokens package
has landed.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/InfoTip.tsx` | the component: pure `renderInfoTip` + the focused wrapper |
| `packages/primitives/src/components/InfoTip.test.tsx` | element tree |
| `packages/primitives/src/components/index.ts` | export `InfoTip`, `InfoTipProps`, `infoTipTriggerStyle` |
| `packages/primitives/runtime/info-tip.runtime.test.tsx` | open by hover and by focus, a11y nodes, focus ring |
| `packages/primitives/examples/feedback.example.tsx` | replace the hand-rolled trigger |
| `packages/primitives/docs/info-tip.mdx` | new page |
| `packages/primitives/docs/tooltip.mdx` | point the usage snippet at `InfoTip`; link the page |
| `packages/primitives/docs/README.md` | index the page |
| `packages/primitives/README.md` | Feedback list + runtime count |
| `examples/basic-app/src/App.tsx` | use `InfoTip` |
| `examples/basic-app/README.md` | refresh the stale theme/verification claims |
| `COMPONENTS.md` | Tooltips row (variant merged) + runtime count |
| `TODO.md`, `.agents/slop/plans/README.md` | tick the basic-app task, index this plan |

Commands and expected result:

```sh
nub run --filter @gpuixui/primitives test          # 31 files, 353 tests
nub run --filter @gpuixui/primitives test:runtime  # 16 files, 175 tests
nub run check && nub run lint && nub run test
```

## 4. Test plan

**Element tree (`InfoTip.test.tsx`):**

- the tree is a `Tooltip` whose first child is a host `div` with
  `role="img"`, `aria-label={label}`, `tabIndex={0}`;
- the icon inside is `presentation` and carries the muted tint at the `sm`
  size, so it never becomes a second a11y node;
- a focused trigger merges a `boxShadow`; an unfocused one does not.

**Runtime (the regression guard, `info-tip.runtime.test.tsx`):**

1. Hovering the trigger opens the tip (painted text) — the case the broken
   `Box` trigger also passed, kept so the refactor cannot lose it.
2. `focusNext` lands on the trigger, the tip opens, and the a11y dump has an
   `Image` named by `label` with the content as its **description**. This is the
   case the `basic-app` version failed: a `Box` produces no node and no
   description.
3. The trigger paints a focus ring while focused — the case neither the old
   hand-rolled div nor the `Box` had.

**Two directions:** remove `tabIndex`/`role`/`aria-label` from the trigger (the
pre-fix shape) and tests 2 and 3 fail; restore and all pass. The element test
fails on the old tree because the props are absent.

## 5. STOP conditions

- `Icon` cannot be nested inside a focusable trigger without stealing the
  hover — then the trigger's hit area needs a different host shape; stop and
  report rather than shipping a partially hoverable icon.
- The a11y dump reports two nodes for one trigger (the icon plus the wrapper) —
  the icon must be `presentation`; if the runtime cannot suppress it, stop.
- Any gate fails for a reason outside these files.

## 6. Outcome

Implemented and measured on this host with the locally built 0.10.0 binding
(ADR 0003).

- `InfoTip` lives in `src/components/InfoTip.tsx`; `renderInfoTip` is the pure
  tree, the wrapper only adds `useFocus()`. It is exported from the package root.
- Offline: **31 files / 353 tests**, green (3 new element tests).
- Native: **16 files / 175 tests**, green. Hover opens the tip; `focusNext`
  lands on the trigger, the `Image` node carries `"Booked revenue, net of
  refunds."` as its description and the open tip is a named `Tooltip` node; the
  painted `boxShadow` equals `focusRing(testTheme)` with the runtime's
  normalisation (`inset: false` added by the renderer). The existing examples
  suite (feedback tooltip by hover and by keyboard) still passes unchanged, so
  the component swap did not lose the plan-071 behaviour.
- **Two directions:** with `role`, `aria-label` and `tabIndex` removed from the
  trigger (the pre-fix shape), the keyboard and focus-ring runtime tests fail
  (`the trigger produced no accessibility node`; `expected undefined to strictly
  equal { … }`) and the element test fails too; other tests pass. Restored, all
  pass.
- `examples/basic-app` now uses `InfoTip`, its `ScrollArea` is labelled, and its
  README no longer claims a stand-in theme or an unverified-everything status.
