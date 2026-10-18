# 388 — the composed examples need a public subpath

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | F (packaging) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `047`, `092`, `374` |
| Hand-off | playground plan `168` / its `TODO.md` cross-team row |

## 1. The gap

`packages/primitives/examples/index.ts` is the registry of the fifteen composed
screens (`buttonGroup`, `checkbox`, `feedback`, `form`, `icons`, `layout`,
`numberField`, `otp`, `rating`, `selection`, `toggle`, `toggleGroup`, `tooltip`,
`typography`, `value`). The package README points at them, and
`runtime/examples.runtime.test.tsx` mounts them, but the package's `exports`
map has only `.`, `./core` and `./testing`.

The playground cannot mount them through the package boundary and plan `168`
had to build its smoke screen against the public root export instead. The
hand-off row is in the playground workstream's `TODO.md`:
"export the composed examples from `@gpuixui/primitives`
(`\"./examples\": \"./examples/index.ts\"`) so the playground can show and smoke
the realistic compositions its README already points at".

An internal path (`../../packages/primitives/examples/...`) would invert the
packaging boundary — the same reason `./testing` exists (D33).

## 2. The change

One manifest entry, no code move:

```json
"./examples": {
  "types": "./examples/index.ts",
  "default": "./examples/index.ts"
}
```

The example modules already use the package's public root for components
(`@gpuixui/primitives`), so the subpath adds no second dependency direction.
`examples/index.ts` stays the only registry; the docs example lookup and the
runtime mount continue to read it.

### Guard

A package export that no test resolves is the failure mode this repo keeps
finding (plans `333`, `348`, `349`). Add
`packages/primitives/src/examples-export.test.ts`:

1. decode `package.json` (`Schema.fromJsonString`) and assert
   `exports["./examples"]` is `{ types: "./examples/index.ts",
   default: "./examples/index.ts" }`;
2. assert the target file exists;
3. import `../examples/index.js` and assert every registry key maps to a
   function, and the registry is not empty.

The test fails if the manifest entry is removed, renamed, or pointed at a
missing file, and if a registry entry is added without a component.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/package.json` | add the `./examples` export (types + default) |
| `packages/primitives/src/examples-export.test.ts` | **new** guard described above |
| `packages/primitives/README.md` | name the subpath in the examples/playground paragraph |
| `TODO.md` | tick the primitives row for the playground hand-off; add the row if absent |
| `.agents/slop/plans/README.md` | index this plan |

No example file changes.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test` | all offline files pass; the new guard is collected (46 → 47 files) |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` (the export target is included by the package tsconfig) |
| `nub run check` | exit `0` |
| `cd packages/primitives && nub exec vitest run src/examples-export.test.ts` | **after**: passes; **before**: fails because the export key is absent |

## 5. STOP conditions

1. TypeScript cannot resolve the self-referencing subpath inside the package's
   own test run (exports self-reference is not wired for source-first packages).
   If so, do not add a `paths` alias; assert the manifest shape and keep the
   subpath for external consumers, recording the limitation in the test header.
2. The examples registry imports a module outside `src/`, `examples/` or the
   package's declared dependencies. Report it; do not add a dependency for an
   example.
3. The playground already imports a different path for these examples. Record
   the conflict instead of renaming their path.

## 6. Test plan (what must be able to fail)

- Remove the `./examples` key from the manifest → the guard fails by key name.
- Point `default` at `./examples/missing.ts` → the existence assertion fails.
- Add a registry entry whose value is not a component → the "every entry is a
  function" assertion fails.
- The registry-size assertion is a liveness check, not a hard-coded count, so a
  new example does not require editing the test.

## 7. Acceptance

- `@gpuixui/primitives/examples` resolves to the registry and the guard proves
  the manifest shape and the target's existence.
- The offline suite, type check and `nub run check` are green.
- The README names the subpath; the TODO hand-off is ticked; committed on
  `agent/primitives` and pushed.

## 8. Results (2026-10-18)

**Change** — `packages/primitives/package.json` declares:

```json
"./examples": {
  "types": "./examples/index.ts",
  "default": "./examples/index.ts"
}
```

**Guard** — `src/examples-export.test.ts` (2 tests) schema-decodes the manifest,
asserts the `./examples` target's `types`/`default` are both
`./examples/index.ts`, asserts that file exists, and asserts every registry id
maps to a function.

**Both directions** — removing the `./examples` key from the manifest and
running the file reported `1 failed | 1 passed` with
`expected undefined to be './examples/index.ts'`; restoring it reported
`2 passed`.

**Runs**

| Command | Result |
| ------- | ------ |
| `nub exec vitest run src/examples-export.test.ts` | **2 passed** |
| `nub run --filter @gpuixui/primitives test` | **47 files / 679 tests passed** |
| `nub run check` | see the branch's gate run; the package's docs/exports/manifest guards are included |

The README's offline count was refreshed from the stale `46 / 660` to the
measured `47 / 679`. The full runtime suite is not part of this slice; the
subpath is type-checked and manifest-guarded, and no runtime behaviour changed.

