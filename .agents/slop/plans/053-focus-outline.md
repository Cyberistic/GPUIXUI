# 053 — Keyboard-only focus rings, and the 0.11 shadow list

**Workstream:** `tokens-theme` (tokens half) with `components` + `primitives` adoption.
**Phase:** F (truth pass after the 0.11 upgrade), not a new feature.
**Files owned by this plan:** `packages/tokens/src/styles.ts`, `focus.test.ts`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md` (design-system rows), `TODO.md` (this workstream + interlocks),
`.agents/slop/plans/README.md` (index row only).
**Adoption files are another workstream's:** every `focusRing(...)` call site and
the manual focus tracking it forced — the rows below name them. Do not edit them
from `tokens-theme`.

## Why

`@gpuix/native@0.11.0` declares three capabilities that 0.10.0 did not, and the
library's focus story was designed around the older absence:

| Capability | 0.11.0 evidence (`dist/host.d.ts`) |
| ---------- | ---------------------------------- |
| `outlineWidth`, `outlineColor`, `outlineOffset` | 119–124 — a line outside the border box that "takes no layout space" |
| `focusVisible?: StateStyleDesc` | 157 — "While focused after keyboard input (Tab), like CSS `:focus-visible`. A mouse press never shows it." |
| `boxShadow?: BoxShadow \| BoxShadow[]` | 109 — "One shadow, or a list painted in the order given" |
| `keyboardFocusDim?: boolean` | 162, 575 — the runtime dims other focusables while one has keyboard focus |

The consequences today:

1. `focusRing(theme)` returns a spread `boxShadow`, so **a mouse press paints the
   same ring as a Tab** — `docs/tokens.md` and `docs/design-system.md` say so
   honestly, but it is a compromise the runtime no longer requires.
2. Every control that wants a ring tracks focus itself and merges the shadow:
   `components/src/list.tsx:702`, `primitives/src/components/Button.tsx`,
   `primitives/src/components/internal.ts:83`, `primitives/src/core/selection.ts:38`
   and more. That is state and LOC the runtime can own.
3. The docs and several source comments claim "GPUix 0.10.0 has no `outline*` and
   no `focusVisible`, and paints one shadow". All three claims are false against
   the pinned 0.11.0 and must stop being repeated (the pinned version is named in
   `PLAN.md`; the claims are in this plan's owned docs plus, for the source
   comments, the adopting packages).

## Probe first (STOP gate)

Do these in the playground before changing `focusRing`. Owner: `playground`
(cross-team row in `TODO.md`).

1. A control whose style carries
   `{ focusVisible: { outlineWidth: 2, outlineColor: colors.ring, outlineOffset: 0 } }`:
   Tab to it → the ring paints; click it → no ring. Screenshot both.
2. Same control focused **programmatically** (`renderer.focusElement`) — a dialog
   opening focus trap and a menu's first row. Does `focusVisible` paint? If it
   does not, the overlays cannot rely on it alone and keep a programmatic ring.
3. `keyboardFocusDim`: with a dialog open, is the rest of the window dimmed? Record
   whether that is a wanted native affordance or must be disabled per element.

**STOP** if `focusVisible` does not paint in a real window (API declared, no
paint). Keep the shadow ring, correct only the docs, and record the evidence here.
Do not ship a ring that silently disappears.

## Design (after the probe passes)

1. **`focusRing(theme)` returns a `focusVisible` fragment**, not a shadow:

   ```ts
   export function focusRing(theme: Theme): StyleDesc {
     return {
       focusVisible: {
         outlineWidth: theme.borderWidth.strong,
         outlineColor: theme.colors.ring,
         outlineOffset: 0,
       },
     };
   }
   ```

   Applied once at rest, so a component never tracks `focused` to paint a ring.
   The return type changes from `{ boxShadow }` to a style fragment — a breaking
   change, and every call site is in-repo. `outlineOffset` is decided by the
   probe (0 if the outline hugs the border box like the shadow did).
2. **Overlays keep a programmatic ring only if probe 2 fails**; otherwise they
   drop it too. This is the only conditional in the migration.
3. **`keyboardFocusDim`** stays at the runtime default unless the probe shows it
   conflicting with a control that paints its own dimmed state; then the adopting
   component sets `false` and documents why.
4. **Elevation does not change.** The scale ships one shadow per level because
   the design wants one; the runtime now accepts a list, so the docs must stop
   claiming it cannot. `elevationShadow` keeps returning the one shadow.
5. **No new token.** `ring` and `borderWidth.strong` already name the ring; this
   plan removes a workaround, it does not add surface.

## Steps

1. Probe (above). Record answers in this plan before touching code.
2. `packages/tokens/src/styles.ts` — rewrite `focusRing`, update its JSDoc.
3. `packages/tokens/src/focus.test.ts` — the current suite asserts the shadow
   shape; rewrite it to assert the fragment and the outline geometry, and keep the
   "no layout space" claim testable (outline fields only, no width/height).
4. `packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md` — the
   focus section, the runtime-constraint table, the limitations list and the
   elevation "one shadow" sentences.
5. Record the adoption interlock (components/primitives) with the exact call
   sites; do not edit them here.
6. Verification: `nub run --filter @gpuixui/tokens test`, then a scoped
   `nub apps/playground/dist/smoke/run.js --only focus-ring` once the playground
   scenario exists, and, for the adoption, the two packages' behaviour suites.

## Test plan

- `focus.test.ts` fails if `focusRing` returns a `boxShadow` (the old shape) and
  fails if the outline is thinner than `borderWidth.strong`.
- A rendering-level test belongs to the adopting package (a real focus event), not
  to tokens; the probe is its source of truth until then.
- Both-direction proof: `outlineColor: theme.colors.ring` → a hardcoded hex fails
  the theme-driven assertion; `outlineWidth: 1` fails the thickness assertion.

## Acceptance

- [ ] Probe answered in this plan, with the three questions and screenshots.
- [ ] `focusRing` returns the `focusVisible` fragment; tokens' suite passes.
- [ ] Docs no longer claim 0.11.0 lacks `outline*`/`focusVisible` or a shadow list.
- [ ] Adoption interlock row names the call sites and is owned by the component
  packages.
- [ ] `nub run check`, `nub run lint`, `nub run test` exit 0 for the touched paths.

## STOP conditions

- The probe shows no paint → keep the shadow ring, correct the docs only, close
  this plan as an evidenced limitation.
- A call site needs a change outside this plan's owned files → interlock row, not
  an edit here.
- Any gate is red for a reason outside this plan → stop and record it.
