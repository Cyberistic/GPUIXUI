# Plan 755 — the tasks block

A Notion-style tasks block for the docs site: the top bar, the workspace
sidebar, and a task inbox plus two card rows — pinned docs and docs with
tasks — with every string carrying Hunter × Hunter content.

This plan is written against the reference screenshot, feature by feature.

## Files

| Path | Change |
| ---- | ------ |
| `apps/docs/src/components/docs/tasks-block.tsx` | **new** — the block: data, reducers, rendering |
| `apps/docs/src/components/docs/tasks-block.test.tsx` | **new** — the guards |
| `apps/docs/src/styles/blocks.css` | **change** — `.gx-task*` rules, appended |
| `apps/docs/src/components/docs/blocks.tsx` | **change** — register the block |
| `apps/docs/content/docs/blocks/tasks.mdx` | **new** — the block page |
| `apps/docs/content/docs/blocks/meta.json` | **change** — add the page |
| `apps/docs/README.md` | **change** — ledger rows for the page and the module |

### Reused, not rebuilt

The top bar's tab strip is `apps/docs/src/components/docs/reorderable-tabs.tsx`,
the site's drag-and-close tab component, dressed with `tabClassName`. The block
adds no tab behaviour of its own.

## The block, feature by feature

The reference is Notion's Tasks view. It has three regions.

### 1. The top bar (full width, above both panes)

- a **sidebar-toggle** panel icon, and a `⌄` chevron, on the left
- **back `‹`** and **forward `›`** arrows
- a centred **tab strip**: a rounded grey active tab reading `✓ Tasks`, and a
  `+` button beside it
- on the right: a **bell** and a round **avatar**

### 2. The sidebar (left, warm grey)

Top to bottom, in the reference's order:

- **Home** (house) and **New Document** (document) — above the workspace
- the **workspace row**: an avatar, `⌄` chevron, the workspace name, and a
  search icon on the right
- **Organize** (document), **All Docs** (box)
- **Tasks** — the active row, a circle-check icon, highlighted, with a `+` on
  the right
- **Calendar** — calendar icon, with a focus/expand icon on the right
- **Starred** (star), **Unsorted**, **My Templates**, **Published Content**
- a **Folders** heading with a `+` on the right, then the folders: `Work
  related`, `Journal`, a folder with a flower icon and a `›` submenu chevron,
  and a folder with a `›` submenu chevron
- the footer: **Send Beta Feedback** (envelope) and **Help Center** (`?`)

### 3. The content pane (right, white)

- the page title **Tasks** as a large heading, and a soft-blue **⊞ New Task**
  button on the right
- the **Inbox** section: the heading, a `···` beside it, and a `⌄` on the far
  right. Its rows are: a checkbox, a **date pill** (grey rounded), then the
  task text. Two variations appear in the reference — the date pill can carry
  a folder glyph, and the date can sit at the far right of the row instead of
  beside the text.
- the **Pinned Docs** section: one row of three cards
- the **Docs With Tasks** section: two rows of three cards

Each section header carries the same `···` and the far-right `⌄`.

### The cards

Each card is:

- a **cover strip** across the top — a photo, or a tinted band. Some cards have
  a coloured border (blue, orange, yellow) and one card is dark with a yellow
  border.
- a small **document glyph**, the **title in link blue**, and a grey
  **"N tasks to do"** count
- a list of the document's **open tasks**, each a checkbox with a blue title
- a **clock badge** in the top-right corner

### The state a reader can watch

- a checkbox ticks a task; the card's count follows the same array
- **New Task** appends a task to the inbox
- a card's menu pins and unpins it; the **Pinned Docs** row follows
- a section's `⌄` collapses and expands it
- the rail's collapse keeps its icons and takes its labels
- the top bar's tab strip is the site's **`ReorderableTabs`**, not a hand-rolled
  row: a card's title opens that document as a tab, `+` opens a blank view,
  `×` closes one, and tabs drag or move with `Alt`+arrow; activating a
  document tab shows that document's page and its tasks

### Content

Every string is Hunter × Hunter:

- **Workspace**: Whale Island
- **Inbox tasks**: buy Greed Island's replica ball, leave the key for Gon,
  research Nen types, pack for the Hunter Exam, bribe the Phantom Troupe
- **Pinned docs**: the Zoldyck family tree, the Greed Island game manual, the
  Nen quirk catalogue, the Heavensnake Arena floor guide
- **Docs with tasks**: the Hunter Exam prep, Killua's training schedule,
  Kurapika's scarlet eyes, the Phantom Troupe heist, Leorio's medical notes

## Commands

```bash
cd apps/docs && nub run test -- src/components/docs/tasks-block.test.tsx
cd apps/docs && nub run check-types
cd /Users/cyberistic/Documents/GPUIXUI && nub run check && nub run lint && nub run test
cd apps/docs && nub run build
```

## Test plan

The guards must fail without the implementation and pass with it:

1. A tick removes the task from the open count, and the card's count follows
   the same array.
2. **New Task** appends to the inbox and the inbox's count follows.
3. Pinning a document moves it into the **Pinned Docs** row; unpinning moves
   it back.
4. A collapsed section hides its cards.
5. The rail's collapse keeps its icons and takes its labels.
6. The block renders the reference's regions: the top bar, the sidebar's
   workspace row and folders, the inbox, and both card rows.

## STOP conditions

- Stop if the library has no component the block needs — the block is a
  recipe from shipped components, not a new component. If a control cannot be
  built from `Card`, `Badge`, `Button`, `Checkbox`, `Text`, `Stack` and
  `Icon`, report it instead of adding one.
- Stop if a block page needs a route that is not file-based.

## Acceptance

- The page renders at `/blocks/tasks` and shows in `/blocks`.
- Every control in the reference is live.
- `nub run check`, `nub run lint`, `nub run test` pass.
