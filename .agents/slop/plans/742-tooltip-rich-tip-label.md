# 742 — A rich `Tooltip` must be announced: the tip's `label`

| Field | Value |
| ----- | ----- |
| Phase | F — accessibility truth for the last unnamed surface |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Tooltips row in `COMPONENTS.md`) |
| Depends on | `030` (package), `041` (runtime suite), `060`/`067` (placement), `071` (description), `347` (open state), `573` (blank tip), `586` (blank description), `741` |
| Status | **done** — `Tooltip` takes `label`: a labelled node tip is a named `tooltip` node and describes its trigger, a string tip defaults to its own text, a blank label falls back, and the blank-string no-tip rule is untouched. 4 element + 3 runtime cases, both directions measured (§4); offline 69 files / 953 tests, scoped live 1 file / 3 |

## 0. Why

`docs/tooltip.mdx` states the behaviour and then the gap in two places:

- §Accessibility: "Non-string content is painted and becomes a `tooltip` node,
  but the wrapper does not invent a name for it; pass a string to have it
  announced."
- §Limitations: "A non-string tip has no description on the trigger and no name
  of its own."

So a **rich** tip — a node with an emphasised term, an inline `code` run, or a
two-line hint — paints, reaches the accessibility tree as a `tooltip` node, and
is **unnamed**: a screen-reader user hears nothing, and the trigger carries no
description. That is the same class plans `573`/`578`/`586`/`589` fixed
elsewhere (an unnamed node or an empty name instead of no node), and the wrapper
already owns both halves of the fix: it writes the trigger's `aria-description`
and the tip's `aria-label` from one resolved string.

The runtime has no way to read text out of a node (`aria-label` is a string
prop), so the caller must supply the words. `Tooltip` therefore gains one
optional prop, `label`, which is the announced summary of the tip — a string
tip's own text is still the default, so nothing existing changes.

Measured today (this host, pinned release build): a `Tooltip` whose content is
`<Text role="code">gpuixui</Text>` publishes a `tooltip` node with no name and a
trigger with no description; the same tip plus `label="Package name"` should
publish both.

## 1. The contract

1. `label` is the tip's **accessible summary**. It becomes the trigger's
   `aria-description` and the open tip's `aria-label` — the two places the
   wrapper already writes.
2. A **string** tip keeps its text as the summary. `label` wins when both are
   supplied, so a caller can shorten what is announced without changing what is
   painted (`content="3 items"`, `label="3 selected items"`).
3. A **blank** `label` falls back to a string tip's text; blank is absent
   (`ariaName`'s rule, plans `026`/`586`).
4. A **node** tip with no `label` is unchanged: it paints, becomes a `tooltip`
   node, and is unnamed — the honest result, now documented as a requirement
   rather than an acceptable end state.
5. A **whitespace-only string** content is still no tip at all, whatever the
   label says (plan `573`): there is nothing to show, so the child renders
   unchanged and no description is written.

No other prop changes; `InfoTip` (string content) is untouched.

## 2. Files to change

### 2.1 `packages/primitives/src/components/Tooltip.tsx`

- `TooltipProps` gains, after `content`:

  ```ts
  /**
   * The tip's accessible summary: the trigger's description and the open tip's
   * name. Defaults to the content when it is a string. A **node** tip has no
   * text the runtime can read, so without a label it paints unnamed (plan 742).
   * A blank label falls back to a string content and is otherwise absent.
   */
  readonly label?: string;
  ```

- In `renderTooltip`, destructure `label` and resolve one value:

  ```ts
  const text = P.isString(content) ? ariaName(content) : undefined;
  if (P.isString(content) && text === undefined) return <>{children}</>;
  const announced = ariaName(label) ?? text;
  ```

  Replace the local `description` with `announced` in both the
  `TooltipTrigger`'s `aria-description` and the `TooltipContent`'s
  `aria-label`. Rename the docstring's "is not given an invented name" sentence
  to name the `label` rule.

### 2.2 `packages/primitives/src/components/Select.test.tsx` (the `describe("Tooltip")` block)

- Update `"exposes non-string content as a tooltip node without inventing a
  name"` so it also proves the label closes the gap, and add:

1. `"names a rich tip from its label"` — `{ content: <div />, label: " Billing cycle " }`
   → the trigger's `aria-description` is `"Billing cycle"` and the tip's
   `aria-label` is `"Billing cycle"`; role stays `tooltip`.
2. `"lets a label shorten a string tip's announcement without changing its
   paint"` — `{ content: "3 items", label: "3 selected items" }` → both ARIA
   values are `"3 selected items"`, while the tip's painted child is still the
   string `"3 items"`.
3. `"falls back to a string tip when the label is blank"` — `label: "   "` +
   `content: "A hint"` → `"A hint"` on both; a blank label with a node content
   leaves both absent (the existing case).
4. Keep `"drops a tip whose content is only whitespace"` passing **with** a
   label: `{ content: "   ", label: "A hint" }` still renders the child alone.

### 2.3 `packages/primitives/runtime/tooltip-rich.runtime.test.tsx` (new)

Header comment names the bug this removes (the runtime-hygiene guard requires
one). Three cases, using `openWindow`, `Surface`, `awaitFrame`, `a11yNode` and
the existing `descriptionOf` shape:

1. `"announces a labelled rich tip and describes its trigger"` — a `Button`
   wrapped in `<Tooltip label="Billing cycle" content={<Text role="code">gpuixui</Text>}>`;
   `runtime.focusNext()`, `awaitFrame` for the tip's paint, then:
   `a11yNode(runtime.a11y(), { role: "tooltip", label: "Billing cycle" })` is
   `Some`, and the `Button` node's `aria.description` is `"Billing cycle"`.
2. `"paints an unlabelled rich tip without a name"` — the old direction: the
   `tooltip` node exists, its `aria.label` is absent, and the trigger has no
   description.
3. `"keeps a string tip's text when the label is blank"` — the open tip's name
   and the trigger's description are the content text.

### 2.4 `packages/primitives/docs/tooltip.mdx`

- API table: add
  `| label | string | the content, when it is a string | the tip's accessible summary — the trigger's description and the tip's name; give a node tip one, because the runtime cannot read text out of a node |`.
- Accessibility: replace the "does not invent a name" sentence with the
  supported rule — a **node** tip needs `label`; with one, both the trigger's
  description and the tip's name are that string, and without one the tip paints
  unnamed.
- Limitations: replace "A non-string tip has no description on the trigger and
  no name of its own." with "A non-string tip needs `label`; the runtime cannot
  read text out of a node, so an unlabelled rich tip is painted but not
  announced (no name is invented)."
- Verification: add the four element cases (naming the `describe("Tooltip")`
  block's file) and the runtime file.

### 2.5 `COMPONENTS.md`, `packages/primitives/README.md`

- Tooltips row: one sentence, **Rich tips (742):** a node tip paints and reaches
  the tree as a `tooltip` node; `label` is its name and the trigger's
  description, a string tip defaults to its own text, and an unlabelled node tip
  stays unnamed (measured in the runtime).
- Runtime file counts `65` → `66` in the README's sentence and both
  `COMPONENTS.md` passages (the guards in `src/docs-counts.test.ts` fail
  otherwise).

### 2.6 `TODO.md` and `.agents/slop/plans/README.md`

- Add and tick the primitives row (plan `742`) and raise the section count
  `166/166` → `167/167`.
- Add the plan to the primitives block table with its measured result.

## 3. Commands and expected results

```sh
# 1. the element suites, including the new Tooltip cases
nub run --filter @gpuixui/primitives test
# expect: 69 files / 953 tests pass (950 + 3; the whitespace case gained the labelled half), count guards green after §2.5.

# 2. the new runtime file, scoped
nub run --filter @gpuixui/primitives test:runtime runtime/tooltip-rich.runtime.test.tsx
# expect: 1 file / 3 tests pass.

# 3. the suites this change touches
nub run --filter @gpuixui/primitives test:runtime runtime/overlay-trigger.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/info-tip.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/description.runtime.test.tsx
# expect: each passes; string tips and every trigger's description are unchanged.

# 4. the package's type gate
nub run --filter @gpuixui/primitives check-types
```

## 4. Test plan — both directions

The gap this guards: a rich (node) tip painted and produced a `tooltip` node
with no name, and its trigger carried no description, so the whole tip was
invisible to assistive technology.

1. Revert the resolution to `const announced = text` (ignore the label) and run
   the runtime file: case 1 fails (no `tooltip` node named `"Billing cycle"`, no
   description on the trigger) and element case 1 fails.
2. Revert `ariaName(label) ?? text` to `text` in the element suite only: case 2
   fails (the tip announces `"3 items"`, not the shorter label).
3. Remove the `?? text` fallback: the blank-label case (element case 3) fails,
   because both ARIA values become absent.
4. Move the blank-string guard below the label resolution: element case 4 fails
   (a whitespace-only string with a label opens an empty named tip) — the
   plan-573 regression.
5. Keep case 2 of the runtime file in both directions: it must pass before and
   after, because an unlabelled node tip is not what this plan fixes.

Record the exact failing assertion text in the plan's status line and the commit
body.

## 5. STOP conditions

Stop and report (do not improvise) if:

- the runtime does not map `role="tooltip"` plus `aria-label` to a named node
  (the capability would have to be re-measured before any docs change);
- writing the trigger's `aria-description` changes the trigger's name, role or
  focus behaviour (the slot contract and the name matrix must not move);
- a string tip's existing description changes (the `071`/`573`/`586` cases fail);
- the tip's paint or placement changes (the tooltip placement suites fail);
- `InfoTip`'s description or name moves (it passes a string content, so it must
  not).

## 6. Acceptance

- `Tooltip` takes `label`; a named node tip is announced (trigger description and
  tip name) and an unlabelled one is unchanged.
- A label wins over a string's announcement without changing the painted text; a
  blank label falls back; a whitespace-only string tip is still no tip.
- Four element cases + three runtime cases, each failing in the stated
  direction; the tooltip placement, InfoTip, overlay-trigger and description
  suites unchanged.
- The page, `COMPONENTS.md`, the README count, `TODO.md` and the plans index
  tell the truth.
- `nub run --filter @gpuixui/primitives test`, the scoped runtime files and
  `check-types` pass.
