# 608 — Focus signals are documented truthfully on every focusable page

**Phase:** F (docs truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 110, 117, 333, 335, 337, 383, 388,
522, 523, 540, 536; playground plans 390, 603, 605.

**Status when written:** open. `TODO.md` → Interlocks records the gap: focus
rings follow React `focus`/`blur`, which the renderer does not reliably deliver
for a native focus change, while the component pages describe the ring as if it
always appears.

## 1. The documented claim and the measured behaviour

Components seed `focused` from `autoFocus` and track later changes through React
`onFocus`/`onBlur` (plans 388, 522, 523). The measurement is narrower than that
suggests:

- the headless `TestRenderer` delivers **no** `focus`/`blur` for `focusElement`,
  `focusNext`, or a pointer focus change (plans 536, 540);
- a live window's delivery is **window-state dependent** — the same code read
  `onFocus` delivered and not delivered (playground plans 390, 603), and
  `InlineEdit`'s `onBlur` is missing in some states (playground plan 605).

So a ring is guaranteed when `autoFocus` seeds it, and otherwise depends on a
signal the runtime may not send. No page states this. A reader implementing
`Form` or `List` reasonably assumes a ring appears whenever the control is
focused, which is not a promise this package can keep.

## 2. Decision

Document the limitation once in full (the API contract and `COMPONENTS.md`) and
state it in one canonical bullet on every component page whose public parts can
take native focus. Add a machine check so a new focusable component cannot ship
without it: `ComponentMeta` gains a required `focusable` boolean, and
`inventory.test.ts` holds every `focusable: true` record to the bullet.

The wording is fixed so the check is exact and the reader meets the same claim
everywhere:

```md
- Focus cues are seeded by `autoFocus`; the runtime does not reliably deliver
  React `focus`/`blur`, so a ring may not paint when focus moves by code
  (plans 390/603/605).
```

No component code changes. No new public API. No dependency.

## 3. Files to create or change

| Action | Path | What |
| ------ | ---- | ---- |
| change | `packages/components/src/inventory.ts` | `ComponentMeta.focusable: boolean`, with JSDoc |
| change | `packages/components/src/<module>.tsx` (43 meta records) | add `focusable: true` or `false` |
| change | `packages/components/docs/*.mdx` (36 focusable pages) | the canonical bullet under the limitations heading |
| change | `packages/components/src/inventory.test.ts` | a `focusable` docs-truth check |
| change | `docs/component-api.md` §5 | the full measurement and the consequence |
| change | `COMPONENTS.md` | the cross-cutting focus paragraph |
| change | `TODO.md` | tick the Interlocks row |
| change | `.agents/slop/plans/README.md` | index this plan |
| change | `PLAN.md` | D30 records `608` as the next free components number |

### 3.1 The `focusable` values

`false` only for the seven presentational families: **Avatars, Badges, Cards,
Countdown, Keyboard shortcuts, Stepper, Timeline**. Every other record is
`true` — including the composites whose action/dismiss/field parts take focus
(Alert, EmptyState, Message, MessageScroller, Toast, Form, Fieldset,
MultiStepForm).

### 3.2 The limitations heading

The existing contract (`inventory.test.ts` → "gives every implemented component
a limitations heading") accepts `## Limitations` or `## Accessibility and
limitations`. Append the bullet at the end of that section, before the next
`## ` heading. Do not create a second limitations section.

## 4. Steps

1. `src/inventory.ts`: add

   ```ts
   /** Whether a public part can take native focus, and therefore carries the
    *  runtime's focus-signal limitation (plan 608). */
   readonly focusable: boolean;
   ```

2. Add `focusable: <bool>,` after `gpuixSupport` in every `*Meta` record, using
   the §3.1 values. Each module holds exactly one record.
3. Append the canonical bullet to the limitations section of each focusable
   page. Keep the surrounding prose; only the bullet is new.
4. `docs/component-api.md` §5, after the disabled paragraph, add:

   ```md
   **A focus cue needs a focus signal.** A part seeds its `focused` state from
   `autoFocus` and follows React `focus`/`blur` afterwards. The headless
   `TestRenderer` delivers neither for `focusElement`, `focusNext` or a pointer
   focus change (plans 536, 540), and a live window's delivery is window-state
   dependent (playground plans 390, 603, 605). A ring is therefore guaranteed
   for `autoFocus`; after a programmatic or pointer focus move it appears only
   when the host sends the event. Components never fake it with a timer or a
   poll.
   ```

5. `COMPONENTS.md`, in the cross-cutting Accessibility block (after the
   `aria-disabled` paragraph), add the same claim in the ledger's voice and
   name `plan 608` and `src/inventory.test.ts`.
6. `TODO.md`: the Interlocks row becomes **resolved — plan 608**, keeping the
   measured two-state sentence.
7. Index this plan; append `608` to the D30 number history.

## 5. Test plan

Add one case to `describe("inventory")` in `src/inventory.test.ts`:

```ts
it("states the focus-signal limitation on every focusable page", () => {
  const CLAIM = "Focus cues are seeded by `autoFocus`";
  const problems = Arr.filterMap(
    Arr.filter(inventory, (meta) => meta.focusable),
    (meta) => {
      const page = readFileSync(
        fileURLToPath(new URL(meta.docs, packageRoot)),
        "utf8",
      );
      return page.includes(CLAIM)
        ? Result.failVoid
        : Result.succeed(`${meta.name}: ${meta.docs} omits the focus claim`);
    },
  );

  expect(problems).toEqual([]);
});
```

`Result` and `Arr` are already imported.

**Both directions, observed and reverted:**

1. Delete the bullet from `docs/list.mdx` → exactly
   `Lists / list items: docs/list.mdx omits the focus claim` fails. Restore.
2. Flip `cardMeta.focusable` to `true` → `Cards: docs/card.mdx omits the focus
   claim` fails (the check actually reads the flag). Restore.
3. Flip `listMeta.focusable` to `false` → the case passes while the list page
   still carries the bullet; that is expected (a non-focusable record is not
   checked) and is why the *type* is required rather than optional: every new
   record must make the judgment.

## 6. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run src/inventory.test.ts
```

Expected: the inventory suite passes (`18` cases, one more than before),
`445` unit tests across the same `44` files, and the focus-claim check green.

Then from the repository root:

```sh
nub run check-types
nub run lint
nub run fmt
nub run check
nub run lint
nub run test
```

Expected: types, format and lint report no findings; `check` and `test` exit
`0`. The native behaviour suite is not implicated by a docs-only change; run it
once only if a `.tsx` runtime file outside `inventory.ts` changed.

## 7. STOP conditions

- **STOP** if a focusable page has no limitations heading — that is a missing
  section, not a place to append; report the page rather than inventing one.
- **STOP** if the check passes on the unmodified tree: the bullet is missing
  everywhere, so a passing check means the filter is wrong.
- **STOP** if a meta record matches more than once while scripting the field;
  edit that module by hand.
- Do not add the bullet to a presentational page "for symmetry": the point is
  that the claim is true where it appears.

## 8. Acceptance

- `inventory.ts` requires `focusable`; all 43 records declare it.
- The 36 focusable pages carry the canonical bullet under their limitations
  heading; the 7 presentational pages do not.
- `docs/component-api.md` §5 and `COMPONENTS.md` state the measured behaviour
  and the two host states.
- The new inventory case fails when either the bullet or the flag is wrong, in
  both directions, verified and recorded in §9.
- `TODO.md` no longer lists the focus-signal row as open.

## 9. Measured record

| Measurement | Value |
| ----------- | ----- |
| focusable records / presentational records | `36` / `7` (43 total) |
| pages carrying the canonical bullet | `36` |
| inventory suite | `18` cases, all passing |
| unit suite | `445` tests in `44` files |
| mutation 1: remove the bullet from `docs/list.mdx` | fails: `Lists / list items: docs/list.mdx omits the focus claim` |
| mutation 2: `cardMeta.focusable = true` | fails: `Cards: docs/card.mdx omits the focus claim` |
| both mutations reverted | suite green again |
