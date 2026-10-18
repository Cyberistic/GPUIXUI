# 494 — The preview counts are checked, not remembered

**Phase:** F (docs truth) · **Owner:** docs-site
**Depends on:** 412 (preview strategy), 450 (preview-count truth), 464 (gap truth),
455–493 (the scenes themselves)
**Status:** implemented

## 1. Why this plan exists

Plans 450 and 464 fixed the same bug twice: `docs/preview-strategy.md` and the
content pages hand-counted previews, a plan added scenes, and the prose kept the
old number. 450 removed the counts from the MDX pages and made the registry the
only count; 464 put the *gap list* under a test. Neither covers the two counts
that this plan's scene set keeps changing:

- `**Thirty scenes ship today**` — the total, now wrong as soon as plan 493's
  six scenes exist beyond the document's edits;
- `Fourteen scenes document state only a gesture produces` — the gesture total,
  which changes whenever a scene gains a step.

`apps/docs/README.md` repeats both numbers. A reader trusts them; nothing proves
them. This plan replaces the remembered numbers with a test that derives them
from `LIVE_SCENES` and `SCENE_GESTURE`, exactly as `preview-gaps.test.ts` already
derives the gap set.

## 2. Goal and acceptance

- both documents state the counts as digits, so they are unambiguous;
- `preview-gaps.test.ts` fails when either stated total differs from the code;
- the gesture table's row count equals the number of gesture scenes;
- the tests were proven to fail by breaking each number in turn.

## 3. Exact changes

### 3.1 `docs/preview-strategy.md`

- `**Thirty scenes ship today**` → `**30 scenes ship today**`.
- `Fourteen scenes document state only a gesture produces` →
  `14 scenes document state only a gesture produces`.

No other wording changes; the lists next to both sentences stay.

### 3.2 `apps/docs/README.md`

- `Fourteen of those` → `14 of those`.

### 3.3 `apps/docs/src/components/preview/preview-gaps.test.ts`

The file already reads the document at import time. Add a second file read for
the README and one describe block:

```ts
const readme = readFileSync(
  fileURLToPath(new URL("../../../README.md", import.meta.url)),
  "utf8",
);

const stated = (source: string, pattern: RegExp): number =>
  Number(pattern.exec(source)?.[1] ?? Number.NaN);

const gestureCount = Object.keys(SCENE_GESTURE).length;

describe("preview counts", () => {
  it("states the scene total the code ships, in both documents", () => {
    const pattern = /\*\*(\d+) scenes ship today\*\*/;
    expect({
      document: stated(document, pattern),
      readme: stated(readme, /Live scenes ship for[\s\S]*?(\d+) of\s+those/),
    }).toEqual({ document: LIVE_SCENES.length, readme: LIVE_SCENES.length });
  });

  it("states the gesture total the code ships, in both documents", () => {
    const pattern = /(\d+) scenes document state only a gesture produces/;
    expect({
      document: stated(document, pattern),
      readme: stated(readme, /(\d+) of\s+those/),
    }).toEqual({ document: gestureCount, readme: gestureCount });
  });

  it("lists one gesture row per gesture scene", () => {
    const rows = pipe(
      section.split("\n"),
      Arr.filter((line) => /^\| .* \| .* \| .* \|$/.test(line)),
    ).length;
    // Minus the header and its separator.
    expect(rows - 2).toBe(gestureCount);
  });
});
```

`section` is the gap section the file already computes; rename it to
`gapSection` only if needed for clarity, and add a `gestureSection` helper cut
between the `## Gestures are proved, not implied` heading and the next heading
(the table lives there).

Note the README's two numbers are adjacent, so the README total pattern must be
anchored on `Live scenes ship for` and the gesture pattern on `of those`; a
generic `(\d+)` would read the wrong one. If the README wording makes one regex
fragile, prefer dropping the README number to a neutral phrase ("Every live
scene that documents a gesture is listed in `preview/scenes.ts`") over a brittle
regex — the document is the contract, the README is the pointer.

## 4. Test plan

1. Change `30` to `31` in the document → the total test fails naming both
   documents.
2. Change `14` to `13` in the document → the gesture-total test fails.
3. Change the README's `14 of those` to `13 of those` → the README side fails.
4. Delete one gesture-table row → the row-count test fails.
5. Restore after each; the whole suite passes.

## 5. Commands and expected results

```sh
nub run --filter docs test                 # every suite; the new block passes
nub run check                              # test quality, lint, format, types
nub run lint                               # 0
nub run test                               # every workspace suite
```

## 6. Measured results

Run on this host, 2026-10-18.

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 52 files / **346 tests** pass (three new guards) |
| `nub run check` | pass |
| `nub run lint` | pass |
| `nub run test` | exit 0 (docs 346; every workspace suite) |

Both documents now state digits: `**30 scenes ship today**` and `14 scenes
document state only a gesture produces` in `docs/preview-strategy.md`; `14 of
those` in `apps/docs/README.md`.

Two-direction proofs, each measured against
`nub x vitest run src/components/preview/preview-gaps.test.ts`:

1. `30` → `31`: `AssertionError: expected 31 to be 30`; 1 failed / 5 passed.
2. Document `14` → `13`: `expected { document: 13, readme: 14 } to deeply equal
   { document: 14, readme: 14 }`.
3. README `14` → `13`: `expected { document: 14, readme: 13 } to deeply equal
   { document: 14, readme: 14 }`.
4. Deleting the Text areas row: `expected 13 to be 14`.

All four restored → 6 passed.

## 7. STOP conditions

- The README regex cannot be made stable without contorting the sentence: drop
  the README number and keep its pointer to `preview/scenes.ts`. Do not weaken
  the document test to compensate.
- The gesture section's table parse picks up the wrong table: scope the slice
  between the two headings, not the whole document.

## 8. Acceptance checklist

- [ ] both counts are digits and match `LIVE_SCENES` / `SCENE_GESTURE`
- [ ] the gesture table row count is guarded
- [ ] both-direction proofs recorded in §6
- [ ] `TODO.md` row added and ticked; plan index updated
