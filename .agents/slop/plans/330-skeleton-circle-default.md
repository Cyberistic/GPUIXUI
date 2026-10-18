# 330 — `Skeleton circle` paints a circle, not a pill

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `030` (the package), `041` (runtime verification), `329` (the loading family's animation record) |
| Status | done |
| Fixes | `Skeleton`'s `circle` prop defaults to a full-width block, so it paints a pill |

---

## 1. The defect

`SkeletonSpec.circle` documents "A circle: an avatar placeholder". The resolver
defaults `width` to `"100%"` and `height` to the body line height, and `circle`
only changes the radius:

```ts
// packages/primitives/src/core/loading.ts (before)
width: spec.width ?? "100%",
height: spec.height ?? theme.typography.body.lineHeight,
borderRadius: spec.circle === true ? theme.radius.full : theme.radius[spec.radius ?? "sm"],
```

So the obvious call paints a **pill spanning its parent** with fully rounded
ends — an ellipse, not the avatar placeholder the prop promises. The docs' own
avatar example passes `width={32} height={32}`, which is why the gap was never
visible; a consumer who writes `<Skeleton circle />` gets a 100 % × 18 bar.

Measured on this host, 2026-10-18, real GPUix 0.10.0 `TestRenderer`, test theme
(body line height 18):

```
<Skeleton testId="sk" circle />        painted 100% × 18   (a pill)
<Skeleton testId="sk" circle width={32} height={32} />  32 × 32
```

A `circle` boolean that cannot produce a circle on its own is a contract bug,
not a styling choice.

## 2. The rule

> **`circle` makes the placeholder as wide as it is tall.** When the caller does
> not pass `width`, a circular skeleton takes the resolved height as its width,
> so `<Skeleton circle />` is a square. An explicit `width` always wins, and a
> non-circular skeleton keeps `"100%"`.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/loading.ts` | resolve `height` first, then `width = spec.width ?? (circle ? height : "100%")`; correct the `pulseOpacity` comment, which still says the runtime interpolates nothing (plan `329`) |
| `packages/primitives/src/core/loading.test.ts` | the square default, an explicit `width` winning, and a non-circular skeleton staying full width |
| `packages/primitives/runtime/loading.runtime.test.tsx` | the painted box is square for `<Skeleton circle />` |
| `packages/primitives/docs/skeleton.mdx` | the API row and the avatar example |
| `COMPONENTS.md` | the Skeleton row |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Exact implementation

### 4.1 `core/loading.ts`

```ts
export const skeletonStyle = (
  spec: SkeletonSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const height = spec.height ?? theme.typography.body.lineHeight;
  return {
    // A circle takes its height as its width, so `circle` alone is a square.
    width: spec.width ?? (spec.circle === true ? height : "100%"),
    height,
    flexShrink: 0,
    borderRadius:
      spec.circle === true
        ? theme.radius.full
        : theme.radius[spec.radius ?? "sm"],
    backgroundColor: theme.colors.skeleton,
  };
};
```

`DimensionValue` is `number | string`, so `height` (either) is a legal width.

### 4.2 Tests

`src/core/loading.test.ts`, in the `skeletonStyle` block:

```ts
it("makes a circle as wide as it is tall", () => {
  // The bug guarded (plan 330): `circle` only changed the radius, so the
  // default `100%` width painted a pill.
  const circle = skeletonStyle({ circle: true }, testTheme);
  expect(circle.width).toBe(circle.height);
  expect(circle.width).toBe(testTheme.typography.body.lineHeight);
  // an explicit width still wins, and a plain block stays full width
  expect(skeletonStyle({ circle: true, width: 40 }, testTheme).width).toBe(40);
  expect(skeletonStyle({}, testTheme).width).toBe("100%");
});
```

`runtime/loading.runtime.test.tsx`:

```tsx
it("paints a bare circle Skeleton as a square", async () => {
  // Plan 330 §1: `<Skeleton circle />` measured 100% × 18, an ellipse.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Skeleton testId="sk" circle />
    </Surface>,
  );
  const box = Option.getOrElse(runtime.bounds("sk"), () =>
    expect.fail("the Skeleton painted no box"),
  );
  expect(box.width).toBe(box.height);
});
```

### 4.3 Docs

- `skeleton.mdx` API row: `width` default becomes "`"100%"`, or the height when
  `circle`", and `circle` reads "full radius and a square default — an avatar or
  icon placeholder".
- The avatar example keeps its explicit numbers and gains a sentence: a bare
  `<Skeleton circle />` is already a square at the body line height; pass
  `width`/`height` for a larger avatar.
- `COMPONENTS.md` Skeleton row appends the fix and the measured box.

## 5. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/primitives test -- loading` **before** the change | the new core case fails: `expected "100%" to be 18` |
| 2 | `nub exec vitest run --config vitest.runtime.config.ts runtime/loading.runtime.test.tsx -t "bare circle"` **before** the change | `expected 1256 to be 18` (the surface's content width) |
| 3 | apply §4.1–§4.3 | — |
| 4 | `nub run test` | 40 files, 524 tests green |
| 5 | `nub run test:runtime` | 21 files, 316 tests green |
| 6 | `nub run check` | every gate green |

## 6. STOP conditions

- **STOP** if a plain `<Skeleton />` stops spanning its parent (`width "100%"`).
- **STOP** if an explicit `width` is ignored, or a string height is coerced to a
  number.
- **STOP** outside §3's files.

## 7. Acceptance

- [x] `<Skeleton circle />` paints a square at the body line height.
- [x] `<Skeleton circle width={40} />` is 40 wide; `<Skeleton />` stays `100%`.
- [x] Element-tree/core and runtime suites prove both directions; `nub run check`
      is green; docs, `COMPONENTS.md` and `TODO.md` agree.

## 8. Measured results

### 8.1 Both failing directions

| Mutation | Result |
| -------- | ------ |
| the old `width: spec.width ?? "100%"` | the core case fails (`expected '100%' to be 18`) and the runtime case fails (`expected 1256 to be 18`) |
| `width: spec.width ?? height` for every skeleton (circle ignored) | the `skeletonStyle > takes width, height and radius…` / plain-block case fails: a plain skeleton painted 18 px instead of spanning its parent |

### 8.2 After the fix

```
nub run --filter @gpuixui/primitives test
  Test Files  40 passed (40)
       Tests  524 passed (524)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  21 passed (21)
       Tests  316 passed (316)
```
