# 399 — A blank icon label must not create an unnamed image

- **Status:** done
- **Phase:** F (accessibility truth)
- **Depends on:** `024`, `031`, `041`, `357`, `396`
- **Owner:** primitives workstream (`packages/icons`, plus the runtime suite in
  `packages/primitives`)
- **Amends:** `packages/icons/src/Icon.tsx`, `packages/icons/docs/icon.mdx`,
  `packages/icons/README.md`, `COMPONENTS.md`

## 1. The bug

`Icon` decides its accessibility role from **presence** of the `label` prop:

```ts
role={label === undefined ? "presentation" : "img"}
aria-label={label}
```

So `<Icon name="check" label="" />` (or `label="   "`) paints a monochrome
decorative mark but publishes **`role="img"` with an empty name** — an unnamed
image in the accessibility tree. The page and the README both promise the
opposite rule:

> A decorative icon gets `role="presentation"` … only a `label` promotes the
> icon to an image.

This is the same class plan `396` fixed for `Button`, `Toggle` and
`ScrollArea`: whitespace (or a computed empty string) is not a name. `Icon` is
the one remaining primitive that reads the raw prop and treats a blank string
as a deliberate name.

A caller commonly gets here without meaning to: `label={someCondition ?
"Delete" : ""}` or `label={t("icon.close")}` with a missing translation. The
mark is decoration in that state; it must not steal focus of the accessibility
tree from the control that contains it.

## 2. Decision

- A **blank** (`""` or whitespace-only) label is **absent**: `role="presentation"`
  and no `aria-label`. The icon is decoration again.
- A **real** label is trimmed before it becomes the name, so `"  Done  "`
  announces `Done` (the rule `usableLabel` already applies in primitives).
- The public type does **not** change: `label?: string` stays optional.
- `InfoTip`/`IconButton` keep a required `label`; this plan deliberately does
  not invent a fallback name for a blank required prop. Their contract is
  "the caller supplies a name", and a generic invented name ("More
  information") would be a different decision. Recorded in §7.

Pure rule, no new dependency and no runtime API.

## 3. Steps

### 3.1 Write the failing unit tests

File: `packages/icons/src/Icon.test.ts`

Add beside the existing decoration/image cases:

```ts
it("treats a blank label as decoration, not an unnamed image", () => {
  for (const label of ["", "   "]) {
    const { props } = render({ name: "check", color: "#123456", label });
    expect(props.role).toBe("presentation");
    expect(props["aria-label"]).toBeUndefined();
  }
});

it("trims a real label before it becomes the name", () => {
  const { props } = render({
    name: "check",
    color: "#123456",
    label: "  Done  ",
  });
  expect(props.role).toBe("img");
  expect(props["aria-label"]).toBe("Done");
});
```

Run:

```sh
nub run --filter @gpuixui/icons test
```

**Expected (before the fix):** 2 failures — the blank cases report `img` and
`""`/`"   "`, and the trimmed case reports the untrimmed string. STOP if the
suite is not otherwise green; do not edit an unrelated test.

### 3.2 Fix the resolver in `Icon.tsx`

Replace the raw prop with one derived name:

```ts
const name = label?.trim();
const named = name !== undefined && name.length > 0;
```

and pass:

```tsx
role={named ? "img" : "presentation"}
aria-label={named ? name : undefined}
```

Update the `label` JSDoc to say "a non-blank label" and that blank reads as
decoration, and the component doc's line about the role/name coming from the
props.

Run the same command. **Expected:** 25 tests green (23 + 2 new).

### 3.3 Prove it at the accessibility boundary

File: `packages/primitives/runtime/icons.runtime.test.tsx`

Extend the existing case
`"takes a decorative icon out of the accessibility tree and keeps a named one"`:
after the decorative mount and before the named mount, mount
`<Icon ... label="" />` and `<Icon ... label="   " />` and assert
`a11yNode(runtime.a11y(), { role: "Image" })` is `None`; after the named mount,
also assert no node has label `"   "`. Optionally add the trimmed name
(`label=" Done "` → a node labelled `"Done"`).

Run only the affected file:

```sh
nub run --filter @gpuixui/primitives test:runtime -- icons
```

**Expected:** the file green (the new assertions fail on the old component:
the blank mount publishes an `Image` node). STOP if the runtime binding is not
available; record the command output and report — do not fake the run.

### 3.4 Correct the docs and the inventory

- `packages/icons/docs/icon.mdx`:
  - API row for `label`: "accessible name; a non-blank label promotes the icon
    to an image, a blank one leaves it decorative".
  - Accessibility bullet: "only a non-blank `label` promotes it …".
  - Verification bullet: add the blank-label/trim case.
- `packages/icons/README.md`: the same two sentences.
- `packages/primitives/docs/README.md` (if it indexes icons) — only if the claim
  appears there.
- `COMPONENTS.md` Icons row: append **"Blank label (399):** `label=""` or
  whitespace exposed `role="img"` with no name — a blank label is now absent
  (presentation, no `aria-label`) and a real one is trimmed."

### 3.5 Gates

```sh
nub run --filter @gpuixui/icons test
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
nub run test
```

Expected: all exit `0`; the offline primitives count rises by the new assertions
(the icons suite gains 2 tests). The full live suite is **not** part of this
plan: its 19 failing files are the host's plan-379/529 binding delta, and the
scoped file is the correct verification here.

## 4. STOP conditions

- The icons suite or `check-types` is red before the change for an unrelated
  reason.
- The runtime suite cannot load the binding (`unsupported-host` / missing
  native module) — report the exact output; do not replace the runtime proof
  with a claim.
- The fix would need a change outside `packages/icons`,
  `packages/primitives/runtime/icons.runtime.test.tsx`, `COMPONENTS.md` and the
  plan index — record it as a `TODO.md` row instead.
- Any temptation to add a fallback name for `InfoTip`/`IconButton`: out of scope
  (§7).

## 5. Test plan (what must be able to fail)

| Direction | Test | Fails on the old code because |
| --- | --- | --- |
| blank → decoration | `Icon.test.ts` + runtime case | `role` was `img` with `""`/`"   "` |
| whitespace-only → decoration | same | `label === undefined` was the only test |
| real label trimmed | `Icon.test.ts` | the untrimmed prop was passed through |
| real label still named | existing decoration/image case | unchanged, guards no regression |

Two-direction proof: run the unit test against the old one-line rule
(`label === undefined`) — both new unit cases fail; restore the fix — all pass.
Run the scoped runtime case against the old component — it reports an `Image`
node for the blank mount.

## 6. Acceptance

- A blank or whitespace-only `label` produces `role="presentation"` and no
  `aria-label`, in the unit tree and in the real 0.10.0 accessibility tree.
- A real label is trimmed and still produces an `Image` node with that name.
- The page, README, JSDoc and inventory agree with the code.
- `nub run check`, `nub run lint`, `nub run test` and the scoped runtime file
  pass, and the commands were actually run.


## 7. Deliberately out of scope

- `InfoTip` and `IconButton` have a **required** `label`; a blank value is a
  caller error with no semantic alternative. Inventing "More information" or
  the icon name would be a separate naming decision (and, for `InfoTip`, would
  duplicate the description). If a consumer needs a guard, the honest shape is
  a schema-validated, non-empty name at the boundary, not a silent fallback in
  a renderer.
- The `Icon` component cannot import primitives' `usableLabel` (the dependency
  points the other way: primitives → icons), so the trim rule is three lines
  local to the icons package. The guard is behavioural, not structural.

## 8. Outcome (measured 2026-10-19)

- `nub run --filter @gpuixui/icons test` — **27 passed** (23 before; the blank
  cases are one `it.each` with two rows plus the trim case).
- Old-direction proof: reverting the rule to `label === undefined` failed both
  blank unit rows and the trim row.
- `nub run --filter @gpuixui/primitives test:runtime runtime/icons.runtime.test.tsx`
  — **5/5 passed** with the new assertions; with the old rule the same file
  reported **1 failed / 4 passed** at the blank mount.
- `nub run --filter @gpuixui/primitives test` — 705 passed (no offline count
  change: the runtime assertion extends an existing case).
- `nub run check`, `nub run lint`, `nub run test` — all exit `0`.
