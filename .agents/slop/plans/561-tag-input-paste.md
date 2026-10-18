# 561 — A pasted comma-separated tag list commits every token

**Owner:** components workstream · **Phase:** F (integration and polish) ·
**Number:** 561 — `560` is taken in another worktree, so this is the first free
number across every worktree.

## 1. The bug being guarded

`docs/tag-input.mdx` promises `Pasting "a,b"` adds **both** tokens. The component
does not: `TagInput.editDraft` commits every segment except the last and keeps
the last as the draft, so one `onChange` carrying `"a,b"` produces
`onValueChange(["a"])` and leaves `"b"` in the field. The user has to press Enter
to get the second token, and chips appear only after that extra action.

The existing native test types **one character at a time**, so the comma path is
the incremental one: typing `"a,"` reports `["a"]`, then typing `"b"` leaves
`"b"` as a draft by design. No test sends a bulk change — the shape a paste
delivers.

Why the incremental rule must stay: a typed comma means “commit what is before
it, keep typing the rest”. A bulk change that already contains a non-empty tail
is the paste shape, because the comma keystroke would have produced an empty
tail first.

## 2. Exact change

### 2.1 `packages/components/src/tag-input/logic.ts`

Add the draft rule next to `splitDraft`:

```ts
/** What one field edit contributes: tokens to add, and the remaining draft. */
export interface DraftEdit {
  readonly add: ReadonlyArray<string>;
  readonly draft: string;
}

/**
 * One `onChange` value: a single segment is still being typed, an empty tail is
 * a typed comma, and a non-empty tail after a comma is a bulk insert (paste),
 * where every segment is already complete.
 */
export const editDraft = (text: string): DraftEdit => {
  const segments = Str.split(",")(text);
  if (Arr.length(segments) === 1) return { add: [], draft: text };
  const tail = Option.getOrElse(Arr.last(segments), () => "");
  if (tail === "") {
    return {
      add: splitDraft(
        Arr.join(Arr.take(segments, Arr.length(segments) - 1), ","),
      ),
      draft: "",
    };
  }
  return { add: splitDraft(text), draft: "" };
};
```

`Option` is already imported; `Str`, `Arr` are already imported.

### 2.2 `packages/components/src/tag-input.tsx`

Replace the local `editDraft` body with the pure rule:

```ts
const applyDraft = (text: string): void => {
  const edited = editDraft(text);
  add(edited.add);
  setDraft(edited.draft);
};
```

Import `editDraft` from `./tag-input/logic.js`. Keep the context field name
`editDraft: applyDraft` so the field part is unchanged.

No other behaviour changes: the `disabled` guard, duplicate/max rules and the
Enter path stay as they are.

## 3. Tests

### 3.1 `src/tag-input/logic.test.ts` (the regression guard)

```ts
describe("editDraft", () => {
  it("keeps a single typed segment as the draft", () => {
    expect(editDraft("des")).toEqual({ add: [], draft: "des" });
  });

  it("commits before a typed comma and keeps the tail empty", () => {
    expect(editDraft("a,")).toEqual({ add: ["a"], draft: "" });
  });

  it("commits every token in a pasted list", () => {
    expect(editDraft("a,b")).toEqual({ add: ["a", "b"], draft: "" });
    expect(editDraft(" a , b ")).toEqual({ add: ["a", "b"], draft: "" });
  });

  it("does not add whitespace-only tokens from a paste", () => {
    expect(editDraft(" , ,a")).toEqual({ add: ["a"], draft: "" });
  });
});
```

Import `editDraft` in the existing import list.

Before the fix the third case fails: `editDraft` does not exist. If the old body
is pasted into the pure helper (commit-then-keep-tail), it returns
`{ add: ["a"], draft: "b" }` for `"a,b"` and the case fails.

### 3.2 `src/behaviour/tag-input.test.tsx`

Keep the existing typed-comma case unchanged (it must still pass through the new
rule). No native paste simulation exists in 0.10.0 (`nativeSimulateKeyDown` is
one key), so the paste shape is guarded at the rule that consumes the field's
change value. Record that in the test comment rather than inventing a native
paste API.

## 4. Both-direction proof

```sh
cd packages/components
nubx vitest run src/tag-input/logic.test.ts
# expected: all cases pass, including the new "pasted list" case
```

Mutation: replace the non-empty-tail branch with the old
`setDraft`-equivalent result (`{ add: splitDraft(prefix), draft: tail }`) → the
`"a,b"` case fails with `{"add":["a"],"draft":"b"}`. Restore it.

Native wiring: run the existing typed-comma case and the Enter case; both must
still pass.

## 5. Docs and inventory sync

- `packages/components/docs/tag-input.mdx` → the token-rules table stays “Pasting
  `"a,b"` adds both tokens” (now true); add one sentence under it: a pasted list
  commits all tokens in one change, while a typed comma keeps the remainder as
  the draft.
- `COMPONENTS.md` → `Tag / token input` row: say a pasted comma list commits every
  token in one change.
- `TODO.md` → add and tick a Tier 2 hardening row for plan 561.
- `.agents/slop/plans/README.md` → index this plan.
- `PLAN.md` → no decision or ADR needed.
- No native test count changes; the inventory test stays at 15 native tests.

## 6. Commands and expected results

From `packages/components`:

```sh
nubx vitest run src/tag-input/logic.test.ts
# expected: 14 passed (10 existing + 4 new)

nubx vitest run --config vitest.behaviour.config.ts src/behaviour/tag-input.test.tsx
# expected: 14 passed, 1 pre-existing plan-540 binding failure
# (the chip removal control focus-ring case), unchanged

nub run test
# expected: 41 files, 421 tests, all pass
```

From the repo root:

```sh
nub run check
nub run lint
```

## 7. STOP conditions

Stop and report rather than loosening a test if:

- the typed-comma native case reports both `"a"` and `"b"` — the rule lost the
  incremental distinction; record the observed call;
- a paste of `" , ,a"` adds an empty token — the rule must go through
  `splitDraft`, not raw `Str.split`;
- the max/duplicate native cases change — `addTokens` was not modified, so this
  would mean the wiring bypassed it;
- the native suite's count changes — this plan adds no native case.

## 8. Acceptance

- The new pure case fails with the old commit-then-keep-tail rule and passes with
  `editDraft`.
- `TagInput` uses the pure rule; all 15 native tag cases keep their status.
- Unit suite, `nub run check` and `nub run lint` pass.
- Docs, `COMPONENTS.md`, `TODO.md` and the plan index record the fix.

## 9. Observed (2026-10-19)

- New pure cases: `14 passed` in `logic.test.ts` (10 existing + 4 new).
- Mutation (old commit-then-keep-tail branch): `2 failed` — the `"a,b"` case
  reported `{ add: ["a"], draft: "b" }`, and `" , ,a"` reported
  `{ add: [], draft: "a" }`.
- The native typed-comma and Enter cases still pass; no native case count
  changed.
