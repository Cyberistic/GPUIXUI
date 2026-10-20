# 796 — A read-only rating paints the disabled pointer and keeps a ring it cannot act on

**Phase** F (Tier 1 truth) · **Workstream** primitives · **Depends on**
`054` (Rating), `094` (hover preview), `332` (a disabled control paints no
ring), `601` (the focus lifetime), `603` (the focus-loss matrix), `786` (the
read-only field family).

## 0. The defect, stated precisely

`Rating` has three input states — interactive, `disabled`, and `readOnly` — but
`core/style.ts`'s `ratingStarStyle` only tells two of them apart:

```ts
const interactive = spec.disabled !== true && spec.readOnly !== true;
cursor: interactive ? "pointer" : "not-allowed",
…
if (spec.focused === true && spec.disabled !== true) style.boxShadow = …;
```

Two measured consequences on this host (probe, `runtime/`, 2026-10-20):

1. **A read-only rating advertises the disabled pointer.** Every star of a
   `<Rating readOnly />` paints `cursor: "not-allowed"`, although `readOnly` is
   the documented *display* state — the docs say it "shows the value" and the
   only thing it refuses is input. The disabled state is the one that dims
   (`opacity: 0.5`) and blocks; read-only does neither, yet it claims to.
2. **A rating made read-only while focused keeps its focus ring.** Measured:
   mount `<Rating defaultValue={3} />`, `focusNext()` → native focus is
   `rating-star-3` and the star paints the ring; re-render the same tree with
   `readOnly` → the ring is **still painted** on `rating-star-3`, while every
   star has `tabIndex: undefined` and the group refuses every key and click. The
   ring marks a control that cannot act and cannot be reached again — the class
   plan `332` fixed for `disabled`, left open for the state plan `786` added to
   the public payload.

The probe output (the exact assertion that failed):

```
{
  beforeRing: true,
  afterRing: true,
  cursor: "not-allowed",
  focused: "rating-star-3"
}
```

The fix is two lines of intent in one resolver: **read-only is neither
interactive nor disabled.** It paints the default pointer, no dimming and no
ring; a disabled rating keeps `not-allowed`, half opacity and no ring; an
interactive one keeps `pointer` and rings while focused.

## 1. The rule

| State | `cursor` | `opacity` | ring while focused | input |
| ----- | -------- | --------- | ------------------ | ----- |
| interactive | `pointer` | none | yes | pointer, keys |
| `disabled` | `not-allowed` | `0.5` | no (plan 332) | none |
| `readOnly` | `default` | none | no | none |

Read-only is not focusable (plan `786`: it has no tab stop), so a ring on it has
no honest meaning; a ring that survives a prop change is exactly the stale state
plans `591`/`601`/`602` removed from the other controls. The component does not
blur the host — that is the runtime's focus, not ours — it stops painting a
state it no longer owns.

## 2. Files to change (exact)

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | In `ratingStarStyle`: `cursor` becomes `interactive ? "pointer" : spec.disabled === true ? "not-allowed" : "default"`; the ring guard becomes `spec.focused === true && interactive`. Update the function's doc comment to name the three states. |
| `packages/primitives/src/core/style.test.ts` | Extend the existing `"paints no ring for a control that cannot act"` case with `ratingStarStyle({ size: "md", focused: true, readOnly: true }, testTheme).boxShadow` → `undefined`; add one case asserting the three cursors (`pointer` / `not-allowed` / `default`) and that only `disabled` sets `opacity: 0.5`. |
| `packages/primitives/src/components/Rating.test.tsx` | Extend `"rings only the star that holds focus"` (or add one case beside it): a read-only rating rendered with focus index 2 paints no ring on any star, while the interactive twin rings exactly star 3. This proves the element tree carries the state, not only the resolver. |
| `packages/primitives/runtime/rating.runtime.test.tsx` | Two scoped cases: (a) the measured transition — focus star 3, re-render `readOnly`, assert the painted `boxShadow` is gone and `cursor` is `"default"`; (b) the control — a `disabled` rating paints `cursor: "not-allowed"`, `opacity: 0.5` and no ring, so the read-only case cannot pass by every star losing its pointer. |
| `packages/primitives/docs/rating.mdx` | In the read-only paragraph (§ Accessibility) and the API row, state the three-way pointer contract: read-only is a display state (default cursor, no dimming, no ring), disabled is blocked (`not-allowed`, half opacity, no ring). One sentence, not a section. |
| `COMPONENTS.md` | Append a `**Read-only pointer (796):**` clause to the Rating row with the measured before/after. |
| `TODO.md` | Add the task under the primitives workstream before implementing; tick it after the gates. |
| `.agents/slop/plans/README.md` | Index this plan in the primitives table after `027`/`028` (the table's latest primitives rows). |

Nothing outside these paths.

## 3. Implementation steps

1. **Resolver.** In `ratingStarStyle`:

   ```ts
   const interactive = spec.disabled !== true && spec.readOnly !== true;
   const style: StyleDesc = {
     …
     cursor: interactive
       ? "pointer"
       : spec.disabled === true
         ? "not-allowed"
         : "default",
   };
   …
   if (spec.focused === true && interactive) style.boxShadow = focusRing(theme).boxShadow;
   ```

   The `disabled` opacity line stays. Do **not** add an opacity for read-only: a
   read-only value must read at full contrast (the same rule the field family
   follows, plan `786`).
2. **Docs wording.** `docs/rating.mdx` already says read-only "shows the value,
   takes no input, no tab stop". Add that it is not the disabled paint: default
   pointer, full contrast, no ring.
3. **Tests** per §4.
4. **Record** the observed failure text in §6.

## 4. Test plan

### 4.1 Offline

- `src/core/style.test.ts`
  - the existing no-ring case gains the read-only row;
  - a new case: `cursor` is `"pointer"` for `{size:"md"}`, `"not-allowed"` for
    `{size:"md", disabled:true}`, `"default"` for `{size:"md", readOnly:true}`,
    and only the disabled one carries `opacity`.
- `src/components/Rating.test.tsx`
  - a focused read-only render paints no `boxShadow` on any star; the same
    render without `readOnly` rings exactly the focused star. This fails against
    the old guard, which excluded only `disabled`.

### 4.2 Runtime — `runtime/rating.runtime.test.tsx`

Use `byLabel(runtime, "3 of 5")` (already in the file) for the star and read
`element.style["cursor"]` / `element.style["boxShadow"]`.

1. **`"drops the ring and the blocked cursor when a focused rating becomes read-only"`**
   - mount `<Rating defaultValue={3} label="Quality" testId="ra" />`;
   - `runtime.focusNext()`;
   - `await awaitFrame(() => byLabel(runtime, "3 of 5").style["boxShadow"] !== undefined, "the rating ring")`;
   - re-render the same tree with `readOnly`;
   - `runtime.flush()`;
   - `await awaitFrame(() => byLabel(runtime, "3 of 5").style["cursor"] === "default", "the read-only paint")`;
   - assert `boxShadow` is `undefined` and focus is still `rating-star-3` (the
     component does not move the runtime's focus).
2. **`"keeps the disabled rating visually blocked"`**
   - mount `<Rating defaultValue={3} label="Quality" testId="ra" disabled />`;
   - assert the star's `cursor` is `"not-allowed"`, `opacity` is `0.5`, and
     `boxShadow` is `undefined`;
   - this is the fail-direction control: a change that made every star read-only
     would fail it.

Do not add a third read-only case that only repeats the cursor assertion.

### 4.3 Both directions (must actually run)

- Green: the scoped runtime file and the two offline files.
- Old direction A: revert the `cursor` expression → the core cursor case and the
  runtime transition case fail on `expected 'not-allowed' to be 'default'`.
- Old direction B: revert the ring guard to `spec.disabled !== true` → the core
  read-only ring case, the Rating element case and the runtime transition case
  fail on the painted `boxShadow`.
- Record the observed messages in §6.

## 5. Commands (exact, in order)

```sh
# while iterating
nub run --filter @gpuixui/primitives test src/core/style.test.ts
nub run --filter @gpuixui/primitives test src/components/Rating.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/rating.runtime.test.tsx

# end of task
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
```

Expected: the two offline files green; the scoped runtime file green (its
existing cases plus the two new ones); the whole offline suite is
**73 files / ≥ 1013 tests**; `check-types` clean. The full live suite is the
merge gate, not this plan (AGENTS §3).

## 6. Verification record (fill in when the work lands)

| Direction | Command | Observed |
| --------- | ------- | -------- |
| probe before the fix | `test:runtime runtime/__probe-rating.runtime.test.tsx` (deleted) | `{ beforeRing: true, afterRing: true, cursor: "not-allowed", focused: "rating-star-3" }` |
| new runtime cases | `test:runtime runtime/rating.runtime.test.tsx` | **18/18 passed** (16 existing + the 2 new cases) |
| old A (cursor reverted) | same + the core file | core `separates a read-only rating's pointer…`: `expected [ 'pointer', 'not-allowed', …(1) ] to strictly equal [ 'pointer', 'not-allowed', 'default' ]`; runtime `drops the ring and the blocked cursor…` failed the `cursor === "default"` wait |
| old B (ring guard reverted to `disabled !== true`) | same + the element file | core `paints no ring for a control that cannot act`: `expected { offsetX: +0, offsetY: +0, …(3) } to be undefined`; element `paints no ring on a read-only star that still holds focus`: `expected [ false, true, false, false, false ] to strictly equal [ false, false, false, false, false ]`; runtime transition: `expected { offsetX: +0, offsetY: +0, …(3) } to be undefined` |
| core + element cases | `test src/core/style.test.ts src/components/Rating.test.tsx` | **2 files / 82 tests passed** |
| final offline | `test` | **73 files / 1013 tests passed** |
| type gate | `check-types` | clean; `nub run check` stops only on `apps/docs/src/components/docs/demos.tsx`, the docs-site formatting task already in `TODO.md` (outside this workstream) |

## 7. STOP conditions

- The focused star's ring cannot be measured (`style.boxShadow` is absent even
  before the re-render) — stop: the focus tracker or the harness changed; report
  the dump instead of weakening the case.
- A read-only rating turns out to be focusable by a later decision (a tab stop
  is added) — stop: that is a contract change to plan `786`, not this fix.
- Any existing Rating/Runtime case fails for a reason other than these two
  properties — stop and report it as a regression.
- The runtime reports the cursor through a different property than `style` —
  stop with the element dump; do not assert a property the runtime does not
  paint.

## 8. Acceptance

- `Rating`'s read-only stars paint `cursor: "default"`, full opacity and no
  focus ring; disabled keeps `not-allowed`, `0.5` and no ring; interactive keeps
  `pointer` and the ring.
- One offline case and one runtime case fail by name without each half of the
  fix, and the disabled control case fails if every state collapses into
  read-only.
- `docs/rating.mdx`, `COMPONENTS.md`, the plan index and `TODO.md` are current.
- `nub run --filter @gpuixui/primitives test` and `check-types` are green, with
  the exact commands recorded in §6.
