# 809 — A message row keeps a unique React key when two rows share a name

**Owner:** components workstream · **Phase:** F (correctness hardening) ·
**Depends on:** 110, 117, 200, 201, 207, 772, 799, 802, 806

**Numbering:** `807` was claimed by tokens-theme and the playground in the same
tick (see plan `808`), so this plan's predecessor took `808`; `809` is free
across every worktree on 2026-10-20 (checked with `ls` over every
`workspaces/*/.agents/slop/plans`). Recorded in `PLAN.md` D30.

## 1. Why

Plan `806` named every `Message` section row and explicitly left the React key
collisions for a separate plan. They are real: the three sections derive a key
from caller data, and that data may repeat.

| part | key today | repeat case |
| ---- | --------- | ----------- |
| `MessageToolCalls` | `` `${call.name}-${call.status}-${call.result ?? ""}` `` | the same call run twice with the same result |
| `MessageAttachments` | `attachment.name` | two files called `index.ts` (the `meta` is ignored) |
| `MessageSources` | `source.url` | the same URL cited twice, or two sources with a shared canonical URL |

Measured in this worktree on 2026-10-20 against the installed 0.10.0 binding,
with a temporary probe (`src/behaviour/zz-probe.test.tsx`, deleted by this
plan), by spying on `console.error` while mounting and updating a real
`TestRenderer` tree:

```text
two attachments named "a.txt":
  Encountered two children with the same key, `%s`. Keys should be unique so
  that components maintain their identity across updates. Non-unique keys may
  cause children to be duplicated and/or omitted — the behavior is unsupported
  and could change in a future version.   (twice: mount + update)

two identical tool calls, two sources with one URL: the same warning once each.
```

React documents duplicate keys as **unsupported**: the children may be
duplicated or omitted in a future version. This package's rows are display-only
today, so the painted text still happened to be correct; the invariant is still
broken, the warning reaches every consumer in development, and a later change
that gives a row local state would attach that state to the wrong call.

Scope:

- each of the three sections keys its rows by the array position, which is the
  only identity a caller cannot duplicate (the rows are display-only and hold no
  state, so a reorder only updates props);
- three native cases assert no duplicate-key warning and that the rows still
  paint their own data after an update (message 19 → 22);
- `docs/message.mdx`, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md`
  D30 synced.

**Out of scope** (do not add): a caller-supplied row `id` (an API change with no
current consumer); stable keys for reordered stateful rows (the rows are
stateless); any visible text, name or ordering change; the plan-806 naming rules.

## 2. What exists today (read these first)

- `packages/components/src/message.tsx`
  - `MessageToolCalls` (~line 377): `key={\`${call.name}-${call.status}-${call.result ?? ""}\`}`.
  - `MessageSources` (~line 471): `key={source.url}`; the `testId` already uses
    `index`.
  - `MessageAttachments` (~line 534): `key={attachment.name}`.
- `packages/components/src/behaviour/message.test.tsx` — 19 native cases; imports
  `vi` already (used by the action test), and `renderComponent`, `nodesWithRole`
  and the `Row` helper.
- `packages/components/docs/message.mdx` — the Verification line `(19 tests)`.
- `COMPONENTS.md` — the `Message (AI message row)` row says `19 native behaviour
  tests`.

## 3. Exact changes

### 3.1 `packages/components/src/message.tsx`

1. `calls.map((call, index) => ...)` and `key={index}`.
2. `attachments.map((attachment, index) => ...)` and `key={index}`.
3. `sources.map((source, index) => ...)` already has `index`; `key={index}`.
4. Add one sentence to each part's JSDoc or the module JSDoc: rows are keyed by
   position because a caller may legitimately repeat a call, an attachment name
   or a URL, and the rows are display-only.

No other change: names, order, styles and `testId`s stay as they are.

### 3.2 `packages/components/src/behaviour/message.test.tsx`

- Extend the header comment with the measured duplicate-key warning and React's
  "unsupported" wording.
- Add `afterEach(() => vi.restoreAllMocks())` so a warning spy cannot leak into
  the next case.
- Add three cases after the plan-806 section cases:

  1. **Two attachments with one name paint as two rows.** Spy `console.error`,
     render `MessageAttachments` with `[{name:"a.txt",meta:"1 KB"},
     {name:"a.txt",meta:"2 KB"}]`, rerender with metas `3 KB`/`4 KB`; assert no
     `console.error` call contains `same key`, and the `listitem` names are
     `["a.txt, 3 KB", "a.txt, 4 KB"]`.
  2. **Two identical tool calls paint as two rows.** Two `{name:"search",
     status:"done", result:"3"}` calls; assert no duplicate-key warning and two
     `listitem` names `["search, done", "search, done"]`.
  3. **Two sources with one URL paint as two buttons.** Two sources with the
     same `url` and label; assert no duplicate-key warning and both buttons are
     named `"Open source Spec"`.

  This makes **22** native cases in the file.

### 3.3 `packages/components/docs/message.mdx`

- Limitations: one bullet — a tool call, attachment or citation has no caller
  `id`, so rows are keyed by position; repeating a name or URL is supported and
  does not collapse the rows.
- Verification: `(19 tests)` → `(22 tests)`, naming the duplicate-key coverage.

### 3.4 `COMPONENTS.md`

In the `Message (AI message row)` row: `19 native behaviour tests` → `22 native
behaviour tests`, and one clause after the section-naming sentence: "rows are
keyed by position, so a repeated call name, attachment name or source URL still
paints every row". Keep the cell on one line.

### 3.5 Index and tracking

- Add a row to the components table in `.agents/slop/plans/README.md`.
- Add a ticked `[x]` line under "Tier 2 hardening after the inventory closed" in
  `TODO.md`.
- Append `809` to the overflow sentence in `PLAN.md` D30 (after `808`).

## 4. Test plan

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/message.test.tsx
```

Expected **before** the source change: **3 failed | 19 passed (22)** — every new
case reads the duplicate-key warning; the row-name assertions pass.

Expected after: **22 passed (22)**.

**Both directions** (revert one key at a time, confirm the named case fails,
restore):

1. `key={attachment.name}` → case 1 fails on the warning.
2. The old tool-call key → case 2 fails on the warning.
3. `key={source.url}` → case 3 fails on the warning.

Then the scoped contract suites and the gates from the repo root:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/message.test.tsx \
  src/behaviour/accessibility.test.tsx \
  src/behaviour/examples.test.tsx
nub run test
nub run check
nub run lint
```

All exit 0; unit count unchanged (no logic module changes). Delete the scratch
probe before committing.

No playground smoke scenario mounts a `Message`, so the native `TestRenderer`
read is the evidence; no live window is needed.

**Measured in this worktree, 2026-10-20:**

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/message.test.tsx
# HEAD (all three keys reverted): 3 failed | 19 passed (22)
# after:                          22 passed (22)

nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/message.test.tsx \
  src/behaviour/accessibility.test.tsx \
  src/behaviour/examples.test.tsx
# 3 files passed, 24 tests passed

nub run test    # exit 0; unit 512 in 48 files
nub run check   # exit 0
nub run lint    # exit 0
# full native suite: 1032 passed / 20 failed of 1052 — the same plan-540 classes
```

The first full-suite run reported 21 failures (one extra known position/focus
flake); the clean rerun is the 20 recorded classes above.

## 5. STOP conditions

- A new case passes at `HEAD`: stop and re-measure; another writer may have
  changed the tree.
- React logs a duplicate-key warning from a fixture whose rows are distinct:
  stop and report the key; the fixture is wrong, not the code.
- A painted name, order or `testId` changes: stop; only keys may change.
- The `console.error` spy sees a warning unrelated to keys: ignore it in the
  filter, but if it is a new warning from the component, report it.
- `docs/message.mdx` or `COMPONENTS.md` states a count other than 22 after the
  change: stop and reconcile before committing.

## 6. Acceptance

- No `Message` section emits a duplicate-key warning for a repeated call name,
  attachment name or source URL; every row still paints its own data after an
  update.
- `message.test.tsx` is **22/22 measured on this host**, and the three new cases
  are red at `HEAD` on the warning assertion.
- `docs/message.mdx`, `COMPONENTS.md`, the plan index, `TODO.md` and `PLAN.md`
  D30 agree; `nub run test`, `nub run check` and `nub run lint` exit 0.
