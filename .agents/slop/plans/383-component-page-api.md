# 383 — Every component page documents its public API

**Phase:** F (docs truth) · **Owner:** components workstream ·
**Depends on:** 110, 117, 200, 337 · **Status:** planned

## 1. Why

MISSION.md requires every component page to include **API/prop docs**. Today
only 26 of the 41 `packages/components/docs/*.mdx` pages have an `## API`
section, and four of those omit parts the component exports. A reader of the
Accordion, Dropdown menu, Combobox, Dialog or Toast page cannot find the props,
defaults or which part owns which behaviour without opening the source.

`docs/component-api.md` §8 is the authoritative parts list (checked against the
package exports by `inventory.test.ts`), so the page-level API tables can be
checked against it. This plan closes the gap and adds the check, so it cannot
regress.

**Evidence (audit, 2026-10-18):** 15 pages have no `## API` section:
`accordion`, `breadcrumb`, `collapsible`, `combobox`, `command-menu`,
`context-menu`, `date-picker`, `dropdown-menu`, `field`, `pagination`,
`popover`, `search-input`, `tabs`, `time-picker`, `toast`. Four existing
sections omit parts: `alert` (`AlertIcon`, `AlertContent`, `AlertTitle`,
`AlertDescription`), `color-picker` (`ColorPicker`), `confirm-dialog`
(`ConfirmDialog`), `dialog` (`DialogHeader`, `DialogDescription`,
`DialogFooter`).

## 2. The rule

A page's `## API` section, from the heading to the next `## ` heading, must:

1. exist;
2. name **every** part in that component's `docs/component-api.md` §8 `Parts`
   cell inside backticks (`useToast` counts: it is the Toast entry's public
   hook and gets its own row);
3. start each part's row with the part name in backticks.

Part rows must state the public props with their types and defaults. A part with
no props beyond the host props gets an em dash. Host props are described once in
the section's opening sentence, as `card.mdx` already does.

## 3. Files

Change only:

- `packages/components/src/inventory.test.ts` — the new check.
- The 15 pages listed in §1 — add `## API`.
- `packages/components/docs/{alert,color-picker,confirm-dialog,dialog}.mdx` —
  add the missing part rows.
- `.agents/slop/plans/README.md` — add this plan's row.
- `TODO.md` — add and tick the task under Phase F, components workstream.

Do **not** touch component source, examples, `COMPONENTS.md`, the root
`README.md`, or docs-site files.

## 4. Steps

### 4.1 Write the failing check first

In the `documented API` describe of `packages/components/src/inventory.test.ts`,
add one case:

```ts
it("documents every part in its page's API section", () => {
  const rows = tableRows(section(contract(), "## 8. Parts by component"));
  const problems = Arr.flatMap(inventory, (meta) => {
    const page = readFileSync(
      fileURLToPath(new URL(meta.docs, packageRoot)),
      "utf8",
    );
    const api = section(page, "## API");
    if (api === "") return [`${meta.name}: ${meta.docs} has no API section`];
    const row = Arr.findFirst(rows, (cells) => cells[0] === meta.name);
    const parts = Option.match(row, {
      onNone: () => [],
      onSome: (cells) => partsOf(cells[1] ?? ""),
    });
    return Arr.map(
      Arr.filter(parts, (part) => !api.includes(`\`${part}\``)),
      (part) => `${meta.name}: ${meta.docs} does not document ${part}`,
    );
  });

  expect(problems).toEqual([]);
});
```

`section`, `tableRows`, `partsOf`, `contract`, `packageRoot` and `inventory` are
already in scope in that file. Keep the file's Effect-array style.

Run:

```sh
cd packages/components
nub run --filter @gpuixui/components test -- src/inventory.test.ts
```

Expected: **fail** with one line per missing page (19 pages: 15 absent sections
plus the 4 incomplete ones). Paste the failure list into the commit message.
This is the both-directions proof for the check.

### 4.2 Fill the API sections

For each page, read the component module(s) and document only what the exported
TypeScript says. The exact sources:

| Page | Source to read |
| ---- | -------------- |
| `accordion.mdx` | `src/accordion.tsx` (`AccordionProps`, item/trigger/content props) |
| `breadcrumb.mdx` | `src/breadcrumb.tsx` |
| `collapsible.mdx` | `src/collapsible.tsx` |
| `combobox.mdx` | `src/combobox.tsx` |
| `command-menu.mdx` | `src/command-menu.tsx` |
| `context-menu.mdx` | `src/context-menu.tsx` and `src/menu/*` (shared parts) |
| `date-picker.mdx` | `src/date-picker.tsx` and `src/date-picker/*` |
| `dropdown-menu.mdx` | `src/dropdown-menu.tsx` and `src/menu/*` |
| `field.mdx` | `src/field.tsx` |
| `pagination.mdx` | `src/pagination.tsx` |
| `popover.mdx` | `src/popover.tsx` |
| `search-input.mdx` | `src/search-input.tsx` |
| `tabs.mdx` | `src/tabs.tsx` |
| `time-picker.mdx` | `src/time-picker.tsx` |
| `toast.mdx` | `src/toast.tsx`, `src/toast/provider.tsx`, `src/toast/model.ts` |

Plus the four missing rows: `alert.mdx`, `color-picker.mdx`,
`confirm-dialog.mdx`, `dialog.mdx`.

Table shape (match `card.mdx` and `combobox.mdx`):

```mdx
## API

Every part takes the GPUix host props (`style`, `testId`, `role`, `aria-*`,
pointer and key handlers) and **merges `style` last**.

| Part | Renders | Props |
| ---- | ------- | ----- |
| `Tabs` | `div` | `value?: string`, `defaultValue?: string`, `onValueChange?: (value: string) => void`, `orientation?: "horizontal" \| "vertical"` (default `"horizontal"`), `activationMode?: "automatic" \| "manual"` (default `"automatic"`) |
| `TabsList` | `div` | — |
```

Rules for the rows:

- One row per part from the §8 list, even when it has no own props (`—`).
- Types are copied from the source, not invented. Optionality is `?:`; defaults
  are shown as `` (default `"md"`) `` and only when the source sets one.
- Do not document internal props (`testId` excepted as host), state callbacks
  that are not exported, or behaviour. Behaviour belongs in the prose above.
- Keep the existing prose; insert `## API` immediately before `## Theming`
  (or before `## Accessibility` when the page has no theming section), so the
  page order stays: description, usage, anatomy, behaviour, API, theming, style
  by state, limitations/accessibility, verification, related.

### 4.3 Re-run

```sh
cd packages/components
nub run --filter @gpuixui/components test -- src/inventory.test.ts
```

Expected: pass, 0 problems.

Then prove the check in the other direction: delete one row from one page (for
example `TabsList` from `tabs.mdx`), re-run, expect exactly that one failure;
restore the row and re-run to green.

## 5. Acceptance

- `nub run --filter @gpuixui/components test -- src/inventory.test.ts` is green
  with the new case.
- Every `## API` section names all its §8 parts and states real props.
- No component source or example changed.
- `.agents/slop/plans/README.md` has row 383; `TODO.md` has the ticked task.
- `nub run check`, `nub run lint`, `nub run test` pass (the last includes
  `packages/components` unit tests; behaviour suites are unchanged but run
  `nub run --filter @gpuixui/components test:behaviour` once before committing).

## 6. STOP conditions

Stop and report if:

- a part in the §8 table is **not** exported (the existing contract check would
  already fail; do not paper over it with a table row);
- a component has no exported props interface to read, so the public props
  cannot be stated without guessing;
- the check cannot be expressed with the helpers already in `inventory.test.ts`
  without adding a new parsing path (report the shape instead of hand-rolling a
  second markdown parser);
- any page needs a component change to make its documented API true. That is a
  separate plan.
