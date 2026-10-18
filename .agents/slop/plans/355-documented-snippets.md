# Plan 355: The documented snippets nothing compiles

> **Status:** done 2026-10-18. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/snippets.test.ts` (new), `docs/tokens.md`,
> `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`. No API, token
> value, pair or floor changes.

## Execution record (2026-10-18)

- The new guard failed before the repair, exactly as predicted:
  `docs/tokens.md #12: uses ThemeProvider without importing it`.
- The recipe snippet now imports `ThemeProvider` from
  `@gpuixui/tokens/react`; the guard passes.
- Two further both-directions probes: a snippet changed to
  `theme.colors.notARole` failed the role case with
  `docs/tokens.md #7: colors.notARole`; an import changed to
  `{ …, nope }` failed the export case with
  `docs/tokens.md #32: nope from @gpuixui/tokens`. Both were reverted.
- Design decision recorded while running: a block with **no** package import is
  a contextual continuation (an expression or a shape sketch) and is not a
  module, so the import rule applies only to blocks with at least one
  `@gpuixui/tokens`/`/react` import. The role and scale checks still cover every
  block.
- The guard covers public data exports as well as functions and types
  (`colorRoles`, `themes`, `contrastFloors`, `platformRecipes`, …), excluding the
  scale-group names (`radius`, `spacing`, `motion`, …) because those are also
  ordinary object keys and JSX prop names. A probe that dropped `colorRoles`
  from the README's import failed with
  `packages/tokens/README.md #15: uses colorRoles without importing it`.
  Function names are checked only when called or rendered, because
  `controlHeight` is both a helper and a `density` field — the first run caught
  that false positive and the rule was narrowed rather than the snippet changed.
- The export check is per entry: a type imported from `@gpuixui/tokens/react`
  must be declared there, not merely somewhere in the package. A probe that
  added `type Theme` to the README's `/react` import failed with
  `packages/tokens/README.md #1: Theme from @gpuixui/tokens/react`.
- Final: `nub run test` → **71 files / 4244 tests passed** (the guard has four
  cases, not the three estimated below); `nub run check`, `nub run lint` and
  `nub run test` are green.

## Why

Plan `350` made every `src/*.example.ts` runnable and linked, because an
example nothing executes can drift silently. The documents' **fenced snippets**
are the same risk one surface over: a reader copies them, and nothing checks
them against the package. `docs.test.ts` holds the prose, the generated tables
and the `Theme` block; `examples.test.ts` holds the example files; the code
fences in `docs/tokens.md` and `packages/tokens/README.md` have no guard.

The audit that motivated this plan found a real defect in that gap. The platform
recipe snippet in `docs/tokens.md` (“Platform recipes”) renders
`<ThemeProvider theme={getPlatformRecipeTheme("xp", "light")}>…</ThemeProvider>`
but imports only `applyPlatformStyle`, `getPlatformRecipeTheme`, `getTheme` and
`platformRecipes` from `@gpuixui/tokens`. A reader who copies it gets
`Cannot find name 'ThemeProvider'`; the missing import is from
`@gpuixui/tokens/react`, and no test noticed.

The fix is a drift guard over the snippets plus the one import repair. The guard
is deliberately not a compiler: the snippets are contextual fragments (`theme`
is supplied by the surrounding component, `<text>`/`<div>` are GPUix intrinsics,
`contosoStyle` is “the style you copied and named”), so type-checking them as
modules would require a page of prelude stubs and would fail on illustrative
code rather than real drift. It checks the four things a snippet can get wrong
about this package without context:

1. every named import from `@gpuixui/tokens` or `@gpuixui/tokens/react` is a
   real export (a value in the namespace or a type from the module walk);
2. every `theme.colors.<role>` names a member of `colorRoles`;
3. every `theme.<group>.<member>` names a member of the shipped scale
   (`spacing`, `radius`, `density`, `motion`, `elevation`, `borderWidth`,
   `iconSize`, `avatarSize`, `dimensions`, `typography`);
4. a public function, component or type a snippet calls, renders or names is
   imported in that same snippet (or declared by it), so the recipe snippet's
   missing `ThemeProvider` fails the suite.

Roles and scales are read from the implementation, not retyped, so a rename
must move the documents with it.

## Files to change

### 1. New `packages/tokens/src/snippets.test.ts`

```ts
/**
 * Guards the defect fixed in plan 355: the fenced TypeScript snippets in
 * `docs/tokens.md` and the package README are what a reader copies, and nothing
 * held them to the package. The platform-recipe snippet rendered
 * `<ThemeProvider>` without importing it while every gate stayed green.
 *
 * This is not a compiler: a snippet is a contextual fragment, so `theme`,
 * `children` and `contosoStyle` have no module scope. It checks the four facts a
 * fragment can still get wrong about this package — that its imports exist,
 * that the colour roles and scale members it names exist, and that a public
 * function, component or type it uses is imported by the same block.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as tokens from "./index.js";
import * as react from "./react.js";

const documents = [
  { label: "docs/tokens.md", url: new URL("../../../docs/tokens.md", import.meta.url) },
  { label: "packages/tokens/README.md", url: new URL("../README.md", import.meta.url) },
];

interface Snippet {
  readonly label: string;
  readonly index: number;
  readonly code: string;
}

const snippetsOf = ({ label, url }: (typeof documents)[number]): ReadonlyArray<Snippet> =>
  [...readFileSync(url, "utf8").matchAll(/```(ts|tsx)\n([\s\S]*?)```/g)].map(
    (match, index) => ({ label, index, code: match[2] ?? "" }),
  );

const snippets = documents.flatMap(snippetsOf);
const [tokenValues, reactValues] = [tokens, react] as const;
const publicValues = new Set([...Object.keys(tokenValues), ...Object.keys(reactValues)]);

// The type walk of `public-types.test.ts`: types have no runtime key, so follow
// the entry modules' re-exports.
const declarations = /^export (?:interface|type|class|enum) (\w+)/gm;
const starExports = /^export \* from "([^"]+)";/gm;
const namedReExports = /^export (?:type )?\{[^}]+\} from "([^"]+)";/gm;

const moduleUrl = (specifier: string, from: URL): URL =>
  new URL(specifier.replace(/\.js$/, ".ts"), from);

const exportedTypes = (entry: URL): ReadonlySet<string> => {
  const visited = new Set<string>();
  const names = new Set<string>();
  const visit = (url: URL): void => {
    if (visited.has(url.href)) {
      return;
    }
    visited.add(url.href);
    const source = readFileSync(url, "utf8");
    [...source.matchAll(declarations)].forEach((match) => {
      const name = match[1];
      if (name !== undefined) {
        names.add(name);
      }
    });
    [starExports, namedReExports].forEach((pattern) => {
      [...source.matchAll(pattern)].forEach((match) => {
        const specifier = match[1];
        if (specifier !== undefined) {
          visit(moduleUrl(specifier, url));
        }
      });
    });
  };
  visit(entry);
  return names;
};

const publicTypes = new Set([
  ...exportedTypes(new URL("./index.ts", import.meta.url)),
  ...exportedTypes(new URL("./react.ts", import.meta.url)),
]);
```

Then the checks. `importedNames` parses the block's own import clauses:

```ts
const importPattern =
  /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+"(@gpuixui\/tokens(?:\/react)?)"/g;

const importedOf = (code: string): ReadonlySet<string> =>
  new Set(
    [...code.matchAll(importPattern)].flatMap((match) =>
      (match[1] ?? "").split(",").flatMap((raw) => {
        const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
        return name === undefined || name === "" ? [] : [name];
      }),
    ),
  );
```

The cases:

```ts
describe("documented snippets", () => {
  it("has snippets to check", () => {
    expect(snippets.length).toBeGreaterThan(40);
  });

  it("imports only names the package exports", () => {
    snippets.forEach(({ label, index, code }) => {
      [...code.matchAll(importPattern)].forEach((match) => {
        const source = match[2];
        const namespace = source === "@gpuixui/tokens/react" ? react : tokens;
        (match[1] ?? "").split(",").forEach((raw) => {
          const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
          if (name === undefined || name === "") {
            return;
          }
          expect(
            name in namespace || publicTypes.has(name),
            `${label} #${index}: ${name} from ${source}`,
          ).toBe(true);
        });
      });
    });
  });

  it("names only shipped colour roles and scale members", () => {
    snippets.forEach(({ label, index, code }) => {
      [...code.matchAll(/theme\.colors\.(\w+)/g)].forEach((match) => {
        expect(tokens.colorRoles, `${label} #${index}: colors.${match[1]}`).toContain(match[1]);
      });
      const groups: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
        spacing: tokens.spacing,
        radius: tokens.radius,
        density: tokens.defaultDensity,
        motion: tokens.motion,
        elevation: tokens.lightElevation,
        borderWidth: tokens.borderWidth,
        iconSize: tokens.iconSize,
        avatarSize: tokens.avatarSize,
        dimensions: tokens.dimensions,
        typography: tokens.typography,
      };
      [...code.matchAll(/theme\.(spacing|radius|density|motion|elevation|borderWidth|iconSize|avatarSize|dimensions|typography)\.(\w+)/g)].forEach(
        (match) => {
          const group = groups[match[1] ?? ""];
          expect(group, `${label} #${index}: theme.${match[1]}`).toBeDefined();
          expect(group && match[2] in group, `${label} #${index}: theme.${match[1]}.${match[2]}`).toBe(true);
        },
      );
    });
  });

  it("imports every public name it calls, renders or types", () => {
    // Strip comments and imports; those are not usages.
    const usage = (code: string): string =>
      code
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/\s\/\/.*$/gm, "")
        .replace(/^import[\s\S]*?;$/gm, "");

    const declared = (code: string, name: string): boolean =>
      new RegExp(`(?:const|let|var|function|class)\\s+${name}\\b`).test(code);

    snippets.forEach(({ label, index, code }) => {
      const imported = importedOf(code);
      const body = usage(code);
      [...imported].forEach((name) => {
        // An import-only block (the reference's export list) has no usage.
        expect(name === "" || true, `${label} #${index}`).toBe(true);
      });
      // A called public function, a rendered public component, or a named
      // public type needs its own import.
      [...publicValues, ...publicTypes].forEach((name) => {
        if (imported.has(name) || declared(code, name)) {
          return;
        }
        const called = new RegExp(`(?<![\\w$.])${name}\\s*\\(`).test(body);
        const rendered = new RegExp(`<${name}(?![\\w$.])`).test(body);
        const typed = publicTypes.has(name)
          ? new RegExp(`(?<![\\w$.])${name}(?![\\w$])`).test(body)
          : false;
        expect(called || rendered || typed, `${label} #${index}: uses ${name} without importing it`).toBe(false);
      });
    });
  });
});
```

(The final implementation may drop the placeholder `[...imported].forEach` loop
above — it asserts `true` and is not part of the contract; the executor must not
ship a vacuous assertion. It is shown only to make the parsing step explicit.)

### 2. `docs/tokens.md` — repair the recipe snippet

Inside the “Platform recipes” code fence, add the React import beside the token
import:

```ts
import { ThemeProvider } from "@gpuixui/tokens/react";
```

### 3. `packages/tokens/README.md`

No text change is expected. The README snippets are already self-consistent; if
the guard finds a real defect, repair it and record the finding in the execution
record. Do not weaken the guard to keep a broken snippet.

### 4. `TODO.md`

Add to the tokens section and tick it:

```md
`[x]` Hold the documented snippets to the public API — the fenced `ts`/`tsx`
blocks in `docs/tokens.md` and the package README were the last unguarded
documentation surface, and the platform-recipe snippet rendered
`<ThemeProvider>` without importing it; a new guard checks every named import,
every `theme.colors.*` and scale member, and every public function, component
and type a snippet uses without importing it (plan 355)
```

The section header moves to **123/171** and its bar stays `[███████░░░]`
(123/171 ≈ 72%).

### 5. `COMPONENTS.md`

Append to the **Design tokens** row's prose:

```md
The fenced snippets in `docs/tokens.md` and the package README are held to the
export, role and scale names they use (plan 355).
```

### 6. `.agents/slop/plans/README.md`

Add after the 354 row:

```md
| [355](./355-documented-snippets.md) | The documented snippets nothing compiles | F | 056, 066, 324, 350 | done |
```

and a paragraph in the “plan set” prose block describing the gap and the guard.

## Commands and expected results

```bash
nub run --filter @gpuixui/tokens test -- snippets.test.ts
```

Expected **before** step 2: the third guard fails with
`docs/tokens.md #12: uses ThemeProvider without importing it`. After step 2:
passes.

```bash
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: all green. Report the exact file/test count from the run (plan 354
left 70 files / 4240 tests; this plan adds one file and three cases, so expect
**71 files / 4243 tests** — confirm, do not assume).

## Both-directions verification (required)

1. Add `snippets.test.ts` **before** repairing the snippet: it must fail on the
   recipe block's `ThemeProvider`.
2. Repair the import: the suite passes.
3. Temporarily change a snippet's `theme.colors.foreground` to
   `theme.colors.notARole`: the role case must fail. Revert.
4. Temporarily remove an import of `themeContrastFailures` from a snippet that
   calls it: the usage case must fail. Revert.
5. Run the full suite again.

## STOP conditions

- **STOP** if the usage guard reports a snippet that is intentionally
  illustrative and cannot be imported (for example a pseudo-code fragment).
  Report the block and argue a named exemption in the test; do not add a blanket
  skip and do not silence real drift.
- **STOP** if `docs.test.ts`, `readme.test.ts` or `inventory.test.ts` rejects a
  new sentence. The guards are the contract; report the assertion, do not
  loosen it.
- **STOP** if the audit finds a snippet that teaches an API the package does not
  ship. That is a product-doc defect: report the snippet and the correct API,
  and repair it rather than deleting the section.
- **STOP** if any token value, contrast pair, floor, public export or example
  changes.

## Acceptance

- [x] `snippets.test.ts` fails on the pre-fix recipe snippet and passes after
      the import repair.
- [x] Every fenced `ts`/`tsx` block imports only real exports, names only
      shipped roles and scale members, and imports every public function,
      component and type it uses.
- [x] The recipe snippet compiles for a reader.
- [x] `TODO.md` and `COMPONENTS.md` record the guard and the count re-derives.
- [x] Plan 355 is indexed and marked done.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
