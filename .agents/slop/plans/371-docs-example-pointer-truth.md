# 371 — Docs truth: the example pointer names what this package verifies

**Phase.** F — integration and polish (docs truth).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 117, 330, 333, 335, 337, 347 (playground evidence).
**Status.** planned 2026-10-18.

## 1. Why this plan exists

Seventeen `packages/components/docs/*.mdx` pages say their runnable example is
"which the native playground mounts". This package cannot verify another app's
catalogue, and the claim is currently false for most of those families: the
playground's plans `330`, `344`, `346` mounted the overlays, foundation/navigation
and choice/form families, and plan `347` is still mounting the remaining twelve.
The playground recorded the defect in its own `TODO.md` ("docs truth": 15 pages,
the registry/wording half stays with `components`).

What *is* verified from this package: `examples/index.ts` registers every
example one-to-one with its docs page (`src/inventory.test.ts`) and
`src/behaviour/examples.test.tsx` mounts all of them in the real renderer
(plan `330`). That is the honest pointer.

## 2. What will change

Replace the playground claim in every affected page with the verified one:

> The runnable build is `examples/<id>.example.tsx`, registered in
> `examples/index.ts` and mounted by the package's native example suite
> (`src/behaviour/examples.test.tsx`).

Pages: `preview-card`, `countdown`, `drawer`, `navigation-menu`, `inline-edit`,
`hotkey-recorder`, `color-picker`, `mention-input`, `message-scroller`,
`carousel`, `form`, `stepper`, `fieldset`, `timeline`, `tag-input`,
`keyboard-shortcuts`, `card`, `message`, `chat` (19 occurrences / 17 files).

Two pages keep their extra sentence after the new pointer:
`message-scroller` ("It appends rows and streams a reply token by token."),
`message` and `chat` (their simulation sentences), and `form` (the button
stand-in note).

`keyboard-shortcuts` keeps the macOS/Windows comparison as a property of the
example, not of the playground.

No code changes; no public API changes.

## 3. Exact edit

For each page, the sentence

```
The runnable build is `examples/<id>.example.tsx`, which the native
playground mounts.
```

becomes

```
The runnable build is `examples/<id>.example.tsx`, registered in
`examples/index.ts` and mounted by the package's native example suite
(`src/behaviour/examples.test.tsx`).
```

`card.mdx` says "The full build is the `card` example in
`packages/components/examples/card.example.tsx`…" — keep that framing and the
new clause.

## 4. Exact commands and expected results

```sh
grep -rn "playground" packages/components/docs
```

Expected: no match. A documentation pointer that depends on another app is gone.

```sh
nub run check
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
```

Expected: exit `0`; the inventory test still maps every docs page to an example
and the example suite still mounts the registry. The docs-count check is
unaffected (no test count changes).

## 5. STOP conditions

1. A page's example is **not** in `examples/index.ts`. STOP: the registry is the
   authority; fix the registry or the page, and record which.
2. The replacement makes a sentence ungrammatical because the page's example
   sentence carries extra clauses. Rewrite that page by hand and keep the
   verified pointer.
3. A docs build check (outside this package) expects the old wording. It is the
   docs-site workstream's page; record it in `TODO.md` instead of editing there.

## 6. Acceptance

- No docs page claims another app mounts its example.
- Every pointer names `examples/index.ts` and the native example suite.
- Gates pass; plan indexed and `TODO.md` ticked.

## 7. Result

_To be filled after execution._
