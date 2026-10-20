# 808 — Choosing a navigation link returns focus to its trigger

**Owner:** components workstream · **Phase:** F (focus continuity) ·
**Depends on:** 110, 112, 114, 117, 200, 201, 320, 325, 366, 583, 704, 722, 724,
730, 732, 755

**Numbering:** this plan was written as `807`, but tokens-theme
(`807-elevation-rationale`) and the playground (`807-gradient-backgrounds`)
claimed `807` in the same tick; `808` is free across every worktree on
2026-10-20 (checked with `ls` over every `workspaces/*/.agents/slop/plans`), so
the plan was renumbered to `808`. Recorded in `PLAN.md` D30.

## 1. Why

A `NavigationMenuLink` closes its panel through `requestClose(null)`
(`packages/components/src/navigation-menu.tsx`, the link's `onClick`). The
`null` means "do not restore focus", so the link's own host is unmounted and the
user's keyboard focus is left on **nothing** — the next `Tab` restarts at the
window's first stop. Every other menu-like surface in this package returns focus
to its trigger (Dropdown/Context menu rows, `popover` Escape, the command menu's
opener); the navigation menu does it for Escape but not for a chosen link.

Measured in this worktree on 2026-10-20 against the installed 0.10.0 binding,
with a temporary probe (`src/behaviour/zz-probe.test.tsx`, deleted by this plan):

```text
keyboard: click trigger, focusElement(link-overview), Enter
  onSelect calls: 1, panel gone, focused: Option.none()
pointer:  click trigger, clickCentreOf(link-overview)
  onSelect calls: 1, panel gone, focused: Option.none()
```

`focusedTestId` reads the renderer's focused host, so both paths end with no
host focused. The existing case "runs a link once and closes the panel" asserts
the callback and the closed panel but never the focus, which is why this leaked.

Scope:

- a chosen link requests the close with its **item's trigger value**, so the
  existing `useCloseFocus` machinery returns focus once the close is accepted;
- a caller that focuses its own content in `onSelect` keeps that focus: the
  link's restore runs only when the close left focus on **nothing**, the
  package's "a consumer's focus in the same update wins" rule (plan 708);
- Escape keeps its unconditional return to the trigger, because its restore is
  a dismissal, not an action the app may already have answered;
- three new native cases plus one pin (Navigation menu 30 → 34);
- `docs/navigation-menu.mdx`, `COMPONENTS.md`, `TODO.md`, the plan index and
  `PLAN.md` D30 synced.

**Out of scope** (do not touch): the panel's `aria-labelledby`/`aria-haspopup`
gaps (absent from 0.10.0); hover opening; the trigger-press and outside-press
close paths (both deliberately do not move focus — plans 583/704); the
`NavigationMenuLink` role (`button`, because 0.10.0 has no anchor); any visible
text.

## 2. What exists today (read these first)

- `packages/components/src/navigation-menu.tsx`
  - `NavigationMenuContextValue.requestClose` (~line 82): `(focus: string | null) => void`.
  - The root's `requestClose = useCloseFocus<string | null>(...)` (~line 191);
    its restore ignores `null` and focuses the registered trigger for a value.
  - `dismiss.current = () => requestClose(open)` (~line 311) — Escape.
  - The outside press calls `requestClose(null)` (~line 327).
  - `NavigationMenuTrigger` calls `requestClose(null)` when an open trigger is
    pressed again (~line 524).
  - `NavigationMenuLink` (~line 667) destructures `{ requestClose }` and its
    `onClick` runs `onClick?.(event); onSelect?.(); requestClose(null);`.
  - `useNavItem()` gives the link its item's `value` (already used by the
    trigger).
- `packages/components/src/internal/close-focus.ts` — `useCloseFocus` records a
  token and applies it only on the observed `open -> false` transition, so a
  controlled close the caller refuses leaves focus where it is.
- `packages/components/src/behaviour/navigation-menu.test.tsx` — 30 native
  cases; the `Workspace` fixture has `onSelect` and an `elsewhere` host, and
  `focusedTestId` / `clickCentreOf` come from `../internal/interaction.js`.
- `packages/components/docs/navigation-menu.mdx` — the key table (`Choosing a
  link`), the Accessibility bullets and the Verification line `(30 tests)`.
- `COMPONENTS.md` — the `Navigation Menu` row (grep `| Navigation Menu |`).

## 3. Exact changes

### 3.1 `packages/components/src/navigation-menu.tsx`

1. Replace the string token with one small union, above the context interface:

   ```ts
   /**
    * Where a close sends focus. Escape is a dismissal and always returns to its
    * trigger; a chosen link yields to focus the app has already placed, because
    * its own host is gone by the time the close is observed.
    */
   type NavigationCloseFocus =
     | { readonly kind: "trigger"; readonly value: string }
     | { readonly kind: "link"; readonly value: string };
   ```

2. `requestClose` becomes
   `(focus: NavigationCloseFocus | null) => void` in
   `NavigationMenuContextValue`.

3. The root's hook becomes `useCloseFocus<NavigationCloseFocus | null>` and its
   restore callback gains the guard:

   ```ts
   (focus) => {
     if (focus === null) return;
     const focused = renderer?.getFocusedElementId?.() ?? null;
     // A chosen link closes because the user acted on it; if the app placed
     // focus in the content it opened, that focus wins. The link's own host is
     // already gone, so "nothing focused" is the case to repair.
     if (focus.kind === "link" && focused !== null) return;
     const instance = triggers.current.get(focus.value);
     if (instance !== undefined) renderer?.focusElement?.(instance.id);
   },
   ```

4. `dismiss.current = () => requestClose({ kind: "trigger", value: open });`
   (the guard `open === null` already returned above).

5. Keep the outside press and the trigger's own close at `requestClose(null)`.

6. `NavigationMenuLink` also reads `const { value } = useNavItem();` and its
   `onClick` ends with `requestClose({ kind: "link", value });`.

7. Extend the file's module JSDoc with one sentence: choosing a link returns
   focus to its trigger once the panel has closed, unless the app moves focus in
   `onSelect`.

### 3.2 `packages/components/src/behaviour/navigation-menu.test.tsx`

Extend the header comment with the measured bug (both keyboard and pointer
leave `focused = None`). Add four cases after "runs a link once and closes the
panel":

1. **Returns focus to the trigger when a link is chosen from the keyboard.**
   Click the trigger, `renderer.focusElement(link-overview)`, `simulateKeystrokes("enter")`;
   assert `onSelect` once, the panel gone and `focusedTestId` is
   `Option.some("trigger-platform")`. Red at `HEAD` (`None`).
2. **Returns focus to the trigger when a link is chosen with the pointer.**
   Click the trigger, `clickCentreOf(link-overview)`; same three assertions.
   Red at `HEAD` (`None`).
3. **A consumer that focuses its own control in `onSelect` keeps it.** Render
   `Workspace` with `onSelect` that calls `renderer.focusElement(elsewhere)`
   (assign the callback through a `let` after render); click the trigger and
   the link; assert `focusedTestId` is `Option.some("elsewhere")`. Passes at
   `HEAD` and fails if the restore is unconditional — the guard's pin.
4. **A refused controlled close keeps focus on the link.** Render
   `Workspace value="platform" onValueChange={vi.fn()}` (the caller never
   accepts `null`), focus the link and press Enter; assert `onValueChange` was
   called with `null`, the panel is still painted and focus is still
   `Option.some("link-overview")`. The `useCloseFocus` pin.

This makes **34** native cases in the file.

### 3.3 `packages/components/docs/navigation-menu.mdx`

- Key table: `Choosing a link` → "calls `onSelect` once, closes the panel and
  returns focus to the trigger (an app that moves focus in `onSelect` keeps it)".
- Accessibility: one bullet — a chosen link never leaves focus on the unmounted
  panel; focus returns to its trigger unless the app moved it in `onSelect`.
- Verification: `(30 tests)` → `(34 tests)`, naming the two focus-return paths,
  the consumer-focus pin and the refused-close pin.

### 3.4 `COMPONENTS.md`

In the `Navigation Menu` row: `30 native behaviour tests` → `34 native behaviour
tests`, and add one clause after the link sentence: "choosing a link returns
focus to its trigger unless the app moves focus in `onSelect`". Keep the cell on
one line.

### 3.5 Index and tracking

- Add a row to the components table in `.agents/slop/plans/README.md`.
- Add a ticked `[x]` line under "Tier 2 hardening after the inventory closed" in
  `TODO.md` describing the measurement, fix and counts.
- Append `808` to the overflow sentence in `PLAN.md` D30 (after `806`, with
  `807` recorded as claimed by tokens-theme and the playground).

## 4. Test plan

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/navigation-menu.test.tsx
```

Expected **before** the source change: **2 failed | 32 passed (34)** — the two
focus-return cases read `None`; the consumer-focus pin and the refused-close pin
pass.

Expected after: **34 passed (34)**.

**Both directions** (revert one at a time, confirm the named case fails,
restore):

1. `requestClose(null)` in the link → cases 1 and 2 fail with `None`, pin 3
   stays green.
2. Remove the `focused !== null` guard → case 3 fails with `trigger-platform`.
3. Ignore `null`/pending in `useCloseFocus` for a refused close → case 4 fails
   (this is a pin on existing code; do not change `close-focus.ts`).

Then the scoped contract suites and the gates from the repo root:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/navigation-menu.test.tsx \
  src/behaviour/accessibility.test.tsx \
  src/behaviour/examples.test.tsx
nub run test
nub run check
nub run lint
```

All exit 0; unit count unchanged (no logic module changes). Delete the scratch
probe `src/behaviour/zz-probe.test.tsx` before committing.

No playground smoke scenario mounts a `NavigationMenu`, so the native
`TestRenderer` read is the evidence; no live window is needed. Record the exact
command and result in the plan index row.

**Measured in this worktree, 2026-10-20:**

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/navigation-menu.test.tsx
# HEAD (link requesting requestClose(null) again): 2 failed | 32 passed (34)
# after:                                          34 passed (34)

nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/navigation-menu.test.tsx \
  src/behaviour/accessibility.test.tsx \
  src/behaviour/examples.test.tsx
# 3 files passed, 36 tests passed

nub run check   # exit 0
nub run lint    # exit 0
nub run test    # exit 0; unit 512 in 48 files
# full native suite: 1029 passed / 20 failed of 1049 — the same plan-540 classes
```

The guard was proven by deleting `if (focus.kind === "link" && focused !== null)
return;`: the consumer-focus case then failed with `trigger-platform` while the
other 33 passed.

## 5. STOP conditions

- Either new focus-return case passes at `HEAD`: stop and re-measure; another
  writer may have changed the tree.
- The restore observes the unmounted link's id rather than `null`: stop and
  report; the guard needs a recorded request-time id instead (do not guess).
- The consumer-focus pin fails at `HEAD`: stop; it would mean the current tree
  already steals focus somewhere else.
- `focusedTestId` reports a host other than `trigger-platform` after the fix:
  stop and report which host.
- Any visible text changes, or an existing navigation case changes state: stop
  and report which case.
- A docs page or `COMPONENTS.md` states a count other than 34 after the change:
  stop and reconcile before committing.

## 6. Acceptance

- Choosing a link with `Enter`, `Space` or a pointer closes the panel, runs
  `onSelect` once, and leaves native focus on that item's trigger — never on the
  unmounted link and never on nothing.
- A caller that focuses its own content in `onSelect` keeps that focus.
- A controlled nav that refuses the close keeps the panel and the link's focus.
- `navigation-menu.test.tsx` is **34/34 measured on this host**, and the two
  new focus-return cases are red at `HEAD`.
- `docs/navigation-menu.mdx`, `COMPONENTS.md`, the plan index, `TODO.md` and
  `PLAN.md` D30 agree; `nub run test`, `nub run check` and `nub run lint` exit 0.
