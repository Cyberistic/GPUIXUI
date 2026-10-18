# 380 — Components run from source: the JSX runtime shim must be loadable

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110` (package), `330` (playground vendor workaround), `338` (packaging truth) |
| Status | done — the JSX runtime maps to loadable `.ts` shims: `nub -e "import('@gpuixui/components')"` returns **210 exports** (was `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), `check-types` passes, and the drift check fails when a shim entry is removed. Unit 361 → 362. |

## 1. The problem

The playground recorded a cross-team defect (their plan `330` §8.1, repeated in
their `TODO.md`): **`@gpuixui/components` cannot be executed from source by
`nub`.** `packages/components/tsconfig.json` maps the JSX runtime specifier to
the installed **declaration** files:

```json
"@gpuix/react/jsx-runtime": ["./node_modules/@gpuix/react/jsx-runtime.d.ts"]
```

`nub` honours `paths` at run time, so Node's type stripping tries to load the
`.d.ts`. Reproduced on this host, 2026-10-18, from `packages/components`:

```sh
nub -e "import('@gpuixui/components').then(m => console.log(Object.keys(m).length))"
# ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING
# Stripping types is currently unsupported for files under node_modules,
# for ".../node_modules/@gpuix/react/jsx-runtime.d.ts"
```

The mapping exists for a real reason: `@gpuixui/tokens/react` is compiled inside
this package's program from `packages/tokens/`, where the isolated linker does
not place `@gpuix/react`. Without the mapping, TypeScript cannot resolve the JSX
runtime for that file.

The playground currently works around it by compiling this package with
`apps/playground/tsconfig.vendor.json`. That workaround means the playground
tests a **copy**, not the source a consumer runs.

Measurements made before designing the fix (all on this host):

| Attempt | Typecheck | Runtime |
| ------- | --------- | ------- |
| map to `jsx-runtime.js` | **fails** — `TS7016: no declaration file`, then DOM `Props`/`StyleDesc` mismatches | `nub -e` imports **210 exports** |
| map to a `.ts` shim that only `export type { JSX }` | **fails** — TS falls back to React's DOM JSX namespace (`Property 'style' does not exist on type 'Props'`) | not tried; the type failure is decisive |
| map to a `.ts` shim with values from `react/jsx-runtime` and `export declare namespace JSX` declaring the intrinsic map | **passes** | imports **210 exports** |

The third row is the fix. Node strips the shim's types (it is our `.ts`, not a
dependency declaration), while TypeScript gets the GPUIX `JSX.IntrinsicElements`
map from the shim.

## 2. Scope

**In scope**

- `packages/components/tsconfig.json`: point both JSX-runtime paths at the new
  shims and explain why.
- `packages/components/src/internal/jsx-runtime.ts` and
  `packages/components/src/internal/jsx-dev-runtime.ts`: the runtime shims.
- `packages/components/src/exports.test.ts`: a drift check that the shim's
  intrinsic map still equals the installed `jsx-runtime.d.ts` map.
- `TODO.md`: resolve the playground interlock row.
- This plan and its index row.

**Out of scope — do not touch**

- `packages/tokens`: the durable alternative is a tokens devDependency on
  `@gpuix/react` (or a `@jsxImportSource react` pragma), which is tokens'
  decision and already recorded as an interlock. This plan makes components
  runnable without waiting for it.
- `apps/playground`: dropping the vendor build is the playground's change; this
  plan only removes the reason for it and records the hand-off.
- No change to `jsxImportSource` itself (`@gpuix/react` is still the runtime the
  components' host elements are typed against).
- No files outside `packages/components/`, `TODO.md` and this plan set.

## 3. Files and exact changes

### 3.1 `packages/components/src/internal/jsx-runtime.ts`

New file. Header comment: why a `.ts` shim exists, that Node refuses `.d.ts`,
and that the intrinsic map must match the installed declaration.

```ts
import type * as React from "react";
import type {
  AnchoredProps, CodeProps, DiffProps, ImgProps, InputProps,
  MarkdownProps, Props, SvgProps, TextareaProps, VirtualListProps,
} from "@gpuix/react";

export { Fragment, jsx, jsxs } from "react/jsx-runtime";

export declare namespace JSX {
  type ElementType = React.JSX.ElementType;
  type Element = React.JSX.Element;
  type ElementClass = React.JSX.ElementClass;
  type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
  type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
  type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;

  interface IntrinsicElements {
    div: Props;
    text: Props;
    img: ImgProps;
    svg: SvgProps;
    canvas: Props;
    input: InputProps;
    textarea: TextareaProps;
    anchored: AnchoredProps;
    code: CodeProps;
    diff: DiffProps;
    markdown: MarkdownProps;
    "virtual-list": VirtualListProps;
  }
}
```

`export declare namespace` is ambient: no runtime object is emitted and Node's
type stripping removes it.

### 3.2 `packages/components/src/internal/jsx-dev-runtime.ts`

The same shape, with `export { Fragment, jsxDEV } from "react/jsx-dev-runtime"`.
One-line header pointing at `./jsx-runtime.ts`.

### 3.3 `packages/components/tsconfig.json`

Replace the two `.d.ts` targets with the shims:

```json
"paths": {
  "@gpuix/react/jsx-runtime": ["./src/internal/jsx-runtime.ts"],
  "@gpuix/react/jsx-dev-runtime": ["./src/internal/jsx-dev-runtime.ts"]
}
```

and update the comment: the mapping serves tokens' source and must point at a
loadable `.ts`, never a declaration file (plan 380).

### 3.4 `packages/components/src/exports.test.ts`

Add one test to the `package exports` describe:

- helper `intrinsicBlock(text)` extracts the body of `interface IntrinsicElements
  { ... }` with `/interface IntrinsicElements \{([\s\S]*?)\n\}/`, trims it;
- assert the shim's block equals the installed
  `node_modules/@gpuix/react/jsx-runtime.d.ts` block, and the dev shim equals
  `jsx-dev-runtime.d.ts`'s.

This is the guard against a GPUix release adding an element: the shim then
rejects it at compile time already, and this test names the drift.

Update the file header to name the shim check.

### 3.5 `TODO.md`

Replace the pending interlock row

> `@gpuixui/tokens`' React file compiles with this package's `jsxImportSource`;
> tokens cannot resolve `@gpuix/react` under the isolated linker

with a **resolved** row naming this plan and the remaining tokens-side option,
and add a cross-team row:

> Playground can drop `apps/playground/tsconfig.vendor.json` and run
> `@gpuixui/components` from source (the `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`
> cause is gone) — owner: playground.

### 3.6 This plan set

Add plan 380 to `.agents/slop/plans/README.md` with the measured result.

## 4. Commands and expected results

Run from `workspaces/components`.

```sh
cd packages/components
nub -e "import('@gpuixui/components').then(m => console.log('exports', Object.keys(m).length))"
# expected: exports 210 (was ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING)

cd ../..
nub run --filter @gpuixui/components check-types
# expected: exit 0

nub run --filter @gpuixui/components test
# expected: 37 files / 362 tests (the new drift check; +1)

nub run --filter @gpuixui/components test:behaviour
# expected: 47 files / 554 tests (unchanged)

nub run check
nub run lint
nub run test
# expected: exit 0
```

The vendor build is not run from this workstream; the plan records the
directory hand-off. If `nub run --filter playground build` is run, it must still
pass — the shim is a real `.ts` module and its emitted import
(`react/jsx-runtime`) resolves from the playground's own `node_modules`.

## 5. Both-direction proof

1. Point `@gpuix/react/jsx-runtime` back at
   `./node_modules/@gpuix/react/jsx-runtime.d.ts` and run the `nub -e` import.
   Expected: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` (the original bug).
   Restore.
2. Delete one line from the shim's `IntrinsicElements` (for example `code:
   CodeProps;`) and run the exports suite. Expected: the drift check fails and
   names the missing entry. Restore.
3. Re-run `nub -e` (210 exports) and the exports suite (green).

## 6. STOP conditions

Stop and report with evidence instead of improvising if:

- `nub` rejects `export declare namespace JSX` in a `.ts` shim (the measured
  third row says it does not; if the host differs, record it);
- the shim's emitted output still imports `@gpuix/react/jsx-runtime` recursively,
  which would mean the path mapping is applied to the emitted specifier rather
  than only to resolution;
- the drift check cannot read the installed declaration under the isolated
  linker (then assert the shim block against a checked-in excerpt and record the
  reason);
- fixing this changes a runtime behaviour or a component test;
- any file outside §3 must change;
- a gate fails twice for the same reason.

## 7. Acceptance criteria

- `nub -e "import('@gpuixui/components')"` resolves the package from source with
  210 exports and no type-stripping error.
- `check-types` passes with the shims as the only JSX-runtime mapping.
- The drift check fails when the shim and the installed declaration disagree.
- The playground hand-off (drop the vendor copy) is recorded in `TODO.md`.
- `nub run check`, `nub run lint` and `nub run test` pass.
