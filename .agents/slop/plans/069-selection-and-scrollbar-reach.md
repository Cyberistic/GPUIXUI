# 069 — Selection and scrollbar: what the pinned runtime reaches

| Field | Value |
| ----- | ----- |
| Phase | F (truth pass over the role catalogue) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `017` (focus truth), `018` (elevation truth), `060` (motion truth) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

The catalogue names 53 roles and says "if a token is not here, it is not
public". For two roles it does not say **how the runtime applies them**, and the
answer is opposite in each case. Both gaps were found by reading the pinned
packages, not by guessing:

| Role | Pinned `@gpuix/native@0.10.0` | Consequence |
| ---- | ----------------------------- | ----------- |
| `selection` | **Supported.** `StyleDesc` declares `selectionColor?: string` and `userSelect?: "text" \| "none" \| "auto"` (both inherit down the tree) — `dist/host.d.ts` lines 131 and 133 | the role is usable today; the reference never names the property, so an implementer may guess `::selection`, a CSS string, or `selected` |
| `scrollbar` | **Absent.** No `scrollbarColor` or `scrollbarWidth` in the published types. Both exist only as unreleased changesets on `references/gpuix` main (`.changeset/native-scrollbars.md`, `.changeset/virtual-list-scrollbar.md`) | a scroll thumb cannot be tinted in 0.10.0; `theme.colors.scrollbar` cannot reach it |

The `primitives` workstream documented the scrollbar half in
`ScrollArea`'s docs and `scrollStyle` JSDoc; this package — the one that claims
to document every token — still describes `scrollbar` as "scrollbar thumb" with
no caveat. Plan `017` fixed exactly this kind of false claim for focus; this is
the same pass for selection and scrollbars.

**Not in scope.** Do not add `scrollbar`-style helpers: a function no runtime
reads is the same lie as a z-index token (see `docs/tokens.md` "Layering"). Keep
the role, because every consumer theme carries the full role set and the release
that adds `scrollbarColor` will apply it without a role change.

## 2. Design decision

1. **Ship `selectionStyle(theme)`** in `styles.ts`, beside `focusRing`. It maps
   the `selection` role to the runtime's one application point:

   ```ts
   /** The inherited text-selection style. */
   export interface SelectionStyle {
     readonly selectionColor: string;
   }

   export const selectionStyle = (theme: Theme): SelectionStyle => ({
     selectionColor: theme.colors.selection,
   });
   ```

   One property, so no options object: the opt-out is `userSelect: "none"`, a
   component decision, not a theme token. Both properties inherit, so the
   application sets `selectionStyle` once on its root and chrome subtrees opt
   out locally.

2. **Re-describe `scrollbar` as reserved**, not as a paintable thumb. The JSDoc
   and the catalogue's Use column say the pinned runtime exposes no tint; the
   role is carried for the release that does.

3. **Guard both claims in `docs.test.ts`** so a later doc edit cannot quietly
   drop the application points again.

No role is added or removed; role count, contrast pairs and guards stay as they
are.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/069-selection-and-scrollbar-reach.md` | **create** (this file) |
| `packages/tokens/src/styles.ts` | **add** `SelectionStyle`, `selectionStyle` |
| `packages/tokens/src/color.ts` | **edit** the `selection` and `scrollbar` JSDoc |
| `packages/tokens/src/selection.example.ts` | **create** — an application root and a chrome subtree |
| `packages/tokens/src/styles.test.ts` | **add** the helper and example assertions |
| `packages/tokens/src/docs.test.ts` | **add** the runtime-reach guard |
| `docs/tokens.md` | **add** a Text selection section, name the property in both role tables, record the scrollbar limitation |
| `docs/design-system.md` | **edit** §8's selection row and §10's runtime constraints |
| `packages/tokens/README.md` | **add** a short Selection and scrollbars section |
| `COMPONENTS.md` | **edit** the Design tokens row |
| `TODO.md` | **add** one ticked task and one **cross-team** row for `playground` |
| `.agents/slop/plans/README.md` | **add** the `069` index row and explanation |

## 4. The implementation

`styles.ts`, after `focusRing`:

```ts
/** The inherited text-selection style. */
export interface SelectionStyle {
  /** The theme's translucent selection wash. */
  readonly selectionColor: string;
}

/**
 * The text-selection style for a subtree.
 *
 * GPUix's `selectionColor` and `userSelect` inherit, so an application sets the
 * wash once on its root; a chrome subtree that must not be selectable sets
 * `userSelect: "none"` itself. The wash is translucent, so selected text keeps
 * the theme's foreground contrast.
 *
 * @example
 * ```tsx
 * <div style={selectionStyle(theme)}>{children}</div>
 * ```
 */
export function selectionStyle(theme: Theme): SelectionStyle {
  return { selectionColor: theme.colors.selection };
}
```

`color.ts`:
- `selection`: "Text selection wash for `selectionColor`. Translucent, so text stays legible."
- `scrollbar`: "Scrollbar thumb tint. Reserved in GPUix 0.10.0: the platform paints the scrollbar and exposes no tint."

`selection.example.ts`:

```ts
import { selectionStyle, type Theme } from "./index.js";

/** The application root: native text selection wears the theme's wash. */
export const appRootStyle = (theme: Theme) => selectionStyle(theme);

/** Chrome that must not be selectable (toolbars, tab strips, window controls). */
export const chromeStyle = { userSelect: "none" as const };
```

## 5. Tests

`styles.test.ts`:

1. `selectionStyle` returns the active theme's `selection` value and no other
   property — a hardcoded or opaque wash fails.
2. It follows the theme: dark and high-contrast light produce their own values.
3. The wash stays translucent (`#RRGGBBAA`) in every shipped theme, because an
   opaque wash would hide the text it selects.
4. The example's root carries the wash and the chrome opts out with
   `userSelect: "none"` — a wrong opt-out direction fails.

`docs.test.ts`, new describe:

1. The catalogue names `selectionColor` and `userSelect`.
2. It names `scrollbarColor` and `scrollbarWidth` as absent from 0.10.0.

Both are one-way guards in the file's existing style: they fail if the
application point or the limitation is deleted from the reference.

## 6. Documentation edits

- `docs/tokens.md`, new **Text selection** section after Focus:

  > GPUix 0.10.0 exposes `selectionColor` and `userSelect` as inherited
  > `StyleDesc` properties, so native text selection is themeable.
  >
  > ```tsx
  > import { selectionStyle } from "@gpuixui/tokens";
  >
  > <div style={selectionStyle(theme)}>{children}</div>;
  > ```
  >
  > `selectionStyle(theme)` returns `{ selectionColor }`. Both selection
  > properties inherit, so an application sets the wash once on its root;
  > chrome that must not be selectable sets `userSelect: "none"`. The wash is the
  > translucent `selection` role, so selected text keeps the foreground's
  > contrast.

- `docs/tokens.md` role tables: the `selection` Use column gains
  "`selectionColor`"; the `scrollbar` Use column becomes "reserved: no tint in
  0.10.0".
- `docs/tokens.md` Limitations gains:

  > - No scrollbar tint. GPUix 0.10.0 exposes no `scrollbarColor` or
  >   `scrollbarWidth` (both are unreleased on GPUix main), so `scrollbar` is
  >   reserved for the release that does. Text selection is supported — see
  >   [Text selection](#text-selection).

- `docs/design-system.md` §8 text selection row: "`selection` wash via
  `selectionColor`; `userSelect: "none"` opts chrome out". §10 gains two rows:
  selection properties inherit; scrollbar tint is absent in 0.10.0.
- `README.md`: a short **Selection and scrollbars** section naming
  `selectionStyle` and the reserved scrollbar role.
- `COMPONENTS.md` Design tokens row: "selection applies through
  `selectionColor`; `scrollbar` is reserved because 0.10.0 exposes no tint".
- `TODO.md`: tick the task; add a cross-team row — `playground` paints the
  selection wash through `selectionStyle` in the theme gallery so the claim is
  verified natively.

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; record the observed count
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

## 8. STOP conditions

Stop and report if:

- the pinned `@gpuix/native@0.10.0` types no longer declare `selectionColor` or
  `userSelect` — the claim would be false; re-check the version before editing;
- a test needs a cast to read `StyleDesc` — the helper returns a plain object
  with the runtime's exact property name; do not import the native types into
  the dependency-free package;
- the docs coverage guard needs a new value export it cannot find — name an
  existing export rather than inventing one;
- a reviewer asks for a scrollbar helper — that contradicts the layering
  decision (no API a runtime does not read); record it, do not ship it.

## 9. Test plan and both directions

1. Hardcode `selectionColor: "#0000FF"` in `selectionStyle` → the theme-follows
   and translucent tests fail. Restore.
2. Make `selectionStyle` return `{}` → the helper test and the example test
   fail. Restore.
3. Delete the `selectionColor` sentence from `docs/tokens.md` → the docs guard
   fails. Restore.
4. Delete the scrollbar limitation → the docs guard fails. Restore.

## 10. Acceptance criteria

- `selectionStyle` and `SelectionStyle` are exported, typed, documented and
  tested; the example compiles.
- The catalogue names `selectionColor`/`userSelect` and states the scrollbar
  limitation with the pinned evidence.
- The design system and README agree; `COMPONENTS.md` records the reach.
- No role added or removed, no dependency, no cast.
- The five gate commands exit 0 and every failing direction was observed.
