# 334 — Search and replace: washing editable text, and the replace cursor

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §9) |
| Phase | D (Tier 4 feasibility) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `171`, `188`, `197` |
| Feeds | `COMPONENTS.md` **Search and replace**; the Tier 4 search/replace component and any editor surface that offers find. The editor/caret half is plan `333` |

## 1. Goal

Plan `171` measured the **find** half of the contract: `highlight`, `onHighlight`,
`useTextSearch`, `getPaintedHighlights`, case/whole-word/ranges and virtual-list
numbering. The Tier 4 inventory row **Search and replace** is still `todo` with
GPUix support `?`, because nobody has measured the **replace** half, and one
question decides its whole shape:

> Can a match be washed inside an **editable** field, or only in rendered text?

A find bar over a rendered document is a solved problem (`171`). A replace bar
usually lives beside an editor, and in 0.10.0 the only editor is `<input>` /
`<textarea>` — a native text editor whose text is not a retained text run. The
highlight machinery in `packages/native/src/text/search.rs` attaches to a
`HighlightSource` on runs built by the retained renderer, `<code>`, `<markdown>`
and `<diff>`; a `TextInput` is none of those. If that reasoning is right, a
replace UI **cannot** paint washes inside the editor, and must be honest about
it: a results list of context lines, or a rendered document plus an explicit
edit mode.

The probe answers that, plus the state rules a replace bar needs:

- Does a document mutation re-wash, and does `onHighlight` fire for the new
  count?
- After replacing one match, which match is the cursor on, and what does
  `activeIndex` report when the total shrinks?
- Does a replacement that **keeps the count** (e.g. `error` → `ERROR`, or
  `error` → `errors`) move the washes without any `onHighlight` event? A UI
  that rebuilds from the event would go stale.
- Do downstream matches keep correct offsets when the replacement changes
  length?
- Does replacing in `<code>` work by changing its `code` prop?
- Do the find/replace controls inside the highlighted subtree wash themselves?

## 2. Hypotheses (to be replaced by measurements in §9)

| Question | Expected | If it differs |
| -------- | -------- | ------------- |
| Wash inside `<input>`/`<textarea>` | **none** — editor text is not a text run, though `paintedText()` includes the value | STOP: never ship a replace bar that depends on editor washes; record the new evidence |
| Find field inside the highlight subtree | no self-wash (same reason) | record; the field needs a nested exclusion instead |
| Replace one → total and cursor | total −1; `active` stays at the same index, clamped to `total−1`; the painted active wash is that match | record the exact clamp |
| Replace all | total 0, no washes, `paintedText` has no query | record |
| Count-preserving replace | washes move, `onHighlight` fires **zero** more times | record; the UI must refresh from its own state, not the count event |
| Length-changing replace | downstream offsets shift by the length delta and still wash the right runs | record |
| `<code>` replace | works: a `code` prop change re-renders and re-highlights | record |

## 3. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/replace-state.ts` | **new** — pure replace/cursor rules: apply ranges right-to-left, derive the next cursor, clamp |
| `apps/playground/src/scenarios/replace-state.test.ts` | **new** — unit tests for those rules |
| `apps/playground/src/scenarios/search-replace.tsx` | **new** — the `search-replace` scenario, capability `search` |
| `apps/playground/src/scenarios/index.ts` | import + register the scenario (no capability change — it shares `search`) |
| `apps/playground/README.md` | a scenario section with the measured table and the design consequence |
| `COMPONENTS.md` | mark the **Search and replace** row `partial (probe)` and cite this plan; keep it out of `done` (the component is not built here) |
| `TODO.md` | add and tick the probe task with the check count |
| `PLAN.md` | D46 — searches wash rendered text only; a replace bar over an editor shows a context list |
| `.agents/slop/plans/README.md` | index this plan |

No change to `packages/testing`: the host already exposes `highlights`,
`paintedText`, `click`, `key`, `advance` and `bounds`, which is the whole verb
set this probe needs. No new capability literal, because the run is a second
`search` scenario and the suite aggregates per capability.

## 4. The pure module (`replace-state.ts`)

Small, total, no Effect — arithmetic over already-computed ranges:

- `replaceRanges(text, ranges, replacement)` — apply every `[start, end)` to
  `text`, **right to left**, so earlier offsets stay valid. Used by replace-all.
- `replaceRange(text, range, replacement)` — the single-match case.
- `nextCursor(totalAfter, replacedIndex)` → `Option<number>` — `None` when
  nothing is left; otherwise `min(replacedIndex, totalAfter - 1)`. This is the
  rule `useTextSearch` cannot express by itself: its controller keeps a
  *requested* index and clamps at read time, but a replace UI that moves the
  cursor explicitly has to decide what "the next match" is.
- `matchText(text, range)` — the substring a wash should carry, so a scenario
  assertion reads the same thing a user does.

Ranges come from `findRanges` (`@gpuix/react`), the JS matcher behind
`useTextSearch`, so the probe never re-implements matching. That also means the
replacement's offsets are computed from the same matcher the washes use — the
question under test is what the **runtime** does with the new document, not
whether JS can find a substring.

## 5. The scenario `search-replace`, capability `search`

View (themed, 920 wide):

1. **Find/replace bar** — `sr-query` (controlled `<input>`, `autoFocus` off),
   `sr-replace` (controlled `<input>` holding `fixed`), buttons `sr-next`,
   `sr-previous`, `sr-replace-one`, `sr-replace-all`, `sr-reset`.
2. **Rendered document** — `<div testId="sr-doc" {...search.props}>` with one
   `<text testId="sr-line-N">` per line of a `lines` state array:
   `"error error here"`, `"an error follows"`, `"no match"`, `"the last error"`.
   Four matches; the first line has two.
3. **Editor** — `<div testId="sr-editor-box" highlight={{ query: "error" }}>`
   containing a controlled `<textarea testId="sr-editor">` whose value is
   `"error in the editor"`, so a wash is attributable by its run text. A
   second, nested `<input testId="sr-editor-input">` with the same value.
4. **Code** — `<code testId="sr-code" code={code} highlight={{ query: "error" }} />`
   where `code` is state (`"const error = 1;"`), replaced by a button.
5. **Count-preserving document** — `"error ERROR error"` with a
   case-insensitive query; a `sr-uppercase` button replaces the first `error`
   with `ERROR`. Same count, same offsets, different run text.
6. **Readouts** — `sr-total` (`total=N active=M`), `sr-events`
   (`fired=N` from the `onHighlight` handler), `sr-doc-text` (the joined lines),
   `sr-code-text`.

Steps:

1. `advance(0)` after mount (the hook's count is native, as plan `171` found).
2. The document washes 4 matches; `sr-total` is `total=4 active=0`.
3. **No editor wash:** `paintedText()` contains `error in the editor`, but no
   wash's `text` contains the editor value — neither the textarea's nor the
   nested input's.
4. **No self-wash in the bar:** the find field's own value is painted and not
   washed.
5. Click `sr-next` twice → `active=2`; the active wash is the second `error` of
   line 0.
6. **Replace one:** set the replacement to `fixed`, click `sr-replace-one`; the
   line text is `error fixed here`, total 3, active 2, and the *painted* active
   wash is the `error` in `an error follows` (i.e. the match now at index 2 is
   the one after it — measured, then pinned).
7. **Replace all:** click `sr-replace-all`; total 0, zero document washes, and
   `sr-doc-text` contains none of the query.
8. **Reset, then equal-count shift:** reset; click `sr-uppercase`; total stays
   4, `sr-events` does **not** increment, the first line's painted run reads
   `ERROR`, and the washes still cover the same offsets.
9. **Length change:** reset; replace the first match with `errors` (longer by
   one); the total is unchanged (the new word still contains `error`), every
   downstream match's `start` in its line is +1 from the before-read, and the
   active wash is still index 0.
10. **Shorter:** reset; replace one match with `err`; total drops by one and the
    downstream starts shift by −2. (Steps 9/10 prove a UI cannot cache offsets.)
11. **Code:** click `sr-code-replace`; `sr-code-text` has no `error`, the code
    wash count drops by one, and the remaining code wash (if any) still paints.
12. **Exhausted cursor:** replace-all, then click `sr-next`/`sr-previous`; the
    readout stays `total=0 active=0` and nothing throws.
13. Screenshot `apps/playground/.artifacts/screenshots/search-replace.png`.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground test` | exit `0`; `replace-state.test.ts` passes |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --only search-replace` | exit `0`, every check passes |
| `nub apps/playground/dist/smoke/run.js` | `65/65`, exit `0` (suite `64 → 65`) |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 7. STOP conditions

- **STOP** if a wash *does* paint inside the `<textarea>` or `<input>`: the
  expected design (a washable editor) is now possible, but the probe's negative
  check would be wrong; record the new fact and re-scope the scenario rather
  than weakening the check.
- **STOP** if a document mutation does not change the painted washes without a
  manual scroll/reveal; record what does force it and whether a component can
  ask for it.
- **STOP** if `onHighlight` fires for a count-preserving replacement (the
  hypothesis says it must not); the readout assertion is then a different one —
  record it before changing the check.
- **STOP** if `useTextSearch`'s `active` index is not clamped after the total
  shrinks; that would need a component-side clamp, which is the pure module's
  job — record the measured value.
- **STOP** if the run exits `2` (no binding): no evidence, do not claim the row.

## 8. Test plan and two-direction proof

**Unit (`replace-state.test.ts`, 8+ tests):**

- `replaceRanges` applies two ranges right-to-left (a naive left-to-right fold
  shifts the second range and corrupts the text).
- `replaceRanges` handles a single range and an empty range list.
- `replaceRange` replaces exactly the given range and nothing else.
- `nextCursor` clamps `3` to `1` when one match remains; returns `None` at zero;
  keeps `0` at zero-after; returns the same index when the total is unchanged.
- `matchText` reads the UTF-16 slice the ranges describe.

The "left-to-right" mutation must fail the first test; a `nextCursor` that
returns the requested index unclamped must fail the clamp test.

**Native:** the scenario is the test. Two-direction proofs to record in §9:

1. Delete the `highlight` prop from `sr-doc` → step 2 fails
   (`expected 4, got 0`).
2. Change `replaceRanges` to fold left-to-right → the replace-all step fails on
   a corrupted line (`sr-doc-text`), not on a count.
3. If §9 confirms that editor text is not washed, the negative check is proven
   by putting the same `highlight` query on a `<text>` sibling: its wash exists,
   so the absence is specific to the editor, not a dead query.

## 9. Landed — measured results

Run on 2026-10-18 on this host, the locally built `darwin-x64` 0.10.0 binding
(ADR 0003). The suite also contains the companion editor/caret probe
(`replace-contract`, plan `333`), so the totals below are for the pair.

| Command | Result |
| ------- | ------ |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground test` | 13 files / **101 tests** (`replace-state.test.ts` has 9) |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --only search-replace` | exit `0`, **50 checks** |
| `nub apps/playground/dist/smoke/run.js --only replace-contract` | exit `0`, 15 checks |
| `nub apps/playground/dist/smoke/run.js` | `66/66`, exit `0` (two consecutive full runs) |
| `nub apps/playground/dist/live/run.js` | `20/20`, exit `0` |

Measured in the scenario:

- **An editor's text is painted but never washed.** Both the textarea's value
  (`error in the editor`) and the input's (`error in an input`) reach
  `paintedText()`, while a `<text>` sibling under the *same* `highlight`
  declaration washes once. The negative is specific to the editor, not a dead
  query; the find bar's own query field washes nothing either.
- **The document re-washes after a mutation, and `onHighlight` recounts.** Five
  matches before, four after one replacement; the active cursor stayed at index
  `2`, which is now the match that followed the replaced one (`the last error`).
- **Replace-all clears the paints and the count.** `total=0`, zero document
  washes, and `next`/`previous` stay at `0` without throwing.
- **A count-preserving replacement fires no count event.** `error` → `ERROR`
  keeps `total=5`; the `sr-events` readout is unchanged, while the first line's
  washed runs become `ERROR,error`. A UI that rebuilds from `onHighlight` alone
  would show stale positions.
- **Length changes shift downstream matches exactly.** `error` → `errors`
  keeps five matches and moves the line's second match from `start 6` to `7`;
  `error` → `err` drops to four and moves the survivor to `start 4`.
- **`<code>` re-highlights by prop.** Replacing the `code` source removes both
  washes; no manual highlight call is needed.
- **The fold order is load-bearing.** Replace-all with `err` rewrites every
  match exactly once: `err err here|an err follows|no match|the last err|another
  err closes`.

### Two-direction proofs

1. Removing `{...search.props}` from `sr-doc` fails `--only search-replace` at
   `the find bar counts every document match: expected "total=5", got
   "total=0 active=0"`, exit `1`.
2. Folding `replaceRanges` left-to-right fails **two unit tests**
   (`applies every range right to left`, `handles a length-changing replacement
   without corrupting later ranges`) and the native check with the corrupted
   document:
   `got "err ererrere|an erroerrlows|no match|the last error|errer error
   clerr"`, exit `1`. Reverted, the suite is green again.

### Notes for the component owner

- Build the replace bar around a **rendered document** (one `<text>` per line)
  or a **context list**; do not promise washes inside `<textarea>`/`<input>`.
- Apply ranges **right to left**; recompute the ranges from the new document
  after every replacement — never cache offsets.
- Refresh the find bar from the component's own state, not from `onHighlight`:
  the event only reports a *count change*.
- The find cursor's rule is `nextCursor(totalAfter, replacedIndex)` — clamp to
  the new last match, `None` when nothing remains.
- The caret is lost after a programmatic rewrite (plan `333`), and there is no
  `setSelection`; treat commit-and-reopen, not in-place editing, as the honest
  interaction.

