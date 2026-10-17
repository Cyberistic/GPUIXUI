# 117 — Tier 2 verification, inventory and the completion gate

- **Phase:** C (gate) and F (re-run)
- **Workstream:** components · **Owns:** `packages/components/**`, Tier 2 rows of `COMPONENTS.md`
- **Depends on:** 110–116

A component is not done because it renders. This plan defines the gate every
Tier 2 component passes, and the automated check that keeps the inventory honest.

---

## 1. The completion checklist (per component)

Copy this into the PR/commit body and tick it. A row may only say `done` when
every line is true.

- [ ] **Code** — public API in plan 110 §8, JSDoc on every export, no literal
      colour, controlled + uncontrolled where it owns state.
- [ ] **Logic test** — if the component has arithmetic/state (`collection`,
      `pagination`, `accordion`, `breadcrumb`, `menu`, `combobox`, `toast`,
      `validation`), a pure-logic suite exists and fails on regression.
- [ ] **Behaviour test** — rendered in the native GPUix test renderer, driven by
      `simulateClick`/`simulateKeyDown`, asserting focus, text, bounds or style.
      Not a "renders without throwing" test.
- [ ] **Both themes** — at least one assertion per theme proving the component
      reads the token layer (`backgroundColor === theme.color.<role>`).
- [ ] **Disabled / loading / empty / error** — whichever the component has, a
      test proves the state is reachable and inert.
- [ ] **Keyboard** — every documented key has a test, or the docs state that the
      component has no keyboard behaviour.
- [ ] **Example** — `examples/<name>.example.tsx`, realistic, wired to real
      state.
- [ ] **Docs page** — `docs/<name>.mdx` with description, variants, usage, API
      table, keyboard, a11y/limitations, related components.
- [ ] **Inventory** — `meta` record + `COMPONENTS.md` row updated in the same
      commit.
- [ ] **Limitation** — anything the runtime cannot do is recorded with evidence
      (file:line of the missing capability), not softened into "not supported
      yet".

## 2. Inventory records — `src/inventory.ts`

Each component module exports its record; `src/inventory.ts` collects them.

```ts
export interface ComponentMeta {
  /** Exactly the label used in COMPONENTS.md. */
  readonly name: string;
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly status: "todo" | "wip" | "done" | "blocked" | "unsupported";
  readonly gpuixSupport: "yes" | "partial" | "no";
  /** Empty array when there is no limitation. Never omit the field. */
  readonly limitations: ReadonlyArray<string>;
  readonly docs: string;      // "docs/card.mdx"
  readonly example: string;   // "examples/card.example.tsx"
}

export const inventory: ReadonlyArray<ComponentMeta>;
```

## 3. `src/inventory.test.ts` — the check that can fail

Uses `node:fs` (allowed in tests) and `node:path`. Asserts, for every record:

1. `docs` and `example` files exist on disk.
2. `COMPONENTS.md` (repo root, resolved from this package) contains a row whose
   first cell is `name` and whose cells include `status` and `gpuixSupport`.
3. `status: "done"` implies a co-located `src/<file>.test.tsx` exists for that
   component (the record gains a `testFile` field for this — add it to §2).
4. `limitations` is present and is an array (empty when none).
5. No duplicate `name` and no duplicate `docs` path.
6. Every Tier 2 row in `COMPONENTS.md` has a matching record — this catches a
   component that was added to the docs but not the inventory, and the reverse.

This test fails if someone marks a component `done` without a test, writes a
docs page that does not exist, or edits `COMPONENTS.md` and forgets the record.
Its header comment says exactly that.

## 4. Both-theme matrix

Run once per component in `dark` and `light` (plan 110 §10 helper):

| Component | Assertion that must change with the theme |
| --------- | ------------------------------------------ |
| Card | `backgroundColor` = `color.card` |
| Badge | fill/text per variant |
| Avatar | fallback `backgroundColor` = `color.muted`; status dot colour |
| Alert | tone background + border |
| EmptyState | title `color`, description `color.mutedForeground` |
| List | selected row `color.muted`, hover state declared |
| Dialog / Confirm | content `backgroundColor` = `color.popover`; backdrop = `color.overlay` |
| Popover | content `backgroundColor` = `color.popover` |
| Dropdown / Context menu | content background + destructive item colour |
| Command menu | dialog background + highlighted row |
| Tabs | active trigger `color.background`, inactive `color.mutedForeground` |
| Accordion / Collapsible | open content text colour |
| Breadcrumb | link `color.mutedForeground`, current page `color.foreground` |
| Pagination | active page `color.primary` / `color.primaryForeground` |
| Toast | card `color.popover`, tone bar |
| Field | error border `color.destructive` |
| SearchInput | placeholder `color.mutedForeground`, border `color.input` |
| Combobox | popup `color.popover`, selected row |

If a component cannot read the theme (for example it hard-codes a colour), this
matrix fails. That is the point.

## 5. Native runtime evidence

The native test renderer (`@gpuix/react/testing`) dispatches through GPUI's real
hit-testing and event pipeline, which is the "verified compatible test
environment" AGENTS.md §4 allows.

### 5a. Environment matrix (recorded 2026-10-17)

| Host | Native renderer | How the suite behaves |
| ---- | --------------- | --------------------- |
| macOS arm64 | available | behaviour suites run |
| Linux x64 (glibc) | available | behaviour suites run |
| Windows x64 | available | behaviour suites run |
| **macOS x64 (this machine)** | **unavailable** | behaviour suites skip with a recorded reason; logic suites run |

GPUix ships no `darwin-x64` native binary and its WASM build exports no test
renderer. Evidence and the alternatives are in `TODO.md` → Blockers. This is an
environment limitation, not a library limitation: the code under test is the
same, and the suites are runnable unchanged on a supported host.

### 5b. The one rule that survives the limitation

Never let a missing renderer look like a passing test. `src/runtime.test.tsx`
always runs and asserts the environment is one of the states above:

```tsx
const state = hasNativeTestRenderer
  ? "available"
  : process.platform === "darwin" && process.arch === "x64"
    ? "unsupported-host"
    : "missing";

it("knows why the native renderer is or is not available", () => {
  expect(state).not.toBe("missing"); // missing on a supported host is a failure
});
```

Behaviour suites then use `describe.skipIf(state !== "available")` **and** state
the reason in the file header and the test title suffix. A skipped suite is
visible in the output; it is never silent.

### 5c. Visual check (when the renderer is available)

- `renderer.captureScreenshot(path)` into `.agents/slop/evidence/` (agent state,
  not repo content), open the PNG, and confirm: text is not clipped, the surface
  is not transparent, focus is visible, and the layout has no accidental
  overlap. Delete or leave unsaved; it is evidence for the worker, not a gate.
- Record one line in the commit body: "screenshot: dialog dark — ok".

**Playground smoke (owned by the playground workstream).** Add a TODO task (do
not edit `apps/playground`):

> playground: mount each Tier 2 example from `@gpuixui/components/examples` and
> add a smoke script that opens/closes a dialog, a menu and a toast.

Until that lands, the native renderer suite is the evidence, and the docs say so
honestly.

## 6. Full gate

Run from the worktree root, in this order, and paste the last line of each:

```
nub install
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run check:tests
nub run lint
nub run fmt
nub run check
nub run test
```

Expected:

- `check-types`: exit 0, no output.
- `test` (package): exit 0; every suite ran; the runtime guard is present; no
  `describe.skip`; zero skipped tests.
- `check:tests`: `tests: every test asserts something, and nothing asserts itself`.
- `lint`: exit 0.
- `fmt`: exit 0 (no diffs).
- `check`: all of the above via the root script.
- `test` (root): exit 0 for every workspace that has tests.

If the root `check`/`test` fails inside another workstream's package, report it
and do **not** fix it here (AGENTS.md §6).

## 7. Docs truth pass

For each docs page, re-read it against the code and delete any claim the code
does not implement. Specifically check:

- every prop in the API table exists with the documented type and default;
- every keyboard key listed has a test;
- every limitation is still true (a limitation that has been fixed is a lie in
  the other direction);
- no example is described as "runs in the playground" until it does;
- the preview is labelled as a docs-site illustration (the native runtime cannot
  be embedded in Fumadocs), never presented as a live native surface.

## 8. Tier 2 status report

At the end of the phase, write this table into the commit body and mirror the
statuses into `COMPONENTS.md`. Honesty over completeness:

| Component | Status | Evidence |
| --------- | ------ | -------- |
| Card, Badge, Avatar, Alert, EmptyState, List | … | tests + example + docs |
| Dialog, ConfirmationDialog, Popover | … | native focus/dismiss tests |
| Tabs, Accordion, Collapsible, Breadcrumb, Pagination | … | logic + native tests |
| DropdownMenu, ContextMenu, CommandMenu | … | native keyboard tests |
| Toast, Field (inline validation) | … | TestClock + native tests |
| SearchInput, Combobox | … | keystroke + selection tests |
| Date / time picker | `todo` | design in plan 116 §5 |

## 9. STOP conditions

1. `inventory.test.ts` cannot read `COMPONENTS.md` because the test runs from a
   different working directory → resolve the path from `import.meta.url`
   (`new URL("../../../COMPONENTS.md", import.meta.url)`), never `process.cwd()`.
2. A component's theme assertion passes in both themes because the test compares
   against the same computed value (a tautology) → the test is wrong; assert
   against the two *different* theme constants explicitly.
3. `nub run test` at the root skips a package with no test script → report the
   package; do not add a fake test to make the run green.
4. A skipped native test would let the suite pass with no renderer → forbidden.
   The runtime guard in §5b must be the only place that decides, and it must
   fail on a supported host with a missing renderer.

## 10. Acceptance criteria

- [ ] Every Tier 2 component passes §1.
- [ ] `inventory.test.ts` passes and would fail if a `done` row lost its test.
- [ ] Both-theme assertions exist for every row in §4.
- [ ] Full gate green, with the command output recorded.
- [ ] `COMPONENTS.md` Tier 2 section is accurate, including what is not done.
- [ ] Playground smoke recorded as a TODO for its owner.
