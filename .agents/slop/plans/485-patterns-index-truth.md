# 485 — The patterns index names the real blocker

**Phase:** F (docs truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 427 (the pattern contract), 461 (the Tier 2 pages), 463 (the
Tier 2 truth pass), 465 (record limitations)

## 1. Why

`apps/docs/content/docs/patterns/index.mdx` says:

> A confirmation flow, a command palette and an inspector workspace appear once
> the components they compose are implemented and proven.

That was true when plan 427 wrote it. It is false now: `ConfirmDialog`,
`CommandMenu`, `Dialog` and the form parts are `done` rows with native
behaviour suites, and their component pages ship. What those two patterns still
lack is **one runnable composed example** — the cross-team row in `TODO.md`
(“Components/examples: provide one real composed source…”). The inspector
workspace is different again: it waits on `packages/docking`, which does not
exist.

The sentence therefore sends a reader to the wrong blocker — it implies the
components are unfinished. This plan states the three facts separately and
adds a prose guard so the stale wording cannot return.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/patterns/index.mdx` | Replace the “Still to come” paragraph with the measured blockers. |
| `apps/docs/src/prose-truth.test.ts` | Add a guard that fails on the stale claim, derived from the registry's shipped records. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `TODO.md` | Add and tick the row in the docs workstream; keep the cross-team example row unchanged (it is still owned by `components`). |

## 3. The corrected prose

```mdx
## Still to come

The confirmation flow and the command palette have every component they need —
`ConfirmDialog`, `CommandMenu`, `Dialog`, the form parts and the toast system are
implemented and native-tested. They wait on one **runnable composed example**
(`ConfirmDialog` + a form + `Toast`; `CommandMenu` + `Dialog`), because a pattern
page is never assembled from separate component demos.

An inspector workspace waits on `packages/docking`, which does not exist yet.

A pattern is never assembled from browser imitations and presented as working
native behaviour.
```

## 4. The guard

`prose-truth.test.ts` already holds wording-class guards (the playground one is
its precedent). Add one that reads the patterns index and fails on the class of
sentence that claims the components are the blocker:

```ts
/** The wording plan 427 shipped: the components were the blocker. */
const stalePatternClaims = [
  /once the components they compose are implemented/i,
  /components? (?:are|is) not (?:yet )?implemented/i,
];

it("does not tell a reader a shipped pattern component is the blocker", () => {
  const found = stalePatternClaims.filter((claim) => claim.test(patternsIndex));
  expect(found).toEqual([]);
});
```

The check is narrow on purpose: the precise fact (which components are `done`)
lives in the registry and is already guarded by `registry.test.ts`; this guard
only prevents the specific drift sentence from coming back.

## 5. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `nub run --filter docs test` | pass; the new guard fails on the old sentence when it is restored |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run smoke:build` (`nub run --filter docs smoke:build`) | exit `0`; the patterns index still renders |

Two-direction proof: restore the old paragraph, run the docs tests, and observe
the new test fail by name; apply the corrected paragraph and it passes.

## 6. STOP conditions

- A registry fact contradicts the new prose (a named component is not `done`):
  stop and re-derive the sentence from `apps/docs/src/component-meta/entries.ts`.

## 7. Progress (2026-10-18)

- The paragraph now names the composed-example gap for the confirmation flow and
  the command palette, and `packages/docking` for the inspector workspace.
- The guard fails on the shipped sentence and passes on the corrected one.
- `nub run --filter docs test`, `nub run check`, `nub run lint` and
  `nub run test` pass.

## 8. Acceptance

- The patterns index no longer implies a shipped component is unfinished.
- The guard is proven in both directions and the plan index / `TODO.md` are
  current; the commit is pushed on `agent/docs-site`.
