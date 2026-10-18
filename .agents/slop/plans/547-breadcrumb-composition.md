# 547 — Breadcrumb: composed separators and an announced current page

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `113`, `117`, `200`, `201`, `391`, `392`, `516` |
| Status | done — 5 native cases (Breadcrumb 12), three mutation proofs |
| Blocker | none — assertions use text, `testId`, the accessibility dump and `role`; no bounds or focus-event assertion, so the two plan-540 binding defects stay out of scope |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

Two measured defects in the breadcrumb component:

1. **`BreadcrumbSeparator` ignores its children.** The part is typed as `Props`
   and renders a literal `/` after spreading the caller's props, so an authored
   `<BreadcrumbSeparator>›</BreadcrumbSeparator>` paints `/`. The compound-part
   contract says a part is composed from its props/children; silently dropping
   the child is the one place a part still cannot be styled as authored. The
   root's `separator` prop works, but the part form does not, and the docs list
   the part as the way to compose a trail.
2. **A collapsed trail uses the fallback separator for the ellipsis.** When
   separators are composed as children, `BreadcrumbList` pairs each separator
   with the item after it (correct), but the ellipsis crumb is drawn with
   `fallback` instead of the separator authored before the first hidden entry.
   A trail `Projects › GPUIXUI › packages › components` with `maxItems={3}`
   therefore paints `Projects / … › components` once defect 1 is fixed.
3. **The current page is not announced.** `@gpuix/native@0.10.0` has no
   `aria-current` (recorded in `COMPONENTS.md` and the docs page), so the
   current page is text plus colour only. Plan 392/516 established the supported
   alternative: put the state in `aria-description` on a role-bearing node.
   `BreadcrumbItem` is `role="listitem"`; a measured probe confirms a
   description on that node reaches the accessibility tree, while a description
   on the `<text>` node does not (the dump drops it).

Scope of this plan:

- `BreadcrumbSeparator` renders `children ?? "/"`;
- a collapsed `BreadcrumbList` uses the separator authored before the first
  hidden entry for its ellipsis;
- the item that holds the current page (`BreadcrumbPage`, or
  `BreadcrumbLink current`) carries `aria-description` = the new
  `currentLabel` prop (default `"Current page"`), and a caller's own
  `aria-description` wins;
- native tests, docs, example, `COMPONENTS.md` and the inventory count are
  synced.

**Out of scope** (do not add): `aria-current` (the runtime has none), a
clickable ellipsis, detecting a separator wrapped in the caller's own component
(the list already documents that parts must be direct children), a new part, a
locale lookup.

## 2. What exists today (read these first)

- `packages/components/src/breadcrumb.tsx`:
  - `Breadcrumb` owns `BreadcrumbContextValue { maxItems, separator }`;
  - `entries(children, fallback)` pairs every item with the separator that
    precedes it; a separator authored before the first item is dropped;
  - `BreadcrumbList` maps the collapsed crumbs and, for the ellipsis, renders
    `fallback`;
  - `BreadcrumbItem` is a `role="listitem"` div;
  - `BreadcrumbPage` is a `role`-less `<text>`;
  - `BreadcrumbLink current` delegates to `BreadcrumbPage`;
  - `BreadcrumbSeparator` renders a literal `/` after `{...rest}`.
- `packages/components/src/behaviour/breadcrumb.test.tsx` — 7 native cases
  (rendering, selection, keyboard, collapse, ellipsis tab order, autoFocus).
- `packages/components/docs/breadcrumb.mdx` — anatomy, collapse rule, API,
  accessibility, the canonical verification line.
- `packages/components/examples/breadcrumb.example.tsx` — the collapsing trail.
- `COMPONENTS.md` → Tier 2 → Breadcrumbs; `src/inventory.ts` →
  `breadcrumbMeta` (its `limitations` currently says "no aria-current … the
  current page is text and colour").

## 3. Design

### 3.1 Composed separators (`breadcrumb.tsx`)

`BreadcrumbSeparator`:

```ts
export interface BreadcrumbSeparatorProps extends Omit<Props, "children"> {
  /** The glyph between entries. Default `/`. */
  readonly children?: ReactNode;
}

export const BreadcrumbSeparator = ({
  children,
  style,
  ...rest
}: BreadcrumbSeparatorProps) => {
  const theme = useTheme();
  return (
    <text
      role="presentation"
      {...rest}
      style={mergeStyles({ ...textStyle(theme, "caption"), color: theme.colors.mutedForeground, userSelect: "none" }, style)}
    >
      {children ?? "/"}
    </text>
  );
};
```

A caller's `separator` prop on `Breadcrumb` still wins: it is the `fallback`
node used when no separator child is authored.

### 3.2 The ellipsis keeps the hidden entry's separator (`BreadcrumbList`)

`entries` already attaches the preceding separator to each item. When `collapse`
produced an ellipsis, the first hidden entry is `parsed[1]`; its separator is
the glyph between the first visible crumb and the ellipsis. Compute once:

```ts
const ellipsisSeparator = Option.match(Arr.get(parsed, 1), {
  onNone: () => fallback,
  onSome: (entry) => entry.separator,
});
```

and render `item === undefined ? ellipsisSeparator : item.separator` for every
crumb after the first. Import `Option` from `effect/Option` (the file already
imports `Arr`). No change to `breadcrumb/logic.ts`.

### 3.3 Announcing the current page (`Breadcrumb` / `BreadcrumbItem`)

Extend the context:

```ts
interface BreadcrumbContextValue {
  readonly maxItems: number | undefined;
  readonly separator: ReactNode;
  readonly currentLabel: string;
}
```

Root prop:

```ts
/** Describes the current entry to assistive technology. Default `"Current page"`. */
readonly currentLabel?: string;
```

The context stores `currentLabel ?? "Current page"`.

`BreadcrumbItem` detects a direct current child with a small predicate:

```ts
const isCurrentChild = (child: ReactNode): boolean =>
  isValidElement<BreadcrumbLinkProps>(child) &&
  (child.type === BreadcrumbPage ||
    (child.type === BreadcrumbLink && child.props.current === true));
```

Then:

```ts
const description = rest["aria-description"] ??
  (Arr.some(Children.toArray(children), isCurrentChild) ? currentLabel : undefined);
```

Render `{...rest}` first and add the description only when it is not
`undefined`, exactly as `Avatar` does for its presence state. An authored
`aria-description` therefore wins and a non-current item gets none.

The predicate references `BreadcrumbLink`, which is declared later in the
module; that is safe because the comparison runs at render time, after module
initialisation. Keep the existing `assertParts` call.

### 3.4 Boundaries and permissions

- Touch only `packages/components/**`, `COMPONENTS.md`, `TODO.md` and
  `.agents/slop/plans/README.md`.
- Do not touch `breadcrumb/logic.ts`; the collapse arithmetic is correct and
  already tested for lengths 0–8 and budgets 3–6.
- No new dependency, no `throw`, no `any`.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/breadcrumb.tsx` | `currentLabel` in the context and root props; the current-child predicate and description in `BreadcrumbItem`; `ellipsisSeparator` in `BreadcrumbList`; `BreadcrumbSeparatorProps` and `children ?? "/"`; update `breadcrumbMeta.limitations` |
| `packages/components/src/behaviour/breadcrumb.test.tsx` | five new native cases (§5.1) and the guarded-bug header |
| `packages/components/docs/breadcrumb.mdx` | anatomy/API rows, the collapse note, the accessibility bullet, the verification count |
| `packages/components/examples/breadcrumb.example.tsx` | author `›` separators and a `currentLabel` so the example shows the composed form |
| `COMPONENTS.md` | the Breadcrumbs row: composed separators, current-page description, the new count |
| `TODO.md` | add and tick the Phase C hardening row (§7) |
| `.agents/slop/plans/README.md` | index this plan as done with its measured counts |

## 5. Test plan

Every test must be able to fail; extend the suite's header comment with the two
guarded bugs (a separator child dropped, and the current page unannounced).

### 5.1 Native (`src/behaviour/breadcrumb.test.tsx`, real `TestRenderer`)

Use `getAllText`, `findByTestId().customProps`, and `a11yNodes`/`nodesWithRole`
from `../internal/a11y.js`. No bounds, no focus-ring assertion.

1. **A composed separator paints its child** — a two-entry trail with
   `<BreadcrumbSeparator>›</BreadcrumbSeparator>` between them:
   `getAllText()` is `["Projects", "›", "components"]` (not `/`).
2. **The collapsed ellipsis keeps the authored separator** — a four-entry trail
   with `maxItems={3}` and `›` separators:
   `getAllText()` is `["Projects", "›", "…", "›", "components"]`.
3. **The current page's item is described** — a trail ending in
   `BreadcrumbPage`: exactly one `listitem` node has
   `description === Option.some("Current page")`, and the other items have
   `Option.none()`.
4. **`BreadcrumbLink current` is described too** — the same assertion for
   `<BreadcrumbLink current>components</BreadcrumbLink>`.
5. **The caller owns the text** — `Breadcrumb currentLabel="Seite"` gives
   `description === Option.some("Seite")`; adding
   `aria-description="You are here"` to the current `BreadcrumbItem` gives
   `Option.some("You are here")` and no `"Seite"`.

Expected: the suite grows from 7 to 12 passing cases.

```sh
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/breadcrumb.test.tsx
# 12 passed
```

### 5.2 Both directions (AGENTS §3)

1. Restore `BreadcrumbSeparator` to the literal `/` and confirm case 1 fails
   (and case 2 fails on its first separator).
2. Restore the ellipsis line to `fallback` and confirm case 2 fails with `/` in
   the middle.
3. Remove the description wiring in `BreadcrumbItem` and confirm cases 3–5 fail
   with `Option.none()` on the `currentLabel` half (measured: 3 cases fail). The
   authored-description half of case 5 still passes without the wiring, which is
   the intended precedence — it guards against the wiring overwriting a caller's
   description, not against its absence.

Record the exact case counts in the commit message: mutation 1 fails 2 cases,
mutation 2 fails 1, mutation 3 fails 3.

### 5.3 Regression

- the seven existing breadcrumb cases still pass unchanged;
- the all-example native contract (`src/behaviour/examples.test.tsx`) still
  passes with the updated example — the separator is non-interactive, so no new
  name is required;
- `nub run --filter @gpuixui/components test` (unit + inventory) passes with the
  updated counts;
- `nub run check` and `nub run lint` pass.

## 6. Commands and expected results

Run from `workspaces/components`:

```sh
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/breadcrumb.test.tsx
                                                          # 12 passed
nub run --filter @gpuixui/components test                 # 417 passed (no new unit cases)
nub run --filter @gpuixui/components check-types          # exit 0
nub run check                                             # exit 0
nub run lint                                              # exit 0
```

The package `test` suite includes `src/inventory.test.ts`, which checks the
`COMPONENTS.md` and docs counts against the suite — update both counts in the
same commit.

## 7. Docs, inventory and TODO

- `docs/breadcrumb.mdx`:
  - anatomy: `BreadcrumbSeparator` "the glyph between entries; `children`
    defaults to `/` and is not focusable";
  - collapse rule: "the ellipsis keeps the separator authored before the first
    hidden entry";
  - API: root `currentLabel?: string` (default `"Current page"`);
    `BreadcrumbSeparator` `children?: ReactNode` (default `/`);
  - accessibility: replace the bare "no `aria-current`" line with the measured
    statement — the current item is a `role="listitem"` described by
    `currentLabel`, a caller's `aria-description` wins, and the page text keeps
    its own name;
  - verification line: `(12 tests)`.
- `COMPONENTS.md` Breadcrumbs row: add the composed-separator, collapsed-
  separator and current-page-description behaviour, change `7 native behaviour
  tests` to `12 native behaviour tests`, and update the limitation sentence
  (no `aria-current`; the description is the supported alternative).
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick
  `Breadcrumb composed separators and an announced current page — plan 547;
  5 native tests, both-direction proof; docs, example, COMPONENTS.md and
  inventory synced`.
- Plan index: add plan 547 after 546 with status
  `done — 5 native cases (Breadcrumb 12, behaviour 720), both-direction proof;
  docs, example, COMPONENTS.md and inventory synced` (use the measured suite
  totals, not the guessed ones, and do not claim a full-suite green if the
  plan-540 binding failures are still present).
- `src/inventory.ts` `breadcrumbMeta.limitations`: replace the "no
  aria-current … text and colour" sentence with the description behaviour and
  keep the missing-attribute fact.

## 8. STOP conditions

Stop and report instead of improvising when:

- `Children.toArray` cannot see the direct `BreadcrumbPage`/`BreadcrumbLink`
  child (then the item cannot detect the current entry; stop rather than add a
  second context or a wrapper part);
- the accessibility dump does **not** report the description on the `listitem`
  (the probe in §1 measured that it does; if a different binding drops it, stop
  and record it — do not assert on `customProps` alone and call it announced);
- `BreadcrumbSeparator`'s `children` type collides with `Props` under the
  strict config (use `Omit<Props, "children">`; do not introduce `any`);
- an existing breadcrumb case fails for a reason other than the intended
  change (list the failing case and stop);
- the inventory count check fails because a docs or row count was not updated
  (fix the count, not the check).

## 9. Acceptance

- `<BreadcrumbSeparator>›</BreadcrumbSeparator>` paints `›` between entries,
  and a collapsed trail keeps it at the ellipsis.
- The item holding the current page (`BreadcrumbPage` or
  `BreadcrumbLink current`) is described as `currentLabel` (default
  `"Current page"`); a caller's `aria-description` wins, and no other item gets
  a description.
- Five new native cases pass; the seven existing ones still pass; the unit,
  inventory and type gates pass.
- Docs, example, `COMPONENTS.md`, `TODO.md` and the plan index agree with the
  measured counts.
