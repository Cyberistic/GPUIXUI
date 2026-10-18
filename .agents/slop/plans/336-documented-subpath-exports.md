# 336 — Packaging truth: every documented subpath import resolves

**Phase:** F (packaging / docs truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 110, 115, 117, 330, 335.

**Status when written:** `docs/field.mdx` tells a consumer to write

```ts
import { validate } from "@gpuixui/components/validation/logic";
```

and that import **cannot resolve through the package's own export map**. The map
is:

```json
"exports": { ".": "./src/index.ts", "./*": "./src/*.tsx" }
```

so the subpath maps to `./src/validation/logic.tsx`, while the module on disk is
`src/validation/logic.ts`. Measured on this host:

```sh
node --input-type=module -e 'import.meta.resolve("@gpuixui/components/validation/logic")'
# -> .../src/validation/logic.tsx
node -e 'import("@gpuixui/components/validation/logic")'
# -> ERR_MODULE_NOT_FOUND ... src/validation/logic.tsx
```

Every component subpath (`@gpuixui/components/card`) still works because those
modules are `.tsx`. This is the only documented deep import today, but nothing
stops the next one from reintroducing the same break: the README states the
boundary and `docs/` states the import paths, and neither is checked.

## 1. The rule

> A subpath the package's own documentation or examples tell a consumer to
> import must resolve through `package.json`'s `exports` to a file that exists.
> Every public `src/*.tsx` module must also be re-exported by `src/index.ts`.

## 2. Exact changes

### 2.1 `packages/components/package.json`

Add one explicit export before the wildcard:

```json
"./validation/logic": "./src/validation/logic.ts",
```

Explicit keys win over the `./*` pattern, so the documented import resolves.
No other `.ts` module is documented as a public subpath; do not add speculative
entries.

### 2.2 `packages/components/src/exports.test.ts` (new)

A repository check (test-only `node:fs`/`node:url`, like `inventory.test.ts`).

1. Collect the subpaths: read every `docs/*.mdx` and `examples/*.example.tsx`,
   match `@gpuixui/components/([\w/-]+)`, and dedupe. The bare package specifier
   `@gpuixui/components` is also included.
2. For each, `import.meta.resolve(specifier)`, convert with `fileURLToPath` and
   assert `existsSync` — the assertion is the file check, not the resolver, since
   Node's resolver does not verify existence.
3. Read `src/` and assert every `*.tsx` module that is not a test file and not
   `index` has `export * from "./<stem>.js"` in `src/index.ts`.

Header comment states the bug being guarded: a documented deep import shipped
pointing at a file that does not exist (plan 336), and a public module could be
added without reaching the package root.

### 2.3 Nothing else

No component code, docs prose or behaviour change. The docs page already states
the correct API; the package was wrong.

## 3. Test plan

1. Write `exports.test.ts` **before** 2.1 and run
   `nub run --filter @gpuixui/components test -- exports`. It must fail with the
   `validation/logic` specifier (the returned path ends in `.tsx` and does not
   exist).
2. Add 2.1; the same command is green.
3. Both-direction proof 2: temporarily change the explicit export to a
   nonexistent file (or delete it) → the same failure returns. Restore.
4. Both-direction proof 3: temporarily remove `export * from "./badge.js"` from
   `src/index.ts` → the index check fails naming `badge`. Restore.
5. `nub run --filter @gpuixui/components test` (337 unit tests,
   `335 + 2`), `... test:behaviour` (517), `nub run check`, `nub run lint`,
   `nub run test`.

## 4. STOP conditions

- The check finds another documented subpath that does not resolve — STOP; list
  every one in the report and add only the exports the docs actually promise.
- A subpath resolves to `node_modules` rather than this package — STOP; the
  self-reference is wrong and the check would be meaningless.
- Fixing the export requires changing component source — STOP; this is a
  packaging bug, not an API redesign.

## 5. Acceptance

- The documented `validate` import resolves and imports successfully.
- The new check fails on a removed export entry and on a module missing from
  `src/index.ts`.
- All gates pass.

## 6. Outcome

Landed on `agent/components` (2026-10-18). Evidence:

- **Before:** the new resolution test failed with the real path:
  `"@gpuixui/components/validation/logic -> .../src/validation/logic.tsx"`.
  `node -e 'import("@gpuixui/components/validation/logic")'` reproduced
  `ERR_MODULE_NOT_FOUND` for the same path.
- **After:** the explicit export resolves; `import()` returns
  `[ 'validate', 'validateAll' ]`; the unit suite is **337** (335 + 2).
- **Both directions:** deleting `export * from "./badge.js"` from
  `src/index.ts` fails the second check with `[ 'badge' ]`; removing the
  explicit export entry fails the first with the `.tsx` path. Both restored.
- No component, docs or behaviour change: the docs already promised the right
  API and the package shipped the wrong map.
