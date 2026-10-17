# 059 — The type-role index and the unguarded colour pairs

| Field | Value |
| ----- | ----- |
| Phase | F (catalogue truth) — closes the last two drift surfaces in the token package |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`, the design-system section of `COMPONENTS.md`) |
| Depends on | plans `010–019`, `050–058` (all landed) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Two parts of the catalogue are stated but not enforced.

**1.1 There is no type-role index.** `colorRoles` was added by plan `015` so the
docs site generates colour tables from the package instead of retyping values.
The ten type roles have no equivalent: the docs site's
`apps/docs/src/components/type-scale.tsx` (another worktree, read-only here)
declares its own

```ts
const textRoles: ReadonlyArray<TextRole> = [
  "display", "h1", "h2", "h3", "body",
  "bodyStrong", "label", "caption", "code", "codeBlock",
];
```

If an eleventh role is added to `Typography`, the package and the docs site
disagree and nothing fails: the docs page silently omits the role. This is the
same defect `colorRoles` fixed for colour.

**1.2 The contrast suite guards only part of what the docs claim.** The pair
table in `packages/tokens/src/color.test.ts` tests `mutedForeground` on `muted`
but not on the plain surfaces the role's own JSDoc names; it never tests typed
input text, ghost text sitting on the `hover`/`active` washes, or the
`selection` wash. Each is a real surface a component paints:

| Claim in the docs / JSDoc | Guarded today? |
| ------------------------- | -------------- |
| `mutedForeground` is "secondary text on `muted` and on `background`" | only on `muted` |
| `inputForeground` is "text typed into an input" | no |
| `foreground` sits on the `hover` and `active` washes (ghost surfaces) | no |
| `selection` is "translucent, so text stays legible" | no |

A palette edit can therefore make secondary text, input text or selected text
unreadable and the suite stays green. The design system claims these floors; the
suite must hold them.

## 2. Decisions (do not re-litigate)

- **One index, not a second scale.** `textRoles` is an ordered list of the roles
  `Typography` already has. It does not duplicate values, does not create a new
  type scale, and is not density-dependent. `TextRole` is derived from it, so
  `textStyle(theme, role)` and `roleFamily` stay exhaustive.
- **Order is documentation order** (`display` → `codeBlock`), the same order the
  catalogue table uses. A consumer iterates it for a table; ordering is part of
  the contract.
- **Extend the existing contrast table.** Do not write a second contrast runner.
  Add pairs to `pairs` and one composite block for the translucent wash, which
  needs alpha blending before the ratio can be computed.
- **No floor is lowered.** Every added pair passes in all four colour sets as
  shipped. If one fails after an edit, the token value is wrong, not the floor.
- **Do not edit the docs site.** `apps/docs` belongs to another workstream;
  record the follow-up as a cross-team row in `TODO.md` instead.

## 3. Exact files to change

| Path | Action |
| ---- | ------ |
| `packages/tokens/src/typography.ts` | add `textRoles` before `Typography`; derive `TextRole` from it instead of `Exclude<…>` |
| `packages/tokens/src/typography.test.ts` | import `textRoles`; replace the local `roles` list; add an index-completeness test |
| `packages/tokens/src/color.test.ts` | add the five missing pairs; add a `text selection` block with alpha compositing |
| `packages/tokens/src/docs.test.ts` | iterate `textRoles` for the typography table; assert the documented rows follow index order |
| `docs/tokens.md` | document `textRoles` in the typography and docs-site sections; add the new pairs to `## Verification` |
| `docs/design-system.md` | state the type-role index and the selection/input/muted surfaces in §5 and §9 |
| `packages/tokens/README.md` | mention `textRoles` beside `colorRoles` |
| `COMPONENTS.md` | design-system `/ Design tokens` note: both indexes drive generated tables |
| `TODO.md` | two ticked rows; one cross-team row for the docs site |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Exact change

### 4.1 `packages/tokens/src/typography.ts`

Put this immediately above `Typography` (the `text()` helper stays below the
interface, as it is):

```ts
/**
 * Every type role, in the order the token documentation lists them. A
 * documentation site iterates this to build a type table from the package
 * without an unsafe cast, the way {@link colorRoles} indexes the colour roles.
 *
 * @example
 * ```ts
 * import { textRoles, typography } from "@gpuixui/tokens";
 *
 * const rows = textRoles.map((role) => ({ role, ...typography[role] }));
 * ```
 */
export const textRoles = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "bodyStrong",
  "label",
  "caption",
  "code",
  "codeBlock",
] as const;

/** A typographic role name, excluding the font family fields. */
export type TextRole = (typeof textRoles)[number];
```

Delete the old `export type TextRole = Exclude<keyof Typography, "sans" | "mono">;`
line and the comment above it. The `Typography` interface keeps one documented
field per role; the test in §4.2 proves the interface and the index agree.

### 4.2 `packages/tokens/src/typography.test.ts`

- Import `textRoles` beside `typography`, plus `type TextRole`.
- Replace the hand-written `roles` list with `textRoles` in the leading/weight
  assertions.
- Replace the `ascendingPairs` literal with the **ladder** model. The scale is
  not one total order: `bodyStrong` shares `body`'s size, and `code`/`codeBlock`
  form a separate ladder, so a pair list derived from `textRoles` alone asserts
  false relations (`caption > code` fails: 12 vs 13). Declare the two ladders and
  prove they cover the index:

```ts
const proseLadder = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "label",
  "caption",
] as const satisfies ReadonlyArray<TextRole>;

const codeLadder = [
  "code",
  "codeBlock",
] as const satisfies ReadonlyArray<TextRole>;

const laddered: ReadonlyArray<TextRole> = [
  ...proseLadder,
  "bodyStrong",
  ...codeLadder,
];

/** The roles that fail to step down from the role before them. */
const brokenSteps = (ladder: ReadonlyArray<TextRole>): ReadonlyArray<TextRole> =>
  ladder.filter((role, index) => {
    const previous = index === 0 ? undefined : ladder[index - 1];
    return (
      previous !== undefined &&
      typography[previous].fontSize <= typography[role].fontSize
    );
  });
```

- Add:

```ts
it("places every role on exactly one ladder", () => {
  expect(laddered.toSorted()).toEqual([...textRoles].toSorted());
  expect(new Set(laddered).size).toBe(laddered.length);
});

it("steps each ladder strictly down in size", () => {
  expect(brokenSteps(proseLadder), "prose ladder").toEqual([]);
  expect(brokenSteps(codeLadder), "code ladder").toEqual([]);
});
```

The first test fails when a role is added to `Typography`/`textRoles` and not
placed on a ladder; the second fails when a size edit breaks a ladder. Keep the
index-completeness test as well:

```ts
it("indexes every non-family role exactly once, in documentation order", () => {
  const roles = Object.keys(typography).filter(
    (key) => key !== "sans" && key !== "mono",
  );
  expect(textRoles).toEqual(roles);
  expect(new Set(textRoles).size).toBe(textRoles.length);
  expect(textRoles[0]).toBe("display");
  expect(textRoles.at(-1)).toBe("codeBlock");
});
```

Do not use `ladder.at(index - 1)`: `at(-1)` is the last element.

### 4.3 `packages/tokens/src/color.test.ts`

Add to `pairs` (keep the existing grouping; `PairClass` already covers these):

```ts
["mutedForeground", "background", "secondary"],
["mutedForeground", "card", "secondary"],
["mutedForeground", "popover", "secondary"],
["inputForeground", "input", "body"],
["foreground", "hover", "body"],
["foreground", "active", "body"],
```

Then add an alpha-compositing helper below `contrast`, and a block:

```ts
/** Blend an 8-digit hex colour over an opaque 6-digit colour. */
const composite = (overlay: string, base: string): string => {
  const hex = overlay.slice(1);
  const alpha = Number.parseInt(hex.slice(6, 8), 16) / 255;
  const channel = (at: number): number =>
    Math.round(
      Number.parseInt(hex.slice(at, at + 2), 16) * alpha +
        Number.parseInt(base.slice(at + 1, at + 3), 16) * (1 - alpha),
    );
  return `#${[0, 2, 4]
    .map((at) => channel(at).toString(16).padStart(2, "0"))
    .join("")}`;
};

describe("text selection", () => {
  colourSets.forEach(({ label, colors, floors }) => {
    it(`${label}: selection is a translucent wash`, () => {
      expect(colors.selection).toMatch(/^#[0-9A-F]{8}$/);
    });

    ["background", "card"].forEach((surface) => {
      it(`${label}: body text stays readable on ${surface} under the selection wash`, () => {
        expect(
          contrast(
            colors.foreground,
            composite(colors.selection, colors[surface as "background" | "card"]),
          ),
        ).toBeGreaterThanOrEqual(floors.body);
      });
    });
  });
});
```

The composite helper only accepts 8-digit overlays; the first test guarantees
`selection` is one, so a future opaque selection fails loudly instead of
silently changing what the second test measures.

### 4.4 `packages/tokens/src/docs.test.ts`

- Import `textRoles` from `./typography.js`.
- Change the typography table test to iterate `textRoles`:

```ts
it("lists every type role with its size, leading and weight", () => {
  textRoles.forEach((role) => {
    const style = typography[role];
    expect(markdown, `typography.${role}`).toContain(
      `| \`${role}\` | ${style.fontSize} | ${style.lineHeight} | ${style.fontWeight} |`,
    );
  });
});
```

- Add an order guard:

```ts
it("lists the type roles in index order", () => {
  const positions = textRoles.map((role) =>
    markdown.indexOf(`| \`${role}\` |`),
  );
  expect(positions).not.toContain(-1);
  expect(positions).toEqual(positions.toSorted((a, b) => a - b));
});
```

### 4.5 Documentation

- `docs/tokens.md` import block: add `textRoles` (before `textStyle`).
- In `## Typography`, one sentence: "`textRoles` lists the ten roles in this
  order, so a table can be generated without retyping them."
- In `## For documentation sites`, add a runnable snippet:

```ts
import { textRoles, typography } from "@gpuixui/tokens";

const rows = textRoles.map((role) => ({ role, ...typography[role] }));
```

  and state that `textRoles` excludes `sans`/`mono`.
- In `## Verification`, add: the contrast suite also covers `mutedForeground` on
  `background`/`card`/`popover`, `inputForeground` on `input`, `foreground` on
  the `hover`/`active` washes, and `foreground` over the composited `selection`
  wash on both surfaces; `docs.test.ts` holds the type table to `textRoles`
  order.
- `docs/design-system.md` §5: name `textRoles` as the index. §9 table: change
  the first rows to read "body text on background/card/popover/input" and
  "secondary text (`mutedForeground` on plain surfaces), on-colour text,
  placeholder", and add a row "text selection (`foreground` over the
  composited `selection` wash)".
- `packages/tokens/README.md` "For documentation sites": mention `textRoles`
  beside `colorRoles`.
- `COMPONENTS.md` `/ Design tokens` note: replace "`colorRoles` indexes the
  roles for generated doc tables" with "`colorRoles` and `textRoles` index the
  colour and type roles for generated doc tables".

### 4.6 `TODO.md`

Add under the tokens block, ticked:

- `Expose textRoles and guard it against the typography interface (plan 059)`
- `Guard every documented colour pair — muted text on plain surfaces, input text, ghost text on hover/active, the selection wash (plan 059)`

Add under the cross-team rows, unticked:

- `Cross-team: docs-site generates its type table from textRoles instead of its
  local list, and drops the hardcoded role array (owner: docs-site; plan 059)`

Update the section header count to the real totals.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test        # expected: exit 0, all suites pass
nub run --filter @gpuixui/tokens check-types # expected: exit 0
nub run check                                # expected: exit 0 (check:tests, lint, fmt, types)
nub run lint                                 # expected: exit 0
```

## 6. STOP conditions

Stop and report instead of improvising if:

- `textRoles` and the `Typography` interface disagree after the change — decide
  which is wrong (the interface is the source of value; the index is the
  order) and re-read plan `015` before choosing;
- an added contrast pair fails in any of the four colour sets — **do not lower
  the floor and do not delete the pair**; fix the token value, then record the
  measured before/after in the commit message;
- the selection composite cannot be computed because a theme's `selection` is
  not 8-digit hex — treat that as the bug the test exists to catch;
- the docs table is in a different order from `textRoles` — fix the document,
  the index is the contract;
- you are tempted to edit `apps/docs` or another worktree — don't; the TODO row
  is the handoff.

## 7. Test plan

| Test | Catches |
| ---- | ------- |
| `typography.test.ts` index test | a role added to `Typography` but not `textRoles`, a duplicate, or a reordered index |
| `typography.test.ts` derived ascending pairs | a new role that breaks the size hierarchy, with no hardcoded list to update |
| `color.test.ts` new pairs | a palette edit that makes muted, input or ghost text unreadable on its real surface, in any of the four colour sets |
| `color.test.ts` selection block | a `selection` that stops being translucent, or a wash that makes body text drop below its floor |
| `docs.test.ts` textRoles iteration + order | a documented type table that misses a role or lists them out of index order |

**Prove both directions** (the repo's `scripts/verify-two-directions.sh` needs
`jj`, which is not installed; do it by hand):

1. Remove `"caption"` from `textRoles` → the typography index test and the docs
   table test fail. Restore it.
2. Set `lightColors.mutedForeground` to `palette.neutral[400]` → the new
   `mutedForeground on background` pair fails. Restore it.
3. Set `lightColors.selection` to `palette.iris[500]` (opaque) → the
   translucency test fails; set it to a near-black opaque wash with a fake alpha
   if you want to see the contrast assertion fail too. Restore it.

Record the command output in the commit message; do not claim a run you did not
make.

## 8. Acceptance criteria

- `textRoles` is exported from the core entry, ordered, typed, documented and
  guarded against `Typography`.
- The contrast suite covers every pair the catalogue claims: the five new pairs
  and the composited selection wash, in all four colour sets.
- `docs/tokens.md`, `docs/design-system.md`, the package README and the
  `COMPONENTS.md` row name the new index and the new guards.
- `TODO.md` has the two ticked rows, the docs-site handoff row, and honest
  counts.
- `nub run --filter @gpuixui/tokens test`, `check-types`, `nub run check` and
  `nub run lint` pass.
