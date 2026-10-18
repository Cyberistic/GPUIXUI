# Blocker: three `primitives` agents wrote one worktree (B3, recurrence)

**Discovered:** 2026-10-18 04:20–04:30 by the `primitives` session
`ses_eb373a337ffeUOwab1KCIMlBqh` (04:07 batch, `deepseek-braven/deepseek-flash`).

**Severity:** high. It is AGENTS §6's one-writer rule broken again, and this
time two peers were **committing** while a third read the same tree.

## What was measured

`opencode serve --service` hosted three live `swarm:primitives` sessions in
`workspaces/primitives` (the same query as plan 022 §1):

```sh
sqlite3 ~/.local/share/opencode/opencode.db \
  "select id, (select count(*) from session_message m where m.session_id = s.id) as msgs
     from session_v2 s
    where directory like '%workspaces/primitives' and time_idle is null;"
```

| Session | Created | Messages at 04:27 | 30 s later |
| ------- | ------- | ----------------- | ---------- |
| `ses_eb39af5b6…` | 03:24 | 142 | **144** (live) |
| `ses_eb37936ab…` | 04:01 | 76 | **79** (live) |
| `ses_eb373a337…` (this one) | 04:07 | 54 | 54 (running tools) |

Only one `opencode run` client existed for the workstream (`pid 2810`, the
04:07 batch) — so the 03:24 and 04:01 turns outlived their CLI calls, exactly
as plan 022 describes.

The tree moved under this session:

| Time | Observation |
| ---- | ----------- |
| 04:08 | `912f7c3 fix(primitives): an invalid field paints its border, not its surface` |
| 04:20 | `3fe2496 docs(primitives): close plan 091 with the verified suite counts` |
| 04:23 | `a1426fe test(primitives): mount every registered example, both themes` |
| 04:25 | `129f381 docs(primitives): count the examples parity guard` |
| 04:27 | a peer is writing `093-accessible-name-matrix.md` and `runtime/name.runtime.test.tsx` |

A concrete collision: this session wrote an untracked
`.agents/slop/plans/092-rating-hover-preview.md` at 04:24; a peer's
`git add -A` swept it into `a1426fe` at 04:23–04:25 while the number `092` was
also claimed by the peer's `092-examples-suite-parity.md`. The file was never
indexed, and two plans now share a number.

## What this agent did

Took the workaround recorded in
`2026-10-17-concurrent-tokens-writers.md` rather than edit a tree two peers
owned:

```sh
git -C ~/GPUIXUI worktree add workspaces/primitives-hover \
  -b agent/primitives-hover agent/primitives   # tip 0acb63c
nub install
```

There it delivered plan **094** (`Rating`'s hover preview — the docs' "no cheap
star-under-the-pointer query" limitation was false) with:

- `nub run check` → exit `0`
- `nub run lint` → exit `0`
- `nub run test` → exit `0` (primitives offline 38 files / 439 tests)
- `nub run --filter @gpuixui/primitives test:runtime` → exit `0` (20 / 269)
- the two-direction proof in plan 094 §7.

`packages/primitives/**`, `COMPONENTS.md`, `TODO.md` and the plan index in the
shared tree were left untouched by this session.

## Outcome: the same task was claimed twice

At 05:12 a peer landed `b480eae feat(primitives): Rating previews the star under
the pointer` on `agent/primitives` — from the **stray plan file** `a1426fe` had
swept into its tree, renumbered to `094-rating-hover-preview.md`. It is the same
task this branch implemented, with one extra case (a preview already pending when
the control becomes inert is ignored) and five runtime tests.

So `agent/primitives-hover` is **superseded**: do **not** merge its code. The
shared plan `094` on `agent/primitives` is authoritative. This branch remains as
the evidence for B3 and the workaround, and its code is a second implementation
of the same plan — the clearest possible demonstration of what two writers on
one queue costs.

The peer's `094` and this branch's `094` are two versions of one plan (the
shared one was seeded from this branch's file). A merge would duplicate the plan
row and the helper; no merge is needed.

## Merge note (historical)

When one writer owns `workspaces/primitives`, only the blocker note from this
branch is worth keeping:

```sh
git -C ~/GPUIXUI/workspaces/primitives merge agent/primitives-hover
```

The expected conflicts are the plan index, `TODO.md` and the Rating files; the
resolution is to take the shared tree's version of everything except
`.agents/slop/blockers/2026-10-18-concurrent-primitives-writers.md`.

## The fix (unchanged, not this workstream's paths)

Plan `022-swarm-single-writer.md` §5: pin `opencode run --session
swarm-<workstream>` in the supervisor's generated runner, count live server-side
sessions in `agent_alive`, and reap a session whose `directory` equals a
worktree that already has one. Until that lands, every workstream re-acquires a
duplicate.
