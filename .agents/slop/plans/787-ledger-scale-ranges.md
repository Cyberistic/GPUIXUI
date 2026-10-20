# Plan 787 — the ledger's scale ranges have no owner, and two are wrong

**Workstream:** `tokens-theme`. **Phase:** F (truth maintenance).
**Depends on:** 054 (the avatar scale), 062/303/313/664 (the ledger guards),
725 (the density/avatar ladder summary), 766/767 (the last ledger counts).
**Owns:** `COMPONENTS.md`, `packages/tokens/src/inventory.test.ts`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The defect

`COMPONENTS.md`'s **Design tokens** row closes with a parenthetical that states
four shipped scale ranges:

```
every shipped value already holds (spacing 2…64, avatars 16…40,
controls 24/28/32 → 32/36/40, rows 28 → 32 → 36)
```

Two are right; two are not. **`avatars 16…40` is wrong**: `avatarSize` has
shipped `20 / 26 / 32 / 40` since plan 054
(`packages/tokens/src/scale.ts:157`), and so does `docs/design-system.md` §6.
The range came from plan 725's §*Measured*, which stated
"avatars 16 → 24 → 32 → 40" — already false when it was written — and the
sentence was copied into this ledger and into the plan index's summary of 725.

The **control ladder is an abbreviation that hides a preset**: the ledger says
`controls 24/28/32 → 32/36/40`, naming only `compact` and `spacious` and
implying one step where `densityNames` has three — `24/28/32 → 28/32/36 →
32/36/40`. The row's own `rows 28 → 32 → 36` states all three, so the
parenthetical is inconsistent with itself, and a fourth preset (the case plan
725 exists to catch) would not have to appear anywhere in the sentence.

Nothing reads the parenthetical. `inventory.test.ts` guards the row's role and
type-role counts, the pair counts, the metric group names, the floor table, the
status surfaces and the Toast exception, but not these four ranges, so the
ledger has been quoting a scale the package does not ship while 7052 tests stay
green.

**Evidence** (on this branch, `7052` tests green):

```sh
# falsify the stale range further: the ledger guard stays green
sed -i '' 's/avatars 16…40/avatars 12…40/' COMPONENTS.md
cd packages/tokens && nub exec vitest run src/inventory.test.ts
# Test Files 1 passed · Tests 22 passed
git checkout -- ../../COMPONENTS.md
```

The same probe with `spacing 2…64` → `2…63`, a control step → `41` or
`rows 28 → 32 → 36` → `37` also leaves the suite green, so the class — not one
digit — is the defect. The first run of the new case found the second defect:
the control ladder is stated as two presets, so the case's derived
`24/28/32 → 28/32/36 → 32/36/40` failed against the row.

## 2. Decisions

- **D1 — one case in `inventory.test.ts`, not a new suite.** It already owns
  every `COMPONENTS.md` row guard and reads the file once; a second reader would
  duplicate the pattern this workstream keeps consolidating. Its header gains
  the bug statement the suite guards.
- **D2 — derive from the ordered indexes, then the values.** The four phrases
  are built with `spacingSteps`/`spacing`, `avatarSizeSteps`/`avatarSize`,
  `densityNames`/`controlSizes`/`densityPresets` — the indexes a generated table
  reads — so a new step or preset joins the phrase with no test edit.
- **D3 — fix the ledger and the index summary; leave plan 725's file.** An
  executed plan is a historical record (the plan-688 rule); `COMPONENTS.md` and
  the plan index are read as the current state, so both are corrected. The new
  plan states the measured scale so the record is not lost.
- **D4 — no token value moves.** `avatarSize` is correct; only the sentence is
  not. A palette or scale edit is a STOP condition.

## 3. Files and steps

### 3.1 `packages/tokens/src/inventory.test.ts`

Extend the header comment with the bug: the Design tokens row's range
parenthetical had no owner, `avatars 16…40` contradicts the shipped
`20/26/32/40`, and falsifying any endpoint leaves the suite green (plan 787).

Add imports from `./scale.js`:

```ts
import {
  avatarSize,
  avatarSizeSteps,
  controlSizes,
  densityNames,
  densityPresets,
  spacing,
  spacingSteps,
} from "./scale.js";
```

Add a case in `describe("COMPONENTS.md design-system rows", …)`:

```ts
it("states the scale ranges the indexes derive", () => {
  const range = (values: ReadonlyArray<number>) =>
    `${Math.min(...values)}…${Math.max(...values)}`;
  const controlLadder = densityNames
    .map((name) =>
      controlSizes
        .map((size) => densityPresets[name].controlHeight[size])
        .join("/"),
    )
    .join(" → ");
  const rowLadder = densityNames
    .map((name) => densityPresets[name].rowHeight)
    .join(" → ");

  const tokens = row("Design tokens");
  expect(tokens).toContain(
    `spacing ${range(spacingSteps.map((step) => spacing[step]))}`,
  );
  expect(tokens).toContain(
    `avatars ${range(avatarSizeSteps.map((step) => avatarSize[step]))}`,
  );
  expect(tokens).toContain(`controls ${controlLadder}`);
  expect(tokens).toContain(`rows ${rowLadder}`);

  // The stale range plan 725 copied from its own mis-measured ladder.
  expect(tokens).not.toContain("avatars 16…40");
});
```

`Math.min`/`Math.max` are deliberate: the package's tests are plain vitest and
the values are four numbers; no Effect helper is in scope here.

### 3.2 `COMPONENTS.md`

In the Design tokens row, replace

```
avatars 16…40, controls 24/28/32 → 32/36/40
```

with the shipped ranges:

```
avatars 20…40, controls 24/28/32 → 28/32/36 → 32/36/40
```

Change nothing else in the row — no reflow, no rewording, no plan reference.
Both corrections were found by this plan: the first by reading `avatarSize`, the
second by the new case's derived control ladder.

### 3.3 `.agents/slop/plans/README.md`

Three edits:

1. Add the plan row after `785`:

   ```
   | [787](./787-ledger-scale-ranges.md) | The ledger's scale ranges: the avatar range and the density ladder it hid | F | 054, 062, 303, 313, 664, 725, 766, 767 | done |
   ```

2. In the long 725 paragraph that contains
   `(spacing 2…64, avatars 16…40, …)`, replace the range with `avatars 20…40`,
   add the middle control preset, and note that the sentence first said
   `16…40` and named two presets. Plan 725's own file keeps its authored text as
   history.
3. Add plan 787's summary paragraph after 785's, naming both corrections, the
   derived guard and the five mutations it fails.

### 3.4 `TODO.md`

Tick the section progress (`354/430` → `355/431`) and add one `[x]` row under
*Design tokens and theming*: the ledger's four scale ranges now derive from the
shipped scales, the avatar range was `16…40` while the package ships `20…40`,
any endpoint edit fails `inventory.test.ts`, and no token value moves (plan
787).

## 4. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/inventory.test.ts   # 23 passed (the one new case)
nub run --filter @gpuixui/tokens test       # 7053+ passed, 0 failed
cd ../..
nub run check                               # check:tests, lint, fmt, check-types pass
nub run test                                # tokens + docs + playground suites pass
```

## 5. Test plan — both directions

1. **Fails without the guard.** Before adding the case, mutate `COMPONENTS.md`
   to a *different* range (`avatars 12…40`) and record the green run from §1.
2. **The new case can fail.** With the case in place, mutate each endpoint in
   turn and confirm `inventory.test.ts` fails naming the Design tokens row:
   - `spacing 2…64` → `spacing 2…63`
   - `avatars 20…40` → `avatars 16…40`
   - `controls … → 28/32/36 → …` → drop the middle step (the pre-787 text)
   - `rows 28 → 32 → 36` → `rows 28 → 32 → 37`
   Restore with `git checkout -- COMPONENTS.md` after each.
3. **The derivation reads the package, not the document.** Temporarily set
   `avatarSize.lg` to `44` in `scale.ts`; the unchanged ledger must fail (it
   quotes `20…40`). Restore with `git checkout -- packages/tokens/src/scale.ts`.
4. **Nothing else moves.** `git diff --stat` shows the plan, the plan index,
   `TODO.md`, `COMPONENTS.md` and `inventory.test.ts` only; no colour, pair,
   floor, metric or shipped theme changes.

## 6. STOP conditions

- Another range in the row is wrong too: correct it and record it in §3.2 — as
  this plan did for the control ladder. If a *value* has moved (one of the four
  ranges quotes a number the shipped scale does not carry), stop after the guard
  is green and report, because that means a scale moved without its documents.
- The derived phrase does not match the row's punctuation: adjust the *phrase
  fragments* in the case, not the row's prose, and keep the row a single
  parenthetical.
- Any temptation to touch `avatarSize` or another token: stop. The package is
  right; the sentence is not.
- Any temptation to rewrite plan 725's file: stop (D3).

## 7. Acceptance

- `COMPONENTS.md` states `avatars 20…40` and the full three-step control ladder,
  and all four ranges in the parenthetical are derived by `inventory.test.ts`.
- The case fails for each of the four range mutations and for a shipped-value
  edit, and passes when restored — with the commands and results recorded in the
  commit message.
- `nub run check` and `nub run test` pass; no colour, pair, floor, metric or
  shipped theme moves.
- The plan is indexed, `TODO.md` is ticked, and the branch is pushed.
