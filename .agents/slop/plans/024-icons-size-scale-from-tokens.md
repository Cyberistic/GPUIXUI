# 024 — `packages/icons` takes its size scale from tokens

**Phase:** B (cleanup). **Owner:** primitives/icons workstream.
**Depends on:** plan `021` (tokens is in the tree and resolves from source).
**Status:** done (2026-10-17).

## 1. Why

`packages/icons/src/sizes.ts` declares the icon scale a second time:

```ts
export const ICON_SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const;
```

`@gpuixui/tokens` owns exactly that scale as `iconSize` and every component
receives it as `theme.iconSize`. Two copies of one scale is how an icon stops
lining up with the text beside it: a token change would reach the theme but not
`<Icon size="md">`. The boundary permits the dependency
(`tokens → icons → primitives`); tokens has no runtime dependencies.

The public API does not change: `ICON_SIZES`, `IconSize` and `iconPixels` stay
exported from `@gpuixui/icons`.

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/icons/package.json` | add `"@gpuixui/tokens": "workspace:*"` to `dependencies` |
| `packages/icons/src/sizes.ts` | `ICON_SIZES` becomes `iconSize` imported from `@gpuixui/tokens`; delete the literals |
| `packages/icons/src/sizes.test.ts` | add the identity guard from §4 |
| `packages/icons/README.md` | note that the scale is the tokens scale, not a second copy |
| `TODO.md` / plan index | record plan 024 as done when the gates pass |

Do not edit `packages/tokens`.

## 3. Steps

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/primitives
nub run --filter @gpuixui/icons test
```

Expected before the edit: 3 files / 18 tests green (the baseline).

1. Add the dependency and run `nub install`; confirm
   `packages/icons/node_modules/@gpuixui/tokens` is a symlink.
2. Rewrite `sizes.ts`’s declaration as:

   ```ts
   import { iconSize } from "@gpuixui/tokens";

   /**
    * Icon sizes.
    *
    * The scale is `@gpuixui/tokens`’ `iconSize` (plan 024): an icon at `md` is
    * exactly the height of a line of `md` text's cap box and lines up with it.
    * Pass a number only when the icon is not inline with text.
    */
   export const ICON_SIZES = iconSize;

   export type IconSize = keyof typeof ICON_SIZES;
   ```

   Keep `iconPixels` unchanged.
3. Run:

   ```sh
   nub run --filter @gpuixui/icons test
   nub run check
   nub run test
   ```

   Expected: icons still 3 files / 19 tests (the identity test is new); every
   workspace green.
4. Commit and push:

   ```sh
   git add packages/icons TODO.md .agents/slop/plans
   git commit -m "refactor(icons): take the size scale from tokens"
   git push origin agent/primitives
   ```

## 4. Test plan

Add one test to `sizes.test.ts`:

```ts
it("is the token scale, not a second copy", () => {
  expect(ICON_SIZES).toBe(iconSize);
});
```

It fails the moment someone re-declares the literals, which is the regression
this plan exists to prevent. The existing five tests still prove the scale is
positive, monotonic, resolves by name and passes raw pixels through; they are
not weakened by the identity change.

## 5. STOP conditions

- `@gpuixui/tokens` cannot be resolved from `packages/icons` after
  `nub install` — stop; do not add a path shim (compare plan 021 §5).
- The icons package must stay installable without tokens for a documented
  published-package reason — stop and record the reason instead of forcing the
  dependency.
- Any gate fails for a reason not explained by this change.

## 6. Acceptance

- One icon-size scale in the library.
- `@gpuixui/icons` exports `ICON_SIZES`, `IconSize`, `iconPixels` unchanged.
- `nub run check` and `nub run test` green; plan index and `TODO.md` updated.
