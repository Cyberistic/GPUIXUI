# Plan 356 — Hold the source JSDoc examples to the package

**Phase:** F · **Owner:** `tokens-theme` · **Status:** done
**Depends on:** 324 (the public type walk), 350 (runnable examples), 355 (the
documented-snippet guard).
**Owns:** `packages/tokens/src/snippets.test.ts`,
`packages/tokens/src/theme.ts`, `packages/tokens/src/platform-recipes.ts`,
`docs/tokens.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

Plan 355 closed the fenced `ts`/`tsx` snippets in `docs/tokens.md` and
`packages/tokens/README.md` and called them "the last unguarded documentation
surface". That claim is false: the exported API's **JSDoc `@example` blocks** are
fenced snippets too, a doc generator renders them, and a reader copies them. No
test reads them.

The audit found the same defect plan 355 fixed, still shipped:

```tsx
// packages/tokens/src/theme.ts, getPlatformTheme
 * import { getPlatformTheme } from "@gpuixui/tokens";
 *
 * <ThemeProvider theme={getPlatformTheme("win32", "dark")} />
```

```tsx
// packages/tokens/src/platform-recipes.ts, getPlatformRecipeTheme
 * import { getPlatformRecipeTheme } from "@gpuixui/tokens";
 *
 * <ThemeProvider theme={getPlatformRecipeTheme("xp", "light")} />
```

Both blocks present themselves as modules (they carry a package import) and then
use `ThemeProvider` without importing it from `@gpuixui/tokens/react`. A reader
who copies either gets `Cannot find name 'ThemeProvider'` while every gate is
green — exactly the failure plan 355 described, one documentation surface over.

The same audit found one more non-copyable block: `applyPlatformStyle` imports
`applyPlatformStyle` and `getTheme`, then applies a `contosoStyle` that the block
never defines. It is not a package export, so the new guard cannot see it, but
the example is still not runnable.

## 2. The decision

Extend the existing `snippets.test.ts` guard rather than add a second, parallel
guard:

- collect the fenced `ts`/`tsx` blocks from every source module in
  `packages/tokens/src` except `*.test.ts` and `*.example.ts`;
- strip the JSDoc ` * ` line prefix;
- apply the same three checks plan 355 already runs on the docs and the README:
  every named import is a real export, every `theme.colors.*` and
  `theme.<scale>.*` member exists, and every public function, value, component
  or type a module block uses is imported by that block.

A JSDoc block with no package import stays a contextual fragment, exactly as a
docs block does. That keeps `getTheme`, `extendTheme`, `textStyle`, `focusRing`
and `selectionStyle` short while the guard still holds the blocks that claim to
be modules.

Fix the two `ThemeProvider` blocks by importing it. Fix `applyPlatformStyle` by
applying a **shipped** style (`platformStyles.win32`) so the block is runnable;
the copy-and-own path stays in `docs/tokens.md` §"Authoring a platform style",
where the full recipe example lives.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/snippets.test.ts`

1. Update the header comment: the guard now also covers every fenced `@example`
   block in the package's exported modules, because the two
   `ThemeProvider` examples shipped without the import plan 355 had just
   fixed in the docs. Keep the existing four-facts paragraph.
2. Add `readdirSync` to the `node:fs` import.
3. After the `documents` list, add:

   ```ts
   const moduleDir = new URL("./", import.meta.url);

   const modules = readdirSync(moduleDir)
     .filter(
       (name) =>
         name.endsWith(".ts") &&
         !name.endsWith(".test.ts") &&
         !name.endsWith(".example.ts"),
     )
     .sort();

   /** Remove the ` * ` prefix a JSDoc fence carries on every line. */
   const stripJsdoc = (block: string): string =>
     block
       .split("\n")
       .map((line) => line.replace(/^\s*\*\s?/, ""))
       .join("\n");

   const sourceSnippets: Snippet[] = modules.flatMap((name) =>
     [
       ...readFileSync(new URL(name, moduleDir), "utf8").matchAll(
         /```(ts|tsx)\n([\s\S]*?)```/g,
       ),
     ].map((match, index) => ({
       label: `packages/tokens/src/${name} @example`,
       index,
       code: stripJsdoc(match[2] ?? ""),
     })),
   );
   ```

4. Replace `const snippets = documents.flatMap(snippetsOf);` with

   ```ts
   const snippets = [...documents.flatMap(snippetsOf), ...sourceSnippets];
   ```

5. In the `"has snippets to check"` case, keep the `> 40` floor and add a case
   that the JSDoc blocks are actually in the set:

   ```ts
   it("finds an example in every module that documents one", () => {
     expect(sourceSnippets.length).toBeGreaterThanOrEqual(20);
     expect(
       sourceSnippets.some(({ label }) => label.includes("theme.ts")),
     ).toBe(true);
     expect(
       sourceSnippets.some(({ label }) => label.includes("platform-recipes.ts")),
     ).toBe(true);
   });
   ```

   Keep the existing three check cases unchanged — they iterate `snippets`, so
   they now cover the JSDoc blocks automatically. Do not weaken the
   no-import-is-contextual rule.

### 3.2 `packages/tokens/src/theme.ts`

1. `getPlatformTheme` example — import the provider:

   ```tsx
   import { getPlatformTheme } from "@gpuixui/tokens";
   import { ThemeProvider } from "@gpuixui/tokens/react";

   <ThemeProvider theme={getPlatformTheme("win32", "dark")} />;
   ```

2. `applyPlatformStyle` example — replace the undefined `contosoStyle` with a
   shipped style and its import:

   ```ts
   import {
     applyPlatformStyle,
     getTheme,
     platformStyles,
   } from "@gpuixui/tokens";

   const windows = applyPlatformStyle(getTheme("dark"), platformStyles.win32);
   ```

   The surrounding prose already says a copied style is applied the same way;
   leave it.

3. `platformTheme` example (deprecated bridge) — make it a module block too:

   ```tsx
   import { platformTheme, themes } from "@gpuixui/tokens";
   import { ThemeProvider } from "@gpuixui/tokens/react";

   <ThemeProvider theme={platformTheme(themes.dark, "win32")} />;
   ```

### 3.3 `packages/tokens/src/platform-recipes.ts`

`getPlatformRecipeTheme` example — import the provider:

```tsx
import { getPlatformRecipeTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={getPlatformRecipeTheme("xp", "light")} />;
```

### 3.4 `docs/tokens.md`

In the Verification section, after the plan-355 sentence, add:

> The `@example` blocks in the package's own modules are held by the same guard
> (`snippets.test.ts`), after two of them rendered `<ThemeProvider>` without
> importing it (plan 356).

### 3.5 `packages/tokens/README.md`

In the Testing/Verification section, extend the sentence that names the
docs-snippet guard to include the source `@example` blocks. Keep the install
path and every guarded phrase unchanged.

### 3.6 `COMPONENTS.md`

In the `Design tokens` row, replace the last sentence
"The fenced snippets in `docs/tokens.md` and the package README are held to the
export, role and scale names they use (plan 355)." with a sentence that names all
three surfaces and plan 356:

> The fenced snippets in `docs/tokens.md`, the package README and every
> `@example` block in the package's modules are held to the export, role and
> scale names they use; the source examples caught two `<ThemeProvider>` blocks
> that did not import it (plans 355 and 356).

### 3.7 `.agents/slop/plans/README.md`

Add a row after plan 355:

```
| [356](./356-jsdoc-example-guard.md) | The source JSDoc examples are unguarded | F | 324, 350, 355 | done |
```

### 3.8 `TODO.md`

Tick the new Design tokens row and move the progress bar from 123/171 to
124/172.

## 4. Commands and expected results

Run from the repository root unless stated.

1. `nub run --filter @gpuixui/tokens test`
   - Before §3.2/§3.3: the new guard fails on both `ThemeProvider` blocks with
     `... uses ThemeProvider without importing it`. Capture that output.
   - After §3.2/§3.3: all tests pass.
2. `nub run --filter @gpuixui/tokens check-types` — exits 0.
3. `nub run check` — exits 0 (includes `check:tests`, lint, format, types).
4. `nub run lint` — exits 0.
5. `nub run test` — exits 0.
6. `git diff --check` — no whitespace errors.

## 5. STOP conditions

- STOP if the new guard reports a block that is *deliberately* a contextual
  fragment with no import; do not add an import to every JSDoc example — the
  no-import rule is the plan-355 contract.
- STOP if fixing an example needs a public API that does not exist (for example
  a public Contoso style). Use `platformStyles.win32` instead; do not export a
  test fixture as public API.
- STOP if `nub run check` fails in another workstream's package. Record the
  failure in `TODO.md` and report it; do not edit outside this workstream's
  paths.
- STOP if `snippets.length` collapses below the floor because module discovery
  found no files; investigate the URL/readdir first.

## 6. Test plan

The regression is the guard itself. Prove both directions:

- **Fails without the fix:** temporarily delete the
  `ThemeProvider` import from the `getPlatformTheme` example and run
  `nub run --filter @gpuixui/tokens test -- snippets`. It must fail with
  `src/theme.ts @example #1: uses ThemeProvider without importing it`.
  Restore the import.
- **Fails for the recipe block:** delete the import from
  `getPlatformRecipeTheme`; the same command must fail naming
  `platform-recipes.ts`. Restore it.
- **Passes with both:** the full tokens suite is green.

The test is meaningful because a fenced block with a package import is presented
as copyable runnable code; the guard asserts the block is a module, not a
sketch. The "has snippets to check" floor prevents the guard from silently
passing on an empty set.

## 7. Acceptance criteria

- `snippets.test.ts` reads every non-test, non-example source module and checks
  its fenced blocks with the same three rules as the docs.
- The two `ThemeProvider` examples and the deprecated bridge import the
  provider; `applyPlatformStyle` applies a shipped style and defines every name
  it uses.
- The docs, README, `COMPONENTS.md`, plan index and `TODO.md` name the new guard
  and the defect it caught.
- The tokens suite, `nub run check`, `nub run lint` and `nub run test` pass, and
  the two-direction proof is recorded in the commit message.
