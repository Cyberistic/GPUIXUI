# 065 — Guard the package README against drift

| Field | Value |
| ----- | ----- |
| Phase | F (documentation truth) — the last unguarded document in the package |
| Owner | **tokens-theme workstream** (`packages/tokens/README.md`, `packages/tokens/src/readme.test.ts`) |
| Depends on | plans `056`, `058`, `059`, `062` (the other three docs guards), `064` (the indexes this guard uses) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`docs/tokens.md` and `docs/design-system.md` are held to the implementation by
`packages/tokens/src/docs.test.ts` (plans `056`, `058`, `059`, `062`).
`packages/tokens/README.md` is the **package's front door** — the page a consumer
reads before the reference — and **nothing guards it**. It repeats numeric and
membership claims that can drift silently:

- the high-contrast role count (`It reuses the same 53 roles`);
- the platform table: mono family, four radii, density and both accents for
  every variant;
- the typographic role count (`the ten typographic roles`);
- the motion levels;
- the status-family list.

It also already lies in one place: its motion paragraph names five levels
(`step`, `fast`, `normal`, `slow`, `pulse`) and omits `none`, which is a real
`Motion` level with a `0` value, and which `docs/tokens.md` lists. The role
count and the platform table happen to be correct today; the guard is what keeps
them correct.

**Not in scope.** The README's runtime claims (eight `MotionStyle` properties,
no `letterSpacing`, no `registerFont`, no portal) are facts about GPUix
`0.10.0`, not about the token data; they are already evidenced in
`docs/tokens.md` and `COMPONENTS.md`. Leave them as prose.

## 2. Design decision

A second docs-truth file, `packages/tokens/src/readme.test.ts`, using the same
one-way method as plan `058`: **build the exact sentence or table row from the
implementation and require the README to contain it.** Do not write a markdown
parser.

The README wraps prose at ~80 columns, so normalise once:

```ts
const readme = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
```

The platform table is the one structural exception: its rows are built with the
same helper shape `docs.test.ts` already uses (a template string), not parsed
back out of the markdown.

Two README edits are part of this plan because the guard would otherwise pin a
less honest sentence:

1. the motion level list gains `none`;
2. the Default platform row uses the same shape as the other three (label, real
   radii instead of the word `identity`), so one row builder covers all four;
3. the `ten typographic roles` phrase becomes `all 10 typographic roles`, so the
   count is built from `textRoles.length`;
4. the "Four variants ship: …" sentence drops the hand-typed count and list; the
   guarded table already carries both.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/065-readme-truth-guard.md` | **create** (this file) |
| `packages/tokens/src/readme.test.ts` | **create** — the guard |
| `packages/tokens/README.md` | fix the four sentences/rows above; add one line to "For documentation sites" is done by plan `064`, do not duplicate it |
| `packages/tokens/README.md` (intro) | name **motion** and **avatar diameters** among the groups the package owns (it currently omits both) |
| `COMPONENTS.md` | extend the **Design tokens** row's notes: the package README is guarded too |
| `TODO.md` | one task under the tokens block, ticked; progress count updated |
| `.agents/slop/plans/README.md` | index row for `065`, plus the explanatory paragraph |

**Do not change** the theme data, the public API, `docs/tokens.md`, or
`docs/design-system.md`. If the guard exposes a mismatch, fix the README when the
implementation is right; if the README is right, the implementation is a product
bug — fix it with its own test and record it.

## 4. The guard

Every expected string is built from the implementation. The file header states
the bug class it guards, per `AGENTS.md` §3.

Imports: `colorRoles` (`./color.js`), `motion` (`./motion.js`),
`platformNames`, `platformStyles`, `platformTypes` (`./platforms.js`),
`defaultDensity`, `radius` (`./scale.js`), `statusTones` (`./styles.js`),
`themes` (`./theme.js`), `textRoles` (`./typography.js`).

A total list formatter for the sentences:

```ts
const sentenceList = (values: ReadonlyArray<string>): string =>
  values.length < 2
    ? values.join("")
    : `${values.slice(0, -1).join(", ")} and ${values.slice(-1).join("")}`;
```

### 4.1 Role count

```ts
expect(readme).toContain(`same ${colorRoles.length} roles`);
```

### 4.2 Type-role count

```ts
expect(readme).toContain(`all ${textRoles.length} typographic roles`);
```

### 4.3 Motion levels

Build the level names in `Motion` declaration order, excluding `ease`:

```ts
const { ease: _ease, ...levels } = motion;
const levelNames = Object.keys(levels).map((level) => `\`${level}\``);
expect(readme).toContain(`${sentenceList(levelNames)} are the levels`);
```

The expected fragment is `` `none`, `step`, `fast`, `normal`, `slow` and `pulse`
are the levels ``. `_ease` is an unused binding by design; rename it to `ease`
and reference it in the easing assertion below instead if lint objects.

### 4.4 Status families

```ts
const toneNames = statusTones.map((tone) => `\`${tone}\``);
expect(readme).toContain(
  `The four status families — ${sentenceList(toneNames)} —`,
);
```

The count word `four` is safe only while `statusTones.length === 4`; assert that
first in the same test so a fifth tone fails loudly:

```ts
expect(statusTones.length).toBe(4);
```

### 4.5 Platform table

One test per platform in `platformNames` order, plus an order assertion. Row
builder:

```ts
const platformRow = (platform: PlatformName): string => {
  const style = platformStyles[platform];
  const variantRadius = style.structure.radius ?? radius;
  const density = style.structure.density ?? defaultDensity.name;
  const light = style.colors.light.primary ?? themes.light.colors.primary;
  const dark = style.colors.dark.primary ?? themes.dark.colors.primary;
  return `| ${platformTypes[platform].label} (\`${platform}\`) | \`${style.types.mono}\` | ${variantRadius.sm} / ${variantRadius.md} / ${variantRadius.lg} / ${variantRadius.xl} | \`${density}\` | \`${light}\` | \`${dark}\` |`;
};
```

Assert each row is present, then that the README lists them in `platformNames`
order (indexOf positions ascending).

### 4.6 What is deliberately not asserted

- the intro's group list — a prose enumeration with no canonical order;
- the runtime facts (motion properties, fonts, portal, contrast floors) — see
  §1;
- every example snippet — docgen/type-checking would be the right tool, and the
  examples in `src/*.example.ts` are the executed ones.

## 5. Exact README edits

1. Intro sentence: `colour, typography, spacing, radii, density, elevation,
   border widths, icon sizes, avatar diameters and motion`.
2. Motion paragraph: "`none`, `step`, `fast`, `normal`, `slow` and `pulse` are
   the levels; `standard`, `enter`, `exit` and `linear` are the easings."
3. High contrast: keep `It reuses the same 53 roles` (the guard derives `53`).
4. "Four variants ship: macOS, Linux, Windows and Default. They are full token
   themes" → "The variants in `platformNames` are full token themes" (keep the
   next sentence unchanged).
5. Platform table `default` row → `| Default (`default`) | `Menlo` | 4 / 6 / 8 /
   12 | `comfortable` | `#5F4BDB` | `#A7A9FF` |` (values derived: `radius` and
   the identity accents).
6. "the ten typographic roles in documentation order" → "all 10 typographic
   roles in documentation order".

## 6. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; 14 files, 601 + 6 new tests = 607
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

If the number differs, record the observed number, not the prediction.

## 7. STOP conditions

Stop and report if:

- the README has been rewritten since this plan and §5's anchors no longer
  exist — re-read it and update this plan before writing the test;
- the platform table's column order differs from §4.5 — do not reorder the
  table to match a test without recording the choice;
- a guard fails because the README is right and the implementation is wrong —
  that is a product bug; fix it with its own test and record it;
- you are about to parse markdown structurally — do not; use the built strings;
- you are tempted to guard the runtime claims — they are deliberately out of
  scope (§1).

## 8. Test plan

- Every assertion compares the document against a value built from the
  implementation, so a value edit either fails the guard or is invisible only
  when it does not change the claim.
- **Able to fail**, prove both directions with edits and record the observed
  output in the commit message (`scripts/verify-two-directions.sh` needs `jj`,
  which is not installed here):
  1. change the macOS primary `#0071E3` to `#0071E4` in the README, run the
     package suite, observe the macOS row test fail, restore, observe green;
  2. remove `\`none\`, ` from the motion sentence, observe the motion-level test
     fail, restore;
  3. change `same 53 roles` to `same 52 roles`, observe the role-count test
     fail, restore.
- Do not claim a direction that was not run.

## 9. Acceptance criteria

- `packages/tokens/src/readme.test.ts` guards the five claim groups in §4.
- The README's motion list includes `none`; its Default platform row has the
  same shape as the other three and real radii; it states `all 10 typographic
  roles`; it no longer hand-types the variant count.
- `COMPONENTS.md`'s **Design tokens** row records that the README is guarded.
- No product source or public API change.
- `nub run --filter @gpuixui/tokens check-types`, the package suite, `nub run
  check`, `nub run lint` and `nub run test` exit 0, and the failing directions
  were observed.
