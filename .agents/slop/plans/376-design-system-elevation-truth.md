# Plan 376 — the elevation paragraph the scrim contract outgrew

**Workstream:** `tokens-theme` · **Phase:** F (integration and polish) ·
**Depends on:** 315, 326, 337, 345, 352, 359, 375 · **Status:** done when every
step below has been run.

## 1. The defect

`docs/design-system.md` §7 (radii, borders and elevation) describes the modal
scrim as measured "on the **six** surfaces it covers — `background`, `card`, the
`muted` panel, the `input` fill a form paints, the persistent `selected` fill a
table or list keeps and `popover`".

Plan 375 grew `overlaySurfaces` from six to fourteen — adding the four resting
filled actions (`primary`, `secondary`, `accent`, `destructive`) and the four
soft status panels (`infoSoft`, `successSoft`, `warningSoft`,
`destructiveSoft`) — and updated `docs/tokens.md`, the §9 accessibility table
row and the §9 prose. It did not update §7, so the same page now states **six**
in its rationale and **fourteen** in its floor table and explanatory paragraph.
`docs.test.ts` holds the §9 table row to `overlaySurfaces`, but no test reads
§7's clause, so the contradiction ships green.

The same paragraph carries a second stale claim: "the runtime paints one shadow
per element — no `inset`, no shadow list — so a level **is exactly one shadow**".
`Elevation` is `ElevationShape[]`, a shipped level carries at most one entry,
and `elevationShadows(theme, level)` resolves the whole list for a web renderer.
`docs/tokens.md` states this correctly ("A level is a list so a web renderer can
composite several shadows; a shipped level carries at most one entry"), as does
`elevation.ts`'s JSDoc. The design-system page therefore contradicts the public
type and the reference page.

A third sentence in the same clause, "The transient pointer washes are the one
exclusion", is one class short: the filled families' `xHover`/`xActive` steps are
also excluded (`overlay-scrim.test.ts` header, `docs/tokens.md` §scrim), so a
reader cannot tell whether a scrim over a pressed filled control is supported.

## 2. Evidence

- `packages/tokens/src/contrast.ts` — `overlaySurfaces` has fourteen entries:
  `background`, `card`, `muted`, `input`, `selected`, `popover`, `primary`,
  `secondary`, `accent`, `destructive`, `infoSoft`, `successSoft`,
  `warningSoft`, `destructiveSoft`.
- `docs/design-system.md` §7 says "the six surfaces it covers" and lists six.
- `docs/design-system.md` §9 table row says "overlay composited over
  `background`/`card`/`muted`/`input`/`selected`/`popover`, the four resting
  filled actions … and the four soft status panels …", and the paragraph below
  says "the fourteen surfaces a dialog covers".
- `docs/tokens.md` (scrim section) names all fourteen and states the transient
  exclusion for both the washes and the filled steps.
- `docs/design-system.md` §7 says "a level is exactly one shadow";
  `elevation.ts` says a level is a list and the shipped level carries at most one
  entry; `docs/tokens.md` says the same and documents `elevationShadows`.

No token value, pair or floor is wrong. This is a truth/guard plan: the page and
the contract disagree, and nothing catches it.

## 3. Decision

Correct §7 to the contract and the public type, and guard the paragraph so the
next contract growth cannot leave it behind:

1. The scrim clause names all fourteen surfaces, grouped as the four base
   surfaces, the `input` fill, the persistent `selected` fill, the four resting
   filled actions and the four soft status panels — the same grouping
   `docs/tokens.md` uses.
2. The exclusion sentence names the transient pointer **states**: `hover`,
   `active` and the filled families' `xHover`/`xActive` steps.
3. The elevation sentence describes the type truthfully: a level is a list a web
   renderer can composite, a shipped level carries at most one entry, and the
   entry the runtime paints is read with `elevationShadow` (`elevationShadows`
   resolves the list).

Rejected alternatives:

- **Reverting `overlaySurfaces` to six** would re-open the defect plan 375
  fixed; a dialog does cover filled actions and status panels.
- **Leaving §7 as prose with the count removed** ("the surfaces it covers")
  would hide the contradiction rather than fix it, and would remove the exact
  list a reader needs to audit a copied theme. The count and the members are
  derivable, so the guard can derive them too.
- **Duplicating the surface list in a test literal** would let the test and the
  contract drift together; the guard must read `overlaySurfaces`.

## 4. Files to change

1. `packages/tokens/src/docs.test.ts`
   - Import `overlaySurfaces` from `./contrast.js` (it is not imported today).
   - Hoist `countWords` / `countWord` from the `docs/tokens.md contract counts`
     describe block to module scope, so the new design-system case uses the same
     derived word. Add `"fourteen"` to the array (the list currently stops at
     `"thirteen"`; index 14 would otherwise fall back to digits).
   - Add a `describe("docs/design-system.md elevation paragraph", …)` with two
     cases, built on the already-collapsed `designSystem` string:
     - `"names every surface the modal scrim covers"`: slice from
       `"The scrim is held"` to `"darker backdrop."`; assert it contains
       `the ${countWord(overlaySurfaces.length)} surfaces it covers`; for every
       member of `overlaySurfaces`, assert the clause contains `` `member` ``;
       assert it does not contain `six surfaces`.
     - `"describes a level as the list the helpers read"`: slice from
       `"Elevation is a semantic level"` to `"Motion is a scale beside
       elevation"`; assert it contains `` `elevationShadows` `` and
       `at most one entry`, and does not contain `exactly one shadow`.
   - The slice helper must fail loudly (`expect(start).toBeGreaterThanOrEqual(0)`)
     so a renamed paragraph is reported instead of silently matching "".
2. `docs/design-system.md` §7 — replace the elevation/scrim paragraph with:

   ```md
   Elevation is a semantic level, not a literal shadow: `sm` for resting cards,
   `md` for menus and popovers, `lg` for dialogs and the command palette. The
   runtime paints one shadow per element — no `inset` and no shadow list — so a
   level is a list a web renderer can composite, a shipped level carries at most
   one entry, and the entry the runtime paints is read with
   `elevationShadow(theme, level)` (`elevationShadows` resolves the whole list).
   A level is geometry plus an alpha; the tint is the single `shadow` role, so a
   brand retints every level by editing one value. Overlay layering uses the
   `overlay` scrim colour, a translucent wash a Dialog paints across the window.
   The scrim is held to the same 1.05:1 perceivability floor as every other
   painted value, on the fourteen surfaces it covers — the four base surfaces
   (`background`, `card`, `muted`, `popover`), the `input` fill a form paints,
   the persistent `selected` fill a table or list keeps, the four resting filled
   actions (`primary`, `secondary`, `accent`, `destructive`) and the four soft
   status panels (`infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`) —
   because a scrim that composites to the surface beneath it is an invisible
   modal backdrop. The transient pointer states are the exclusion: `hover`,
   `active` and the filled families' `xHover`/`xActive` steps are gone by the
   time the pointer reaches the dialog, so a scrim over one is not a composition
   the system supports. On the high-contrast dark theme's pure black canvas a
   dark veil cannot darken anything, so that theme veils with light: the modal is
   separated by a light wash, its own edge and elevation instead of a darker
   backdrop.
   ```

   Keep the following `elevation.overlay` paragraph unchanged.
3. `TODO.md` — add a row under the `tokens-theme` block and tick it:
   "Hold the design-system's elevation paragraph to the contract — §7 still said
   the scrim covers six surfaces after plan 375 grew it to fourteen, and called a
   level 'exactly one shadow' while `Elevation` is a list and
   `elevationShadows` resolves it; §7 is now guarded against `overlaySurfaces`
   and the two helpers (plan 376)". Update the block's progress bar from
   `143/195` to `144/196` and keep the filled-block art proportional.
4. `.agents/slop/plans/README.md`
   - Add a row to the `tokens-theme` table after plan 375:
     `| [376](./376-design-system-elevation-truth.md) | The design-system's
     elevation paragraph | F | 315, 326, 337, 345, 352, 359, 375 | done |`
   - Append a summary paragraph after the plan 375 paragraph (the file's
     narrative ends with 375 before the `### Reference adoption` heading):
     the paragraph states the §7 defect, both stale claims, the derived guard,
     and that no token, colour, pair or floor moves.
5. `COMPONENTS.md` — no change: the `Design tokens` row already says the design
   system page is held by `docs.test.ts`, and no count in the row changes.

## 5. Exact commands and expected results

Run from the worktree root, in this order.

Step 0 — prove the guard can fail. Write the two new cases **before** editing
`docs/design-system.md`, then:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: FAIL in `docs.test.ts` — "names every surface…" fails on
`the fourteen surfaces it covers` and on `input`/`primary`/… (the paragraph has
six), and "describes a level…" fails on `elevationShadows` and
`at most one entry`. Every other suite passes. Record the exact failure text in
the commit message body.

Step 1 — edit `docs/design-system.md` §7 as in §4.2. Then:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: PASS. `docs.test.ts` now holds §7's clause to `overlaySurfaces` in both
directions (every member named) and the count word to
`overlaySurfaces.length` (14 → "fourteen").

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0, no output.

Step 2 — the completion gate:

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. `check:tests` must accept the new cases (they assert
derived values against real prose, not literals), and `docs.test.ts`,
`readme.test.ts` and `inventory.test.ts` must pass against the updated prose.

Step 3 — commit and push:

```sh
git add .agents/slop/plans/376-design-system-elevation-truth.md \
        .agents/slop/plans/README.md TODO.md
git commit -m "docs(plans): plan 376 — the design-system's elevation paragraph"

git add packages/tokens/src/docs.test.ts docs/design-system.md
git commit -m "docs(design-system): hold the elevation paragraph to the scrim contract"

git push origin agent/tokens-theme
```

(If the repository's remote requires it, push with the branch name exactly as
above; never push `main`/`master`.)

## 6. Test plan (write these before the fix and watch them fail)

| Test | What it catches | Without the fix |
| ---- | --------------- | --------------- |
| `names every surface the modal scrim covers` | §7 omitting a scrim surface (this defect) or stating a stale count | fails: clause says six, `input`/`primary`/soft fill names are absent |
| same case, per-surface loop | a future `overlaySurfaces` growth leaving §7 behind | would fail for the new surface |
| `describes a level as the list the helpers read` | §7 calling a level "exactly one shadow" and hiding `elevationShadows` | fails: the paragraph has neither phrase |
| existing §9 table-row guard | the table and the contract drifting apart | must keep passing |
| existing `overlay-scrim.test.ts` suite | the 099/359/375 scrim regressions | must keep passing |

Both directions must be observed: run the new cases on the pre-fix document and
confirm they fail with the messages above, then apply the fix and confirm green.
No colour, token, pair or floor changes, so `color.test.ts`,
`contrast.test.ts`, `overlay-scrim.test.ts` and every platform/recipe suite
must be unchanged and green.

## 7. STOP conditions

- A new test cannot locate the paragraph (the slice is empty): stop and report
  the heading/paragraph text. Do not weaken the slice to match nothing.
- The §7 rewrite makes any existing `docs.test.ts` assertion fail that is not
  one of the two new cases: read the assertion and fix the prose. Do not delete
  or loosen the guard.
- `overlaySurfaces` does not contain fourteen entries or an entry is not a
  `ThemeColors` role: stop and report; the plan assumes plan 375's list.
- A colour, pair, floor, metric or theme value would have to move: stop. This
  plan changes documentation and tests only.

## 8. Acceptance

- §7 names all fourteen scrim surfaces and the transient pointer states that are
  excluded, and describes a level as a list with at most one shipped entry read
  through `elevationShadow`/`elevationShadows`.
- `docs.test.ts` holds §7's surface list to `overlaySurfaces` (members and count)
  and the level description to the two helpers, with cases that fail on the
  pre-fix document.
- No token value, colour role, pair, floor, metric, platform style or recipe
  changes; every shipped check still returns `[]`.
- `TODO.md` ticks the row and its progress bar is current; the plan index lists
  plan 376 and summarises it; the work is committed on `agent/tokens-theme` and
  pushed.
