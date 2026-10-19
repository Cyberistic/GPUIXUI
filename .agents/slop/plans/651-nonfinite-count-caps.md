# 651 — A malformed count cap must not hide the component's data

**Phase:** F (input normalisation and display truth)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 117 (verification gate), plan 611/619/649/650 (the
normalise-at-the-boundary rule), plans 113/116/114 (the three components).
**Status:** implemented — measured before the fix: `pageWindow({ page: 5,
pageCount: 10, siblingCount: NaN })` → `[1, …, 10]`, `rankMentions(["ada",
"adam", "bob"], "a", NaN)` → `[]`, `recordRecent(["a", "b", "c"], "d", NaN)`
→ `[]`.
One shared `wholeCap` now treats a non-finite bound as no bound; 1 helper case
file + 3 pure + 3 native cases (unit 462, the three touched behaviour files
58 → 61 with the same 3 recorded plan-540 failures). The three native cases fail
on the old source. Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the
inventory are synced.

## 1. The bug

Three public numeric props cap a list. Each is normalised with arithmetic that
propagates `NaN`:

| Component | Prop | Old rule | Measured with `NaN` |
| --------- | ---- | -------- | ------------------- |
| `Pagination` | `siblingCount` | `Math.max(0, Math.trunc(v))` | `pageWindow({ page: 5, pageCount: 10, siblingCount: NaN })` → `[1, …, 10]`: the current page and every sibling vanish |
| `MentionInput` | `maxVisible` | `Math.max(0, v)` in `rankMentions` | `rankMentions(["ada", "adam", "bob"], "a", NaN)` → `[]`: no suggestion is rendered although two match |
| `CommandMenu` | `recentLimit` | `Math.max(1, Math.trunc(v))` | `recordRecent(["a", "b", "c"], "d", NaN)` → `[]`: the run command is not recorded at all |

Measured at `HEAD` with `nub -e` against the three pure modules (2026-10-19).

The cause is the same in all three: `Math.max`/`Math.min` return `NaN` when one
argument is `NaN`, and `Arr.take(list, NaN)` returns `[]` while
`Arr.range(from, NaN)` returns a one-element range. A malformed count therefore
reads as "show nothing", which is the worst possible answer: the user asked for
a bound, not for an empty control.

A cap that is not a usable count means **no cap**, mirroring plan 649's rule for
Breadcrumb (`maxItems` not finite → no collapse): a malformed bound must never
hide content. `Infinity` already meant "no cap" in all three components, and is
kept. A finite value keeps its documented floor: 0 for `siblingCount` and
`maxVisible`, 1 for `recentLimit` (`docs/command-menu.mdx` states the minimum).

## 2. The fix

One shared helper, used by all three, so the rule exists once:

`packages/components/src/internal/count.ts` (new)

```ts
/**
 * A caller's cap on how many entries a list shows: a whole count at least
 * `minimum`, or no cap when the value is not finite. A malformed bound hides
 * nothing; `Infinity` already means "no cap".
 */
export const wholeCap = (value: number, minimum = 0): number =>
  Number.isFinite(value)
    ? Math.max(minimum, Math.trunc(value))
    : Number.POSITIVE_INFINITY;
```

`Pagination` uses it for `siblings`. The existing `2 * siblings + 5 >= pageCount`
branch then renders the whole list, and the remaining arithmetic is only reached
for a finite value. `MentionInput` uses it for `maxVisible`, and `CommandMenu`
for `limit` with `minimum = 1`.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/count.ts` | New `wholeCap`, with the doc comment above. |
| `packages/components/src/internal/count.test.ts` | New: finite, fractional, negative, `NaN`, `±Infinity`, custom minimum. |
| `packages/components/src/pagination/logic.ts` | `siblingCount` through `wholeCap`; document the rule on `PageWindowInput.siblingCount`. |
| `packages/components/src/pagination/logic.test.ts` | One case: a non-finite `siblingCount` renders every page (the current page included). |
| `packages/components/src/mention/logic.ts` | `rankMentions` takes its cap through `wholeCap`. |
| `packages/components/src/mention/logic.test.ts` | One case: a non-finite `maxVisible` returns every match, prefixes first. |
| `packages/components/src/command-menu/logic.ts` | `recordRecent` takes `limit` through `wholeCap(limit, 1)`. |
| `packages/components/src/command-menu/logic.test.ts` | One case: a non-finite `recentLimit` keeps every entry, front-inserted and deduped. |
| `packages/components/src/behaviour/pagination.test.tsx` | One native case: `siblingCount={NaN}` on 10 pages paints every page, including the current one. |
| `packages/components/src/behaviour/mention-input.test.tsx` | One native case: `maxVisible={NaN}` lists every matching name. |
| `packages/components/src/behaviour/command-menu.test.tsx` | One native case: a run command with `recentLimit={NaN}` appears under `Recent` on reopen. |
| `packages/components/docs/pagination.mdx` | State the malformed-bound rule; native count 17 → 18. |
| `packages/components/docs/mention-input.mdx` | State the rule; native count 17 → 18, pure count 12 → 13. |
| `packages/components/docs/command-menu.mdx` | State the rule; native count 24 → 25, pure count in the verification section +1. |
| `COMPONENTS.md` | Pagination, Mention input and Command menus rows: record the rule and the new test counts. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `PLAN.md` | Record `651` in D30. |
| `TODO.md` | One ticked entry under "Tier 2 hardening after the inventory closed". |

No export is added: `internal/count.ts` stays internal (plan 338), and the three
public modules are already exported.

## 4. Test plan

Every pure case asserts the **content** of the list, not a length, so hiding the
current page or a match fails by name.

- `count.test.ts`: `wholeCap(3) === 3`, `wholeCap(3.9) === 3`,
  `wholeCap(-2) === 0`, `wholeCap(-2, 1) === 1`, `wholeCap(NaN) === Infinity`,
  `wholeCap(Infinity) === Infinity`, `wholeCap(-Infinity) === Infinity`.
- Pagination: `pageWindow({ page: 5, pageCount: 10, siblingCount: NaN })` equals
  `pages(1..10)`, and the same case for `siblingCount: Infinity`.
- Mention: `rankMentions(["ana", "anna", "joana"], "an", NaN)` equals
  `["ana", "anna", "joana"]`; the existing `maxVisible: 2` case still caps
  (a finite bound is untouched).
- Command menu: `recordRecent(["save", "export"], "open", NaN)` equals
  `["open", "save", "export"]`; the existing `limit: 2` case still caps and
  `limit: 0` still means the documented minimum of one.
- Native cases assert the rendered tree: every page number, every suggestion
  row, and a `Recent` group row.

**Both-direction proof.** Run each new case before the source edit and record
the failure; the measured values above are what the pure cases must print. After
the edit, the three files must be green, and the three native cases must fail
when `wholeCap` is replaced by the old expression (one mutation per component).

## 5. Commands

Run from `packages/components`:

```bash
nub run test                 # unit suite, expect 46 files, 462 tests, all green
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/pagination.test.tsx \
  src/behaviour/mention-input.test.tsx \
  src/behaviour/command-menu.test.tsx
```

Expected for the behaviour command: 61 tests, 58 passing and the same 3
recorded plan-540 failures (`keeps the highlighted row inside the list
viewport`, `composes the caller's field handlers`, `paints the focus ring on a
focused row`) as at `HEAD`. Then from the repo root:

```bash
nub run check
nub run lint
nub run test
```

Expected: `check` green (the inventory check holds the docs counts to the
suites), `lint` green, unit suite green. The native suite keeps the recorded
plan-540 binding failures (31 at the time of writing); the three touched files
must not gain a failure.

## 6. STOP conditions

Stop and report if:

- a new pure case passes before the fix (the premise is wrong);
- a native case cannot be written without a harness workaround (record why and
  leave the pure fix plus a `// TODO:` — do not fake a native assertion);
- the behaviour suite's failure count for these three files is larger after the
  change than before;
- `nub run check` fails for a reason outside these files;
- any documented test count disagrees with the suite after the edit.

## 7. Acceptance

- Three public caps no longer hide their data when given a non-finite value.
- The rule lives once in `internal/count.ts` and has its own test.
- Each component has a pure case and a native case, both proven to fail on the
  old source.
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index are synced.
- `nub run check`, `nub run lint` and `nub run test` pass.
