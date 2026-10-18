# 479 — Compound parts and their API tables

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 411 (page template), 414 (copyable source), 415 (type tables), 427 (compound contract), 441 (API index), 462 (the first two compound records)

## 1. Why this plan exists

Plan `427` added `parts` to the record and `missingPartSources` to the page
guard; plan `462` proved that contract on Tabs and Toasts. That is still only
two of the **28 delivered compound components**. Everything else keeps
`parts: []`, so:

- **The API reference is incomplete.** A page generates a table for its root
  props type only. `TabsListProps`, `TabsTriggerProps`, `TabsContentProps`,
  `DialogContentProps`, `AlertDismissProps`, `DatePickerCalendarProps` and
  dozens more are exported by the packages, documented by tsdoc, listed by no
  page, and therefore absent from `/docs/api-reference`. A reader cannot find
  the props of the part they are told to compose.
- **The parts contract sees almost no real data.** `missingPartSources` can only
  fail for a record that declares parts; without declarations it is a fixture.
- **A part can silently stop being exported.** `registryViolations` checks
  every declared part against the package's real exports, but only for the two
  records that declare any.
- **The Source section is incomplete for menus.** `ContextMenu` and
  `DropdownMenu` re-export rows and submenu parts from `menu/item.tsx` and
  `menu/sub.tsx`. Those files are not included today, so the page shows the
  trigger and surface but not the rows it tells the reader to render.

This plan makes `parts` the real surface of every compound record and gives
every part with a distinct props type a generated table. It does **not** change
`pattern` (state ownership prose is plan 480) and does not create Tier 3–4
records.

## 2. What changes (exact files)

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/source-exports.ts` | Parse `export { X as Y }` and `export type { X as Y }` aliases, so a public alias such as `ContextMenuItem` counts as an export. |
| `apps/docs/src/component-meta/contract.ts` | Add `missingPartApi(record, hasType)`: a declared part whose `<Part>Props` type the package exports must be in the record's `api`. |
| `apps/docs/src/component-meta/entries.ts` | `parts` on all 28 compound records (§3); the `api` additions in §3. |
| `apps/docs/src/component-meta/registry.test.ts` | Opt-in list becomes the 28 slugs; new test runs `missingPartApi` with `exportedNames` over each record's package. |
| `apps/docs/src/component-pages.test.ts` | New test: every part table the registry declares is really generated under `## API reference`; keep the existing block test. |
| `apps/docs/content/docs/components/*.mdx` | `## API reference` rewritten as a root table plus `### <Part>` + table for each part with a props type; `## Source` gains `menu/item.tsx` and `menu/sub.tsx` on the two menu pages. |
| `apps/docs/README.md` | The template's API rule: one table per public part that has its own props type, and the Source rule for parts. |
| `.agents/slop/plans/README.md` | This plan in the docs table. |
| `TODO.md` | New docs-site row, ticked; progress bar kept current. |

No change to `packages/*`: the missing props tables are a documentation gap, not
a missing export. If a needed type is **not** exported, that is a STOP
condition and a cross-team `TODO.md` row.

## 3. The records (exact data)

Format: `slug` — parts (all in the record's entry file unless a file is named)
— `api` additions. The root props type is already present and stays first.

| Slug | Parts | API additions |
| ---- | ----- | ------------- |
| `accordion` | Accordion, AccordionItem, AccordionTrigger, AccordionContent | AccordionItemProps, AccordionTriggerProps |
| `alert` | Alert, AlertIcon, AlertContent, AlertTitle, AlertDescription, AlertDismiss | AlertIconProps, AlertContentProps, AlertTitleProps, AlertDescriptionProps, AlertDismissProps |
| `breadcrumb` | Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator | BreadcrumbListProps, BreadcrumbItemProps, BreadcrumbLinkProps |
| `card` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter | CardHeaderProps |
| `carousel` | Carousel, CarouselTrack, CarouselSlide, CarouselControl | CarouselTrackProps, CarouselControlProps |
| `collapsible` | Collapsible, CollapsibleTrigger, CollapsibleContent | CollapsibleTriggerProps |
| `combobox` | Combobox, ComboboxTrigger, ComboboxContent, ComboboxInput, ComboboxList, ComboboxItem, ComboboxEmpty | ComboboxTriggerProps, ComboboxContentProps, ComboboxInputProps, ComboboxListProps, ComboboxItemProps, ComboboxEmptyProps |
| `command-menu` | CommandMenu, CommandMenuInput, CommandMenuList, CommandMenuItem, CommandMenuEmpty | CommandMenuInputProps, CommandMenuListProps, CommandMenuItemProps, CommandMenuEmptyProps |
| `context-menu` | ContextMenu, ContextMenuTrigger, ContextMenuContent; ContextMenuItem/CheckboxItem/Group/Label/Separator in `menu/item.tsx`; ContextMenuSub/SubTrigger/SubContent in `menu/sub.tsx` | ContextMenuTriggerProps, ContextMenuContentProps, ContextMenuItemProps, ContextMenuCheckboxItemProps, MenuGroupProps, ContextMenuSubProps, ContextMenuSubTriggerProps, ContextMenuSubContentProps |
| `date-picker` | DatePicker, DatePickerTrigger, DatePickerContent, DatePickerCalendar | DatePickerTriggerProps, DatePickerContentProps, DatePickerCalendarProps |
| `dialog` | Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter | DialogContentProps, DialogHeaderProps |
| `drawer` | Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter | DrawerContentProps (already present) |
| `dropdown-menu` | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent; DropdownMenuItem/CheckboxItem/Group/Label/Separator in `menu/item.tsx`; DropdownMenuSub/SubTrigger/SubContent in `menu/sub.tsx` | DropdownMenuContentProps, DropdownMenuItemProps, DropdownMenuCheckboxItemProps, MenuGroupProps, DropdownMenuSubProps, DropdownMenuSubTriggerProps, DropdownMenuSubContentProps |
| `inline-validation` | Field, FieldLabel, FieldDescription, FieldError, FieldInput | FieldLabelProps, FieldInputProps |
| `fieldset` | Fieldset, FieldsetLegend | FieldsetLegendProps |
| `keycap` | KeyboardShortcuts, KeyboardShortcutsGroup, KeyboardShortcut, Keycap | KeyboardShortcutsGroupProps, KeyboardShortcutProps |
| `list` | List, ListItem, ListItemTitle, ListItemDescription | (none — both types already declared) |
| `mention-input` | MentionInput, MentionInputList, MentionInputItem | MentionInputListProps |
| `message-scroller` | MessageScroller, MessageScrollerViewport, MessageScrollerItem, MessageScrollerJumpToLatest | MessageScrollerItemProps, MessageScrollerJumpToLatestProps |
| `navigation-menu` | NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink | NavigationMenuListProps, NavigationMenuItemProps, NavigationMenuContentProps |
| `pagination` | Pagination, PaginationPrevious, PaginationList, PaginationItem, PaginationNext, PaginationEllipsis | PaginationPreviousProps, PaginationListProps, PaginationItemProps, PaginationNextProps, PaginationEllipsisProps |
| `popover` | Popover, PopoverTrigger, PopoverContent | PopoverContentProps |
| `preview-card` | PreviewCard, PreviewCardTrigger, PreviewCardContent | (none — both types already declared) |
| `stepper` | Stepper, StepperStep | (none — both types already declared) |
| `tabs` | Tabs, TabsList, TabsTrigger, TabsContent | TabsListProps, TabsTriggerProps, TabsContentProps |
| `tag-input` | TagInput, TagInputField, TagInputChip | TagInputFieldProps |
| `time-picker` | TimePicker, TimePickerSegment, TimePickerSeparator, TimePickerClear | TimePickerSeparatorProps, TimePickerClearProps |
| `timeline` | Timeline, TimelineItem | (none — both types already declared) |
| `toast` | ToastProvider (`toast/provider.tsx`), ToastViewport (`toast/viewport.tsx`) | (none — both already declared) |

A part with **no** `<Part>Props` type (for example `DialogTitle`,
`AccordionContent`, `DrawerTrigger`, `PaginationNext`'s sibling controls that
take `Props`) gets no table; its heading is not invented. `MenuGroupProps` is
the real type behind the aliased `ContextMenuGroup` / `DropdownMenuGroup`, so it
is listed under that part's heading.

## 4. The API-reference format

Root table first, then one `### <Part>` heading per part table, in the order the
parts are declared. Example for Tabs:

```mdx
## API reference

<auto-type-table path="../../../../../packages/components/src/tabs.tsx" name="TabsProps" />

### TabsList

<auto-type-table path="../../../../../packages/components/src/tabs.tsx" name="TabsListProps" />

### TabsTrigger

<auto-type-table path="../../../../../packages/components/src/tabs.tsx" name="TabsTriggerProps" />

### TabsContent

<auto-type-table path="../../../../../packages/components/src/tabs.tsx" name="TabsContentProps" />
```

A table for a part in another file uses that file's path:

```mdx
### ContextMenuItem

<auto-type-table path="../../../../../packages/components/src/menu/item.tsx" name="ContextMenuItemProps" />
```

The two menu pages add to `## Source`:

```mdx
<include lang="tsx" meta='title="packages/components/src/menu/item.tsx"'>
  ../../../../../packages/components/src/menu/item.tsx
</include>

<include lang="tsx" meta='title="packages/components/src/menu/sub.tsx"'>
  ../../../../../packages/components/src/menu/sub.tsx
</include>
```

## 5. Guards

1. `missingPartApi` in `contract.ts`:

   ```ts
   export const missingPartApi = (
     record: Pick<ComponentMetaInput, "slug" | "parts" | "api">,
     hasType: (name: string) => boolean,
   ): readonly string[] =>
     record.parts.flatMap((part) => {
       const props = `${part.name}Props`;
       return hasType(props) && !record.api.includes(props)
         ? [`${record.slug}: ${part.name} exports ${props} but no page table documents it`]
         : [];
     });
   ```

2. `registry.test.ts` "documents a props type for every part that exports one":
   run it over `components` with `exportedNames(packages/<pkg>/src)`. This also
   keeps `exportedNames` alias-aware: without the alias parser, every
   `ContextMenuItemProps` and `DropdownMenuItemProps` disappears.
3. `content-references.test.ts` "declares in the registry exactly the props
   types a page generates" (plan 441) already compares each page's
   `<auto-type-table>` names with `record.api`; with the types now in `api`, it
   fails when a part's table is dropped from the page. No second page guard is
   added for the same fact.
4. The existing `missingPartSources` guard now runs on 28 real records, and the
   two menu pages must include the row and submenu files.

## 6. Test plan (both directions)

| Guard | Fails when | Proof |
| ----- | ---------- | ----- |
| registry: part props documented | a part's real props type is left out of `api` | temporarily remove `TabsListProps` from `tabs.api` → fails naming `tabs: TabsList exports TabsListProps …`; restore |
| registry: parts are real exports | a part name is not a package export | temporarily add `NotARealExport` to `card.parts` → fails; restore |
| component-pages: part table generated | a declared type has no table on the page | temporarily delete Tabs' `TabsListProps` table → fails naming it; restore |
| content-references: part source included | a part file is not included | temporarily remove `menu/sub.tsx` from `dropdown-menu.mdx` → fails naming the three submenu parts; restore |
| type tables resolve | a part type cannot be generated | `nub run --filter docs check-types` + build; a page table that resolves to nothing is caught by the new page guard only if `api` is right, so also open one built page (`tabs`) and confirm the three headings render tables |

The type-table generator was probed on 2026-10-18 for every type in §3
(including the aliased `ContextMenuItemProps` / `DropdownMenuItemProps` at the
entry file and `MenuGroupProps` at `menu/item.tsx`): all resolve to non-empty
tables.

## 7. Commands and expected results

```sh
nub run --filter docs test          # exit 0; new tests present
nub run --filter docs check-types   # exit 0
nub run --filter docs build         # exit 0
nub run check                       # exit 0
nub run lint                        # exit 0
nub run test                        # exit 0
```

Then serve the build and check two pages whose props lived in another file:

```sh
nub run --filter docs preview &
curl -s http://localhost:3000/docs/components/tabs | grep -c "TabsListProps"
curl -s http://localhost:3000/docs/components/dropdown-menu | grep -c "DropdownMenuSubTriggerProps"
```

Both counts are at least `1` (the generated table markup names the type). Stop
the server afterwards.

## 8. STOP conditions

- A props type in §3 does not resolve through `fumadocs-typescript`: stop; do not
  write a table whose name the generator cannot find. Report the type and file.
- A part named in §3 is not actually exported by `@gpuixui/components`: stop; do
  not declare an internal module as a part. Record the missing public export in
  `TODO.md`.
- The API index or `apiDrift` needs a looser rule to pass: stop. The registry is
  the index; fix the record or the page.
- Removing the root table to "simplify" the section: do not. The root props type
  stays first and every part follows.
- Tier 3–4 records: still out of scope (plan 427's remaining half).

## 9. Acceptance

- All 28 compound records declare their real exported parts; every
  `<Part>Props` the package exports for those parts is in `api` and rendered on
  the page under a `### Part` heading.
- Every part's source file is included; both menu pages show the row and
  submenu files.
- `exportedNames` sees public aliases; the compound guards run against real
  records, and each new guard has a recorded two-direction proof.
- `nub run --filter docs test`, `check-types`, `build`, `nub run check`,
  `nub run lint` and `nub run test` pass; `TODO.md`, the plan index and the docs
  README are updated; the work is committed and pushed on `agent/docs-site`.

## 10. Progress (2026-10-18)

- **Landed.** 29 compound records declare real parts; every exported
  `<Part>Props` among them is in `api` and on the page under a `### <Part>`
  heading. The two menu pages include `menu/item.tsx` and `menu/sub.tsx`.
  `exportedNames` now parses `export { X as Y }` / `export type { … as … }`, so
  `ContextMenuItem`, `DropdownMenuItem` and their props aliases are real
  exports. `missingPartApi` is in `contract.ts`, and
  `registry.test.ts` runs it against every record's package.
- **A search regression found and fixed.** The new tables multiplied the
  synthetic `#type-table-…` rows that `fumadocs-typescript` injects as
  structured content. `search("aria-checked")` returned prop rows
  (`…-aria-label`) from menu pages before Checkbox's own prose, so
  `smoke:build` failed on its documented-prose query. `withoutTypeTableRows`
  drops generated table rows from the page index's results; the registry index
  still makes every props type name findable. The built-site smoke is green
  again (`85 pages`, `104 links`, search checked).
- **Two-direction proofs**, each run and reverted:
  - removing `TabsListProps` from `tabs.api` → `registry.test.ts` failed with
    `tabs: TabsList exports TabsListProps but the record does not document it`
    and `content-references.test.ts` with the page/registry drift;
  - returning `declared` without the alias pass from `exportedNames` →
    `registry.test.ts` failed with `dropdown-menu: DropdownMenuItem is not
    exported by @gpuixui/components` (and the rest of the menu parts);
  - deleting Tabs' `### TabsList` table → `content-references.test.ts` failed
    with `tabs: registry declares TabsListProps but the page does not generate
    it`;
  - deleting the `menu/sub.tsx` include from the Dropdown menu page →
    `content-references.test.ts` failed with the three submenu parts named;
  - making `withoutTypeTableRows` a passthrough → its test failed.
- `nub run --filter docs test`: 44 files / 276 tests, green; `check-types`,
  `build`, `smoke:build --no-build`, `nub run check`, `nub run lint` and
  `nub run test` verified before the commit.
