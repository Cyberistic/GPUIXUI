# Plan 519 — The motion scale's ordered indexes

| Field | Value |
| ----- | ----- |
| Workstream | `tokens-theme` |
| Block | `500–599` (tokens overflow) |
| Phase | F — integration and polish |
| Depends on | `019`, `064`, `096`, `305`, `364`, `372`, `387`, `518` |
| Files owned | `packages/tokens/src/motion.ts`, `packages/tokens/src/docs.test.ts`, `packages/tokens/src/inventory.test.ts`, `packages/tokens/src/motion-index.test.ts` (new), `packages/tokens/src/motion-levels.example.ts` (new), `packages/tokens/README.md`, `docs/tokens.md`, `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md` |
| Status | done |

## 1. The defect

Every shipped scale now has an ordered, public index: `colorRoles`,
`textRoles`, `fontWeights` (plan 518), `spacing`, `radius`, `densityNames`,
`controlSizes`, `iconSize`, `avatarSize`, `elevationLevels`, `statusTones`,
`platformNames`, `platformRecipeNames`, `themeModes`, `themeContrasts`,
`shippedThemes`. Motion has none.

`MotionLevel` is `Exclude<keyof Motion, "ease">` and `MotionPhase` is
`keyof MotionEasings` — a type-only answer with no runtime list. The three
places that need to enumerate the scale each work around it:

| File | Workaround |
| ---- | ---------- |
| `packages/tokens/src/docs.test.ts:345` | `const timingLevels = Object.keys(motion).filter((key) => key !== "ease")` → `string[]` |
| `packages/tokens/src/inventory.test.ts` (the Motion row case) | the same two `Object.keys` calls |
| `packages/tokens/src/motion-contract.test.ts:37` | retypes `["step", "fast", "normal", "slow", "pulse"]` as a literal |

The `Object.keys` form is not just untyped: it silently grows. A new timing
field on `Motion` (say `slower`) joins both documentation loops before the
documentation is updated, and a docs table or settings row built the same way
does the same. A retyped literal in a consumer has the opposite failure — a new
level is invisible. The package's own rule from plans `064`, `096` and `305` is
that a union a consumer persists or iterates has one ordered owner.

`docs/tokens.md` already prints the six levels and four phases in order; the
type index names `MotionLevel` and `MotionPhase`; neither points at a runtime
index because there is none.

## 2. Decision

Ship two ordered indexes in `motion.ts`, and derive the two types from them:

```ts
/** The motion timings the library ships, in documentation order. */
export const motionLevels = [
  "none",
  "step",
  "fast",
  "normal",
  "slow",
  "pulse",
] as const;

/** A duration level. `ease` is not a duration. */
export type MotionLevel = (typeof motionLevels)[number];

/** The easing phases the library ships, in documentation order. */
export const motionPhases = ["standard", "enter", "exit", "linear"] as const;

/** An easing phase. */
export type MotionPhase = (typeof motionPhases)[number];
```

Place them **after** the `Motion`/`MotionEasings` interfaces and **before**
`motion`, so the declarations read as the interface's index. Keep the existing
doc comments on the types; only the derivation changes.

The `motion` record stays typed `Motion`, so TypeScript still requires every
interface field. Completeness of the index is a test, exactly as `themeModes`
is guarded rather than derived (`theme.ts`):

- `motionLevels` must cover every key of `motion` except `ease`, in the
  record's documentation order;
- `motionPhases` must cover every key of `motion.ease`, in the record's order.

No narrowing guard (`isMotionLevel`) is added: a motion level is not a
persisted user choice in this library, and `MotionLevel` already types the
resolver parameter.

## 3. Migrate the three workarounds

1. `docs.test.ts` — import `motionLevels, motionPhases` from `./motion.js` and
   replace the two local `Object.keys` derivations:
   ```ts
   const timingLevels = motionLevels;
   const easingPhases = motionPhases;
   ```
   The two documentation assertions below them keep working; they now read the
   owner.
2. `inventory.test.ts` — the Motion row case uses
   `Object.keys(motion).filter((key) => key !== "ease")` and
   `Object.keys(motion.ease)`. Replace with `motionLevels` and `motionPhases`.
3. `motion-contract.test.ts` — leave the per-level failure cases alone; each
   entry is a test case, not an index claim. (Optional, only if it compiles
   cleanly: build `timingLevels` as
   `motionLevels.filter((level) => level !== "none")` and keep the cases.)

`docs.test.ts` and `inventory.test.ts` must not keep a second derivation: that
is how the drift started.

## 4. Documentation and example

- `docs/tokens.md`, `## Motion`, after the table:
  ```
  `motionLevels` lists the six levels in this order and `motionPhases` the four
  easing phases, so a table or a settings row iterates the index instead of
  `Object.keys(motion)`.
  ```
- The type index rows: change the `MotionLevel` purpose to "A timing level from
  `motionLevels`." and `MotionPhase` to "An easing phase from `motionPhases`."
- `packages/tokens/README.md`, the documentation-site paragraph that names
  `statusTones` and `platformNames`: add that `motionLevels`/`motionPhases`
  index the motion scale.
- `COMPONENTS.md`, the `Motion tokens` row: append
  “`motionLevels` and `motionPhases` index the six timings and four phases”.
- Create `packages/tokens/src/motion-levels.example.ts`:
  ```ts
  import { motion, motionLevels, motionPhases } from "./index.js";

  /**
   * The motion scale as a documentation table: the timings in level order and
   * the easing each phase runs. `Object.keys(motion)` would also enumerate a
   * field the index has not adopted; the indexes are the owner.
   */
  export const motionScale = () => ({
    levels: motionLevels.map((level) => ({ level, milliseconds: motion[level] })),
    phases: motionPhases.map((phase) => ({ phase, ease: motion.ease[phase] })),
  });
  ```

## 5. The guard

Create `packages/tokens/src/motion-index.test.ts`. Header comment states the
bug: the types were key-only and three suites re-derived or retyped the scale;
`Object.keys` leaked a `string[]` and would adopt a new field before the docs.

Cases:

1. **`motionLevels` covers the record, in order.** Assert
   `motionLevels` equals `Object.keys(motion).filter((key) => key !== "ease")`
   and equals the documented order (explicit literal). Fails if a timing is
   added without the index, or the index is reordered.
2. **`motionPhases` covers the easings, in order.** Same for
   `Object.keys(motion.ease)`.
3. **Every index member resolves.** For each level,
   `motionTransition(lightTheme, level).duration` equals
   `motion[level] / 1000`; for each phase,
   `motionTransition(lightTheme, "normal", phase).ease` equals
   `motion.ease[phase]`. This proves the public resolver accepts every index
   member and catches an index entry with no record value.
4. **The documents and the ledger name both indexes.** `docs/tokens.md` and
   `packages/tokens/README.md` contain `` `motionLevels` `` and
   `` `motionPhases` ``; the `Motion tokens` row of `COMPONENTS.md` contains
   both.
5. **The example runs and matches the scale.** Execute `motionScale()`; assert
   its `levels` map to `motionLevels` with `motion` timings and its `phases` to
   `motionPhases` with `motion.ease` values.

`node:fs` is deliberate, as in `docs.test.ts`/`inventory.test.ts`: a policy
check over the tree's own documents, and the package ships zero runtime
dependencies.

**Both directions:** remove `"slow"` from `motionLevels` and case 1 fails
(record key missing); restore. Remove the new sentence from `docs/tokens.md`
and case 4 fails. Neither pre-fix state compiles a failing test because the
indexes do not exist; record the post-fix mutations in the commit body.

## 6. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test
```
Expected: `Test Files 112 passed`, `Tests 5371 passed` (one new file, five
cases). Record the real number.

```sh
nub run check
nub run lint
nub run test
```
Expected: all green. `check` runs `check:tests`, `lint`, `fmt`, `check-types`.

## 7. STOP conditions

- `MotionLevel` cannot derive from `motionLevels` without changing the public
  type's semantics (for example another module narrows on
  `Exclude<keyof Motion, "ease">` in a way the literal tuple breaks).
- The `inventory.test.ts` or `docs.test.ts` case cannot use the index without
  losing an assertion it makes today.
- A completion gate stays red after the plan's edits.

Do not add a second list beside the index to keep an old assertion green.

## 8. Acceptance

- `motionLevels` and `motionPhases` are exported, ordered, and the two types
  derive from them.
- The completeness guard fails when a `Motion` field or easing phase is added
  without the index, and when a document drops the index sentence.
- `docs.test.ts` and `inventory.test.ts` read the indexes, not `Object.keys`.
- The executed example and the three documents name the indexes.
- All three completion gates are green.
