# Plan 326 — The contract's surface counts and pair history

**Workstream:** `tokens-theme`
**Phase:** F (docs truth)
**Depends on:** 086 (completeness guard), 306/307 (the inactive list grew), 325
(the invalid field edge)
**Status:** ready

## 1. Why

`docs/tokens.md` is the reference: "if a token is not here, it is not public."
Two sentences in it describe the contrast contract's *size* and are now false.

1. **The inactive list.** Line 1573 says `inactivePairs` is "the nine-surface
   inactive list". Plan 306 shipped nine surfaces; plan 307 added the four soft
   status fills, so `inactivePairs` / `inactiveSurfaces` have been **thirteen**
   entries since then. The same page states thirteen correctly at line 1174, so
   the document contradicts itself. `contrast.test.ts` asserts
   `inactivePairs.length === 13`; no test reads the prose sentence, which is why
   the split survived.

2. **The pair-count history.** The long `## Verification` paragraph narrates the
   contract's growth ("These seven pairs take `contrastPairs` from 232 to
   239 … taking it from 261 to **262**"). Plan 325 added the invalid field edge
   and the list is **264**, so the history ends two pairs short of the number
   `COMPONENTS.md` and `contrast.test.ts` both state. A reader following the
   page's own arithmetic arrives at a size the package no longer ships.

Neither is a palette defect: no colour, role, pair or floor changes. Both are
the failure mode plans 303/313 fixed in the ledger — a hand-written count beside
an implementation that grew — and both are unguarded.

A third, smaller drift is in the same paragraph: "the ones plans `076`–`099`
closed" names an audit series that has continued through plan `325`. It is a
current-tense claim about the contract's history, so it moves with the history.

## 2. What changes

### 2.1 `packages/tokens/src/docs.test.ts` — the guard first

Add the imports the case needs from `./contrast.js`:

```ts
  inactivePairs,
  inactiveSurfaces,
  selectionSurfaces,
  softBorderSurfacePairs,
```

Add one describe block after the `docs/tokens.md` role-count block (around line
143):

```ts
describe("docs/tokens.md contract counts", () => {
  it("states the surface counts of the nested pair lists", () => {
    const prose = markdown.replace(/\s+/g, " ");

    expect(inactivePairs).toHaveLength(inactiveSurfaces.length);
    expect(prose).toContain(
      `on all ${selectionSurfaces.length} surfaces`,
    );
    expect(prose).toContain(
      `the ${inactiveSurfaces.length}-surface inactive list`,
    );
    expect(prose).not.toContain("nine-surface inactive list");
    expect(prose).toContain(
      `the ${softBorderSurfacePairs.length / statusTones.length}-surface chip edge`,
    );
  });

  it("ends the pair-count history at the contract's shipped size", () => {
    const prose = markdown.replace(/\s+/g, " ");
    expect(prose).toContain(
      `taking it from 262 to **${contrastPairs.length}**`,
    );
  });

  it("names the audit series through the latest plan", () => {
    const prose = markdown.replace(/\s+/g, " ");
    expect(prose).toContain("plans `076`–`325` closed");
  });
});
```

`markdown` is the existing module-level read of `docs/tokens.md`; the whitespace
normalisation is required because the prose wraps lines mid-sentence.

### 2.2 `docs/tokens.md` — the two corrections

- In `## Verification`, after the plan `322` sentence, append:

  ```md
  Plan `325` adds the invalid field edge (`destructive` on the `input` fill and
  on the `background` canvas a transparent field paints), taking it from 262 to
  **264**.
  ```

- In the "Every colour role is accounted for" paragraph, change
  "`inactivePairs` is the nine-surface inactive list" to
  "`inactivePairs` is the thirteen-surface inactive list".

- In the same paragraph, change "plans `076`–`099` closed" to
  "plans `076`–`325` closed".

No numeric claim in `docs/design-system.md`, `COMPONENTS.md` or the package
README changes: they already state 264, thirteen surfaces or no count.

### 2.3 `TODO.md` and the plan index

- Add and tick under "Design tokens and theming": "Hold the contract's own
  counts — `docs/tokens.md` still called `inactivePairs` the nine-surface list
  after plan 307 made it thirteen, and its pair-count history ended at 262 while
  plan 325 shipped 264; the prose now derives both from the lists and the audit
  range names the latest plan (plan 326)."
- Re-count the subsection and move the progress bar from `93/122` to `94/123`.
- Add plan 326 to `.agents/slop/plans/README.md` after 325, status `done`, and
  append the commentary paragraph.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 53 files / 3241 tests. Stop if red.

2. Add only the guard from §2.1, then:
   ```sh
   cd packages/tokens && nub exec vitest run src/docs.test.ts
   ```
   Expected: the three new cases FAIL — the page has no
   "thirteen-surface inactive list", no "262 to 264" step and no "076–325"
   range. Record the output; this is the proof the guard can fail.

3. Apply §2.2. Re-run the same command:
   ```sh
   cd packages/tokens && nub exec vitest run src/docs.test.ts
   ```
   Expected: PASS.

4. Full gates:
   ```sh
   nub run --filter @gpuixui/tokens test
   nub run check
   nub run lint
   nub run fmt
   nub run test
   ```
   Expected: all green; 53 files, 3244 tests (3 new cases).

## 4. STOP conditions

Stop and report instead of improvising if:

- the guard fails because `inactivePairs` is **not** thirteen — that is an
  implementation change since plan 307; re-read `contrast.ts` before editing
  prose;
- `contrastPairs.length` is not 264 — another pair has landed on the branch;
  derive the new sentence from the value but report the discrepancy first;
- the phrase `plans \`076\`–\`325\`` already appears elsewhere in a different
  sense — then narrow the guard to the exact sentence;
- `docs.test.ts` already fails for an unrelated reason.

## 5. Acceptance

- `docs/tokens.md` states thirteen inactive surfaces and ends its pair-count
  history at `contrastPairs.length`.
- `docs.test.ts` fails without those edits and passes with them, and its guards
  derive the numbers from the exported lists rather than hard-coding them.
- No token, colour, pair, floor, theme or public export changes.
- `TODO.md`, the plan index and the progress bar are current.
- `nub run check`, `nub run lint` and `nub run test` pass.
