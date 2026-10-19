# 695 — The blockquote's painted body role

> **Status: executed 2026-10-19.** `nativeTextOverFades` now holds the blockquote
> body in the run colour the reference runtime paints (`text`) as well as the
> container's `textMuted`; the new regression fails on the pre-fix tree and
> passes after it. No colour, pair count, floor or shipped theme moves.
> Execution evidence is at the end of this plan.

## Why

`nativeTextOverFades` publishes the blockquote composition as
`textMuted@1 > accent@0.05` at the body floor. That entry came from plan `583`,
and plan `588` deferred a reconciliation on the premise that "the runtime sets
`text_muted` on the blockquote container". The container does set it
(`references/gpuix/packages/native/src/markdown/render.rs:262`), but every text
run inside it carries its own colour:

- `flatten_runs` assigns `color: theme.text` to every non-code run and
  `theme.code_text` to inline code (`render.rs:126–135`);
- `text_element` → `flat_text_element` passes `Some(flat.runs.clone())` to
  `SelectableText` (`render.rs:387–405`);
- `SelectableText` builds `StyledText::new(text).with_runs(runs)`
  (`text/paint.rs:313`), and a `StyledText` run colour wins over the ancestor's
  `text_color`.

So a blockquote paragraph paints `foreground`, not `mutedForeground`. The
container colour is left for any child that does not pass runs — none of the
markdown text blocks do.

**Measured gap.** A probe on the shipped Linux dark variant, changing one role:

```ts
extendTheme(getPlatformTheme("linux", "dark"), {
  colors: { foreground: "#bebebe" },
})
```

paints a blockquote body at **6.315:1** on the `card`, `popover` and `muted`
tones (the body floor is 7:1) while `themeNativeTextFailures(theme)` returns no
`wash: "primaryText"` entry at all — the only blockquote entry names
`mutedForeground`, which this theme leaves at its shipped value. The authored
body ink is unmeasured.

The old entry is not a guarantee hole in the shipped sets: `mutedForeground` is
a step dimmer than `foreground` on every shared surface, so measuring muted is
conservative. It is a **wrong diagnostic**: a consumer whose blockquote body is
dimmed is told to move the container role, and a consumer who dims the actual
run colour is told nothing.

The reference source is the evidence base this workstream already uses for the
native document (plans `583`, `588`, `649`). The published `@gpuix/native`
0.10.0 package ships a binary and no Rust sources, so the pinned inheritance
cannot be inspected; that is why the existing container entry is **kept** rather
than replaced.

## Decision

1. Add `text@1 > accent@0.05` to `nativeTextOverFades` before the container
   entry. The painted run colour is the first composition; the container
   fallback follows it.
2. Keep `textMuted@1 > accent@0.05` and state why: the container names
   `text_muted`, the pinned binary may inherit it, and holding both roles keeps
   the guarantee honest across that uncertainty.
3. Do not add a new pair list, check kind, pair count or colour. The two
   compositions live in the seventh check (`nativeText`), which already owns the
   runtime's fixed washes.

## Exact files and changes

### 1. `packages/tokens/src/native-text-check.ts`

Add the run-colour entry to `nativeTextOverFades`:

```ts
  {
    field: "text",
    opacity: 1,
    wash: "accent",
    washOpacity: 0.05,
    pairClass: "body",
  },
  {
    field: "textMuted",
    opacity: 1,
    wash: "accent",
    washOpacity: 0.05,
    pairClass: "body",
  },
```

Extend the JSDoc above the list:

```md
 * A blockquote is the one composition with two roles. Its paragraph runs carry
 * `theme.text` (`foreground`) — `flatten_runs` gives every non-code run that
 * colour and `SelectableText` paints the runs — while the container also names
 * `text_muted` on the reference renderer. The pinned 0.10.0 binary is not
 * inspectable, so both the painted run colour and the container fallback are
 * held over the 5% accent wash at the body floor.
```

Update the list's short description ("A blockquote paints its body over 5% of
the accent ink") to name both roles.

### 2. `packages/tokens/src/native-text-check.test.ts`

- The published-fraction case gains the new entry, in emission order:

  ```ts
  "text@1>accent@0.05",
  "textMuted@1>accent@0.05",
  ```

- Keep *reports a blockquote body lost through its own accent wash* (the
  container role) and add its sibling:

  ```ts
  it("reports the body run a blockquote actually paints", () => {
    const planted = extendTheme(getPlatformTheme("linux", "dark"), {
      colors: { foreground: "#bebebe" },
    });
    const failure = themeNativeTextFailures(planted).find(
      (candidate) =>
        candidate.field === "text" &&
        candidate.wash === "primaryText" &&
        candidate.washOpacity === 0.05,
    );
    expect(failure?.role).toBe("foreground");
    expect(failure?.surface).toBe("card");
    expect(failure?.pairClass).toBe("body");
    expect(failure?.ratio).toBeCloseTo(6.315, 2);
  });
  ```

  Pre-fix this finds nothing (the probe returns `[]` for every
  `wash: "primaryText"` entry); post-fix it reports `foreground` on `card`.

- Add a shipped-set case: every set clears the new composition at the body
  floor, so no colour moves.

### 3. `docs/tokens.md`

- The fade paragraph (search for ``a diff line and the blockquote's body on the
  **body** floor``): say the blockquote's **runs** are `text` and that the
  container's `textMuted` is held as well.
- The regression paragraph (search for ``mutedForeground: "#bebebe"``): keep the
  container figure and add the painted role:

  > On `Dark · Linux`, `foreground: "#bebebe"` passes the plain tone pairs and a
  > blockquote's body still measures **6.315:1** on the card, popover and quiet
  > panel through the 5% accent wash, under the 7:1 body floor; the container's
  > `mutedForeground` with the same value measures the same ratio and is held as
  > the fallback the pinned renderer may inherit.

- Add the two entries to the *Verification* `nativeTextOverFades` list if that
  paragraph enumerates them.

### 4. `packages/tokens/README.md`

The native-text paragraph says the runtime's fixed fades are held on every
shipped set. Add one clause: "including a blockquote's body through its 5% accent
wash in both the painted run colour (`text`) and the container's `textMuted`".

### 5. `COMPONENTS.md`

In the **Theme contrast check** row's native-text sentence (the phrase "the
runtime's fixed fades and 3.5% ink wash on every shipped set and surface"), add
"and a blockquote's body in both the painted run colour and the container role".
Keep it to one clause; the row is already long.

### 6. `TODO.md`

Add one completed row under *Design tokens and theming* and move the counter
from `313/390` to `314/391`:

```
`[x]` Hold the blockquote's painted body role — `nativeTextOverFades` measured
`mutedForeground` over the 5% accent wash, but the reference runtime gives every
non-code markdown run `theme.text` and `SelectableText` paints those runs, so a
theme with `foreground: "#bebebe"` on `Dark · Linux` painted a 6.315:1 body on
the card, popover and quiet panel while `themeNativeTextFailures` reported no
accent-wash entry; `text@1>accent@0.05` joins the composition beside the
container's `textMuted` fallback, which is kept because the pinned binary is not
inspectable, and every shipped set already passes (plan 695)
```

### 7. `.agents/slop/plans/README.md`

Add one row to the tokens table:

```
| [695](./695-blockquote-body-role.md) | The blockquote's painted body role | F | 569, 583, 588, 649 | done |
```

Add a short paragraph after the `692` summary stating the contribution and that
no colour, pair count or shipped theme moves.

## Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| New regression only | `cd packages/tokens && nub exec vitest run src/native-text-check.test.ts` | passes with the fix |
| Prove it fails without the fix | remove the `text` entry from `nativeTextOverFades`, rerun the suite | the new case fails (no entry) |
| Package suite | `nub run --filter @gpuixui/tokens test` | 193 files pass |
| Types | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| Whole gate | `nub run check` | exit 0 |

## Test plan

- The new regression is the both-directions proof: it plants the painted run
  colour and requires its entry; the pre-fix tree returns none.
- The existing container regression stays, so the fallback role cannot be
  silently dropped.
- The published-fraction case pins the list's order and the 5% wash, so a future
  edit cannot change the fraction without the documents.
- The shipped-set case shows the new pair moves no colour in any of the 24 sets.
- `docs.test.ts` continues to hold the catalogue's sentences they touch.

## Acceptance

- [ ] `nativeTextOverFades` holds `text@1>accent@0.05` beside
      `textMuted@1>accent@0.05`.
- [ ] The new regression fails without the entry and passes with it.
- [ ] Every shipped set still returns `[]` from `themeFailures`; no colour, pair
      count or floor moves.
- [ ] `docs/tokens.md`, the README, `COMPONENTS.md` and `TODO.md` name the two
      roles and why both are held.
- [ ] `nub run check`, `nub run lint` and the tokens suite pass.

## STOP conditions

- A shipped set fails the new composition → stop and report the set, surface and
  ratio; do not adjust a shipped ink from this plan.
- The pinned runtime is shown to ignore run colours → keep both entries and
  record the evidence in the plan's execution note; do not remove the container
  entry.
- `themeFailures` on the probe theme reports the new entry under a different
  surface than `card` → fix the expectation to the checker's emission order and
  the measured minimum, not the checker.
- A gate fails for a file this plan did not touch → report the output; do not
  fix another workstream's tree.

## Execution (2026-10-19)

`nativeTextOverFades` gains `{ field: "text", opacity: 1, wash: "accent",
washOpacity: 0.05, pairClass: "body" }` before the retained container entry. The
JSDoc names both roles and why the fallback stays.

The new case in `native-text-check.test.ts` plants
`extendTheme(getPlatformTheme("linux", "dark"), { colors: { foreground:
"#bebebe" } })` and requires the `text`/`primaryText`/`0.05` entry: role
`foreground`, surface `card`, ratio 6.315:1. The probe on the pre-fix tree
returned no entry for any `wash: "primaryText"`; with the entry it reports one.
The container case stays and still reports `mutedForeground` at the same ratio.
The published-fraction list is `text@1>accent@0.05` then
`textMuted@1>accent@0.05`.

A shipped-set case measures the composition directly on all 24 sets: the
tightest is **10.360:1** (`Dark · Linux`, `foreground` on the `card`/`popover`/
`muted` + 5% `primaryText` wash) and no set moves. `themeFailures` stays `[]`
for every shipped set.

Gates: `nub run check` exit 0; `nub run --filter @gpuixui/tokens test` 193 files
/ 6744 tests; `nub run lint` exit 0.
