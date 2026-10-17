# 304 — Typed-by-position children: the dev check, and the compile-time limit

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200-adopt-compound-part-api.md`, `201-adopt-runtime-state-model.md`, `158-alert-parts.md`, `300`–`303` |
| Status | planned 2026-10-17 |
| Source | `docs/component-api.md` §1 and the adoption table; `TODO.md` → "Enforce the contract's typed-by-position children at compile time" |

Self-contained. It closes the one contract rule that is still a target, and it
corrects the rule's wording where React makes the literal form impossible.

---

## 1. Why

`docs/component-api.md` §1 says:

> Children are typed **by position**: a `TabsContent` inside a `TabsList` is a
> compile error. The parent narrows `children` with a part union and a dev-time
> check.

Today there is **no position check at all**. A part used outside its root throws
(`"Tabs parts must be used inside Tabs"`), but a part used inside the *wrong*
part of its own family renders: `<TabsList><TabsContent/></TabsList>` mounts a
panel inside the tab rail and silently paints both.

## 2. Measured compile-time limit (do not re-litigate)

Verified 2026-10-17 in this worktree with `tsc` and the pinned React 19 types:

```tsx
const Part = (_props: Props) => <div />;
interface Narrow {
  children?: ReactElement<Props, typeof Part> | ReadonlyArray<ReactElement<Props, typeof Part>>;
}
const Root = ({ children }: Narrow) => <div>{children}</div>;

<Root>
  <Part />
  <div /> {/* accepted */}
</Root>;
```

`nub run --filter @gpuixui/components check-types` exits 0. React 19 types every
JSX expression as `React.JSX.Element` — `ReactElement<any, any>` — so **any**
element satisfies a part-typed slot. Element identity is not nominal in the JSX
type system; only the *value* (`element.type`) carries it, at runtime.

Consequences that shape this plan:

- A literal "a `TabsContent` inside a `TabsList` is a compile error" is **not
  expressible** in React over GPUix. Do not fake it with `@ts-expect-error`
  (unused now), an `any`-shaped wrapper, or a lint rule outside this workstream.
- The strongest honest type narrowing is `PartChildren`: elements and
  conditionals, never text or numbers. It is a real compile error for
  `<TabsList>hello</TabsList>`.
- Part identity is enforced by a **dev-time check at render**, where
  `element.type` is still the component reference. That is the contract's own
  second mechanism, promoted to the primary one.
- `docs/component-api.md` §1 and the adoption table must record the limit and
  the evidence, not keep claiming a compile error that cannot happen.

## 3. The check

New module `packages/components/src/internal/parts.ts`:

```ts
/** A component a parent can host. Props do not matter to identity. */
export type PartComponent = (props: never) => ReactNode;

/** Elements and conditionals; never text or numbers. */
export type PartChildren =
  | ReactElement<unknown>
  | boolean
  | null
  | undefined
  | ReadonlyArray<PartChildren>;

export interface PartsContract {
  /** The parent, as the consumer writes it: "TabsList". */
  readonly parent: string;
  /** Every part of the same component, to name a misplaced sibling. */
  readonly family: ReadonlyArray<PartComponent>;
  /** The family members this parent hosts directly. */
  readonly accepts: ReadonlyArray<PartComponent>;
  /** What to do instead, appended to the rejection. */
  readonly hint?: string;
}

export const assertParts: (contract: PartsContract, children: ReactNode) => void;
```

Rules:

- Walk direct children only; unwrap arrays and `Fragment`; ignore
  `null`/`undefined`/booleans (conditional slots).
- Accept every element whose `type` is in `accepts`.
- **Reject** an element whose `type` is in `family` but not in `accepts`:
  `"TabsContent cannot be used inside TabsList. Put TabsContent beside TabsList, directly inside Tabs."`
- **Allow** anything outside the family — a `Button`, a `Badge`, a `div`, text.
  Decoration is not a misplaced part, and the landed examples rely on it
  (`<Card><EmptyState/></Card>`, `<CardHeader><Badge/></CardHeader>`).
- Always on, like the existing parts-outside-root throws. The check walks the
  direct children of one parent; it is not a tree reconciliation.
- A `throw` here is deliberate: a misplaced part is a programming error at the
  composition boundary, not a recoverable domain failure (plan 110 §8.6).

## 4. Where it is installed

Add a module-local `const <component>Parts: ReadonlyArray<PartComponent>` and call
`assertParts` once per parent. Exact allowed sets:

| File | Parent | Accepts (family members only) | Hint (short) |
| ---- | ------ | ----------------------------- | ------------ |
| `card.tsx` | `Card` | `CardHeader`, `CardContent`, `CardFooter` | header/content/footer at the root |
| `card.tsx` | `CardHeader` | `CardTitle`, `CardDescription` | title/description in the header |
| `alert.tsx` | `Alert` | `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss` | icon/content/dismiss at the root |
| `alert.tsx` | `AlertContent` | `AlertTitle`, `AlertDescription` | title/description in the content |
| `list.tsx` | `List` | `ListItem` | rows at the root |
| `list.tsx` | `ListItem` | `ListItemTitle`, `ListItemDescription` | title/description in the row |
| `tabs.tsx` | `Tabs` | `TabsList`, `TabsContent` | list and panels at the root |
| `tabs.tsx` | `TabsList` | `TabsTrigger` | triggers in the list |
| `accordion.tsx` | root (`AccordionFrame`) | `AccordionItem` | items at the root |
| `accordion.tsx` | `AccordionItem` | `AccordionTrigger`, `AccordionContent` | trigger/content in the item |
| `collapsible.tsx` | `Collapsible` | `CollapsibleTrigger`, `CollapsibleContent` | trigger/content at the root |
| `breadcrumb.tsx` | `Breadcrumb` | `BreadcrumbList` | the list at the root |
| `breadcrumb.tsx` | `BreadcrumbList` | `BreadcrumbItem`, `BreadcrumbSeparator` | items and separators in the list |
| `breadcrumb.tsx` | `BreadcrumbItem` | `BreadcrumbLink`, `BreadcrumbPage` | link/page in the item |
| `pagination.tsx` | `Pagination` | `PaginationPrevious`, `PaginationList`, `PaginationNext`, plus a bare `PaginationItem`/`PaginationEllipsis` | controls at the root |
| `dialog.tsx` | `Dialog` | `DialogTrigger`, `DialogContent`, `DialogClose` | trigger/content at the root |
| `dialog.tsx` | `DialogContent` | `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | header/footer in the content |
| `dialog.tsx` | `DialogHeader` | `DialogTitle`, `DialogDescription` | title/description in the header |
| `popover.tsx` | `Popover` | `PopoverTrigger`, `PopoverContent` | trigger/content at the root |
| `dropdown-menu.tsx` | `DropdownMenu` | `DropdownMenuTrigger`, `DropdownMenuContent` | trigger/content at the root |
| `dropdown-menu.tsx` | `DropdownMenuContent` | items, checkbox item, group, label, separator, sub | rows in the surface |
| `dropdown-menu.tsx` | `DropdownMenuGroup` | item, checkbox item, separator | rows in the group |
| `dropdown-menu.tsx` | `DropdownMenuSub` | sub trigger, sub content | trigger/content in the sub |
| `menu/sub.tsx` | `MenuSub` / `MenuSubContent` | sub trigger / and the row set | same rules as the dropdown |
| `context-menu.tsx` | `ContextMenu` + `ContextMenuContent` | the same sets as the dropdown | same |
| `command-menu.tsx` | `CommandMenu` | `CommandMenuInput`, `CommandMenuList`, `CommandMenuEmpty` | input/list at the root |
| `combobox.tsx` | `Combobox` | `ComboboxTrigger`, `ComboboxContent` | trigger/content at the root |
| `combobox.tsx` | `ComboboxContent` | `ComboboxInput`, `ComboboxList`, `ComboboxEmpty` | input/list in the surface |
| `date-picker.tsx` | `DatePicker` | `DatePickerTrigger`, `DatePickerContent` | trigger/content at the root |
| `date-picker.tsx` | `DatePickerContent` | `DatePickerCalendar` | the calendar in the surface |
| `time-picker.tsx` | `TimePicker` | `TimePickerSegment`, `TimePickerSeparator`, `TimePickerClear` | segments in the field |
| `field.tsx` | `Field` | `FieldInput` | the control only; label/message are automatic |

`PaginationList`, `CommandMenuList` and `ComboboxList` take no children, so they
need no check. `CardContent`, `CardFooter`, `TabsContent`, `AccordionContent`,
`DialogContent`'s non-family content, `PopoverContent` and the alert
description stay open — they host forms and arbitrary markup.

## 5. Props typing

- Add `readonly children?: PartChildren` to every parent in §4 (inline for
  components that currently take `Props` directly).
- Export `PartChildren` from `src/index.ts` so a consumer can name it.
- Do **not** narrow parents outside §4; a single styled region (`Badge`,
  `Avatar`, `EmptyState`, `SearchInput`) and open containers keep `ReactNode`.

## 6. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/internal/parts.ts` | **new** — `PartComponent`, `PartChildren`, `PartsContract`, `assertParts` |
| `packages/components/src/internal/parts.test.ts` | **new** — unit suite over React elements (see §8) |
| `packages/components/src/behaviour/parts.test.tsx` | **new** — real-renderer suite through an error boundary |
| the 19 component modules in §4 | family arrays, one `assertParts` call per parent, `PartChildren` on the parent props, `children` destructured and rendered explicitly where it currently rides on `...rest` |
| `packages/components/src/index.ts` | export `type PartChildren` |
| `packages/components/docs/<each component>.mdx` | one line only where the page shows composition that the check now rejects; otherwise unchanged |
| `docs/component-api.md` | §1 rewritten to the measured rule; adoption table row moves to "adopted with a runtime check"; evidence in §1 |
| `TODO.md` | tick the item; keep a reworded follow-up only if something remains |
| `.agents/slop/plans/README.md` | index this plan (304) |

`Card`'s parts currently render children through `...rest` spread; every parent
touched must destructure `children` and render it, or the check and the real
output diverge. Run `grep -n "\\.\\.\\.rest" <file>` before editing.

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/components check-types     # exit 0
nub run --filter @gpuixui/components test            # exit 0 — unit count + new parts tests
nub run --filter @gpuixui/components test:behaviour  # exit 0 — 292 existing + new parts tests
nub run check                                        # exit 0
nub run lint                                         # exit 0
```

Baseline measured in this worktree on 2026-10-17: unit suite green, behaviour
suite **292 passing**. Any behaviour test that existed before this plan and now
fails is a regression in the allowlist, not a test to update — fix the allowlist.

## 8. Test plan

**Unit — `src/internal/parts.test.ts`** (default vitest project, no renderer):

1. accepts every direct part;
2. accepts arrays, fragments and conditional slots (`false`, `null`);
3. rejects a sibling part and names both parent and part;
4. appends the hint;
5. allows a non-family element (`<div/>`), text, and a part from another
   component's family (decorative composition is not a position error);
6. ignores a fragment that nests an accepted part;
7. throws on a nested fragment that hides a misplaced part.

**Behaviour — `src/behaviour/parts.test.tsx`** (real renderer):

Render the misuse under a class error boundary (measured 2026-10-17: the GPUix
reconciler propagates render errors to `getDerivedStateFromError`, and the
boundary's fallback text is readable through `renderer.getAllText()`; a raw
`renderComponent` swallows the error into `console.error`, so a boundary is the
only honest assertion). Cases:

1. `TabsContent` inside `TabsList` → caught message names both;
2. `AccordionContent` directly inside `Accordion` → caught;
3. `BreadcrumbLink` directly in `BreadcrumbList` → caught;
4. `AlertDismiss` inside `AlertContent` → caught;
5. `DropdownMenuTrigger` inside `DropdownMenuContent` → caught;
6. `DatePickerCalendar` directly in `DatePicker` → caught;
7. a valid composition of each touched family renders with no error (a single
   test rendering one representative tree per file section is enough; the
   existing behaviour suites already render the rest and will catch false
   positives).

**Both directions** (record the command and the failure in the commit message):

- delete the `assertParts` call in `TabsList` → case 1 fails;
- add `TabsContent` to `TabsList`'s `accepts` → case 1 fails;
- restore → green.

## 9. STOP conditions

Stop and report if:

- a landed example or behaviour test deliberately nests a family part where §4
  rejects it and the composition is legitimate; do not silently widen the set —
  record the composition in the plan and decide with the contract;
- the error boundary does not catch in the GPUix renderer on a rerun (the probe
  above passed once on this host); fall back to the unit suite plus one
  valid-composition render test and record the limitation;
- a parent cannot destructure `children` without changing its output (e.g. a
  component relies on `...rest` forwarding `children` to a third-party
  component); stop rather than duplicate the child tree;
- `PartChildren` would reject an existing legitimate call site (conditional
  strings, numbers); add the case to §3 only with evidence.

## 10. Acceptance criteria

- Every parent in §4 rejects a misplaced family part at render with a message
  naming both, and still renders arbitrary non-family content.
- `PartChildren` is the declared type of those parents' children and rejects
  text at compile time.
- `docs/component-api.md` no longer claims a part-identity compile error; it
  states the measured limit and the runtime check, with the evidence command.
- Unit and behaviour tests in §8 exist, fail without the check, and pass with it.
- The 292 pre-existing behaviour tests still pass; all gates in §7 are green.

## 11. Result

Landed 2026-10-17:

- `internal/parts.ts` — `PartComponent`, `PartChildren` (elements and
  conditionals, never text), `PartsContract`, `assertParts`; family-scoped, so
  decoration is still allowed and a misplaced family part is rejected with both
  names plus the fix.
- 32 `assertParts` sites across the 19 modules in §4; each module owns its family
  array and hints.
- `PartChildren` now types those parents' children; `src/index.ts` exports it.
  `docs/component-api.md` §1 records the measured React 19 limit (JSX element
  identity is `any`) instead of claiming a compile error that cannot happen.
- **Two legitimately open compositions measured while running the suite** and
  allowed: `Alert` hosts `AlertTitle`/`AlertDescription` directly (the tone
  tests compose them without `AlertContent`), and `Pagination` hosts a bare
  `PaginationItem`/`PaginationEllipsis` (an item outside the window reads the
  root's page). Everything else uses the §4 sets.
- Tests: `internal/parts.test.ts` (6 unit cases, 228 unit total) and
  `behaviour/parts.test.tsx` (7 real-renderer cases through an error boundary;
  behaviour 298 = 291 kept + 7). Both directions: deleting the `TabsList` check,
  and adding `TabsContent` to its accepts, each fail "rejects TabsContent inside
  TabsList"; restored.
- Gates: `check-types`, `test`, `test:behaviour`, `check`, `lint`, `fmt` green.
