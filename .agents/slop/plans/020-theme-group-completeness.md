# 020 — Every shipped theme carries every theme group

**Workstream:** `tokens-theme`
**Phase:** B (working foundation), extending plan 019
**Depends on:** plan 019 (the `motion` group)
**Files owned:** `packages/tokens/src/theme.test.ts` (one new `describe`), this
plan, `.agents/slop/plans/README.md` (index row only), `TODO.md` (this
workstream only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`Theme` is a flat record of groups: `colors`, `typography`, `spacing`, `radius`,
`density`, `elevation`, `motion`, `borderWidth`, `iconSize` (plus `name` and
`mode`). Four themes ship — light, dark, high-contrast light, high-contrast dark —
and `extendTheme` rebuilds the object group by group.

Adding a group (plan 019 added `motion`) touches five places. The tests cover the
colour sets (contrast, role keys) and the merge behaviour (`extendTheme({})`
deep-equals its base), but **nothing asserts that the four themes have the same
groups**. So a group added to `lightTheme` and `darkTheme` but forgotten in the
two high-contrast themes passes every gate and silently removes a scale from
high-contrast mode — exactly the kind of one-theme-only drift this package exists
to prevent.

## 2. Design decisions (do not re-litigate)

1. **No hardcoded group list.** The test asserts the four themes' own key sets are
   equal, so a legitimate new group added to all four does not need a test edit,
   while a group added to one only fails.
2. **`extendTheme` keeps the set** under a real override, not only under `{}`.
3. The test states the bug it guards in its header comment.

## 3. Exact change

Append to `packages/tokens/src/theme.test.ts` (imports `lightTheme`, `darkTheme`,
`highContrastLightTheme` and `extendTheme` are already present):

```ts
describe("theme completeness", () => {
  it("gives every shipped theme the same groups", () => {
    const reference = Object.keys(lightTheme).toSorted();
    [
      ["dark", darkTheme],
      ["high-contrast light", highContrastLightTheme],
      ["high-contrast dark", highContrastDarkTheme],
    ].forEach(([label, theme]) => {
      expect(Object.keys(theme).toSorted(), label).toEqual(reference);
    });
    expect(reference).toContain("motion");
  });

  it("keeps every group through a real override", () => {
    const extended = extendTheme(lightTheme, {
      colors: { primary: "#123456" },
      motion: { fast: 100 },
    });
    expect(extended.colors.primary).toBe("#123456");
    expect(extended.motion.fast).toBe(100);
    expect(Object.keys(extended).toSorted()).toEqual(
      Object.keys(lightTheme).toSorted(),
    );
  });
});
```

The file's header comment already describes the extension contract; add one line:
"and every shipped theme carries every group the others do".

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme

nub run --filter @gpuixui/tokens test      # expect all pass
nub run --filter @gpuixui/tokens check-types
nub run check && nub run lint && nub run test
```

Two-direction proof: delete `motion,` from `highContrastDarkTheme` in
`theme.ts`, run the test, expect "high-contrast dark" to fail on the key-set
comparison; restore.

## 5. Test plan

- The guard fails if a group is dropped from one theme (proven by the two-
  direction run above).
- It fails if `extendTheme` stops rebuilding a group.
- No existing assertion is weakened.

## 6. STOP conditions

- STOP if the four themes legitimately need different groups (a theme-specific
  group is a design decision, not a bug). Report before changing the assertion.
- STOP if any gate is red for a reason outside this plan.

## 7. Acceptance criteria

- [ ] `theme.test.ts` asserts the four shipped themes share a group set, and that
      an override keeps it.
- [ ] The two-direction proof is run and captured in the commit message.
- [ ] `nub run check`, `nub run lint`, `nub run test` exit 0.
- [ ] Committed on `agent/tokens-theme` and pushed.
