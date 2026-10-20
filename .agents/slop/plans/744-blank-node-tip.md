# 744 — A tip that paints nothing is not a tip (the node-content half of plan 573)

| Field | Value |
| ----- | ----- |
| Phase | F — the blank-content rule reaches a computed node tip |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Tooltips row in `COMPONENTS.md`) |
| Depends on | `041` (runtime suite), `071`/`573` (blank string tip), `742` (rich tip label), `743` (`paintsContent`) |
| Status | **done** — the plan-`573` gate covered only a **string** that trimmed to nothing, so a computed node tip resolving to `null` still opened an empty anchored layer and published an unnamed `Tooltip` node (measured; `false` and a blank string already opened nothing). One `paintsContent` gate now returns the child unchanged for absent content, while any element is still content. 3 element + 1 scoped runtime cases; the old gate fails 2 element cases and the runtime case by name, and an over-broad gate fails the real node tip; offline 70 files / 958 tests, scoped live 1 file / 4 |

## 0. Why

Plan `573` established that **a blank tip is not a tip**: a `content` string that
trims to nothing returns the caller's child unchanged, so a computed missing
translation cannot publish `aria-description: "   "` or open an empty popover.
The gate is string-only:

```ts
const text = P.isString(content) ? ariaName(content) : undefined;
if (P.isString(content) && text === undefined) {
  return <>{children}</>;
}
```

`TooltipProps.content` is a `ReactNode`, so a **computed node** is a supported
call shape — `content={hint === undefined ? null : <Text role="code">{hint}</Text>}`
is the documented way to show a rich tip only when there is data. Measured on
this host (2026-10-20, 1280 × 800, release-tag binding):

| `content` | Layer painted | a11y nodes |
| --------- | ------------- | ---------- |
| `null` | **yes** — an empty anchored surface, locator present | **`Tooltip` with no name** |
| `false` | no | — |
| `"   "` | no (plan 573) | — |

So `null` (the natural value of a conditional node) opens an **empty,
unnamed tooltip node** — an empty popover over the trigger that reaches
assistive technology, the class plan `573` closed for strings and plan `742`
named for unlabelled node tips. `false` already behaves, which makes the
inconsistency worse: whether a blank tip opens depends on which falsy value the
caller's conditional produced.

The package already owns the right predicate. Plan `743` added `paintsContent`
to `internal.ts`: `Children.toArray` drops `null`, `undefined` and booleans, and
text/number parts count only when they trim to something. The tip gate is that
rule, not a string test.

## 1. The contract

1. **Content that paints nothing is no tip.** `null`, `undefined`, `false`,
   `true`, a blank string and an empty child list return `children` unchanged:
   no wrapper, no cloned handlers, no description, no layer, no `Tooltip` node.
2. A **non-empty string** is a tip whose text is both the painted content and
   (when `label` is absent) the trigger's description; the paint keeps the
   caller's spacing and the tree gets the trimmed text (unchanged, plan 573).
3. **Any element** counts as content, even an empty fragment: the component
   cannot know what an element paints, and treating it as absent would hide a
   real composition (`content={<Chart/>}`). This is the `paintsContent` rule
   exactly, and it matches `Checkbox`/`Switch`'s labelled-row gate from `743`.
4. A **number** content paints (`0` is a tip saying "0"), exactly as it paints
   today.
5. No public prop, role, name, side, alignment or open-state contract changes.
   `InfoTip` is unaffected (its `content` is already a required string).

## 2. Files to change

### 2.1 `packages/primitives/src/components/Tooltip.tsx`

- Import `paintsContent` beside `ariaName` from `./internal.js`.
- In `renderTooltip`, replace the string-only gate with the shared rule:

  ```ts
  // A tip that paints nothing is no tip (plans 573, 744): a computed node can
  // resolve to `null`, and a layer with no content still publishes an unnamed
  // `Tooltip` node. An element always counts — only absent content is absent.
  if (!paintsContent(content)) {
    return <>{children}</>;
  }
  const text = P.isString(content) ? ariaName(content) : undefined;
  ```

- `renderTooltip`'s JSDoc: extend the "A string that trims to nothing is **no
  tip**" paragraph with "and neither is any other content that paints nothing
  (a computed `null`, an empty list) — the child renders unchanged, because an
  empty layer would still publish an unnamed tooltip node (plan `744`)."
- `TooltipProps.content` JSDoc: add one sentence naming the same rule.

### 2.2 `packages/primitives/src/components/Tooltip.test.tsx` (new)

The component has no element-tree suite today; `Select.test.tsx` borrows
`renderTooltip` for its own placement cases. Create the file with:

1. `"renders the child unchanged when the content paints nothing"` — for
   `null`, `undefined`, `false` and `"   "`, `renderTooltip({ content, children:
   <div testId="child" /> }, testTheme)` produces an element **whose type is the
   fragment**, not the GPUix tooltip wrapper. Assert by decoding the tree with
   the existing element harness (`src/components/testing/element.ts`): the tree
   has exactly one child element and its tag is `div`; no `TooltipTrigger` /
   `TooltipContent` props appear.
2. `"keeps a real node tip and a real string tip"` — `content={<div />}` and
   `content="A hint"` both render the wrapper (the passing direction that stops
   an over-broad gate from shipping).
3. `"does not describe the trigger when the tip paints nothing"` — a `null`
   content with `label="Billing cycle"` still renders the child unchanged: the
   label cannot resurrect an absent tip (the rule plan `573` applied to a blank
   string).

Every case in (1) and (3) fails against the old gate by rendering the wrapper.

### 2.3 `packages/primitives/runtime/tooltip-rich.runtime.test.tsx`

Add one case, `"paints no layer or tooltip node for a null computed tip"`:

- mount `<Tooltip content={null} label="Billing cycle" testId="tip"><Checkbox
  testId="trigger" label="Alerts" /></Tooltip>` (the file already imports what
  it needs; add `Checkbox`);
- `runtime.element("tip")` is `None`, and `a11yNodes(runtime.a11y())` contains
  **no** node with role `Tooltip`;
- the `CheckBox` node named `"Alerts"` still exists and carries **no**
  `description` (no tip, no cloned description);
- `runtime.hover("trigger")` + `flush` still paints nothing: `runtime.allText()`
  stays empty and no `Tooltip` node appears.

Measured before the fix: `runtime.element("tip")` is `Some` and the tree has a
`Tooltip` node with no name (the probe in §4).

### 2.4 `packages/primitives/docs/tooltip.mdx`

- API table `content` row: after "A string that trims to nothing is **no
  tip**", add "and neither is any other content that paints nothing (a computed
  `null` or an empty list)".
- The "Blank content" bullet under Behaviours: state the node case and why
  (an empty layer still publishes an unnamed `Tooltip` node), naming plan `744`.
- Do not touch the marquee/placement sections.

### 2.5 `COMPONENTS.md`

Tooltips row: one sentence — **Null tip (744):** content that paints nothing (a
computed `null`, an empty list) opens no layer and publishes no `Tooltip` node;
the child renders unchanged, while any element still counts as content.

### 2.6 `TODO.md` and `.agents/slop/plans/README.md`

- Add a primitives row for plan `744` and tick it.
- Add plan `744` to the primitives table in the plans index with the measured
  result.

## 3. Commands and expected results

```sh
# 1. the element suite — run after adding §2.2 only, to record the failing side.
nub run --filter @gpuixui/primitives test
# expect before the fix: the null/undefined/blank cases fail, each reporting the
# Gpuix tooltip wrapper where the child alone was expected; after the fix:
# 70 files / 958 tests pass.

# 2. the scoped runtime file.
nub run --filter @gpuixui/primitives test:runtime runtime/tooltip-rich.runtime.test.tsx
# expect before the fix: the new case fails on `runtime.element("tip")` being
# Some and a Tooltip node in the tree; after: 1 file / 4 tests pass.

# 3. the neighbouring suites the gate touches.
nub run --filter @gpuixui/primitives test:runtime runtime/info-tip.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/overlay-trigger.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/tooltip-dismiss.runtime.test.tsx
# expect: unchanged and green (a real tip is still a tip).

# 4. the package gates.
nub run --filter @gpuixui/primitives check-types
nub run --filter @gpuixui/primitives test
```

## 4. Test plan — both directions

The measured gap: `content={null}` opens an empty layer and publishes an
**unnamed `Tooltip`** node; `content={false}` and `content={"   "}` do not.

1. **Runtime, before the fix.** The new case fails: `element("tip")` is `Some`,
   `a11yNodes` contains role `Tooltip`, and the child's node carries no
   description but an empty popover exists above it. Record the dump in the
   status line.
2. **Offline, before the fix.** The null/undefined/blank cases fail by rendering
   the wrapper rather than the child.
3. **After the fix.** `element("tip")` is `None`, no `Tooltip` node exists, the
   `CheckBox` node is unchanged, and hover paints nothing. The element cases
   see the child alone.
4. **Over-broad direction.** A gate of `P.isString(content) || content == null`
   (or any rule that drops elements) fails case (2) of §2.2 and the existing
   rich-tip runtime case: a real node tip stops opening.
5. **Revert direction.** Restore the string-only gate: the new element cases and
   the runtime case fail by name while every other tip case stays green.
6. **No regression direction.** The real string tip (description + named tip),
   the labelled rich tip (plan 742), dismissal (plan 605), the centred tip
   (plan 095) and `InfoTip` (plan 573) all stay green.

## 5. STOP conditions

Stop and report rather than improvise if:

- the runtime still paints a layer for `content={null}` **after** the child-only
  return (then the runtime has its own empty-content path and the fix is not in
  this component);
- `paintsContent` drops a real element child (an element must always count);
- any real tip loses its description, name or layer;
- the new runtime case cannot observe the layer by locator or by the a11y tree
  (then the claim is unprovable and must be recorded as a limitation instead);
- `InfoTip` changes (its content type already refuses a node).

## 6. Acceptance

- A `Tooltip` whose content paints nothing renders its child unchanged: no
  wrapper, no cloned handlers, no description, no layer, no `Tooltip` node.
- A real string tip and a real node tip behave exactly as before.
- The new element and runtime cases fail against the string-only gate and pass
  after it; the neighbouring tip suites stay green.
- The page, the source JSDoc, `COMPONENTS.md`, `TODO.md` and the plans index
  state the rule.
- `nub run --filter @gpuixui/primitives test`, the scoped runtime files and
  `check-types` pass.
