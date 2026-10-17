# 425 — the Tier 2 component pages

- **Workstream:** docs-site
- **Phase:** C — every implemented Tier 2 component gets its `apps/docs` page
- **Owns:** `apps/docs/content/docs/components/**`, `apps/docs/src/component-meta/entries.ts`
- **Depends on:** plans `411`–`415`, `422` (the proven page shape), `424` (the truth
  guard), and the components workstream's `110–118` (the 22 delivered components,
  their in-package pages and examples)
- **Status:** planned

The components workstream records this handoff explicitly: "Docs site renders
`packages/components/docs/*.mdx` and the example registry — docs-site — pending"
(`packages/components/TODO.md` cross-team table). This plan is that handoff.

## 1. The delivered set

| Slug | Page title (must match the registry) | Source | Props type(s) | Example |
| ---- | ------------------------------------ | ------ | ------------- | ------- |
| `card` | Cards | `packages/components/src/card.tsx` | `CardProps` | `card.example.tsx` |
| `badge` | Badges | `packages/components/src/badge.tsx` | `BadgeProps` | `badge.example.tsx` |
| `avatar` | Avatars | `packages/components/src/avatar.tsx` | `AvatarProps` | `avatar.example.tsx` |
| `list` | Lists / list items | `packages/components/src/list.tsx` | `ListProps` + `ListItemProps` | `list.example.tsx` |
| `empty-state` | Empty states | `packages/components/src/empty-state.tsx` | `EmptyStateProps` | `empty-state.example.tsx` |
| `alert` | Alerts | `packages/components/src/alert.tsx` | `AlertProps` | `alert.example.tsx` |
| `inline-validation` | Inline validation | `packages/components/src/field.tsx` | `FieldProps` | `field.example.tsx` |
| `toast` | Toasts / notifications | `packages/components/src/toast/provider.tsx` | `ToastProviderProps` (+ `ToastViewportProps` from `toast/viewport.tsx`) | `toast.example.tsx` |
| `dialog` | Dialogs | `packages/components/src/dialog.tsx` | `DialogProps` | `dialog.example.tsx` |
| `confirm-dialog` | Confirmation dialogs | `packages/components/src/confirm-dialog.tsx` | `ConfirmDialogProps` | `confirm-dialog.example.tsx` |
| `popover` | Popovers | `packages/components/src/popover.tsx` | `PopoverProps` | `popover.example.tsx` |
| `dropdown-menu` | Dropdown menus | `packages/components/src/dropdown-menu.tsx` | `DropdownMenuProps` | `dropdown-menu.example.tsx` |
| `context-menu` | Context menus | `packages/components/src/context-menu.tsx` | `ContextMenuProps` | `context-menu.example.tsx` |
| `command-menu` | Command menus | `packages/components/src/command-menu.tsx` | `CommandMenuProps` | `command-menu.example.tsx` |
| `tabs` | Tabs | `packages/components/src/tabs.tsx` | `TabsProps` | `tabs.example.tsx` |
| `accordion` | Accordions | `packages/components/src/accordion.tsx` | `AccordionProps` | `accordion.example.tsx` |
| `collapsible` | Collapsible sections | `packages/components/src/collapsible.tsx` | `CollapsibleProps` | `collapsible.example.tsx` |
| `breadcrumb` | Breadcrumbs | `packages/components/src/breadcrumb.tsx` | `BreadcrumbProps` | `breadcrumb.example.tsx` |
| `pagination` | Pagination | `packages/components/src/pagination.tsx` | `PaginationProps` | `pagination.example.tsx` |
| `search-input` | Search inputs | `packages/components/src/search-input.tsx` | `SearchInputProps` | `search-input.example.tsx` |
| `combobox` | Comboboxes | `packages/components/src/combobox.tsx` | `ComboboxProps` | `combobox.example.tsx` |
| `date-picker` | Date / time pickers | `packages/components/src/date-picker.tsx` | `DatePickerProps` | `date-picker.example.tsx` |

The registry already has every slug as `planned`; move each to `wip` with its real
`sourcePath` and `gpuix` support from `COMPONENTS.md`. `message-scroller` is a
behaviour port (plan 206) and is not part of this handoff; leave it planned.

## 2. The page contract

Identical to plan 423: frontmatter (`title` = registry title, `description` =
registry summary), `<ComponentState>`, `<NativePreview>`, then `Usage`,
`Variants`, `Sizes`, `States`, `Composition`, `API reference`,
`Keyboard and focus`, `Theming`, `Accessibility and limitations`, `Source`,
`Related`.

- **Truth sources:** `packages/components/docs/<name>.mdx`, the component source,
  and the `COMPONENTS.md` row.
- **Composition:** include the component's own example from
  `packages/components/examples/` (22 files exist).
- **API:** one `<auto-type-table>` per exported props type in the table above;
  never hand-write a prop list.
- **Preview:** tier X everywhere — no per-component playground screen or capture
  exists. Do not fabricate one.
- **Status:** `wip` for every row; `done` waits on the published-binary run.
- **Related:** only records that exist; planned related records render as labels.

## 3. Batching (one commit each)

1. **Surface:** card, badge, avatar, list, empty-state, alert.
2. **Feedback:** inline-validation, toast, dialog, confirm-dialog, popover.
3. **Menus:** dropdown-menu, context-menu, command-menu.
4. **Navigation:** tabs, accordion, collapsible, breadcrumb, pagination.
5. **Choice:** search-input, combobox, date-picker.

Each batch updates `content/docs/components/meta.json` in the same commit so the
sidebar test stays green.

## 4. Exact files

```
A apps/docs/content/docs/components/{card,badge,avatar,list,empty-state,alert,
  inline-validation,toast,dialog,confirm-dialog,popover,dropdown-menu,
  context-menu,command-menu,tabs,accordion,collapsible,breadcrumb,pagination,
  search-input,combobox,date-picker}.mdx
M apps/docs/content/docs/components/meta.json
M apps/docs/src/component-meta/entries.ts          planned -> wip
M COMPONENTS.md                                    docs-page link per row
M TODO.md                                          the Tier 2 docs row
M .agents/slop/plans/README.md                     index this plan
```

The components package is merged first (as primitives was in plan 422), never
edited. If a conflict is in a ledger, keep both sides.

## 5. Commands and expected results

```sh
nub install
nub run --filter docs test        # all pages pass the existing contract guards
nub run --filter docs check-types # every props type resolves
nub run --filter docs build
nub run check
nub run lint
nub run test
```

Browser check: all 22 URLs return 200, appear once in `/sitemap.xml`, are linked
from the index and the sidebar, and carry real API rows and their source block.

## 6. Test plan

No new mechanism: plans 422–424's guards become stricter as each record leaves
`planned`. Prove one page in the first batch can fail:

1. delete `## Theming` from `card.mdx` → `component-pages.test.ts` fails;
   restore.
2. point an `auto-type-table` at `CardPropd` → `content-references.test.ts`
   fails; restore.
3. break a usage import (e.g. `Card` from `@gpuixui/primitives`) →
   `component-truth.test.ts` fails; restore.

Record the runs in §8.

## 7. STOP conditions

- The components merge fails or its source does not contain an exported props
  type for a row → stop, record the exact file and type; do not hand-write a
  table.
- A package page disagrees with source → source wins; record the package drift as
  a cross-team `TODO.md` row.
- A component is not in the registry or has no `COMPONENTS.md` row → stop and
  report; do not invent an inventory entry.
- Any gate fails outside `apps/docs` after the merge → stop and report.

## 8. Acceptance criteria and evidence

- [ ] All 22 delivered Tier 2 components have `wip` records and pages.
- [ ] Sidebar, index, sitemap and search agree; every API table is generated and
      every page includes its source and example.
- [ ] All gates pass; two-direction proof recorded.
- [ ] `COMPONENTS.md`, `TODO.md` and the plan index current.

### §8.1 Evidence (filled by the executor)

- Merge and batches:
- Gates:
- Two-direction proof:
- Browser check:
