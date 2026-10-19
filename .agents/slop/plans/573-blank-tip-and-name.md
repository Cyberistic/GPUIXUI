# 573 — A blank tip is not a tip, and a blank label is not an unnamed focus stop

**Phase:** F (integration and polish) · **Owner:** primitives · **Depends on:** 026, 071, 073, 093, 396, 399, 398
**Number note:** `503` is already used by the docs-site and tokens worktrees
(plans are aggregated across worktrees, `PLAN.md` D7), so this plan takes the
first free number across every worktree.

## 0. The bug class

Two surfaces publish *text that is only whitespace* as if it were content:

1. `InfoTip` passes its `label` through `ariaName`, which drops a blank value.
   The trigger keeps `role="img"` and `tabIndex={0}`, so the result is an
   **unnamed image that takes focus** — the exact failure plan 073 exists to
   prevent, and the rule D44 (`ariaNameOr` keeps a documented default) already
   solves for `Spinner` and OTP cells.
2. `Tooltip` treats any string `content` as a description and as the tip's
   name. A whitespace string therefore publishes `aria-description: "   "`,
   opens an empty popover, and publishes a `role="tooltip"` node whose label is
   `"   "`.

The class is the same one plan 396 fixed for names (`Button`/`Toggle`/
`ScrollArea`) and plan 399 fixed for `Icon`: **a blank string is absence, not a
value.** Plan 398's `userSelect` fix also touched the tip but not its content.

## 1. Measured evidence (this host, 0.10.0 binding, 2026-10-19)

Probe: `<InfoTip content="Net of refunds." label="   " testId="trigger" />`,
rendered in the real `TestRenderer`, then `focusNext()`:

```
A11Y=[{"aria":{"role":"Image","on_action":["Click","Focus"],
               "description":"Net of refunds."}}, ...]
FOCUSED=trigger
```

The `Image` node has **no `label`** and is focusable/actionable. A blank label
is not merely cosmetic; it removes the only name the node has.

Probe: `<InfoTip content="   " label="   " />`, closed then hovered:

```
CLOSED=[{"aria":{"role":"Image","on_action":["Click","Focus"],
                 "description":"   "}}, ...]
OPEN  =[{"aria":{"role":"Image", ..., "description":"   "}},
        {"aria":{"role":"Tooltip","label":"   "}}, ...]
TIP=true
```

A whitespace tip paints a real, empty popover and a whitespace-named tooltip
node.

Both probes are throwaway (`runtime/__probe.runtime.test.tsx`); delete the file
after recording the result. Do not commit a `__`-prefixed runtime file (plan
390's hygiene guard).

## 2. Changes

### 2.1 `packages/primitives/src/components/InfoTip.tsx`

- Import `ariaNameOr` instead of (or beside) `ariaName`.
- The trigger's `aria-label` becomes:
  `ariaNameOr(label, "More information")`.
- Extend the doc comment: a blank `label` takes the documented default because
  the trigger is a focus stop and an unnamed one is the plan-073 bug.

No other `InfoTip` behaviour changes. `content` is forwarded to `Tooltip`,
which owns the blank-content rule below.

### 2.2 `packages/primitives/src/components/Tooltip.tsx`

- Import `ariaName` from `./internal.js`.
- In `renderTooltip`, derive the description once:

  ```ts
  const description = P.isString(content) ? ariaName(content) : undefined;
  ```

- **A string that trims to nothing is no tip.** Before building the runtime
  tree:

  ```ts
  if (P.isString(content) && description === undefined) {
    return <>{children}</>;
  }
  ```

  The caller's child renders unchanged: no trigger wrapper, no description, no
  empty layer. This is the honest reading of "a tip needs something to say";
  a non-string node (a `<div />`, `0`, etc.) is untouched and still paints.
- Use `description` for both the trigger's `aria-description` and the tip's
  `aria-label`, so a real string is trimmed in the accessibility tree (the
  painted text stays exactly what the caller passed).
- Update the element-tree doc comment above `renderTooltip` with the blank
  rule.

### 2.3 Docs

- `packages/primitives/docs/info-tip.mdx`
  - API table: `label` default becomes `"More information"` (used when blank).
  - Accessibility: state the default and why (a focus stop must be named), and
    that a blank `content` produces no tip and no description.
- `packages/primitives/docs/tooltip.mdx`
  - API table `content` row: a whitespace-only string is no tip (the trigger is
    rendered unchanged).
  - Accessibility: a string description is trimmed; a blank one is absent.
  - Limitations: add the blank-string rule if it does not fit elsewhere.
- `COMPONENTS.md` Tooltips row: append the measured `InfoTip`/`Tooltip` blank
  rule and cite plan `573`.

## 3. Test plan

Every case must fail before the change and pass after. Run the package's
offline suite first, then the two scoped runtime files.

### 3.1 Offline — `packages/primitives/src/components/InfoTip.test.tsx`

Change the existing "publishes a blank label as absent and trims a real one"
case:

- blank label → `aria-label` is **`"More information"`** (the old direction was
  `Option.none()`);
- padded real label → still trimmed to `"Revenue definition"`.

### 3.2 Offline — `packages/primitives/src/components/Select.test.tsx` (`describe("Tooltip")`)

Add:

1. **"drops a tip whose content is only whitespace"** — `renderTooltip` with
   `content: "   "` and a real child returns a fragment whose only child is the
   caller's child (`tree.type === Fragment`; `elementChildren(tree)` has one
   element, the child). Old direction: a `GpuixTooltip` root.
2. **"trims a string tip's description and name"** — `content: "  A hint  "`
   gives the trigger `aria-description === "A hint"` and the tip
   `aria-label === "A hint"`. Old direction: `"  A hint  "`.

### 3.3 Runtime — `packages/primitives/runtime/blank-name.runtime.test.tsx`

Add one case:

- `<InfoTip content="Net of refunds." label="   " testId="trigger" />`
- The `Image` node's label is `"More information"`.
- `focusNext()` lands on `trigger` and the node's description is the content.
- The open tip is a `Tooltip` node named by the content.
- Old direction: no `Image` node with that label; the probe shows an unnamed
  `Image`.

### 3.4 Runtime — `packages/primitives/runtime/info-tip.runtime.test.tsx`

Add one case:

- `<InfoTip content="   " label="Revenue definition" testId="trigger"
  tipTestId="tip" />`
- The `Image` node exists, is named `"Revenue definition"`, and has no
  description.
- `runtime.hover("trigger")` + `flush()` paints **no** `tip` box and adds no
  `Tooltip` node.
- Old direction: `TIP=true`, description `"   "`, and a `Tooltip` node labelled
  `"   "`.

## 4. Commands and expected results

From `packages/primitives`:

```sh
nubx vitest run src/components/InfoTip.test.tsx src/components/Select.test.tsx
# expected before the fix: the two new assertions and the InfoTip blank case fail
# expected after: all pass

nubx vitest run --config vitest.runtime.config.ts \
  runtime/blank-name.runtime.test.tsx runtime/info-tip.runtime.test.tsx
# expected before: both new cases fail by name
# expected after: all pass (the scoped files are the host-safe shape, plan 529)

nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
nub run --filter @gpuixui/primitives test:runtime
# expected: offline/type green; the full runtime suite keeps plan 529's known
# binding failures — do not re-baseline them, and do not claim it green.
```

Root gates after the package run: `nub run lint`, `nub run check:tests`.
`nub run check` / `nub run test` are the end-of-task gate; if the runtime
artifact still fails, report the same 19 files, not this change.

## 5. STOP conditions

Stop and report instead of improvising if:

- `renderTooltip` returning a fragment makes a caller's `asChild` contract
  break (a child that is not a single element may fail to compile or render);
- the blank-label fallback causes a `name.runtime` table case or the
  `INTERACTIVE_ROLES` closure to disagree with its recorded name;
- the `Tooltip` blank-content branch changes a documented test (the `open`
  control cases in `Select.test.tsx`) — those must stay green unchanged;
- the full runtime suite's failure set changes by more than the two scoped
  cases (record the numbers; do not edit the fixture).

## 6. Acceptance

- [x] A blank `InfoTip.label` announces `"More information"` in the real
      accessibility tree, and remains focusable.
- [x] A whitespace `Tooltip.content` paints no tip, adds no `Tooltip` node, and
      publishes no description.
- [x] A real string description is trimmed in the tree, painted unchanged.
- [x] Offline tests and `check-types` pass; the two scoped runtime files pass
      their new cases; the full-suite state is reported, not re-baselined.
- [x] `docs/info-tip.mdx`, `docs/tooltip.mdx` and the `COMPONENTS.md` Tooltips
      row state the rule.
- [x] `TODO.md` row ticked, plan indexed, work committed and pushed to
      `origin/agent/primitives`.

## 7. Results (measured 2026-10-19)

**Both directions, offline.** With the two source files reverted to `HEAD`, the
offline suite reported **3 failed / 731 passed**, exactly the new cases:

- `InfoTip > falls back to a documented name for a blank label`
- `Tooltip > drops a tip whose content is only whitespace`
- `Tooltip > trims a real string tip's description and name`

With the fix: **51 files / 734 tests passed** (732 before the plan).

**Both directions, runtime.** With the sources reverted, the two scoped files
reported **4 failed / 9 passed**, adding exactly:

- `blank-name > falls back to a documented name for a blank InfoTip label`
- `info-tip > renders no tip and no description for blank content`

With the fix: **11 passed / 2 failed**. The two remaining failures are the
pre-existing artifact failures this host already records (plan 529): the
keyboard-opened tip does not paint on `focusNext`, and the trigger's ring is
absent after focus. They fail identically with the fix reverted and are not
caused by this change.

**Gates.** `nub run check` green (format, lint, `check-tests`, every workspace
`check-types`). Exact commands:

```sh
nub run --filter @gpuixui/primitives test          # 51 files / 734 passed
nub run --filter @gpuixui/primitives check-types   # Done
nub run --filter @gpuixui/primitives test:runtime \
  runtime/blank-name.runtime.test.tsx runtime/info-tip.runtime.test.tsx
nub run check
```

