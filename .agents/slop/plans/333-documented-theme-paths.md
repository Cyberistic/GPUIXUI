# 333 — A documented token claim must resolve

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives (`packages/icons`, `packages/primitives`) |
| Depends on | `011`/`014` (the token API), `021` (primitives consume tokens), `031` (icons), `024` (icon size scale) |
| Status | implemented |
| Fixes | the icons README and the `Icon` docstring document `theme.color.…` (singular) and `theme.color.destructive.background`; neither resolves on the shipped `Theme` |

---

## 1. The defect

The token package's theme object has `colors` (plural) and its roles are
strings, so the two usage snippets below are not compilable — a reader copying
them gets `Property 'color' does not exist`:

```
packages/icons/README.md:14   import { theme } from "@gpuixui/tokens"
packages/icons/README.md:17   <Icon name="search" color={theme.color.mutedForeground} />
packages/icons/README.md:20   <Icon name="warning" color={theme.color.destructive.background} … />
packages/icons/src/Icon.tsx:13  role such as `theme.color.mutedForeground`
```

`@gpuixui/tokens` exports `lightTheme`, `darkTheme`, `getTheme` and
`platformTheme`, not a bare `theme`; the README's import line is the wrong half
of the same snippet. `packages/icons/docs/icon.mdx` is already correct (it reads
the theme with `useTheme()` from `@gpuixui/primitives`), which is the giveaway:
the page was written against the shipped API and the README/docstring were not.

Nothing guarded this. `src/exports.test.ts` guards that a page exists and is
indexed; `src/callback-names.test.ts` guards one renamed prop; no check read a
documented `theme.…` path or a documented token import against the real package.
The token API was reorganised once already (`theme.color.role.background` →
`theme.colors.role`), so this is a class, not a typo.

## 2. The rule

> **A documented token claim must resolve on the shipped package.** A `theme.…`
> path in a package's documentation or examples must resolve on the shipped
> `Theme`; a named import from `@gpuixui/tokens` must name a real export. A
> reference to a *file* (`theme.ts`, `theme.fixture.js`) is not a path and is
> exempt: it is recognisable by a source-file extension in its last segment.
> Everything else — `theme.colors.x`, `theme.typography.body.fontSize`,
> `theme.density.controlHeight.sm`, `import { darkTheme }` — is read against the
> real package and must resolve.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/icons/README.md` | the usage block reads the theme with `useTheme()` and uses `theme.colors.mutedForeground` / `theme.colors.destructive` |
| `packages/icons/src/Icon.tsx` | the `color` docstring names `theme.colors.mutedForeground` |
| `packages/primitives/src/docs-theme-paths.test.ts` | **new**: the guard over both packages' docs, READMEs, examples and source — theme paths and `@gpuixui/tokens` imports |
| `packages/primitives/README.md` | the measured offline count moves |
| `TODO.md` | add and tick the task under the primitives workstream |
| `.agents/slop/plans/README.md` | index this plan |
| `COMPONENTS.md` | no row: no component behaviour changed |

## 4. Exact implementation

### 4.1 The docs

```mdx
import { Icon } from "@gpuixui/icons";
import { useTheme } from "@gpuixui/primitives";

const theme = useTheme();

// Decoration: takes itself out of the accessibility tree.
<Icon name="search" color={theme.colors.mutedForeground} />
<Icon name="warning" color={theme.colors.destructive} label="Overdue" />
```

```ts
 * role such as `theme.colors.mutedForeground`. Text and Button supply their
```

### 4.2 The guard — `packages/primitives/src/docs-theme-paths.test.ts`

```ts
/**
 * A documented theme path must resolve (plan `333`).
 *
 * The icons README documented `theme.color.mutedForeground` and
 * `theme.color.destructive.background`; neither exists on the shipped `Theme`,
 * and a reader copying the snippet got a type error. The pages, READMEs,
 * examples and source docstrings of both Tier 1 packages are scanned here, so a
 * token rename cannot leave a false claim behind.
 *
 * Both packages are scanned from this one test because they document the same
 * token API and both are owned by this workstream; the alternative is the same
 * scanner twice.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import { lightTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as R from "effect/Record";
import * as Str from "effect/String";

const SOURCE_EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs", "json"];

/** `theme.x.y` — the identifier chain a reader would copy. */
const THEME_PATH = /\btheme\.([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)/g;

const roots = (): Effect.Effect<ReadonlyArray<string>, never, never> => ...
```

The scanner walks these directories with `FileSystem.readDirectory` recursively,
keeps `*.md`, `*.mdx` and `*.tsx`/`*.ts` files, and returns
`Array<{ file, path }>`:

- `packages/primitives/docs`, `packages/primitives/examples`,
  `packages/primitives/README.md`, `packages/primitives/src`
- `packages/icons/docs`, `packages/icons/README.md`, `packages/icons/src`

For each match, `pathSegments = split(".")`:

```ts
const isFileReference = (segments: ReadonlyArray<string>): boolean =>
  Arr.contains(SOURCE_EXTENSIONS, Arr.lastNonEmpty(segments) ?? "");

/** Resolve a documented path on the real theme; `None` when it does not exist. */
const resolveThemePath = (segments: ReadonlyArray<string>): Option.Option<unknown> => {
  const [head, ...rest] = segments;
  if (head === undefined || !R.has(lightTheme, head)) return Option.none();
  return Arr.reduce(rest, Option.some<unknown>(lightTheme[head]), (current, segment) =>
    Option.flatMap(current, (value) =>
      Option.fromNullishOr(
        typeof value === "object" && value !== null
          ? (value as Record<string, unknown>)[segment]
          : undefined,
      ),
    ),
  );
};
```

`theme.color` therefore fails on its head (`color` is not a `Theme` key), and
`theme.colors.destructive.background` fails on `background` (`destructive` is a
string). The test reports `file: theme.path` pairs, so a failure names the
document, not a line number.

### 4.3 The test

```ts
describe("documented theme paths", () => {
  it("resolve on the shipped theme", async () => {
    const { claims } = await Effect.runPromise(scan);
    const broken = Arr.filter(
      claims,
      (claim) =>
        !isFileReference(claim.segments) &&
        Option.isNone(resolveThemePath(claim.segments)),
    );
    expect(Arr.map(broken, label)).toStrictEqual([]);
  });

  it("reads the icon page, so the scan is live", async () => {
    // Not a tautology: the scan must read at least the icon page and at least
    // one token import, or an empty scan would pass both suites.
    const scanned = await Effect.runPromise(scan);
    expect(
      Arr.some(
        scanned.claims,
        (claim) => claim.file === "packages/icons/docs/icon.mdx",
      ),
    ).toBe(true);
    expect(Arr.length(scanned.imports)).toBeGreaterThan(0);
  });
});

describe("documented token imports", () => {
  it("name exports the package actually has", async () => {
    const { imports } = await Effect.runPromise(scan);
    const missing = Arr.filter(imports, (claim) => !R.has(Tokens, claim.name));
    expect(
      Arr.map(missing, (claim) => `${claim.file}: import { ${claim.name} }`),
    ).toStrictEqual([]);
  });
});
```

The import scanner extracts the names inside `import { … } from
"@gpuixui/tokens"` (`type` qualifiers stripped) and checks each against the
package's runtime exports, so `import { theme }` fails by name.

## 5. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | write the guard **before** fixing the docs | fails with `packages/icons/README.md: theme.color.mutedForeground`, `…: theme.color.destructive.background`, `packages/icons/src/Icon.tsx: theme.color.mutedForeground` and `packages/icons/README.md: import { theme }` |
| 2 | apply §4.1 | — |
| 3 | `nub run --filter @gpuixui/primitives test -- docs-theme-paths` | all three cases green |
| 4 | `nub run --filter @gpuixui/primitives test` | 41 files green |
| 5 | `nub run check` | tests, lint, fmt and types green |
| 6 | `nub run test` | every workspace green |

## 6. STOP conditions

- **STOP** if a legitimate documented path is reported: a file reference is
  exempt by extension; a theme path that does not resolve is the defect.
- **STOP** if the guard needs the icons *package* at runtime: it reads files
  only; it must not import `@gpuixui/icons`.
- **STOP** outside §3's files.

## 7. Acceptance

- [x] Every `theme.…` claim and every `@gpuixui/tokens` named import in both
      packages' docs, READMEs, examples and source resolves on the real package.
- [x] The guard fails by file and name for the four claims in §1, and passes
      once they are corrected.
- [x] `nub run check` and `nub run test` are green; `TODO.md` and the plan index
      agree.

## 8. Measured results

### 8.1 Both failing directions

With the guard written first and the docs untouched, the suite reported exactly
the four false claims and nothing else:

```
packages/icons/README.md: import { theme }
packages/icons/README.md: theme.color.mutedForeground
packages/icons/README.md: theme.color.destructive.background
packages/icons/src/Icon.tsx: theme.color.mutedForeground
```

After correcting the two documents, all three cases passed. The liveness case
earned its place during that work: a first version of the resolver wrapped
`R.get` in `Option.fromNullishOr` (an `Option` is not nullish), so every path
resolved to `Some(None)`, the guard reported zero broken claims, and only the
"reads the icon page" case failed. The nested option is gone; the liveness case
and the import half are what keep the scan honest.

### 8.2 After the fix

```
nub run --filter @gpuixui/primitives test
  Test Files  41 passed (41)
       Tests  536 passed (536)   (533 + 3)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done          (exit 0)

nub run test
  tokens 196, testing 19, icons 19, playground 11, components 308,
  primitives 536 — all green
```
