# 806 — A message section is named by the caller, and its rows carry names

**Owner:** components workstream · **Phase:** F (accessibility hardening) ·
**Depends on:** 110, 117, 200, 201, 391, 748, 755, 772, 792, 799, 802, 804

**Numbering:** `805` was claimed by tokens-theme (`805-example-header-figures`),
and `806` is free across `main` and every worktree on 2026-10-20 (checked with
`git ls-tree` over every `agent/*` branch and `ls` over every
`workspaces/*/.agents/slop/plans`). Recorded in `PLAN.md` D30.

## 1. Why

`Message`'s section parts write their accessible names **after** `{...rest}`, so
a caller's authored `aria-label` is silently replaced, and their rows are unnamed
`listitem`s whose text arrives as detached `label` nodes. Two of the three
sections cannot be named at all: they have no `label` prop.

Measured in this worktree on 2026-10-20 against the installed 0.10.0 binding, by
mounting the probe below in the real `TestRenderer` and reading
`src/internal/a11y.ts`:

```tsx
<Message variant="assistant">
  <MessageToolCalls
    aria-label="Search steps"
    calls={[
      { name: "search", status: "done", result: "3 results" },
      { name: "fetch", status: "failed", result: "connection refused" },
    ]}
  />
  <MessageAttachments
    aria-label="Files"
    attachments={[
      { name: "report.pdf", meta: "1.2 MB" },
      { name: "notes.txt" },
    ]}
  />
  <MessageSources label="Sources" aria-label="Citations" sources={[…]} />
</Message>
```

The accessibility tree came back as:

```
label:search, label:done, label:3 results, listitem:,
label:fetch, label:failed, label:connection refused, listitem:,
list:Tool calls,
label:report.pdf, label:1.2 MB, listitem:,
label:notes.txt, listitem:,
list:Attachments,
button:Open source Spec, group:Sources, group:Assistant message
```

Four facts, all defects against this package's own rules:

1. `listitem:` — every tool-call row and attachment chip is an **empty** list
   item. A reader browsing the list hears "list item" with no name; the call's
   name, status and result are loose siblings (the plan-626/772 defect in a third
   family).
2. The caller authored `aria-label="Search steps"` and the group announced
   **`"Tool calls"`** — the name was written after `{...rest}` (the plan-794/802
   defect).
3. The caller authored `aria-label="Files"` and the attachments group announced
   **`"Attachments"`** — same defect.
4. `MessageSources` took `label="Sources"` **and** `aria-label="Citations"` and
   announced `"Sources"` — the caller's authored name lost.

`docs/message.mdx` already claims "Every part takes the GPUix host props
(`style`, `testId`, `role`, `aria-*`)" and the package rule is "a caller's
`aria-label` wins". Neither holds for these three parts.

Scope of this plan:

- `MessageToolCalls` and `MessageAttachments` gain `label?` (defaults
  `"Tool calls"` / `"Attachments"`), and every section resolves its region name
  with `controlNameFrom` so an authored `aria-label` wins;
- every tool-call row is named `"<name>, <status>"`, every attachment chip
  `"<name>, <meta>"`, through the shared `composedName` (a missing meta adds no
  dangling comma);
- `MessageSources` uses the same precedence;
- three native cases in `message.test.tsx`, each proven red at `HEAD`;
- `docs/message.mdx`, `COMPONENTS.md`, the plan index, `TODO.md` and `PLAN.md`
  D30 synced.

**Out of scope** (do not touch): the React `key` collisions (`search-done-3
results`, `report.pdf`, a repeated `source.url`) — a second, separately planned
concern; a general localisation layer; the reasoning trigger's name (already
named from its label by `CollapsibleTrigger`); any change to visible text; the
`Message` row name (plan 802) and `MessageStreaming` (plan 799).

## 2. What exists today (read these first)

- `packages/components/src/message.tsx` — `MessageToolCalls` (~line 344) writes
  `{...rest}` then `role="list"` then `aria-label="Tool calls"`; its rows are
  `<div role="listitem">` with no name and a key of
  `${call.name}-${call.status}-${call.result ?? ""}`.
  `MessageSources` (~line 430) writes `{...rest}` then `aria-label={label}`.
  `MessageAttachments` (~line 480) writes `{...rest}` then
  `aria-label="Attachments"` and names no chip.
  `controlName`/`controlNameFrom` are already imported from
  `./internal/name.js`; `composedName` is not.
- `packages/components/src/internal/name.ts` — `controlNameFrom(authored,
  sources)` returns the first trimmed non-empty string (authored first);
  `composedName(authored, parts)` joins trimmed non-empty parts with `", "` and
  returns `Option.Option<string>`.
- `packages/components/src/behaviour/message.test.tsx` — 16 native cases; imports
  `nodesWithRole`, `renderComponent`, the `Row` helper (fixed 420 px column) and
  every part. Its header comment lists the bugs guarded.
- `packages/components/docs/message.mdx` — the Slots table (lines 57–66), the API
  table (lines 88–98), the Accessibility list (lines 107–124) and the
  Verification line `(16 tests)` (line 140).
- `COMPONENTS.md` line 298 — the `Message (AI message row)` row states
  `16 native behaviour tests`.
- `.agents/slop/plans/README.md` — the components table, newest rows last.
- `TODO.md` — "Tier 2 hardening after the inventory closed (plans 120+)".
- `PLAN.md` D30 — the overflow-number sentence.

## 3. Exact changes

### 3.1 `packages/components/src/message.tsx`

1. Import `composedName` beside the existing name helpers:

   ```ts
   import { composedName, controlName, controlNameFrom } from "./internal/name.js";
   ```

   and `import * as Option from "effect/Option";`.

2. `MessageToolCallsProps` gains:

   ```ts
   /** The group's accessible name. Default `"Tool calls"`. */
   readonly label?: string;
   ```

   `MessageAttachmentsProps` gains the same with default `"Attachments"`.

3. `MessageToolCalls` destructures `label = "Tool calls"` and
   `"aria-label": authoredName`; computes

   ```ts
   const name = controlNameFrom(authoredName, [label]);
   ```

   writes `{...rest}` **before** `role="list"` and
   `{...(name === undefined ? {} : { "aria-label": name })}`, and names each row:

   ```tsx
   const rowName = Option.getOrUndefined(
     composedName(undefined, [call.name, call.status]),
   );
   <div
     key={...}                       // unchanged
     role="listitem"
     {...(rowName === undefined ? {} : { "aria-label": rowName })}
     ...
   ```

4. `MessageAttachments` applies the same shape: `label = "Attachments"`,
   authored name wins, `{...rest}` first, and each chip is a `listitem` with

   ```ts
   Option.getOrUndefined(composedName(undefined, [attachment.name, attachment.meta ?? ""]))
   ```

   so `"notes.txt"` stays two words and never ends in `", "`.

5. `MessageSources` destructures `"aria-label": authoredName` and computes
   `controlNameFrom(authoredName, [label])`; `{...rest}` stays first and the
   resolved name is written once. The citation buttons keep
   `aria-label={\`Open source ${source.label}\`}`.

6. Extend the module JSDoc of each part with one sentence: the section name is the
   caller's (`aria-label`, then `label`), and each row is named from its data
   because 0.10.0 does not lift `div` contents into an accessible name.

### 3.2 `packages/components/src/behaviour/message.test.tsx`

- Extend the header comment with the measured bug: tool-call and attachment rows
  arrived as empty `listitem`s, the caller's `aria-label` on both sections was
  replaced by the hard-coded default, and `MessageSources` preferred `label` over
  an authored name (plan 806).
- Add three cases after the existing tool-call/attachment/source cases:

  1. **A tool-call group takes the caller's name and names each row.**
     Render one `MessageToolCalls` with `calls=[search/done, fetch/failed]`;
     assert the `list` names are `["Tool calls"]` and the `listitem` names are
     `["search, done", "fetch, failed"]`. Rerender with
     `aria-label="Search steps"` and assert the group name is
     `["Search steps"]`. Fails at `HEAD` on both assertions.
  2. **An attachment group takes the caller's name and names each chip.**
     `attachments=[{name:"report.pdf",meta:"1.2 MB"}, {name:"notes.txt"}]`;
     assert the `list` is `["Attachments"]` and the chips are
     `["report.pdf, 1.2 MB", "notes.txt"]`; rerender with `aria-label="Files"` and
     assert `["Files"]`. Fails at `HEAD`.
  3. **A sources group prefers the caller's authored name.**
     `label="Sources" aria-label="Citations"` announces `["Citations"]`; a blank
     authored name (`"   "`) falls back to `["Sources"]`. Fails at `HEAD` with
     `"Sources"` and pins the fallback.

  This makes **19** native cases in the file.

### 3.3 `packages/components/docs/message.mdx`

- Slots table: `MessageToolCalls` data becomes `` `calls`, `label?` ``;
  `MessageAttachments` data becomes `` `attachments`, `label?` ``.
- API table: `MessageToolCalls` → `` `calls` (required), `label?` (`"Tool calls"`) ``;
  `MessageAttachments` → `` `attachments` (required), `label?` (`"Attachments"`) ``.
- Accessibility list: add one bullet — each section is a named `list` whose name
  is the caller's (`aria-label`, then `label`, then the default), and each tool
  call / attachment is a named row (`"search, done"`, `"report.pdf, 1.2 MB"`)
  because 0.10.0 does not name a `listitem` from its contents (plan 806).
- Verification: `(16 tests)` → `(19 tests)` and name the new coverage in the
  prose.

### 3.4 `COMPONENTS.md`

In the `Message (AI message row)` row (line 298): `16 native behaviour tests` →
`19 native behaviour tests`, and add one clause after the streaming sentence:
"each section is a named list (`aria-label` > `label` > default) whose tool-call
and attachment rows are named from their data". Keep the cell on one line.

### 3.5 Index and tracking

- Add row `| [806](./806-message-section-names.md) | A message section is named by the caller, and its rows carry names | F | 110, 200, 201, 391, 772, 792, 799, 802 | done — … |`
  to the components table in `.agents/slop/plans/README.md`.
- Under "Tier 2 hardening after the inventory closed" in `TODO.md`, add a ticked
  `[x]` line describing the measurement, the fix, the 3 native cases and the
  synced docs.
- Append `806` to the overflow sentence in `PLAN.md` D30 (after `804`).

## 4. Test plan

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/message.test.tsx
```

Expected **before** the source change: **3 failed | 16 passed (19)**, with the
measured names (`"Tool calls"` where `"Search steps"` was authored, empty
`listitem` names, `"Sources"` for `"Citations"`).

Expected after: **19 passed (19)**.

**Both directions** (revert one at a time, confirm the named case fails, restore):

1. Remove the `label` + authored precedence from `MessageToolCalls` → case 1 fails
   with the default name and empty rows.
2. Remove the row names from `MessageAttachments` → case 2 fails on the chip
   names (the group-name half stays green, showing the two halves are separate).
3. Move `aria-label` back before `{...rest}` in `MessageSources` → case 3 fails
   with `"Sources"` while the blank-fallback pin stays green.

Then the gates:

```sh
nub run test
nub run check
nub run lint
```

All exit 0; `message.test.tsx` is 19/19 and the unit count is unchanged (no
logic module changes).

No playground smoke scenario mounts a `Message` row (`tier2-*` scenarios cover
other components), so the native `TestRenderer` read is the evidence and no live
window is opened. Record the exact command and result in the plan index row.

**Measured in this worktree, 2026-10-20:**

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/message.test.tsx
# HEAD (source stashed): 3 failed | 16 passed (19)
# after:                 19 passed (19)

nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/message.test.tsx \
  src/behaviour/accessibility.test.tsx \
  src/behaviour/examples.test.tsx
# 3 files passed, 21 tests passed
```

## 5. STOP conditions

- Any of the three new cases passes at `HEAD`: stop and re-measure the tree; a
  part may already have been changed by another writer.
- `composedName`'s signature differs from §2: read
  `src/internal/name.ts` rather than guessing; do not hand-roll a join.
- A visible text node changes: stop. Only `aria-label` may be added or changed.
- An existing message case changes state: stop and report which case.
- `docs/message.mdx` or `COMPONENTS.md` states a count other than 19 after the
  change: stop and reconcile before committing.
- The React duplicate-key warnings appear for a fixture whose calls/attachments
  are all distinct: stop; the fixtures must not introduce a key collision.

## 6. Acceptance

- A caller's `aria-label` wins on `MessageToolCalls`, `MessageAttachments` and
  `MessageSources`; a blank authored name falls back to `label`, then the default.
- Every tool-call row is named `"<name>, <status>"` and every attachment chip
  `"<name>"` or `"<name>, <meta>"`; no `listitem` in a `Message` section is
  anonymous.
- `message.test.tsx` is **19/19 measured on this host**, and the three new cases
  are red at `HEAD`.
- `docs/message.mdx`, `COMPONENTS.md`, the plan index, `TODO.md` and `PLAN.md`
  D30 agree; `nub run test`, `nub run check` and `nub run lint` exit 0.
