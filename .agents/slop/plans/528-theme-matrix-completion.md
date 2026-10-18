# 528 — Every component is proven in both themes, and the claim is checked

**Phase:** F (verification truth) · **Owner:** components · **Depends on:** 110,
117, 139, 309–320, 333, 335, 337 · **Status:** done — six matrix cases
(behaviour 702 → 708), six mutation proofs, a registry check in the unit suite
(404 → 405); all gates green

## 1. The defect (measured 2026-10-18, this workspace)

Plan 117 §4 created `src/behaviour/theme-matrix.test.tsx` so every component
would have at least one assertion that changes with the theme. The header says
"this file is the rest of the matrix", and MISSION requires every component
verified in both themes. `TODO.md` marks **"Verify every component in both
themes"** as done.

Six components landed after that matrix was written and never joined it:

| Component | Own suite mentions `lightTheme` | Row in `theme-matrix.test.tsx` | `COMPONENTS.md` claims "both themes" |
| --------- | ------------------------------- | ------------------------------ | ------------------------------------ |
| Carousel | no | no | **yes** |
| Countdown | no | no | **yes** |
| Inline edit | no | no | **yes** |
| Mention input | no | no | **yes** |
| Tag / token input | no | no | **yes** |
| Preview Card | no | no | no (still uncovered) |

Measured with:

```sh
cd packages/components
for f in src/behaviour/*.test.tsx; do
  grep -q lightTheme "$f" && echo "yes $f" || echo "no  $f"
done
```

The five rows therefore claim a verification that never ran: each of those
suites renders with `renderComponent`'s default (dark) theme only. A component
that hard-coded its light colours would pass every current test, and the docs
would still say "both themes".

The fix has two halves: prove the six that are missing (the components read
semantic roles, so the cases should pass), and add a structural check so the
next component cannot be marked done with no theme evidence — the same drift
that left these six behind.

## 2. The rule

> Every inventory component has at least one assertion under `lightTheme`:
> either in its own behaviour suite or in the shared theme matrix. A registry
> names exactly the suites that rely on the matrix, and `inventory.test.ts`
> fails when the registry and the suites disagree.

A case proves the theme when a rendered style equals the **theme role** it
should read, under both themes — not when the component merely renders.

## 3. Files and changes

### 3.1 `packages/components/src/behaviour/theme-matrix.test.tsx`

Add six cases at the end of the existing `describe("theme matrix")`, using the
existing `bothThemes(render, assert)` helper. Import the parts used:

- `Carousel`, `CarouselSlide`, `CarouselTrack` from `../carousel.js`
- `Countdown` from `../countdown.js`
- `InlineEdit` from `../inline-edit.js`
- `MentionInput`, `MentionInputItem`, `MentionInputList` from
  `../mention-input.js`
- `PreviewCard`, `PreviewCardContent`, `PreviewCardTrigger` from
  `../preview-card.js`
- `TagInput`, `TagInputChip`, `TagInputField` from `../tag-input.js`

Each case asserts the role the source paints:

| Case | Fixture | Assertion |
| ---- | ------- | --------- |
| CarouselTrack surface | two slides, `testId="track"` | `style.backgroundColor` is `theme.colors.card` |
| Countdown text | `remainingMs={90_000} testId="countdown"` | `style.color` is `theme.colors.foreground` |
| InlineEdit display | `value="Docs" testId="rename"` | the one styled `<text>` colour is `theme.colors.foreground` |
| MentionInput field | `testId="mention"`, one item | `mention-group` `style.backgroundColor` is `theme.colors.background` and `style.borderColor` is `theme.colors.border` |
| PreviewCard surface | `defaultOpen`, content `testId="preview"` | `style.backgroundColor` is `theme.colors.popover` |
| TagInput field | `testId="tags"` with one chip and a field | `style.backgroundColor` is `theme.colors.background` and `style.borderColor` is `theme.colors.border` |

Update the file header: the matrix is now the declared home of every suite that
does not prove both themes itself, not an informal remainder.

### 3.2 `packages/components/src/behaviour/theme-coverage.ts` (new)

A plain data module (no JSX, no tests) so both the behaviour matrix and the unit
inventory check can read the same classification:

```ts
/**
 * Behaviour suites whose component is proven in both themes by the shared
 * matrix in `theme-matrix.test.tsx`, not by its own file. `inventory.test.ts`
 * holds this list to the suites on disk (plan 528).
 */
export const themeMatrixCoverage: ReadonlyArray<string> = [
  "src/behaviour/accordion.test.tsx",
  "src/behaviour/avatar.test.tsx",
  "src/behaviour/breadcrumb.test.tsx",
  "src/behaviour/carousel.test.tsx",
  "src/behaviour/chat.test.tsx",
  "src/behaviour/collapsible.test.tsx",
  "src/behaviour/command-menu.test.tsx",
  "src/behaviour/confirm-dialog.test.tsx",
  "src/behaviour/context-menu.test.tsx",
  "src/behaviour/countdown.test.tsx",
  "src/behaviour/empty-state.test.tsx",
  "src/behaviour/inline-edit.test.tsx",
  "src/behaviour/list.test.tsx",
  "src/behaviour/mention-input.test.tsx",
  "src/behaviour/message-scroller.test.tsx",
  "src/behaviour/message.test.tsx",
  "src/behaviour/preview-card.test.tsx",
  "src/behaviour/search-input.test.tsx",
  "src/behaviour/tag-input.test.tsx",
  "src/behaviour/time-picker.test.tsx",
];
```

Twenty entries: the fourteen component rows the matrix already covered (Button
is not an inventory row and does not need to be listed), plus the six above.

### 3.3 `packages/components/src/inventory.test.ts`

Import the registry and add one case to `describe("inventory")`:

```ts
it("proves every component in both themes", () => {
  const uncovered = Arr.filter(
    inventory,
    (meta) =>
      !readFileSync(
        fileURLToPath(new URL(meta.testFile, packageRoot)),
        "utf8",
      ).includes("lightTheme"),
  );
  const problems = [
    ...Arr.filterMap(uncovered, (meta) =>
      Arr.contains(themeMatrixCoverage, meta.testFile)
        ? Result.failVoid
        : Result.succeed(
            `${meta.name}: no both-theme assertion (own suite or theme matrix)`,
          ),
    ),
    ...Arr.filter(
      themeMatrixCoverage,
      (file) => !Arr.some(uncovered, (meta) => meta.testFile === file),
    ).map(
      (file) =>
        `${file}: listed as matrix-covered but its suite now proves both themes`,
    ),
  ];

  expect(problems).toEqual([]);
});
```

Update the file header with the new guard. The first half catches a new
component with only a dark render; the second catches a stale registry entry
once a suite starts proving both themes itself.

### 3.4 Docs and inventory

- `COMPONENTS.md`: the five rows already claim "both themes" — after this plan
  the claim is true. Add "both themes" to the Preview Card row (it is now
  actually proven; its limitation list does not change).
- `TODO.md`: the Tier 2 hardening list gains this task; the Phase F "Verify
  every component in both themes" line now names the structural check.
- The six component docs pages already have their `## Verification` count; the
  new assertions live in the shared matrix, not in their own suites, so **their
  stated counts do not change**. Do not edit those pages except if the plan's
  STOP condition forces it.

## 4. Test plan

### 4.1 The six new native cases

Run:

```sh
cd packages/components
nub run --filter @gpuixui/components test:behaviour -- theme-matrix
```

Expected: the matrix suite passes with six new cases (behaviour suite 702 → 708).

### 4.2 Both-direction proof

The cases must be able to fail. Apply each mutation, run the named case, record
the failure, revert:

| Mutation | Expected failure |
| -------- | ---------------- |
| `carousel.tsx`: `backgroundColor: theme.colors.card` → `"#000000"` | CarouselTrack surface |
| `countdown.tsx`: the positive colour → `"#000000"` | Countdown text |
| `inline-edit.tsx`: the non-empty display colour → `"#000000"` | InlineEdit display |
| `mention-input.tsx`: the group `backgroundColor` → `"#000000"` | MentionInput field |
| `preview-card.tsx`: the content `backgroundColor` → `"#000000"` | PreviewCard surface |
| `tag-input.tsx`: the group `backgroundColor` → `"#000000"` | TagInput field |

For the registry guard, temporarily delete `"src/behaviour/carousel.test.tsx"`
from `theme-coverage.ts` and run the unit suite:

```sh
nub run --filter @gpuixui/components test -- inventory
```

Expected: one failure naming `Carousel`. Restore it; the suite passes.

### 4.3 Gates

```sh
nub run --filter @gpuixui/components test            # unit 404 → 405 (one new inventory case)
nub run --filter @gpuixui/components test:behaviour  # 702 → 708
nub run --filter @gpuixui/components check-types     # exit 0
nub run check                                        # exit 0
nub run lint                                         # exit 0
nub run test                                         # exit 0
```

Record the real counts that ran; do not copy these predicted numbers into the
docs.

## 5. STOP conditions

- A new matrix case cannot name a theme role the component should read (the
  component paints a literal): stop and report the component; that is a real
  defect, not a test to bend. Do not assert `undefined`.
- A component needs a different host fixture (a controlled open state, a
  measured height) than the table assumes: adapt the fixture, keep the role
  assertion, and record it in §3.1.
- A matrix case passes under both themes because the role is the same colour in
  both: pick another role the component paints; the assertion must distinguish
  the two themes.
- The registry check fails for a suite whose `lightTheme` string is incidental
  (a comment, an unused import): remove the incidental mention or make the
  assertion real; do not weaken the check.
- Any change would be needed outside `packages/components`, `COMPONENTS.md` or
  `TODO.md`: stop and record it as an interlock.

## 6. Acceptance

- `theme-matrix.test.tsx` has one meaningful both-theme case for each of the six
  components; each case fails under the mutation in §4.2.
- `theme-coverage.ts` lists exactly the inventory suites that do not prove both
  themes themselves, and `inventory.test.ts` enforces both directions.
- `COMPONENTS.md`'s five "both themes" claims are true and Preview Card is
  covered; `TODO.md` and the plan index are synced.
- Unit and behaviour suites pass with the measured counts; `nub run check`,
  `nub run lint` and `nub run test` exit 0.

## 7. Results (2026-10-18, this host, `0.10.0`)

- Six cases added to `theme-matrix.test.tsx`, one role assertion each:
  CarouselTrack (`card`), Countdown (`foreground`), InlineEdit (`foreground`),
  MentionInput (`background` + `border`), PreviewCard (`popover`), TagInput
  (`background` + `border`). All six passed first run; behaviour 702 → **708**
  (51 files, 21 in the matrix).
- `theme-coverage.ts` lists the 20 inventory suites whose component is proven by
  the matrix; `inventory.test.ts` now fails in both directions — a component
  with no theme evidence, and a stale registry entry.
- Mutation proofs, each run and reverted (matrix suite, 21 cases):
  | Mutation | Failure |
  | -------- | ------- |
  | `carousel.tsx` card fill → `#000000` | CarouselTrack surface |
  | `countdown.tsx` positive colour → `#000000` | Countdown text |
  | `inline-edit.tsx` display colour → `#000000` | InlineEdit display |
  | `mention-input.tsx` group fill → `#000000` | MentionInput field |
  | `preview-card.tsx` content fill → `#000000` | PreviewCard surface |
  | `tag-input.tsx` group fill → `#000000` | TagInput field |
  Registry proof: dropping `carousel.test.tsx` from `theme-coverage.ts` failed
  the inventory case with exactly
  `Carousel: no both-theme assertion (own suite or theme matrix)`.
- Unit 404 → **405**. `nub run check`, `nub run lint` and `nub run test` exit 0.
- The five `COMPONENTS.md` "both themes" claims (Tag / token input, Mention
  input, Countdown, Carousel, Inline edit) are now true; Preview Card's row
  gained the claim because it is now proven. The six docs pages keep their
  stated native counts: the new assertions live in the shared matrix, not in
  those suites.

