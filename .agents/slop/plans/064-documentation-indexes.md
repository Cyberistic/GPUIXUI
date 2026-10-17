# 064 — Documentation indexes for platforms and status tones

| Field | Value |
| ----- | ----- |
| Phase | F (documentation truth) — the last two retyped catalogues |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`) |
| Depends on | plans `014` (status tones), `015` (`colorRoles`), `059` (`textRoles`), `063` (platform styles) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Two shipped catalogues still have their order and membership retyped by hand:

- **Platforms.** The ordered list `["darwin", "linux", "win32", "default"]`
  appears in `platforms.test.ts` (as `platforms`), in `docs.test.ts` (as
  `platformNames`), and in `exports.test.ts` (sorted literal). The Fumadocs
  platform toggle (plan `063`, owner `docs-site`) will need the same order again
  to render macOS · Linux · Windows · Default. Nothing ties those lists to
  `PlatformName`, so a fifth platform can be added to the union and the
  registries while a table silently omits it — exactly the drift plans `015` and
  `059` closed for colour and type roles.
- **Status tones.** `styles.test.ts` retypes `["info", "success", "warning",
  "destructive"]`, and the four-row status table in `docs/tokens.md` is not
  guarded at all: a tone edit or a new family can ship a table that lies.

`colorRoles` and `textRoles` already solve this class of problem: an exported,
ordered, typed index that docs and tests iterate. This plan adds the same two
indexes and uses them everywhere.

**Not in scope.** No new colour role, tone or platform. No change to a value.
No `Theme` shape change.

## 2. Design decision

Derive the **type** from the **index**, so the union and the order cannot
disagree:

```ts
export const platformNames = ["darwin", "linux", "win32", "default"] as const;
export type PlatformName = (typeof platformNames)[number];
```

`platformNames` belongs in `platform-types.ts`: it is inert data, and the
per-platform style files already import that module for `systemUiFont` and the
style shapes. `platforms.ts` re-exports it beside `platformTypes` /
`platformStyles`, so a consumer imports it from the package root as usual.

Same shape for tones in `styles.ts`:

```ts
export const statusTones = ["info", "success", "warning", "destructive"] as const;
export type StatusTone = (typeof statusTones)[number];
```

The order is documentation order: it matches the tables in `docs/tokens.md` and
`packages/tokens/README.md`, and the platform toggle's button order.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/064-documentation-indexes.md` | **create** (this file) |
| `packages/tokens/src/platform-types.ts` | add `platformNames`; derive `PlatformName` from it |
| `packages/tokens/src/platforms.ts` | re-export `platformNames` |
| `packages/tokens/src/styles.ts` | add `statusTones`; derive `StatusTone` from it |
| `packages/tokens/src/platforms.test.ts` | import `platformNames`, delete the local `platforms` literal, add a membership/order test |
| `packages/tokens/src/styles.test.ts` | import `statusTones`, delete the local `tones` literal |
| `packages/tokens/src/exports.test.ts` | assert the platform registry matches `platformNames` instead of a sorted literal |
| `packages/tokens/src/docs.test.ts` | use `platformNames`; assert platform-row order; guard the status-tone table with `statusTones` |
| `packages/tokens/README.md` | one sentence in "For documentation sites" naming both indexes |
| `docs/tokens.md` | one sentence in "For documentation sites" naming both indexes; confirm the status-tone table is guarded in Verification |
| `TODO.md` | one task under the tokens block, ticked; progress count updated |
| `.agents/slop/plans/README.md` | index row for `064`, plus the explanatory paragraph |

**Do not change** theme data, the `Theme` interface, the platform style values,
or the docs numbers. If a guard exposes a mismatch, fix the document when the
implementation is right; if the document is right, the implementation is a
product bug — fix it with its own test and record it.

## 4. Exact implementation

### 4.1 `platform-types.ts`

Replace the hand-written union with an index:

```ts
/** Every platform variant, in documentation and toggle order. */
export const platformNames = ["darwin", "linux", "win32", "default"] as const;

/** A platform a GPUIXUI application runs on. */
export type PlatformName = (typeof platformNames)[number];
```

### 4.2 `platforms.ts`

Add `platformNames` to the existing re-export:

```ts
export { platformNames, systemUiFont } from "./platform-types.js";
```

### 4.3 `styles.ts`

Above the `StatusTone` type:

```ts
/** Every status colour family, in documentation order. */
export const statusTones = ["info", "success", "warning", "destructive"] as const;

/** The four status colour families a component can announce. */
export type StatusTone = (typeof statusTones)[number];
```

### 4.4 `platforms.test.ts`

- Import `platformNames`.
- Delete the local `platforms` literal; use `platformNames` for the existing
  loops (`platformTypes` coverage, labels, sentinel, comma stacks,
  `currentPlatform`).
- Add one test in `describe("platformTypes")`:

```ts
it("indexes every platform once, in toggle order", () => {
  expect(platformNames).toEqual(["darwin", "linux", "win32", "default"]);
  expect(new Set(platformNames).size).toBe(platformNames.length);
  expect(Object.keys(platformStyles).toSorted()).toEqual(
    [...platformNames].toSorted(),
  );
});
```

### 4.5 `styles.test.ts`

- Import `statusTones` from `./styles.js` and delete the local `tones` literal.
- Every existing loop over `tones` uses `statusTones`.

### 4.6 `exports.test.ts`

Replace the sorted literal with the registry/index agreement:

```ts
expect(Object.keys(platformStyles).toSorted()).toEqual(
  [...platformNames].toSorted(),
);
```

Import `platformNames` beside `platformStyles`.

### 4.7 `docs.test.ts`

- Import `platformNames` from `./platforms.js` and `statusTones` from
  `./styles.js`.
- Delete the local `platformNames` literal (it shadows the export).
- In `describe("docs/tokens.md platform table")` add:

```ts
it("lists the variants in toggle order", () => {
  const positions = platformNames.map((platform) =>
    markdown.indexOf(`| \`${platform}\` (`),
  );
  expect(positions).not.toContain(-1);
  expect(positions).toEqual(positions.toSorted((a, b) => a - b));
});
```

- Add a new block guarding the status table. The documented row is:

```
| `info` | `info` / `infoForeground` | `infoSoft` | `infoSoftForeground` | `infoText` |
```

so build it per tone:

```ts
describe("docs/tokens.md status table", () => {
  it("lists every tone with its solid, soft and text roles", () => {
    statusTones.forEach((tone) => {
      expect(markdown, tone).toContain(
        `| \`${tone}\` | \`${tone}\` / \`${tone}Foreground\` | \`${tone}Soft\` | \`${tone}SoftForeground\` | \`${tone}Text\` |`,
      );
    });
  });

  it("lists the tones in documentation order", () => {
    // The full row prefix is the anchor: `| `info` |` also appears in the
    // colour-role table, so the bare role cell is not unique in this document.
    const positions = statusTones.map((tone) =>
      markdown.indexOf(`| \`${tone}\` | \`${tone}\` / \`${tone}Foreground\` |`),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });
});
```

### 4.8 Documentation sentences

`docs/tokens.md`, "For documentation sites", after the `textRoles` paragraph:

> `statusTones` and `platformNames` index the remaining catalogues: the four
> status families in documentation order, and the four platform variants in
> toggle order (macOS · Linux · Windows · Default). A docs table or a platform
> toggle iterates them instead of retyping names.

`packages/tokens/README.md`, "For documentation sites", after the `textRoles`
paragraph:

> `statusTones` and `platformNames` do the same for the four status families and
> the four platform variants, in documentation and toggle order.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; 13 files, 597 + 4 new tests = 601
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

If the number differs, record the observed number, not the prediction.

## 6. STOP conditions

Stop and report if:

- `PlatformName` appears in a module that cannot import `platform-types.ts`
  without a runtime cycle — do not move data around to force it; report the
  cycle instead;
- the existing `docs/tokens.md` status table has a different row shape than
  §4.7 — re-read the table and update this plan before editing the test;
- a test fails because the document and the implementation disagree — decide
  which is right per §3, never loosen the assertion;
- you are about to add a fifth platform, tone or role — out of scope.

## 7. Test plan

- **Membership**: `platformNames` covers every key of `platformStyles` and
  `platformTypes`; the set has no duplicates.
- **Order**: the literal toggle order is pinned, so a reorder is a visible,
  intentional change.
- **Type derivation**: deleting a name from `platformNames` removes it from
  `PlatformName`, so the registries stop type-checking — the union cannot list
  a platform the index omits.
- **Docs drift**: the status table and the platform-row order fail if the
  document drops, reorders or mistypes an entry.
- **Able to fail**, prove both directions with edits and record the observed
  output in the commit message (`scripts/verify-two-directions.sh` needs `jj`,
  which is not installed here):
  1. remove `"win32"` from `platformNames`, run the package suite, observe the
     platform membership test and the `PlatformName` type errors, restore;
  2. change `` `success` | `success` / `successForeground` `` to
     `| \`success\` | \`success\` / \`successForeground\` |` with a wrong soft
     role in `docs/tokens.md`, observe the status-table test fail, restore;
  3. move the `warning` row above `success` in `docs/tokens.md`, observe the
     order test fail, restore.
- Do not claim a direction that was not run.

## 8. Acceptance criteria

- `platformNames` and `statusTones` are public, typed, documented, and exported
  from the package root.
- No ordered list of platforms or tones is retyped in `packages/tokens/src`.
- `docs/tokens.md`'s status table and platform order are guarded.
- Both documents name the indexes in "For documentation sites".
- `nub run --filter @gpuixui/tokens check-types`, the package suite, `nub run
  check`, `nub run lint` and `nub run test` exit 0, and the failing directions
  were observed.
