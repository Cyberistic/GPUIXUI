# 113 — Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination

- **Phase:** C-3
- **Workstream:** components · **Owns:** `packages/components/**`
- **Depends on:** plan 110, plan 111 (`internal/collection.ts`)

Four of these five are **pure logic plus a thin renderer**, which makes them the
cheapest place to establish the "logic module tested hard, component wired
thinly" pattern. Follow it exactly.

---

## 1. Tabs — `src/tabs.tsx`

```tsx
export type TabsOrientation = "horizontal" | "vertical";
export type TabsActivation = "automatic" | "manual";

export interface TabsProps extends Props {
  value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;   // default "horizontal"
  activation?: TabsActivation;     // default "automatic"
}
export const Tabs, TabsList, TabsTrigger, TabsContent;

export interface TabsTriggerProps extends Props { value: string; disabled?: boolean }
export interface TabsContentProps extends Props { value: string }
```

A11y/behaviour:
- `TabsList` role `"tablist"`, `aria-orientation`, `tabIndex` never set on the
  list; the **selected** trigger is the only `tabIndex:0` (`"aria-selected":true`),
  every other trigger is `-1` — the roving tabindex pattern.
- `TabsList` handles `ArrowRight/ArrowLeft` (horizontal) or
  `ArrowDown/ArrowUp` (vertical) via `renderer.focusElement(id)` and
  `collection.nextEnabled`; `Home`/`End` use `firstEnabled`/`lastEnabled`;
  skip disabled triggers; wrap around.
- `activation="automatic"`: moving focus also changes the value.
  `"manual"`: moving focus does not; `Enter`/`Space` activates the focused
  trigger. This is a real difference and must be tested.
- `TabsTrigger` uses `buttonProps()`; disabled triggers are `-1` and do nothing.
- `TabsContent` renders only when `value === active`. `role:"tabpanel"`;
  GPUix has no `aria-controls`/`aria-labelledby`, so the panel gets
  `aria-label` from the trigger's value (`"aria-label": value`) — documented.
- Indicator: the active trigger gets `backgroundColor:color.surface`,
  `color:color.text`, radius `sm`; inactive `color:textMuted`; the list has
  `backgroundColor:color.background`, `borderWidth:1`, `borderColor:color.border`,
  `borderRadius:radius.md`, `padding:space(1)`, `gap:space(1)`.
  Trigger height = `tokens.control("md")`, paddingX `space(3)`, fontSize `sm`.

Logic: `src/tabs/logic.ts` is only the activation rule; the index math stays in
`collection.ts`. Test the activation rule there, the rest in the component test.

**Tests (`tabs.test.tsx`)**
1. Clicking tab 2 shows its panel and hides tab 1's.
2. Selected trigger has the active fill and the unselected one does not (both themes).
3. `ArrowRight` moves focus to tab 2 and (automatic) selects it; wrap from last
   to first.
4. `activation="manual"`: `ArrowRight` moves focus but the panel does not change
   until `Enter`.
5. A disabled middle tab is skipped by arrows and cannot be clicked.
6. `Home`/`End` focus first/last enabled.
7. Controlled `value`: clicking fires `onValueChange` but the panel does not
   change without a prop update.
8. `TabsContent` with a non-matching value renders nothing.

## 2. Collapsible — `src/collapsible.tsx`

```tsx
export interface CollapsibleProps { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; children: ReactNode }
export const Collapsible;               // provider only
export const CollapsibleTrigger;        // button behaviour, aria-expanded
export const CollapsibleContent;        // renders children only when open
```

`CollapsibleContent` unmounts when closed. **Documented limitation:** GPUix's
`motion.div` animates `height` only to an explicit number, so an auto-height
reveal needs a measured first paint; v1 mounts instantly and does not animate.
A follow-up may measure with `onLayout` and animate to the measured height —
record it as a `TODO` comment on `CollapsibleContent`, not as a broken promise
in the docs.

**Tests:** trigger click toggles; `aria-expanded` follows; content unmounts on
close (text absent); controlled mode requires the prop to change; Enter/Space on
the focused trigger toggles (button semantics).

## 3. Accordion — `src/accordion.tsx`

Two genuinely different state shapes. Model them as a tagged union, not
booleans:

```tsx
export type AccordionProps =
  | { type: "single"; collapsible?: boolean; value?: string; defaultValue?: string; onValueChange?: (value: string | undefined) => void; children: ReactNode }
  | { type: "multiple"; value?: ReadonlyArray<string>; defaultValue?: ReadonlyArray<string>; onValueChange?: (value: ReadonlyArray<string>) => void; children: ReactNode };

export const Accordion, AccordionItem, AccordionTrigger, AccordionContent;
export interface AccordionItemProps extends Props { value: string; disabled?: boolean }
```

Logic — `src/accordion/logic.ts` (pure, no React, `Arr`/`Option` only):

```ts
export type AccordionState =
  | { readonly type: "single"; readonly open: Option.Option<string> }
  | { readonly type: "multiple"; readonly open: ReadonlyArray<string> };

export const initialState: (props: AccordionProps) => AccordionState;
export const toggle: (state: AccordionState, item: string, collapsible: boolean) => AccordionState;
export const isOpen: (state: AccordionState, item: string) => boolean;
```

Rules: single + `collapsible:false` → opening another closes the first, toggling
the same one is a no-op; single + `collapsible:true` → toggling the open one
closes it; multiple → toggling adds to the end or removes, never duplicates.

**Tests (`accordion/logic.test.ts`)** — table-driven over the three rules, plus
"multiple preserves the order items were opened in" and "duplicate values are
impossible". Each case fails if the rule is wrong; header comment states the
guarded bug ("opening a second section did not close the first in single mode").

**Tests (`accordion.test.tsx`)**: click opens/closes; single closes the other;
`collapsible:false` refuses to close the only open section; multiple keeps two
open; `aria-expanded` on each trigger; disabled item does not open; content
unmounts when closed; controlled mode.

Styling: items separated by `borderBottomWidth:1,borderColor:color.border`
(last one excepted); trigger is a full-width button, height `control("lg")`,
`justifyContent:"space-between"`, a `text` chevron `"⌄"` that rotates is **not**
possible without transform support — use `"⌄"` / `"⌃"` glyph swap (GPUix
`StyleDesc` has no `transform`; evidence: `packages/native/js/host.ts:121-237`).
Document the glyph approach.

## 4. Breadcrumb — `src/breadcrumb.tsx`

```tsx
export interface BreadcrumbProps extends Props { maxItems?: number; items?: never }
export const Breadcrumb, BreadcrumbList, BreadcrumbItem,
             BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator;
export interface BreadcrumbLinkProps extends Props { onSelect?: () => void; current?: boolean }
```

- `BreadcrumbLink` behaves as a button (`buttonProps`), `onSelect`, `tabIndex:0`;
  `current` renders as plain text (`BreadcrumbPage` is the same thing without
  interaction). Separator default is a `text` `"/"` in `color.textFaint`.
- `Breadcrumb` with `maxItems` collapses the middle. Logic in
  `src/breadcrumb/logic.ts`:

```ts
export type BreadcrumbEntry<A> = { readonly kind: "item"; readonly item: A } | { readonly kind: "ellipsis" };
export const collapse: <A>(items: ReadonlyArray<A>, maxItems: number) => ReadonlyArray<BreadcrumbEntry<A>>;
```

Rules: `maxItems < 3` is clamped to 3 (never render a meaningless "A … B");
when `items.length <= maxItems` return every item; otherwise keep the first
item, an ellipsis, then the last `maxItems - 2` items. The ellipsis is a
non-interactive `text` `"…"` with `aria-label="More"`.

**Tests (`breadcrumb/logic.test.ts`)**: lengths 0..8 against `maxItems` 3 and 4;
clamping of 0/1/2; the first and last items are always present; the number of
rendered items never exceeds the budget. Header states the guarded bug
("a long path silently dropped the current page").

**Tests (`breadcrumb.test.tsx`)**: renders the trail; `onSelect` fires for a
link and not for the current page; separator count is items − 1; `maxItems`
collapses the middle and keeps the last item; the ellipsis is not focusable.

## 5. Pagination — `src/pagination.tsx`

```tsx
export interface PaginationProps extends Props {
  page: number;                 // 1-based
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;        // default 1
  showEdges?: boolean;          // default true: first/last always shown
}
export const Pagination;        // renders prev, page window, next
```

Logic — `src/pagination/logic.ts`:

```ts
export type PageItem =
  | { readonly kind: "page"; readonly page: number }
  | { readonly kind: "ellipsis"; readonly side: "start" | "end" };

export const pageWindow: (input: {
  page: number; pageCount: number; siblingCount?: number; showEdges?: boolean;
}) => ReadonlyArray<PageItem>;
```

Rules: `pageCount <= 0` → `[]`; `page` is clamped into `[1, pageCount]`;
siblings surround the current page; edges are the first and last page; an
ellipsis replaces a gap of two or more, a gap of one is filled with the page
itself; the result is ascending with no duplicates.

**Tests (`pagination/logic.test.ts`)** — this is arithmetic, so a table is the
right shape and every row can fail:
- `pageCount` 0 → `[]`; 1 → `[1]`; 2 → `[1,2]`.
- page 1 of 10 with sibling 1 → `[1,2,3,"…end",10]`.
- page 5 of 10 → `[1,"…start",4,5,6,"…end",10]`.
- page 10 of 10 → `[1,"…start",8,9,10]`.
- gap of exactly one page renders the page, not an ellipsis.
- `siblingCount:2` widens the window; `showEdges:false` drops the edges.
- page 0 clamps to 1; page 99 clamps to `pageCount`.
- ascending, unique, and every page within range.

**Tests (`pagination.test.tsx`)**: prev/next disabled at the edges; clicking a
page calls `onPageChange` with the number (not the index); clicking the current
page is a no-op; ellipsis is not a button; keyboard Tab reaches only enabled
buttons.

Styling: 28–32px square buttons, radius `sm`, active page
`backgroundColor:color.primary` + `color:color.onPrimary`, others
`color:textMuted` with `hover.backgroundColor:color.surfaceHover`.

---

## 6. Examples and docs

| Component | Example | Docs page must cover |
| --------- | ------- | -------------------- |
| Tabs | account settings with three panels (Profile / Notifications / Danger) | orientation, activation modes, keyboard table, roving tabindex, no `aria-controls` |
| Collapsible | "Advanced options" section inside a Card | mount/unmount, no height animation + why |
| Accordion | FAQ with five questions, single non-collapsible | single vs multiple, collapsible, glyph indicator |
| Breadcrumb | `Projects / GPUIXUI / packages / components` with `maxItems` | collapse rule (first + … + tail), current page |
| Pagination | a results footer driven by real state | window rule, disabled edges, ellipsis |

Every docs page: description, preview id, anatomy, usage snippet, API table,
keyboard table, theming note, a11y notes/limitations, related components.

## 7. Commands

```
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run check:tests
nub run lint
nub run fmt
```

Expected: exits 0; the two logic suites and five component suites ran.

## 8. STOP conditions

1. Roving focus cannot be implemented because the renderer cannot focus an
   arbitrary element id → report; do not fake it with `autoFocus` on each item.
2. `aria-selected`/`aria-expanded` are dropped by the native tree → verify with
   `getTreeJson()`; if the runtime drops them, document it as a limitation with
   the evidence and keep the live behaviour that does work.
3. A layout assertion (indicator position, collapsed count) is impossible because
   the test renderer reports no bounds for a node → use the tree JSON element
   count instead, and say so in the test comment.
4. Pagination arithmetic cannot be made total for `pageCount` 0/1 without a
   special case that the docs do not explain → STOP and simplify the API.

## 9. Acceptance criteria

- [ ] Five components with the APIs above.
- [ ] Three pure logic modules with table-driven tests that fail on regression.
- [ ] Component tests for every behaviour bullet, run in the native renderer.
- [ ] Examples, docs pages, `COMPONENTS.md` rows.
- [ ] Keyboard behaviour proven, not described.
