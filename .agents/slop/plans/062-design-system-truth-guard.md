# 062 — Hold the design-system narrative to the implementation

| Field | Value |
| ----- | ----- |
| Phase | F (documentation truth) — the rationale document, after the catalogues |
| Owner | **tokens-theme workstream** (`docs/design-system.md`, `packages/tokens/src/docs.test.ts`) |
| Depends on | plans `056` (colour catalogue), `058` (numeric catalogue), `059` (type index) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`docs/tokens.md` is held to the implementation by
`packages/tokens/src/docs.test.ts`: every colour role, type role, spacing,
radius, density, elevation, motion, border, icon and avatar value is parsed or
built from the package (plans `056`, `058`, `059`).

`docs/design-system.md` is the other half of the pair — the rationale a
maintainer reads first — and **nothing guards it**. It carries machine-checkable
claims:

- the identity metrics: `14px body text, 13px labels, 32px default controls`;
- the shipped role count: `the same 53 roles`;
- the theme surfaces table: `background`, `card`, `popover`, `primary`,
  `destructive`;
- the type summary: `14/20`, `13/18`, `12/16`, `13/20`, `12/18`;
- the spacing list and the three density presets;
- the icon and avatar tiers;
- the radius list.

A type, density, radius or palette edit can therefore ship a rationale document
that lies while the whole suite stays green. The document is a Phase B
deliverable and the source the docs site's Theming prose follows, so it must be
true on its own.

**Not in scope.** The §9 accessibility floor table is a restatement of
behavioural floors that `color.test.ts` already enforces on every shipped pair;
guarding the table as prose would add a third copy of the same numbers and guard
nothing new. The §12 "eight `MotionStyle` properties" claim is about the
runtime, not the token data. Leave both as prose.

## 2. Design decision

Use the same one-way guard as plan `058`: build the exact sentence or row from
the implementation and assert the document contains it. Do **not** write a
markdown parser.

`docs/design-system.md` wraps prose at ~80 columns, so a sentence can straddle a
newline (`icons run` / `12/14/16/20/24 and avatars …`). Normalise the document
once:

```ts
const prose = designSystem.replace(/\s+/g, " ");
```

Then every assertion is built from the package values:

```ts
expect(prose, "identity metrics").toContain(
  `${typography.body.fontSize}px body text, ${typography.label.fontSize}px labels, ${defaultDensity.controlHeight.md}px default controls`,
);
```

A one-way check is the honest scope: the failure it guards is a documented value
that no longer matches the implementation. Extra prose is allowed.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/062-design-system-truth-guard.md` | **create** (this file) |
| `packages/tokens/src/docs.test.ts` | read `docs/design-system.md`, add a `describe("docs/design-system.md")` block |
| `docs/design-system.md` | one sentence in §9 recording that this page is guarded too |
| `COMPONENTS.md` | extend the **Design tokens** row's notes: both documents are guarded |
| `TODO.md` | one task under the tokens block, ticked; progress count updated |
| `.agents/slop/plans/README.md` | index row for `062`, and the paragraph that explains it |

**Do not change** `docs/tokens.md`, the theme data, or the public API. If a guard
exposes a mismatch, decide which side is wrong: if the implementation is right,
fix the document and record the mismatch in the commit message; if the document
is right, the implementation is a product bug — fix it with its own test, do not
weaken the guard.

## 4. The assertions

One `it` per claim. Every expected string is built from the implementation.

| Test | Built from | Expected fragment |
| ---- | ---------- | ----------------- |
| identity metrics | `typography.body`, `typography.label`, `defaultDensity.controlHeight.md` | `` 14px body text, 13px labels, 32px default controls `` |
| role count | `colorRoles.length` | `` exactly the same 53 roles `` |
| surfaces | `themes.light/dark.colors.{background,card,popover}` | `` \| canvas \| `#F6F8FA` \| `#11141A` \| `` (plus raised and floating) |
| filled actions | `themes.{light,dark}.colors.{primary,destructive}` | the two table rows with their hex values |
| type summary | `typography.{body,label,caption,code,codeBlock}` | the four bullets with real size/leading |
| spacing | `Object.values(spacing)` | `` Spacing is a 4px-derived scale: 2, 4, 6, 8, 12, 16, 24, 32, 48, 64. `` |
| density | `densityPresets` | `` - `compact` — 24/28/32 controls, 28px rows. `` (all three) |
| icon and avatar tiers | `Object.values(iconSize)`, `Object.values(avatarSize)` | `` icons run 12/14/16/20/24 and avatars 20/26/32/40, `` |
| radii | `radius` | `` Radii: 0, 4, 6, 8, 12, full. `` |

Typing rules: `as const` for the surface/role tuples; no casts, `any`,
non-null assertions or native markdown parsing.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test     # expected: exit 0, 309 + 9 tests
nub run check                             # expected: exit 0
nub run lint                              # expected: exit 0
nub run test                              # expected: exit 0
```

## 6. STOP conditions

Stop and report if:

- the design-system document has been rewritten and the §4 fragments no longer
  exist — re-read the document and update this plan before editing the test;
- a guard fails because the **document** is right and the implementation is
  wrong — that is a product bug; fix it with its own test and record it;
- you are about to parse markdown structurally — do not; use the sentences in
  §4;
- you are tempted to guard the §9 floor table or the runtime claims — they are
  deliberately out of scope (§1).

## 7. Test plan

- Every new `it` asserts a substring built from implementation values, so
  `check:tests` accepts it and a wrong value fails it.
- **Able to fail**, prove both directions with edits and record the observed
  output in the commit message (the repo's `scripts/verify-two-directions.sh`
  needs `jj`, which is not installed here):
  1. change `` `compact` … 28px rows `` to `30px rows` in
     `docs/design-system.md`, run the package suite, observe the density test
     fail, restore, observe green;
  2. change `Spacing is a 4px-derived scale: 2, 4,` to `… 2, 6,` and observe the
     spacing test fail;
  3. change `exactly the same 53 roles` to `exactly the same 52 roles` and
     observe the role-count test fail.
- Do not claim a direction that was not run.

## 8. Acceptance criteria

- The nine claims in §4 are guarded; a value edit in any of them fails the
  package suite with the claim's name in the message.
- `docs/design-system.md` records that it is guarded beside `docs/tokens.md`.
- No product source changes, no new public API, no new dependency.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` exit 0, and the failing direction was observed.
