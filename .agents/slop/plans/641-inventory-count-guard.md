# 641 — the inventory's suite counts must be true, and guarded

**Phase:** F (documentation truth)
**Owner:** primitives workstream (`packages/primitives`, the Tier 1 inventory rows)
**Depends on:** 588 (the README count guard), 608 (the composed-app ledger guard),
640 (this workstream's latest runtime file)

## 0. The defect

Plan `588` established the rule for a count that only a full run can know: state
the **file** count (which a test can prove), never the test count. It enforced
that on the package README only. `COMPONENTS.md` makes the same claim in two
places and was **not** guarded:

```
… the whole runtime suite — **57 files / 797 tests** — passes after …
(**57 files / 797 tests, all passing on the store's release-tag build**; …
```

Measured 2026-10-19 before plan `640`: the real suite was **57 files / 799
tests**, so “797” was stale by two, silently — exactly the failure plan `588`
removed from the README. Plan `640` added `runtime/selection-mark.runtime.test.tsx`
(58 files / 805 tests), which would have made the same passage stale again.

This is not a behavioural bug; it is the ledger lying about its own evidence,
which the mission treats as a release defect (“never claim a test passed unless
it ran”). The historical sentences (“734 tests at plan 598; …”) are a record of
past runs and stay: they are specific to a plan, not a current claim.

## 1. Files to change

### 1.1 `packages/primitives/src/docs-counts.test.ts`

The scan already grows the offline/runtime file lists. Extend it to read the
repo-root `COMPONENTS.md` (`path.join(packageRoot, "..", "..", "COMPONENTS.md")`)
and return its text with the existing counts.

Add one `it`:

```ts
it("states the real runtime file count in the inventory, and no test count", async () => {
  const result = await Effect.runPromise(scan);
  const claims = [
    /the whole runtime suite — \*\*([^*]+)\*\*/,
    /\*\*([^*]+), all passing/,
  ];
  for (const pattern of claims) {
    // both current-run passages must exist …
    expect(result.inventory.match(pattern)?.[1], `COMPONENTS.md: ${pattern}`)
      .toBe(`${result.runtimeCount} files`);
  }
});
```

Both passages must match **exactly** `${count} files`: a reintroduced
`/ 805 tests` makes the captured group differ and fails by value. Keep the
iteration out of the test: use `Arr.map`/`Arr.forEach` or two explicit asserts
(the repo forbids imperative loops in domain code; tests follow the same rule
where practical). Prefer two explicit assertions with distinct messages — a
weaker executor can then see which passage drifted.

Update the file's header comment: it now guards the README **and** the
inventory, and names plan `641`.

### 1.2 No source change

`COMPONENTS.md` is already corrected by plan `640` (58 files, no test count).
This plan only makes the claim enforceable.

## 2. Test plan — why it can fail

| Direction | Change | Expectation |
| --------- | ------ | ----------- |
| stale file count | edit one passage to `57 files` | fails naming that passage |
| numeric count returns | `**58 files / 805 tests**` | fails: group is `58 files / 805 tests` |
| passage removed | delete “all passing” | fails: `undefined` |
| correct text | no edit | passes |

Record the first three outcomes in §5.

## 3. Commands

```sh
nub exec vitest run src/docs-counts.test.ts     # in packages/primitives/
nub run --filter @gpuixui/primitives test
nub run check && nub run lint && nub run test
```

## 4. STOP conditions

Stop if:

- the guard would need to parse the **historical** measurement sentences — they
  are true as history and must not be normalised;
- `COMPONENTS.md` cannot be read from the package test (a path problem): report
  it instead of copying the file into the package;
- another workstream is mid-edit in `COMPONENTS.md` in a way this worktree
  cannot resolve — record the conflict and stop, never overwrite their rows.

## 5. Acceptance and result

- [ ] one new case, proven to fail in three directions and pass on the current
      text;
- [ ] the test header names README **and** inventory, and plan `641`;
- [ ] package offline suite green; `check`/`lint`/`test` green;
- [ ] plan indexed, `TODO.md` row ticked, commit pushed.

### Result

Measured 2026-10-19 in this worktree.

- Green on the current text: `src/docs-counts.test.ts` **5/5**.
- Failure direction 1 — first passage reverted to `57 files`:
  `expected '57 files' to be '58 files'` (`states the real runtime file count in the inventory`).
- Failure direction 2 — second passage rewritten as `58 files / 805 tests`:
  `expected '58 files / 805 tests' to be '58 files'` (`states no current test count in the inventory`).
- Failure direction 3 — `, all passing` removed:
  `expected undefined to be '58 files'`.
- The file was restored to its committed text after each mutation (`git diff` clean).
- Package offline suite and `check`/`lint`/`test` green.
