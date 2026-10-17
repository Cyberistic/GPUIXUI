# 018 — Elevation truth: one shadow, no unsupported fields

**Workstream:** `tokens-theme`
**Phase:** B (working foundation), extending plan 011
**Depends on:** plan 011 (implemented `@gpuixui/tokens`), plan 016 (source exports)
**Files owned:** `packages/tokens/src/elevation.ts`,
`packages/tokens/src/elevation.test.ts` (new), `packages/tokens/src/index.ts`
(no change expected — `export *` already covers the module),
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`, this
plan, `.agents/slop/plans/README.md` (index row only), `TODO.md` (this
workstream only), `COMPONENTS.md` (design-system section only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Three claims in the elevation token are not true of the runtime, and two
consumers already work around one of them by hand.

### 1.1 `BoxShadow.inset` does not exist

`packages/tokens/src/elevation.ts` declares:

```ts
  /** Draw inside the border box. */
  readonly inset?: boolean;
```

The installed `@gpuix/native` **0.10.0** `BoxShadow` is exactly five fields
(evidence, read-only):

```sh
grep -n "BoxShadow" -A10 /private/tmp/gpuix-probe/node_modules/@gpuix/native/dist/host.d.ts
# interface BoxShadow { offsetX; offsetY; blurRadius; spreadRadius; color }
```

No elevation entry uses `inset` (`rg "inset" packages/tokens/src/elevation.ts` finds
only the declaration), so the field is an unused claim that an inner shadow is
expressible. It is not.

### 1.2 A level is a list the runtime cannot paint

`Elevation`'s doc says "Each level is a shadow list painted in order", and
`docs/tokens.md` presents each level as if the whole list were painted. On GPUix
`boxShadow` is **one** shadow (`boxShadow?: BoxShadow`, no array), so only the
first entry of a level reaches the screen; a second entry is silently dropped.

Both consumers already resolve the level to its first entry by hand:

| Consumer | File | Hand-rolled resolution |
| -------- | ---- | ---------------------- |
| `components` | `src/internal/theme.ts` | `Option.getOrUndefined(Arr.head(theme.elevation[level]))` |
| `primitives` | `src/core/style.ts` | `firstShadow(shadows)` → `Option.fromNullishOr(shadows[0])` |

AGENTS §1: "Hoist when a second consumer appears." Tokens should return the one
shadow that paints.

### 1.3 The consequence

Today a designer can add a two-layer shadow and it renders as one layer with no
error, and can write `inset: true` and expect an inner shadow that never appears.
Both are the class of failure `AGENTS.md` calls out: never pretend an
unsupported feature works.

## 2. Design decisions (do not re-litigate)

1. **The list type stays** — it is what a web renderer (the docs site, a future
   export) needs to composite a multi-layer shadow, and removing it would break
   two in-flight consumers for no runtime gain. The *rule* is what changes and is
   enforced: a shipped level never carries more than one shadow.
2. **`inset` goes.** The runtime has no such field and no entry used it.
3. **`elevationShadow(theme, level)` is hoisted into tokens** and returns the
   shadow the runtime paints, or `undefined` for a reserved empty level. It
   returns `undefined` rather than an `Option` because `@gpuixui/tokens` ships
   zero dependencies and does not import `effect` (see the package README, "Why
   no Effect here"); `undefined` is what `StyleDesc.boxShadow` accepts.
4. **`overlay` stays a reserved empty level.** It is documented as reserved, not
   as a shadow.
5. **The guard test asserts the runtime contract**, so the defect cannot return:
   at most one shadow per level, exactly the five runtime fields, a hex colour
   the runtime can parse.

## 3. Exact changes

### 3.1 `packages/tokens/src/elevation.ts`

- Delete `readonly inset?: boolean;` and its comment from `BoxShadow`.
- Replace the `Elevation` doc comment:

```ts
/**
 * Elevation levels. A level is a list so a web renderer can composite several
 * shadows; the native runtime paints **one** shadow per element, so a shipped
 * level carries at most one entry and a consumer resolves it with
 * {@link elevationShadow}. `overlay` is reserved and empty.
 */
```

- Add:

```ts
/** One elevation level's shadow, or `undefined` when the level is reserved and empty. */
export type ElevationLevel = keyof Elevation;

/**
 * The shadow an elevation level paints. The runtime paints one shadow per
 * element, so a level resolves to its first entry; an empty level paints
 * nothing and returns `undefined`, which is what `boxShadow` accepts.
 *
 * @example
 * ```tsx
 * <div style={{ boxShadow: elevationShadow(theme, "md") }} />
 * ```
 */
export function elevationShadow(
  theme: Theme,
  level: ElevationLevel,
): BoxShadow | undefined {
  return theme.elevation[level][0];
}
```

`Theme` must be imported as a type from `./theme.js`. Careful: `theme.ts`
imports `elevation.ts` for the theme values; a *type-only* import back from
`elevation.ts` to `theme.ts` is erased at compile time and creates no runtime
cycle. If a runtime cycle warning appears, parameterise the helper as
`(elevation: Elevation, level: ElevationLevel)` instead and record the change in
this plan's commit — do not add a runtime import.

### 3.2 `packages/tokens/src/elevation.test.ts` (new)

Header comment states the bug: the runtime paints one shadow and has no `inset`,
so a level that ships two shadows or an unsupported field renders differently
from what the tokens describe. Assertions over `lightElevation`, `darkElevation`
and both themes' `elevation`:

- every level has **at most one** entry (a two-layer level fails);
- every entry's keys are exactly `offsetX`, `offsetY`, `blurRadius`,
  `spreadRadius`, `color` (an `inset` reintroduction fails);
- every `color` is `#RRGGBB` or `#RRGGBBAA` (the runtime ignores what it cannot
  parse, so a typo would paint the wrong shadow);
- `overlay` is empty in both shipped themes;
- `elevationShadow(theme, "md")` is `theme.elevation.md[0]`;
- `elevationShadow(theme, "overlay")` is `undefined` for both themes;
- light and dark shadows differ (a theme that forgot to define dark shadows
  fails).

### 3.3 `docs/tokens.md`

- §Elevation: after the table, state the rule — "GPUix paints one shadow per
  element, so a level carries one entry and resolves with
  `elevationShadow(theme, level)`; `overlay` is reserved and paints nothing."
- Add `elevationShadow` to the `## Import` block.
- Remove the word `inset` from the sentence that lists the shadow fields.

### 3.4 `docs/design-system.md`

§7 already says "Elevation is a semantic level, not a literal shadow". Add one
clause: the runtime paints one shadow per element, so a level is one shadow and
the list shape exists only for web renderers.

### 3.5 `packages/tokens/README.md`

One sentence in the intro list or a short note: elevation levels resolve to the
single shadow GPUix paints, through `elevationShadow`.

### 3.6 `COMPONENTS.md`

Extend the "Design tokens" row note with "elevation resolves to the single shadow
the runtime paints". Keep the row `wip`.

### 3.7 `TODO.md`

Add and tick: `Drop the unsupported BoxShadow.inset field, document the
single-shadow rule and hoist elevationShadow (plan 018)`. Add a cross-team bullet:
`primitives` and `components` delete their local first-shadow helpers and use
`elevationShadow` (owner: those workstreams).

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme

# Failing first: write elevation.test.ts before §3.1, so it fails on `inset`
# still being present in the type and on elevationShadow not existing.
nub run --filter @gpuixui/tokens test      # expect failure

# Implement §3.1, then:
nub run --filter @gpuixui/tokens check-types   # expect exit 0
nub run --filter @gpuixui/tokens test          # expect all pass
nub run check && nub run lint && nub run test  # expect exit 0
```

Two-direction proof for the one-shadow rule: add a second entry to
`lightElevation.md`, run the test, expect the "at most one shadow" failure,
remove it.

## 5. Test plan

- `elevation.test.ts` fails before the change (two ways: the `inset` key is
  present on the five-field contract, and `elevationShadow` does not exist).
- The one-shadow rule is proven by adding a second entry to a level and watching
  the test fail.
- The example in the JSDoc is docgen-clean TypeScript; no `any`, no cast.
- No existing assertion is weakened.

## 6. STOP conditions

- STOP if the installed runtime's `BoxShadow` **does** have `inset` or a
  `boxShadow?: BoxShadow[]` list (re-check §1.1). Then the correct fix is to use
  them, and the elevation model should be reconsidered instead.
- STOP if removing `inset` breaks a file outside `packages/tokens/**` — that is a
  cross-workstream break; record it in `TODO.md` instead of editing their paths.
- STOP if `elevationShadow` needs a runtime import of `theme.ts` (a cycle); use
  the value-parameter form in §3.1 and say so.
- STOP if any gate is red for a reason outside this plan.

## 7. Acceptance criteria

- [ ] `BoxShadow` has exactly the five fields the runtime has; `Elevation`'s doc
      states the one-shadow rule.
- [ ] `elevationShadow(theme, level)` exists, is documented, and is covered by
      `elevation.test.ts`.
- [ ] `docs/tokens.md` and `docs/design-system.md` describe the single-shadow
      rule and no longer list `inset`.
- [ ] `COMPONENTS.md` and `TODO.md` record the work and the consumer interlocks.
- [ ] `nub run check`, `nub run lint`, `nub run test` exit 0.
- [ ] Committed on `agent/tokens-theme` and pushed.
