# 344 — Tier 2 foundation and navigation in the playground

**Status:** planned · **Phase:** C/D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `158`, `160`, `330`.

## 1. Why this plan exists

Plan `330` mounted the shipped Tier 2 **overlays** — `Dialog`/`ConfirmDialog`,
`DropdownMenu`/`ContextMenu` and `ToastProvider`/`ToastViewport` — through the
published package root and proved them in a consumer app. The other Tier 2
families have only the package's own behaviour tests: no playground view, no
consumer-path check, and no place where a human can drive them in a real GPUix
window.

That is a real gap, not a cosmetic one:

- `packages/components` is consumed **through the vendor compile**
  (`apps/playground/tsconfig.vendor.json`, plan `330` §3) because its tsconfig
  maps the JSX runtime to a `.d.ts`. Every family must be exercised through that
  path, or a compile/import regression in a family nobody mounts stays invisible.
- The playground is the docs' native evidence source. A component the playground
  cannot mount cannot be shown honestly by the docs.
- The remaining families are the shared foundation (Card, Badge, Avatar, Alert,
  EmptyState, List) and the navigation set (Tabs, Accordion, Collapsible,
  Breadcrumb, Pagination). A composition library whose foundation does not paint
  together is not usable, even when each part passes in isolation.

Plan `330` left the suite at `tier2` = dialog + menu + toast. This plan extends
the same capability with two more scenarios and does not change package code.

## 2. What will be proven

Both views are consumer code: they import the published root, read
`useTheme()` and compose the parts. The assertions are the shipped contract, not
a re-probe of the mechanism (the mechanism was measured by plans
`155`–`160`, `173`, `174`, `186`).

### `tier2-foundation`

| Family | Interaction asserted |
| ------ | -------------------- |
| Card | all three variants paint; `elevated` reports a shadow and `outline`/`plain` do not; header, content and footer are addressable |
| Badge | the primary variant's painted background equals the theme's `primary` role (the theme value is read from a readout, not hard-coded) |
| Avatar | the initials fallback paints `AL`; `md` is 32 px and `lg` 40 px; the root is an AccessKit `Image` under its authored id |
| Alert | the root is an AccessKit `Alert`; the dismiss control runs once and removes the alert when the consumer closes it |
| EmptyState | title and description paint; the action runs |
| List | single selection reports through `onValueChange`; the selected row paints `theme.colors.selected`; Down moves native focus and skips the disabled row; Enter selects the focused row; a click on a disabled row changes nothing; the selected row is `aria-selected` |

### `tier2-navigation`

| Family | Interaction asserted |
| ------ | -------------------- |
| Tabs | one panel paints at rest; a click selects another tab and swaps the panel; a tab is an AccessKit `Tab` with `selected`; Right moves selection, native focus and the panel together while skipping a disabled tab; `tabpanel` is labelled by its value |
| Accordion | `single` keeps one section open: clicking Shipping opens it, clicking Billing closes Shipping; the header is a `button` with `expanded`; Down moves native focus between enabled headers |
| Collapsible | the trigger is a `button` with `expanded=false` at rest; a click opens the body; Enter closes it |
| Breadcrumb | the trail is a `navigation` landmark named `Breadcrumb`; links are `link` nodes under their authored ids; a click selects Home and Enter selects Projects; the current page is not a link |
| Pagination | the control is a `navigation` landmark named `Pagination`; the current page paints with `aria-selected`; a page click and Next both report through `onPageChange`; the ellipsis paints; at page 1 Prev is inert |

## 3. Files

Create:

- `apps/playground/src/scenarios/tier2-foundation.tsx`
- `apps/playground/src/scenarios/tier2-navigation.tsx`

Change:

- `apps/playground/src/scenarios/index.ts` — import and register both.
- `apps/playground/README.md` — add both to the scenario list and one paragraph
  naming them as the consumer-path catalogue.
- `COMPONENTS.md` — extend the `tier2` capability row and the "End-to-end
  Tier 2 composition" paragraph; add the measured consumer facts.
- `TODO.md` — tick the new task; record the suite counts.
- `.agents/slop/plans/README.md` — add the `344` row and move the "next free
  number" note to `345`.

Do **not** change `packages/components`, `packages/primitives`,
`packages/tokens` or `apps/docs`. If a shipped component is wrong, record it as
a cross-team task in `TODO.md` with the measured evidence; do not fix it here.

## 4. The views

Both frames follow the existing scenario shape: one root element sized by
`useWindowSize()`, a `Readout` for every piece of state the steps assert, and
`aria-id` on the part whose accessibility is asserted (the runtime's node keys
are ephemeral — plan `160`).

### 4.1 `tier2-foundation.tsx`

Two columns inside the frame, 24 px padding, 24 px gap. Left:

1. a badge row — neutral, primary, success, warning, danger, info, outline,
   each with a `testId`;
2. an avatar row — `Ada Lovelace` (md, initials), one with `status="Online"`
   (lg), one `xs`;
3. `card-outline` (header title/description, content, footer with a badge);
4. `card-elevated` (content only);
5. `card-plain` (content only).

Right:

6. `alert-info` with icon, content, title, description and `AlertDismiss`;
7. `empty-state` with an action;
8. a `List selectionMode="single" defaultValue="inbox"` with rows
   `inbox`, `starred`, `spam` (disabled), `trash`, each a `ListItem` carrying
   `testId` and `aria-id`.

Readout `tier2-foundation-readout`:
`selected=<value> dismissed=<bool> created=<n> tokens=<primary>|<selected>|`
and the theme's primary/selected colours come from
`useTheme()` so the style assertion compares the component's paint with the
token it was given, never with a literal.

### 4.2 `tier2-navigation.tsx`

Left:

1. `Tabs defaultValue="overview"` with triggers `overview`, `activity`,
   `billing` (disabled), `settings` and one `TabsContent` per value. Panels
   carry `testId="panel-<value>"`;
2. `Collapsible` with trigger `collapsible-trigger` and body
   `collapsible-body`;
3. `Accordion type="single" collapsible` with sections `shipping` and `billing`
   (`cancelled` disabled), each `AccordionItem` holding a trigger and content.

Right:

4. `Breadcrumb` with Home, Projects, Current;
5. `Pagination page={page} pageCount={20}` with Previous, List, Next, plus a
   `pagination-reset` control that sets the page to 1;
6. readouts.

Readout `tier2-navigation-readout`:
`tab=<value> open=<value|none> collapsed=<bool> path=<value> page=<n>`.

## 5. Steps for the executor

1. Read this plan, then `apps/playground/src/scenarios/tier2-dialog.tsx` and
   `tier2-toast.tsx` (the consumer-path shape), `apps/playground/src/ui.tsx`,
   `apps/playground/src/a11y.ts` and `apps/playground/src/scenarios/probes.ts`.
2. Write `tier2-foundation.tsx` exactly as §4.1. Keep every clickable control
   inside the 1280×800 offscreen window (the runner creates that size).
3. Write `tier2-navigation.tsx` exactly as §4.2.
4. Register both in `src/scenarios/index.ts` next to the existing `tier2-*`
   imports; the registry check requires unique ids and a declared capability.
5. Build and run only the new scenarios first:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only tier2-foundation
   nub apps/playground/dist/smoke/run.js --only tier2-navigation
   ```

   Expected: `1/1 scenarios passed`, exit `0`, each with its check count. If a
   click misses, read the failure's bounds/readout line before changing the
   view; a clipped or overlapped control is a layout bug in the view, not a
   reason to add a tolerance.
6. Run the full suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `74/74 scenarios passed`, exit `0`; the check total grows by the
   two reported counts.
7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`. `nub run test` includes both packages' unit tests and
   the registry integrity check.
8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan
   index with the measured counts. Commit in two commits: the plan, then the
   scenarios + docs.

## 6. Test plan

The test **is** the scenario: `steps` are typed checks (`expectEqual`,
`expectNear`, `expectContains`, `expectSome`) over host text, bounds, style and
the accessibility dump. A scenario with no failing path is not acceptable, so
record three mutation proofs in a new §8 of this plan after the implementation:

| # | Mutation (temporary, then revert) | Must fail with |
| - | -------------------------------- | -------------- |
| M1 | Drop `variant="elevated"` from `card-elevated` | "elevated draws a shadow" |
| M2 | Change the List `defaultValue` from `inbox` to `starred` (same mode, wrong consumer wiring) | "the default row paints the selected token" |
| M3 | Drop `collapsible` from the `Accordion` | "Enter closes the open section (collapsible)" |
| M4 | Pass `pageCount={0}` to the `Pagination` | "the pagination is an accessible landmark" |

Record the exact failing label and exit code for each. A mutation that fails for
an unrelated reason is not a proof; fix the mutation and repeat.

Also verify the **reverse** of the two central consumer facts:

- delete the `aria-id` from `alert-info` → "the alert is an accessible alert"
  fails (the role paints but the node is not addressable by the probe);
- wire `Tabs`'s `onValueChange` to a no-op → the tab readout stays `overview`
  after the arrow key, and "Right selects the next tab" fails.

## 7. STOP conditions

- The vendor compile does not export a part used here. Stop; record the missing
  export in `TODO.md` as a components task with the compiler error.
- A component throws a composition error (`assertParts`) for a layout this plan
  describes. Stop and record it; do not restructure another package's contract
  from here.
- A check can only pass with a tolerance larger than 2 px, or with a screenshot.
  Stop: that is a mechanism question, not a catalogue view.
- The full suite is not `74/74` with exit `0`. Stop and report the failing
  scenario; do not mark this plan done.
- Any file outside §3 needs to change. Stop; write the task in `TODO.md`.

## 8. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003):

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `tier2-foundation` | 42 | pass |
| `tier2-navigation` | 55 | pass |

Suite `72 → 74` scenarios, `1973 → 2070` checks, exit `0`.

Both scenarios first failed for real layout reasons, and the view was fixed
rather than the assertion loosened:

- `tier2-foundation` initially asserted an `Image` node for the avatar without
  giving it an `aria-id`; the dump showed three `Image` nodes with no authored
  id, so the view now authors `aria-id="avatar-md"`. (The runtime **does** map
  `role="img"` to AccessKit `Image`; it only carries an `author_id` for authored
  ids, the same rule the other roles follow.)
- `tier2-navigation` compared the switched panel's `y` with the previous
  panel's — they occupy the same slot. The check now compares the panel's top
  with the tab list's painted bottom.

Mutation proofs (temporary edit, `--only` run, reverted):

| # | Mutation | Failing check |
| - | -------- | ------------- |
| M1 | no `variant="elevated"` | `elevated draws a shadow: expected true, got false` |
| M2 | List `defaultValue="starred"` | `the default row paints the selected token: expected "#2E2370", got "none"` |
| M3 | no `collapsible` on the Accordion | `Enter closes the open section (collapsible): expected a string containing "open=none", got "tab=settings open=billing collapsible=closed path=home page=5"` |
| M4 | `pageCount={0}` | `the pagination is an accessible landmark: expected a value, got none` |

Reverse proofs:

- alert without `aria-id` → `the alert is an accessible alert: expected a value, got none`;
- `Tabs` `onValueChange` wired to a no-op → `Right selects the next tab: expected a string containing "tab=activity", got "tab=overview open=none collapsible=closed path=home page=5"`.

### 8.1 Live parity

The same two views now run in the real 1100×720 window as
`live-tier2-foundation` (18 checks) and `live-tier2-navigation` (17 checks).
Live suite `22 → 24`, checks `373 → 405`, exit `0`, two screenshots.

The first live run failed the List arrow check and the Tabs arrow check. Plan
`345` then isolated the cause with a dedicated key-routing probe, and the two
failures turned out to have different causes:

1. **List was a harness race, not a component defect.** The key was sent before
   the click's React commit, so the list moved from the previous active row.
   With a `settle` after the click (the runner's own rule) `Down` moves focus,
   skips the disabled row and `Enter` selects — the headless contract holds in a
   window. `live-tier2-foundation` gained those three checks.
2. **Tabs was a real component issue in the state measured that day.** A live
   click focused a trigger natively but did **not** run React's `onFocus` (plan
   `345` measured `innerFocus=0`, `outerFocus=0` after clicks). `Tabs` sets its
   roving `active` only in `onFocus`, so after a click an arrow started from the
   first enabled tab. **Amended 2026-10-18 by plan `390`:** the click's
   `onFocus` delivery is window/host-state dependent — the same clean code later
   read `innerFocus=1` and the arrow started from the clicked tab — so the live
   scenario no longer asserts this characterization; setting `active` on click
   remains the robust fix and the cross-team row is a re-verify. The headless
   suite focuses the trigger explicitly, so it never covered click-then-arrow.

The live scenario asserted the measured Tabs behaviour as a characterization
check; plan `390` removed it because the measurement flips with window state.
The expected-next-tab assertion still belongs to `components` (set `active` on
click, then add a headless click-then-arrow test). Recorded in `TODO.md` and the
`Tabs` row of `COMPONENTS.md`.
Plan `345` also established the positive rule: a key reaches the focused
element, bubbles through every ancestor, and then reaches the window handler —
so an ancestor handler is a valid component path.

## 9. Acceptance

- Both scenarios are green alone and in the full suite; the suite is `74/74`
  with exit `0` and the check total is recorded.
- Both live twins are green in a real window; the live suite is `25/25` with
  exit `0` (the follow-up key-routing probe is plan `345`), and the measured
  click/`onFocus` limitation is recorded.
- `tier2=verified` still holds, now backed by five headless and five live
  scenarios.
- The mutation and reverse proofs in §6 are recorded with the exact failing
  labels.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index
  name the two scenarios and their counts.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 10. What this plan does not prove

- It does not re-measure platform mechanics (focus traversal, overlay dismissal,
  scroll): those have their own probes.
- It does not add docs pages for the components (`apps/docs` is the docs-site
  workstream).
- It does not fix the click/`onFocus` issue in the shipped Tabs. The live
  scenario asserts the measured limit; the fix is a `TODO.md` cross-team task
  with the evidence in §8.1 and plan `345`.
- It cannot fix any other defect found in a shipped component. Those become
  `TODO.md` cross-team tasks with the measured evidence.
