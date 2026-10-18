# 542 — The shareable choice's density rule

**Workstream:** `tokens-theme`. **Phase:** F (documentation truth / guard quality).
**Depends on:** 529 (the URL codec), 380 (the resolver), 534 (platform density).
**Files:** `packages/tokens/src/theme-choice.ts`,
`packages/tokens/src/theme-choice-params.test.ts`, `docs/tokens.md`,
`packages/tokens/README.md`, `TODO.md`, this workstream's plan index.

## 1. The defect

`themeChoiceParams` is documented with a rule it deliberately breaks, and the
one test that names the exception cannot see it.

The writer's JSDoc (`theme-choice.ts`, `themeChoiceParams`) said:

> An axis is written only when omitting it would resolve to a different theme…
> A valid `density` is always written: its fallback is the *resolved theme's*
> preset — macOS carries `compact` — so the same stored axis applied to another
> platform resolves differently and is never redundant.

`docs/tokens.md` (the paragraph under *Theme API* that introduces the URL
codec) said the same thing more plainly:

> `themeChoiceParams(choice)` is the canonical writer: it emits only the axes
> whose omission would change the resolved theme — `dark`, `high`, a
> non-`default` platform, and every valid density, because the platform
> supplies the density fallback…

Both sentences contradict themselves. On a macOS choice, `density: "compact"`
**is** the resolved theme's preset, so omitting it resolves to exactly the same
theme — the axis is not "one whose omission would change the resolved theme".
The intended behaviour is right (write it anyway, so a reader who edits the
platform in a shared link cannot silently take the new platform's preset); the
stated rule is wrong. This is the same class as plans 326, 349, 536 and 541: a
document asserts a property its implementation does not have.

The guard is the second half of the defect. `theme-choice-params.test.ts` has a
case named:

> writes a density on every platform, because the preset supplies the fallback

but it derives the platform from the theme's display name:

```ts
platform: theme.name.startsWith("macOS") ? "darwin" : "win32",
```

No shipped theme's name *starts with* `macOS` — the names are `Light · macOS`,
`Dark · macOS`, … — so the branch is dead and every one of the twelve iterations
writes `platform=win32`. The case repeats one platform twelve times and never
tests the axis whose preset (`compact`) is what makes the rule interesting, nor
the recipes. A writer that dropped density for a platform with a non-default
preset would leave the suite green.

There is no documentation guard on this prose at all: `docs.test.ts` and
`readme.test.ts` never read the theme-choice paragraphs.

## 2. The rule to state

Two clauses, in this order:

1. **Omission.** An axis is omitted when the reader's fallback already selects
   it: `mode` only for `dark`, `contrast` only for `high`, `platform` only for a
   styled platform (`darwin`, `linux`, `win32`), and a valid `recipe` suppresses
   the `platform` it overrides.
2. **The density exception.** `density` is written whenever it is valid, even
   when it equals the resolved theme's preset. Its fallback is the *resolved
   theme's* preset, which another axis supplies (macOS ships `compact`), so
   omitting it would make the same stored row resolve differently the moment a
   reader edits the platform in the link. The writer is therefore deliberately
   not minimal for this one axis.

No behaviour change: the encoders already do exactly this
(`theme-choice.ts` `encodeThemeChoice.density`). The unit corrects the claim,
makes the test exercise every shipped axis, and guards the prose.

## 3. Exact changes

### 3.1 `packages/tokens/src/theme-choice.ts` — the JSDoc

In the `themeChoiceParams` JSDoc, replace the paragraph that begins
"An axis is written only when omitting it would resolve to a different theme"
with:

```text
 * An axis is omitted when the reader's fallback already selects it: `mode` only
 * for `dark`, `contrast` only for `high`, and `platform` only for `darwin`,
 * `linux` or `win32`, because `default` is the identity an absent key already
 * selects. A valid `recipe` suppresses `platform`, which
 * {@link resolveThemeChoice} could never apply beside it.
 *
 * `density` is the one axis written even when it equals the resolved theme's
 * preset, so the writer is deliberately not minimal there. Its fallback is the
 * *resolved theme's* preset, which the platform supplies (macOS ships
 * `compact`), so omitting it would make the same stored row resolve differently
 * the moment a reader edits the platform in the link: `platform=darwin` without
 * a density is `compact`, and the same link with `win32` is `comfortable`.
```

### 3.2 `docs/tokens.md` — the catalogue paragraph

Find the paragraph beginning "A choice that travels in a URL is the same row".
Replace the sentence

> `themeChoiceParams(choice)` is the canonical writer: it emits only the axes
> whose omission would change the resolved theme — `dark`, `high`, a
> non-`default` platform, and every valid density, because the platform supplies
> the density fallback — and a valid `recipe` suppresses the `platform` it
> overrides.

with:

> `themeChoiceParams(choice)` is the canonical writer. It omits an axis whose
> fallback already selects it — a light mode, a default contrast, the `default`
> platform — and a valid `recipe` suppresses the `platform` it overrides.
> Density is the one exception: it is written even when it equals the resolved
> theme's preset (macOS is `compact`), because the fallback is the *platform's*
> preset, so the same row on another platform would otherwise change.

Keep every surrounding sentence and both code fences unchanged.

### 3.3 `packages/tokens/README.md` — the same claim in one line

In *Persisted choices*, the sentence

> `themeChoiceParams(choice)` writes the canonical axes: only `dark`, `high`, a
> non-`default` platform, a valid recipe (which suppresses the platform it
> overrides) and any valid density, since the platform supplies the density
> fallback.

becomes:

> `themeChoiceParams(choice)` writes the canonical axes: `dark`, `high`, a
> non-`default` platform, a valid recipe (which suppresses the platform it
> overrides) and every valid density — density even when it equals the resolved
> preset, since the platform supplies the fallback.

### 3.4 `packages/tokens/src/theme-choice-params.test.ts` — the guard

1. Add a helper beside `toSearch`:

```ts
/** The choice that selects one shipped entry's axis, and nothing else. */
const axisOf = (entry: ShippedTheme): ThemeChoice =>
  entry.source === "platform"
    ? { platform: entry.platform }
    : entry.source === "recipe"
      ? { recipe: entry.recipe }
      : {};
```

Import `type ShippedTheme` from `./shipped-themes.js` (beside the existing
`shippedThemes` value import).

2. Replace the `writes a density on every platform…` case with one that derives
   the axis from the entry:

```ts
  it("writes a density for every shipped axis, even where the preset already names it", () => {
    shippedThemes
      .filter(({ theme }) => theme.contrast === "default")
      .forEach((entry) => {
        const axis = axisOf(entry);
        const withDensity = { ...axis, density: "spacious" } as const;

        // Written for every axis, the one whose preset already decides it
        // included (macOS is `compact`).
        expect(
          themeChoiceParams(withDensity).map(([key]) => key),
          entry.theme.name,
        ).toContain("density");

        // The axis alone is not spacious on any shipped style, so the round
        // trip proves the written density is the one that reaches the theme.
        expect(
          resolveThemeChoice(themeChoiceFromParams(toSearch(axis))).density.name,
          `${entry.theme.name} (axis only)`,
        ).not.toBe("spacious");
        expect(
          resolveThemeChoice(
            themeChoiceFromParams(toSearch(withDensity)),
          ).density.name,
          entry.theme.name,
        ).toBe("spacious");
      });

    // A density written beside macOS survives a later platform edit; omitting
    // it would silently take the new platform's preset instead.
    const edited = new URLSearchParams(
      toSearch({ platform: "darwin", density: "compact" }),
    );
    edited.set("platform", "win32");
    expect(resolveThemeChoice(themeChoiceFromParams(edited)).density.name).toBe(
      "compact",
    );
  });
```

Keep the existing "survives a later platform edit" assertions — they are folded
into the case above, so delete the duplicate block if it remains.

3. In the `writes only the axes whose absence would change the theme` case,
   retitle it (`omits every axis a fallback already selects`) and keep its body
   for the non-density axes. After it, add the explicit exception case:

```ts
  it("is deliberately not minimal for density", () => {
    const macos = { platform: "darwin", density: "compact" } as const;

    // Removing the density resolves the same theme *today*…
    expect(resolveThemeChoice({ platform: "darwin" })).toEqual(
      resolveThemeChoice(macos),
    );

    // …but it is still written, because the fallback belongs to the platform:
    // the same link edited to Windows would otherwise change its density.
    expect(themeChoiceParams(macos)).toContainEqual(["density", "compact"]);
  });
```

4. Add the canonical-stability case:

```ts
  it("is canonical: re-encoding a decoded link writes the same link", () => {
    shippedThemes
      .filter(({ theme }) => theme.contrast === "default")
      .forEach((entry) => {
        const choice: ThemeChoice = { ...axisOf(entry), density: "compact" };
        const params = toSearch(choice);
        expect(
          themeChoiceParams(themeChoiceFromParams(params)),
          entry.theme.name,
        ).toEqual(themeChoiceParams(choice));
      });
  });
```

### 3.5 The prose guard — `packages/tokens/src/docs.test.ts`

Add a `describe("the shareable theme choice", …)` case (place it near the other
*Theme API* prose cases; the file already reads both documents through its
helpers — reuse the helper that returns the catalogue text and the README text;
if the README is not already read in that file, read it with the same
`readFile` pattern the file uses, relative to the package root).

The case must **derive** the exception rather than restate it:

```ts
  it("states the density exception the writer implements", () => {
    const macos = { platform: "darwin", density: "compact" } as const;
    const written = themeChoiceParams(macos).some(([key]) => key === "density");

    // The prose claims the writer is minimal for the axes whose fallback
    // selects them, *and* that density is written regardless. Both are only
    // true together if the exception is named: a macOS row omits nothing that
    // would change today, yet density is written.
    expect(written).toBe(true);
    expect(catalogue).not.toContain(
      "it emits only the axes whose omission would change",
    );
    expect(catalogue).toContain("Density is the one exception");
    expect(readme).toContain("density even when it equals the resolved");
  });
```

Adjust the variable names to the file's existing helpers. Import
`themeChoiceParams` from `./theme-choice.js`.

## 4. Test plan — prove both directions

1. **Fails before, passes after (behavioural):** temporarily change
   `encodeThemeChoice.density` to return `undefined` when the density equals the
   preset for one platform (a two-line local edit; do not commit) and run
   `nub exec vitest run src/theme-choice-params.test.ts`. The new case must fail
   for `Light · macOS`; the old case passed. Revert the edit.
2. **Fails before, passes after (prose):** run the new docs case against the
   unedited `docs/tokens.md`/README with the test added first: it must fail on
   the catalogue sentence. Then apply §3.2/§3.3 and re-run: green.
3. **Full package suite:**
   `nub run --filter @gpuixui/tokens test` → `Test Files 130 passed`, exit `0`.
4. **Gate:** `nub run check` → `check:tests`, `lint`, `fmt`, `check-types` all
   pass.

## 5. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/theme-choice-params.test.ts   # 1 file, all cases pass
nub run --filter @gpuixui/tokens test                 # 130 files pass
cd ../..
nub run check                                          # 4 gate steps pass
```

## 6. STOP conditions

Stop and report instead of improvising if:

- the writer's behaviour differs from §2 (e.g. density is *not* written for a
  valid choice) — then this is a code bug, not a documentation bug, and the plan
  must be rewritten before touching the encoders;
- a shipped style names `spacious` (the new case's `.not.toBe("spacious")` would
  be wrong) — re-derive the assertion from `densityNames` instead of hardcoding
  the word;
- the prose guard needs a helper that does not exist and adding it would
  duplicate `docs.test.ts`'s file-reading logic — extend the existing helper
  rather than adding a second reader;
- any shipped theme stops passing `themeFailures` (it must not: no colour,
  metric or pair changes in this plan).

## 7. Acceptance criteria

- `themeChoiceParams`' JSDoc, `docs/tokens.md`, `packages/tokens/README.md` and
  `docs/design-system.md` all state the omission rule and the density exception
  consistently (the design-system sentence already does; verify, do not rewrite
  it).
- The "every shipped axis" case derives each axis from `shippedThemes`; no test
  infers a platform from a display name.
- The canonical-stability case passes for every shipped axis.
- The prose guard fails on the old sentences and passes on the new ones.
- `themeFailures` is unchanged on all 24 shipped sets; no token value moves.
- A new row is ticked in `TODO.md`; the plan is indexed in
  `.agents/slop/plans/README.md`; the commit is on `agent/tokens-theme` and
  pushed.

## 8. Rollback

Revert the commit. The change touches no runtime value, so a revert restores the
previous prose and the previous (weaker) guard with no migration.
