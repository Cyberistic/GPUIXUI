# Plan 670 — Every executed example is linked from a consumer document

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/examples.test.ts`, `docs/tokens.md`, `TODO.md`,
> `.agents/slop/plans/README.md`. No source, API, token, colour, pair, floor or
> metric changes.

## Execution record (2026-10-19)

- Before the catalogue edits, `examples.test.ts` reported exactly the thirteen
  files listed in *Why*, so the guard reads the real documents.
- After the twelve insertions the suite returns `[]`; 42 examples still run.
- `nub exec vitest run src/examples.test.ts src/docs-links.test.ts
  src/docs.test.ts src/snippets.test.ts` → **4 files / 233 tests passed**.
- No source or token value changed.

## Why

Plan `350` states the package's convention: an `*.example.ts` file is a
*runnable, copyable* example, so a suite must import it **and** a document must
link it. That plan fixed `primary-text.example.ts` and added a guard for the
first half only. The second half was never guarded, and thirteen examples are
linked from none of the three consumer documents:

```
accent-states.example.ts
control-padding.example.ts
disabled-wash.example.ts
filled-control.example.ts
font-weights.example.ts
inline-avatar.example.ts
inline-icon.example.ts
motion-levels.example.ts
native-highlight.example.ts
persisted-choices.example.ts
scale-indexes.example.ts
selection-press.example.ts
status-panel.example.ts
```

The audit method (2026-10-19, this branch): collect every Markdown link target
ending `.example.ts` from `docs/tokens.md`, `docs/design-system.md` and
`packages/tokens/README.md`, then compare its basename with
`readdirSync(src)`'s `*.example.ts` list. 29 of the 42 files are linked; these 13
are not. `examples.test.ts` reads only the test files, so no gate notices.

An example a consumer cannot find is documentation that exists but is not
reachable: the failure is silent, because the snippet runs in CI while the
reference never points at it. Plan `350` named exactly this half — "with no test
importing it and no document linking it" — and the guard it shipped only enforced
the import.

No token value, pair, floor, metric or published API changes.

## Scope

- Link the thirteen examples from the catalogue section each belongs to.
- Guard both directions: every example is linked from a consumer document, and
  every example link names a file that exists.
- Keep the guard beside the existing runnable-example case in
  `examples.test.ts`.

Out of scope: a generated examples index page, rewriting the 29 existing links,
and any change to `docs/design-system.md` or the README (they already link what
they need; the guard accepts any of the three documents).

## Files

| File | Change |
| ---- | ------ |
| `docs/tokens.md` | twelve insertion points linking the thirteen examples. |
| `packages/tokens/src/examples.test.ts` | read the three consumer documents; add the two coverage cases and update the header. |
| `TODO.md` | tick the row for this plan. |
| `.agents/slop/plans/README.md` | index this plan. |

## Exact edits

### 1. `docs/tokens.md` — twelve insertion points

Each insertion is one sentence. Do not restate a figure, a count or a plan
number: the prose already carries them.

**(a) `accent-states`** — after the paragraph ending
"contract covers `accent`, `accentHover` and `accentActive` as well." add:

```
A runnable example of the three paints is
[`src/accent-states.example.ts`](../packages/tokens/src/accent-states.example.ts).
```

**(b) `control-padding`** — at the end of the numeric-metric paragraph that ends
"and recipe passes, so the check moves no value; it guards the next edit."
(before "`metricGroups` is the ordered index") add:

```
A runnable example of a flush control inset is
[`src/control-padding.example.ts`](../packages/tokens/src/control-padding.example.ts).
```

**(c) `disabled-wash`** — in the text-selection section, after the paragraph
ending "Every shipped set already clears the floor, so no colour moves." (the
one about `selectionWashPairs` and the `disabled` fill, immediately before
"Every exported pair list is held to content uniqueness") add:

```
A runnable example of the wash that matches the disabled fill is
[`src/disabled-wash.example.ts`](../packages/tokens/src/disabled-wash.example.ts).
```

**(d) `filled-control`** — after the paragraph ending
"steps, and the alpha composition fails it." add:

```
A runnable example of the three paints is
[`src/filled-control.example.ts`](../packages/tokens/src/filled-control.example.ts).
```

**(e) `font-weights`** — after the paragraph ending
"roles, not a second list. A brand may still name any weight in `1…1000`." add:

```
The manifest a bundler loads is
[`src/font-weights.example.ts`](../packages/tokens/src/font-weights.example.ts).
```

**(f) `inline-icon` and `inline-avatar`** — after the paragraph ending
"profile header; they are not row marks." add one sentence for both:

```
Runnable examples of the two bounds are
[`src/inline-icon.example.ts`](../packages/tokens/src/inline-icon.example.ts) and
[`src/inline-avatar.example.ts`](../packages/tokens/src/inline-avatar.example.ts).
```

**(g) `motion-levels`** — replace

```
A runnable example lives in
[`src/motion.example.ts`](../packages/tokens/src/motion.example.ts).
```

with

```
Runnable examples live in
[`src/motion.example.ts`](../packages/tokens/src/motion.example.ts) and
[`src/motion-levels.example.ts`](../packages/tokens/src/motion-levels.example.ts).
```

**(h) `native-highlight`** — in *Find highlighting*, replace

```
A runnable example lives in
[`src/native-text.example.ts`](../packages/tokens/src/native-text.example.ts).
```

with

```
Runnable examples live in
[`src/native-text.example.ts`](../packages/tokens/src/native-text.example.ts) and
[`src/native-highlight.example.ts`](../packages/tokens/src/native-highlight.example.ts).
```

**(i) `persisted-choices`** — after "The executed example is
[`src/theme-choice.example.ts`](../packages/tokens/src/theme-choice.example.ts)."
add:

```
The guards a stored row relies on are exercised in
[`src/persisted-choices.example.ts`](../packages/tokens/src/persisted-choices.example.ts).
```

**(j) `scale-indexes`** — in *For documentation sites*, after the paragraph
ending "so a value table cannot silently omit it." add:

```
A runnable table builder is
[`src/scale-indexes.example.ts`](../packages/tokens/src/scale-indexes.example.ts).
```

**(k) `selection-press`** — after the selection example sentence
"A runnable example lives in
[`src/selection.example.ts`](../packages/tokens/src/selection.example.ts)."
add:

```
The press a selected row derives from the same wash is
[`src/selection-press.example.ts`](../packages/tokens/src/selection-press.example.ts).
```

**(l) `status-panel`** — at the end of *An action inside a status panel*, after
"§ [Limitations](#limitations-and-future-work) states the measurement." add:

```
A runnable example of the panel's text roles is
[`src/status-panel.example.ts`](../packages/tokens/src/status-panel.example.ts).
```

Every target is relative to `docs/`; `docs-links.test.ts` already resolves each
one, so a typo fails that suite as well.

### 2. `packages/tokens/src/examples.test.ts`

Update the header comment's last sentence to include the second half:

```
 * a suite must import it, and a consumer document must link it.
```

Add above the first `describe`:

```ts
const documents = [
  new URL("../../../docs/tokens.md", src),
  new URL("../../../docs/design-system.md", src),
  new URL("../README.md", src),
].map((url) => readFileSync(url, "utf8"));

/**
 * Every example link target in the three consumer documents, reduced to its
 * file name. The catalogue links from `docs/` (`../packages/tokens/src/…`), the
 * README from the package root (`./src/…`).
 */
const linkedExamples = [
  ...documents.join("\n").matchAll(
    /\]\((?:\.\.\/packages\/tokens\/src|\.\/src)\/([^)/]+\.example\.ts)\)/g,
  ),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
```

Add two cases to the existing `describe("runnable examples", …)`:

```ts
  it("links every example from a consumer document", () => {
    const unlinked = exampleFiles.filter(
      (file) => !linkedExamples.includes(file),
    );
    expect(unlinked).toEqual([]);
  });

  it("links no example that is not a source file", () => {
    const stale = linkedExamples.filter(
      (file) => !exampleFiles.includes(file),
    );
    expect([...new Set(stale)]).toEqual([]);
  });
```

The first case fails today on the thirteen files above. The second keeps a
renamed or deleted example from leaving a dead link (it complements
`docs-links.test.ts`, which resolves the target rather than the set).

### 3. `TODO.md`

Add this completed row after the plan-669 row:

```
`[x]` Link every executed example from a consumer document — plan 350 fixed
`primary-text.example.ts` for having "no test importing it and no document
linking it", but its guard enforced only the import, so thirteen examples
(`accent-states`, `control-padding`, `disabled-wash`, `filled-control`,
`font-weights`, `inline-avatar`, `inline-icon`, `motion-levels`,
`native-highlight`, `persisted-choices`, `scale-indexes`, `selection-press`,
`status-panel`) were linked from neither the catalogue, the design system nor the
README; each now sits in the section it belongs to, and `examples.test.ts` fails
on an unlinked example or a link with no file (plan 670)
```

### 4. `.agents/slop/plans/README.md`

Add one row after `669`:

```
| [670](./670-example-links.md) | Every executed example is linked from a consumer document | F | 350, 355, 356, 616, 668 | done |
```

Add one sentence to the prose paragraph after the plan-669 sentence.

## Commands, in order

Before the docs edits, prove the guard can fail:

```sh
cd packages/tokens
nub exec vitest run src/examples.test.ts
```

Expected: **2 passed, 1 failed** — the new link case reports exactly the
thirteen files above; the stale-link case passes. If the link case passes before
the edits, the regex is not reading the documents — **STOP**.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/examples.test.ts src/docs-links.test.ts src/docs.test.ts src/snippets.test.ts
nub run check-types
```

Expected: all green, and the example count remains 42.

Then the repository gates:

```sh
cd ../..
nub run check
nub run lint
nub run test
```

## STOP conditions

- The link case does not fail before the edits: **STOP**; the document paths or
  the regex are wrong.
- An insertion anchor is not found verbatim: read the current section and adapt
  the sentence, but keep the link target and do not restate a figure.
- `docs-links.test.ts` reports a target missing: the link path is wrong; fix it
  in the catalogue, do not relax the suite.
- More or fewer than thirteen files are reported missing: re-run the audit in
  *Why* and report the difference before editing; a file may have been added or
  linked since this plan was written.
- Any source, token, colour, pair, floor or metric changes: **STOP**. This plan
  is documentation plus its guard.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | `examples.test.ts` lists the thirteen unlinked files before the catalogue edits. |
| Passes with the fix | The same suite returns `[]` after all thirteen are linked. |
| Cannot pass by deleting the guard | The two cases derive their expectation from `readdirSync(src)` and the documents; a new example with no link fails the first, a link to a missing file fails the second. |
| Cannot pass by linking from the test only | The case reads `docs/tokens.md`, `docs/design-system.md` and the README — the files a consumer opens — not a fixture. |
| Target truth | `docs-links.test.ts` already resolves every relative link in the catalogue from `docs/`, so a typo in a new target fails it. |

## Acceptance

- [x] All thirteen examples are linked from the catalogue section that explains
      them.
- [x] `examples.test.ts` fails on the pre-edit catalogue and passes after it,
      and has a stale-link case.
- [x] No source or token value changes; 42 examples still run.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.
- [x] Plan indexed in `.agents/slop/plans/README.md`; `TODO.md` row ticked.
