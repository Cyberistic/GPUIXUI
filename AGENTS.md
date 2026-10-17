# AGENTS.md — GPUIXUI repo rules

You are one of Cyberistic's agents. He hates unclean code and hacks. He loves
documentation. LOC IS a measure of quality — the fewer, the better.

## 0. Planning comes first — no exceptions

**The swarm's first deliverable is high-detail implementation plans under
`.agents/slop/plans/`, one per phase and one per package.** Each plan is
self-contained for a *weaker executor*: exact files to create or change, exact
commands to run, expected results, STOP conditions, and a test plan. **No
implementation work starts until those plans exist and are indexed in
`.agents/slop/plans/README.md`.**

Read `MISSION.md` before anything else. It is the source of truth for what this
repo is. `TODO.md` is the source of truth for what is left to do and survives
context compaction and restarts.

## 1. General

- Concise, clean code. No hacks. If a paragraph-long comment is needed to
  justify the code, the code is wrong — find a better way.
- Order of concerns: **secure** (typesafe, fail-safe, auth) → **works and
  effectful** (Effect) → **fast** → **pretty**.
- Shareable logic lives in `packages/` and is reused. Never copy-paste between
  apps. Hoist when a second consumer appears.
- Prefer reading documentation over exploring package source. Most packages
  ship a README that links to the docs.
- If a repo is used as a reference and is not tiny, clone it into
  `references/` (gitignored, linked from `README.md`). Reference clones live at
  the absolute path `~/GPUIXUI/references/` and are **read-only** — never edit
  them. Agent workspaces do not get a copy; read them by absolute path.
- Agent state (plans, scratch, session logs, status) goes under `.agents/slop/`.
  Nothing else may write there.
- Add `// TODO:` comments for work that is not finished, so `rg TODO` finds it.
- Tick finished tasks in `TODO.md`. If the task is not there, add it and tick
  it. Keep the progress bars current. Implementation details do not go in
  `TODO.md` — only tasks worth tracking.
- Keep `README.md` current: it is the ledger and overview of the project.

## 2. Development

- Use **nub** for every script and workspace command — it is the pinned
  `devEngines.packageManager` and the repo runs on **Node 24.18.0**
  (`.node-version`). A bare `node` on this box is old; always go through `nub`
  (or the shim inside a project directory).
- Always use **Effect**; refer to the official docs (https://effectjs.org/docs/).
  See §5.
- Prefer existing libraries. Before installing a new one, check that it is
  actively maintained and widely used, and justify the choice. Do not add a
  big dependency because it is popular in browser React.
- Packages stay modular and reusable; anything tightly coupled to one app stays
  in that app.
- Never silently ignore errors. Never ignore types. Never introduce `any` or a
  "temporary" hack. Surface actionable error messages. Model expected failures
  with Effect instead of throwing.

## 3. Tests

- A test must test something meaningful, not test for the sake of testing.
- **A test has to be able to fail.** `nub run check:tests`
  (`scripts/check-tests.ts`, part of `nub run check`) rejects a test that
  asserts nothing, compares a variable with itself, asserts a literal against
  itself, or asserts back the value the test itself stubbed. A deliberate
  exception is argued on the line: `// check-tests-ok: <why>`. That is the
  floor, not the standard.
- **Every regression fix lands with a test file that fails without the fix and
  passes with it** — state the bug being guarded in the test's header comment.
  Verify both directions (`scripts/verify-two-directions.sh`) before calling it
  done. A fix with no such test is unfinished.
- Tests are vitest, co-located as `src/**/*.test.ts` beside the code, and run
  with `nub run --filter <pkg> test`.
- **Never claim a test passed unless it ran.** Never fake completion to satisfy
  the inventory.

## 4. UI and components

- Before writing a new component, look for an existing one to reuse or match.
  Styling and behaviour must stay consistent across the library.
- The rendering target is **GPUix**, through its React integration. Never
  implement a component as DOM/HTML/CSS-styled React and present it as native.
  Where the runtime lacks a capability, document the limitation with evidence
  and give the strongest honest alternative — never a decorative placeholder
  presented as a working component.
- Tokens are the single source of colour, spacing, typography, radius and
  state. No scattered literals.
- Every component: one responsibility, typed public API, sensible defaults,
  predictable variants/sizes, correct interaction states, a test appropriate to
  its behaviour, a docs page, at least one working example, and an inventory
  record in `COMPONENTS.md`.
- An interaction is not complete until it is tested in the actual native
  runtime (or a verified compatible test environment).

## 5. Effect-first

Domain code is written in Effect-native constructs first; native JS/TS only at
explicit boundaries.

- **Errors are data**: `Effect.Effect<A, E, R>` with `Schema.TaggedError` for
  public/cross-module failures. No `throw` in domain logic, no `try/catch` —
  use `Effect.try` / `Effect.tryPromise`.
- **Absence is `Option`** at boundaries and inside domain code.
- **Decode unknown input with `Schema`** at the boundary (`Schema.Class` over
  `Schema.Struct`).
- **Services**: `Context.Service` + `Layer`, wired in layer composition.
- **No native collection helpers** in domain code (`Arr`, `R`, `Str`, `Order`).
- **No `console.*`** — use `Effect.log*`, spans, metrics.
- **Time/randomness** via `Clock`/`Random`; durations via `Duration`.
- **Runtime execution stays at the boundary** (`Effect.run*` only in
  entrypoints/tests).
- Canonical imports: `import * as Arr from "effect/Array"`, and so on; root
  `"effect"` imports only for `Effect`, `Match`, `pipe`, `flow`.
- The `opencode-effect-enforcer` plugin reviews Effect patterns after every
  write. Treat its findings as a review request: fix valid findings before
  continuing; explain intentional exceptions instead of changing correct code.

## 6. Version control and workspaces

- One writer per tree. Agents work in their own `git worktree` under
  `workspaces/<workstream>/` on branch `agent/<workstream>`. Never edit the
  shared checkout while an agent owns a workstream.
- **The shared checkout's `main` is the integration branch.** A workstream
  merges its own branch into `main` once its plan set is complete and the gates
  in §7 pass, so the plan index, `TODO.md` and `COMPONENTS.md` in the shared
  checkout stay current for the next agent. Resolve conflicts in your own
  branch, never on `main`.
- Commit often with meaningful messages. Small, reviewable commits.

## 7. Completion gate

You are not done if these fail:

- `nub run check`
- `nub run lint`
- `nub run test`
