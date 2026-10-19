# 523 — The preview totals are derived, not remembered

**Status:** implemented
**Phase:** F (docs truth)
**Depends on:** 412, 494, 515, 517, 560, 521, 522
**Owns:** `docs/preview-strategy.md`, `apps/docs/README.md`,
`apps/docs/content/docs/component-pages.mdx`,
`apps/docs/src/components/preview/preview-gaps.test.ts`

## 1. The bug

`docs/preview-strategy.md` says, in the tier-L paragraph:

> Some scenes mount in the state they document — a menu, a dialog, a popover or
> the command palette starts open — and **21 more are opened by a real gesture**

The scene registry ships **22** gesture scenes (`SCENE_GESTURE` has 22 keys;
`preview-gaps.test.ts` already asserts the sentence "22 scenes document state
only a gesture produces" and the 22-row gesture table). Plan 522 added
`command-palette` as a gesture scene and updated the two guarded totals, but
this third copy of the number was not in the guard and stayed at 21.

The same shape exists in three more unguarded places:

| File | Claim | Derived value today |
| ---- | ----- | ------------------- |
| `docs/preview-strategy.md` | `45 scenes ship today: 42 are one per record … and three are composed pages` | 45 = 42 record scenes + 3 composed |
| `apps/docs/README.md` | `(42 today)` (component scenes) | 42 |
| `apps/docs/content/docs/component-pages.mdx` | `45 scenes today` … `the Showcase page and the two pattern pages` | 45; 3 composed = Showcase + 2 patterns |

The existing guard checks `45` and the two gesture statements. It cannot see
`42`, `three`, `two`, or the second `21`, so a new record or composed page can
leave this prose lying about what the site ships. Plan 494 fixed exactly this
class once ("counts stop being remembered"); this plan finishes the same rule
for the split totals.

## 2. Exact changes

### 2.1 `apps/docs/src/components/preview/preview-gaps.test.ts`

At module scope, after the existing `document`/`readme` reads, derive the split
from the registry once:

```ts
const recordScenes = pipe(
  components,
  Arr.filterMap((component) =>
    component.liveScene !== null && isLiveScene(component.liveScene)
      ? Result.succeed(component.liveScene)
      : Result.failVoid,
  ),
);
const composedSceneCount = Arr.length(LIVE_SCENES) - Arr.length(recordScenes);
const patternSceneCount = Arr.length(SCENE_PAGE); // composed scenes with a page
```

Reuse the same derivation in the existing `"the strategy names the code's
scenes"` describe instead of building a second copy. Add a `numberWord` helper:

```ts
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"] as const;
const numberWord = (value: number): string =>
  Arr.get(NUMBER_WORDS, value).pipe(Option.getOrElse(() => `${value}`));
```

(`Option` is a canonical import; no `any`.)

Extend the `"preview counts"` describe with four tests. Each header states the
bug it guards, per AGENTS §3:

1. **`states the record and composed split the code ships`** — assert
   `/(\d+) are one per record/` equals `recordScenes` and
   `/and (\w+) are composed pages/` equals `numberWord(composedSceneCount)` in
   `docs/preview-strategy.md`.
2. **`states the open/gesture split in the tier-L paragraph`** — assert
   `/(\d+) more are opened by a real gesture/` equals `gestureCount`.
3. **`states the component-scene total in the README`** — assert
   `/\((\d+) today\)/` in `apps/docs/README.md` equals `recordScenes`.
4. **`states the scene split on the component-pages template`** — assert
   `/(\d+) scenes today/` in `component-pages.mdx` equals `LIVE_SCENES`, and
   `/the Showcase page and the (\w+) pattern pages/` equals
   `numberWord(patternSceneCount - 1)` (the Showcase is a composed page without
   a pattern page; `SCENE_PAGE` currently holds exactly the three). Assert
   `patternSceneCount >= 1` first so the subtraction cannot go negative silently.

Use the existing `countIn` helper for digits and a small `wordIn` for words.

### 2.2 The three documents

- `docs/preview-strategy.md` line 38: `21 more` → `22 more`.
- `docs/preview-strategy.md` line 206: keep the numbers — they are now guarded.
- `apps/docs/README.md` line 136: keep `42` and `22` — now guarded.
- `apps/docs/content/docs/component-pages.mdx` line 106: keep `45` and `two` —
  now guarded.

No prose is rewritten beyond the one stale digit; the point is the guard, not a
tidy-up that would hide the drift.

### 2.3 `TODO.md`

Add under "Docs site workstream", above the plan-522 entry:

```
`[x]` **Every preview split is derived from the scene registry (plan 523)** —
      the tier-L paragraph still said "21 more" gesture scenes while the
      registry shipped 22; the record/composed and pattern splits are now read
      from the same registry by `preview-gaps.test.ts`, and the three
      documents cannot state a total the code does not ship.
```

Update the workstream counter `124/124` → `125/125`.

### 2.4 `.agents/slop/plans/README.md`

Add a row to the docs table:

```
| [`523-preview-totals-derived.md`](./523-preview-totals-derived.md) | Every preview split is derived: the strategy's record/composed and open/gesture totals, the README's component-scene total and the template's pattern-page count all come from `LIVE_SCENES`, the registry and `SCENE_PAGE`; the stale "21 more" is fixed | F | 412, 494, 515, 517, 521, 522, 560 | implemented — … |
```

Fill the status column only after §4 passes.

## 3. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/docs-site`).

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | `75 passed (75)` before the change; after, **76** files (one new test file is not needed — tests are added to an existing file) and **515** tests (511 + 4) pass |
| `nub run --filter docs check-types` | exit 0, no diagnostics |
| `nub run check` | exit 0 (test-quality checker, lint, format, types) |
| `nub run --filter docs build` | exit 0 |

If any command exits non-zero, read the named failure and fix the derivation —
do not loosen an assertion to make it pass.

## 4. Test plan (two directions)

The tests must be able to fail. Prove both directions and record the measured
output in §6:

1. **Before the fix.** Revert only `21 more` → `22 more` in
   `docs/preview-strategy.md` and run the suite. Test 2 must fail with
   `expected 22, received 21` (or the object form used). Restore the fix.
2. **A new composed page.** Temporarily add a fourth entry to `SCENE_PAGE`
   (and its key to `LIVE_SCENES` if the smoke requires it) and run the suite.
   Tests 1 and 4 must fail naming the changed count/word. Revert.
3. **A new record scene.** Temporarily add `liveScene: "button"` to a planned
   record or remove one delivered record's `liveScene`, then run the suite.
   Test 1 and test 3 must fail on the 42/3 split. Revert.
4. **A new gesture scene.** Temporarily add a `SCENE_GESTURE` entry for a scene
   that had none and run the suite. Tests 2 and the existing "gesture total"
   test must both fail. Revert.

Only direction 1 is required to land; 2–4 prove the guard is not decorative.
Record the exact `vitest` output lines for at least 1 and one of 2–4.

## 5. STOP conditions

Stop and report rather than improvise if:

- `LIVE_SCENES`, `SCENE_PAGE` or the registry cannot be imported by the test
  without a browser or a wasm build (it already can — the file imports them
  today; if that changed, report).
- The derived record-scene count differs from 42 **and** `docs/preview-strategy.md`
  (or `COMPONENTS.md`/the registry) is also wrong. Then the fix is wider than a
  docs guard: report the measured triple before editing.
- Any prose rewrite would change a claim, not a count. This plan only moves
  numbers and adds guards.
- `nub run check` fails for a reason outside these files. Report it; do not
  edit another workstream's paths.

## 6. Measured result

Run in `workspaces/docs-site` on 2026-10-19.

**The pre-fix failure.** With `docs/preview-strategy.md` restored to `21 more`,
`nub exec vitest run src/components/preview/preview-gaps.test.ts` failed:

```
FAIL … > preview counts > states the open and gesture split in the tier-L paragraph
AssertionError: expected 21 to be 22 // Object.is equality
Tests  1 failed | 11 passed (12)
```

**The fix.** The sentence says `22 more`; the same file passes 12/12.

**A fourth composed page.** Temporarily mapping `button` into `SCENE_PAGE` as a
pattern page failed both split tests, by name:

```
expected { records: 42, composed: 'three' } to deeply equal { records: 42, composed: 'four' }
expected { scenes: 45, patterns: 'two' } to deeply equal { scenes: 45, patterns: 'three' }
Tests  2 failed | 10 passed (12)
```

`scenes.ts` was restored byte-for-byte from the backup before the next command;
`grep 'button: "/docs'` prints nothing.

**Final gates.**

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 75 files / **515 tests** passed (511 + the four new ones) |
| `nub run --filter docs check-types` | exit 0 |
| `nub run check` | exit 0 (test checker, lint, format, all packages' types) |
| `nub run --filter docs build` | exit 0 |

`oxfmt` reformatted the test file once; the formatted tree is what the gates
above measured.
