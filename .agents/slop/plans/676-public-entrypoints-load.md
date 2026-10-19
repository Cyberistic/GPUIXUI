# Plan 676 — Every published entry point must load, not only resolve

| | |
| --- | --- |
| Phase | G (release readiness: public-export checks) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 336, 337, 338, 380 |
| Status | **done** — one `exports.test.ts` case imports all 45 published specifiers through the package name; a bogus specifier fails with Node's module error |
| Claimed number | `676` — `675` is this workstream's, `673` is `tokens-theme`'s and `674` is `playground`'s; checked across every worktree on 2026-10-19 and recorded in `PLAN.md` D30 |

## 0. Why this plan exists

`TODO.md` → Phase G still has **“Clean-environment install and public-export
checks”** open. The package's public surface is already enumerated and checked
for *resolution*: `src/exports.test.ts` proves every documented subpath and every
`exports` target points at a file that exists, every public module has one entry,
nothing private is addressable, the root re-exports every module, and the JSX
shim matches the installed declaration (plans 336/338/380).

None of those checks **loads** the module. A target can exist and still fail at
import time — a broken top-level import, a removed named export used at module
scope, a circular initialisation error, or a package the manifest check cannot
see because the failure is a runtime `ERR_MODULE_NOT_FOUND` inside a dependency.
`check-types` catches type errors, but not every runtime failure (a missing
optional peer resolved through a conditional export, for example).

Measured in this worktree on 2026-10-19: importing the four representative
entries through their published specifiers works, and adding one non-exported
specifier makes the same loop report the exact Node error:

```text
"@gpuixui/components/does-not-exist: Error: \"./does-not-exist\" is not exported
 under the conditions [\"node\", \"development\", \"import\"] from package …
 (see exports field in …/package.json)"
```

So one test can hold every entry point to the same runtime contract.

## 1. The rule

The package's public surface is what a consumer can **import**, not what exists
on disk. Every `exports` key must resolve **and load** through the package name,
under the package's own resolution conditions, in the same process the unit
suite runs.

This is the public-export half of the Phase G task. The clean-environment half
(a fresh checkout install) still needs the native binding and network, and stays
open in `TODO.md`.

## 2. Exact files to change

1. `packages/components/src/exports.test.ts` — add `publishedSpecifiers()` and
   the load test; extend the file header.
2. `.agents/slop/plans/README.md` — index row `676`.
3. `PLAN.md` D30 — record `676`.
4. `TODO.md` — under Phase G, split “Clean-environment install and public-export
   checks” into the ticked public-export half (naming this plan and the check)
   and the still-open clean-environment half.

No runtime source changes. No component docs page: this is a packaging gate, not
a component (the precedent is plan 338's `test:perf` + `docs/performance.md`,
which recorded a measured capability rather than a component).

## 3. Implementation

At the top of `src/exports.test.ts`, add `Effect` and `Option` imports (the file
already imports `Arr`, `Order`, `Result`, `Schema`):

```ts
import { Effect } from "effect";
import * as Option from "effect/Option";
```

After `documentedSpecifiers()`, add:

```ts
/** Every specifier the export map publishes, through the package name. */
const publishedSpecifiers = (): ReadonlyArray<string> =>
  sorted(
    Arr.map(Object.keys(exportsMap()), (key) =>
      key === "." ? "@gpuixui/components" : `@gpuixui/components/${key.slice(2)}`,
    ),
  );

/** `None` when `specifier` loads, `Some` with the reason when it does not. */
const loadFailure = (
  specifier: string,
): Effect.Effect<Option.Option<string>> =>
  Effect.tryPromise({
    try: () => import(specifier),
    catch: (cause) => `${specifier}: ${String(cause)}`,
  }).pipe(
    Effect.match({
      onFailure: (message) => Option.some(message),
      onSuccess: () => Option.none<string>(),
    }),
  );
```

and one case in the `describe("package exports")` block:

```ts
it("loads every published entry point", async () => {
  const failures = await Effect.runPromise(
    Effect.map(
      Effect.forEach(publishedSpecifiers(), loadFailure, {
        concurrency: "unbounded",
      }),
      Arr.getSomes,
    ),
  );

  expect(failures).toEqual([]);
});
```

`Effect.runPromise` is the test-harness boundary (EF-21); the test file is the
only caller. No `try/catch`, no `any`. `import(specifier)` with a variable is
deliberate: the specifier comes from the manifest, not from a literal list that
could drift from it.

Extend the file header's last paragraph with one sentence: the load check holds
the manifest's entries to **importability**, because existence is not loading.

## 4. Test plan

From `packages/components`:

```sh
# 1. Add a bogus key to the list temporarily (or to package.json) and prove the
#    test fails with the Node error quoted in §0. Paste it.
nub exec vitest run src/exports.test.ts

# 2. Remove the bogus key: 8 cases pass (the 7 existing + the load check).
nub exec vitest run src/exports.test.ts

# 3. The whole unit suite, the docs-count contract and the package gates.
nub run test
nub run check
nub run lint
```

Both-direction proof: the load case must fail on a specifier that is not in
`exports` (it reports the exact `ERR_PACKAGE_PATH_NOT_EXPORTED`-class message)
and pass on the manifest as shipped. Reverting only the test restores the old
result (no such check).

## 5. STOP conditions

- The load case fails on the shipped manifest: stop and report the specifier and
  the Node error. A public entry that does not load is a real packaging defect,
  not a reason to weaken the check.
- The unit suite's runtime grows by more than ~3 seconds: stop and report the
  measurement. Importing the root already pulls every module, so the cost should
  be near the existing suite's noise; do not serialise the loop to “fix” it.
- A module needs a browser-only or native-only global to load: stop. The check
  runs in the unit environment on purpose; a module that cannot load there is a
  boundary question for a separate plan.
- The change needs a file outside `packages/components` plus the three ledger
  files: stop and report.

## 6. Acceptance

- `exports.test.ts` is 8 tests; the new case loads all 45 published specifiers
  (the root plus 44 subpaths) and reports `[]`.
- The case fails with a precise message when one specifier is removed from the
  manifest's reach, proven both ways.
- `nub run test`, `nub run check` and `nub run lint` exit `0`; the unit suite's
  file/test counts are recorded.
- `TODO.md` names the public-export half as done and leaves clean-environment
  install open.
- One commit: `test(components): every published entry point loads (plan 676)`.

## 7. Results

- `src/exports.test.ts`: `publishedSpecifiers()` reads the export map (the root
  plus 44 subpaths) and one case imports every specifier through the package
  name. `loadFailure` lifts the import with `Effect.tryPromise` and reports the
  exact failure; the test harness is the `Effect.runPromise` boundary.
- Both-direction proof: adding `@gpuixui/components/does-not-exist` fails the
  case with `Error: "./does-not-exist" is not exported under the conditions
  ["node", "development", "import"] … (see exports field …)`; removing it passes
  8/8.
- Gates: `src/exports.test.ts` 8/8 in ~1.9 s; the unit suite is 474 tests in 46
  files; `nub run check` and `nub run lint` exit `0`.
- `TODO.md` splits Phase G: the public-export half is ticked, the
  clean-environment install stays open.
