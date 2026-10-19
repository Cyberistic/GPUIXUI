# 564 — Search promotes a name a reader names in the singular or as a prefix

**Workstream:** docs-site · **Phase:** F (search quality) · **Depends on:** 431,
490, 500, 504, 505, 507, 518, 561 · **Status:** done

A promoted name — a roadmap target, a token, an icon, a capability scenario —
currently matches only the **exact** string. A reader who types the singular or
a prefix (`file tree`, `log viewer`, `code editor`, `split panes`) lands on
unrelated prose, while the plural/exact form reaches the page that documents it.
This plan fixes that at the one rank function every generated index shares.

## 1. Measured bug (2026-10-19, production build at `50c7444e`)

Run:

```sh
nub run --filter docs build
nub run --filter docs preview --port 4178
```

Then, for each query:

```sh
curl -s "http://localhost:4178/api/search?query=<encoded>"
```

| Query | First result now | Where it should land |
| ----- | ---------------- | -------------------- |
| `file tree` | `/docs/license` | `/docs/roadmap` (`File trees`) |
| `log viewer` | `/docs/components/dialog` | `/docs/roadmap` (`Log viewers`) |
| `code editor` | `/docs/components/text#variants` | `/docs/roadmap` (`Code editor integration`) |
| `split panes` | `/docs/component-api` | `/docs/roadmap` (`Resizable split panes`) |
| `property editor` | `/docs/components/scroll-area#composition` | `/docs/roadmap` (`Property editors`) |
| `inspector panel` | `/docs/components/tabs#composition` | `/docs/roadmap` (`Inspector panels`) |
| `primary foreground` | `/docs/components/timeline#states` | `/docs/theming#semantic-roles` |
| `destructive soft` | `/docs/components/alert#variants` | `/docs/theming#semantic-roles` |
| `chevrons up down` | `/docs/components/countdown` | `/docs/components/icon` |
| `modal focus` | `/docs/patterns/confirmation-flow` | `/docs/capabilities` |

The controls are already correct and must stay correct: the exact/plural form
(`file trees`, `log viewers`, `code editor integration`, `resizable split panes`)
returns `/docs/roadmap` first, and single plain words (`input`, `label`, `theme`,
`search`, `copy`, `list`) keep their owned pages.

## 2. Why it happens

`apps/docs/src/lib/generated-search.ts` exports `exactNameRank`, which promotes
a generated document only when `name.toLowerCase() === query.toLowerCase()`.
That conservative rule was right for plan 504's plain words (`input`, `label`)
and plan 507's single-word icon names, but it makes every promoted name
all-or-nothing. Roadmap names are plural (`File trees`), token names are
camelCase (`primaryForeground`), icon and scenario names are hyphenated
(`chevrons-up-down`, `modal-focus-trap`) — the words a reader types are the same
words, spelled the way prose spells them.

`nameRank` in `search.ts` already solved the component half of this for plan
561: a whole-query match keeps ranks `0–3`, and a token match is offset by
`TOKEN_RANK_OFFSET` so it can never outrank a whole-query match. Generated names
never got the token half.

## 3. The rule

One shared function, `promotedNameRank`, returns:

- **`0`** when the query is exactly one of the entry's promoted names
  (unchanged);
- **`TOKEN_MATCH_RANK` (4)** when the query has **at least two words** and every
  query word is a prefix of a word in one promoted name;
- **`undefined`** otherwise.

Words split on camelCase, acronym boundaries and non-alphanumerics, lowercased:
`primaryForeground` → `[primary, foreground]`, `OTPField` → `[otp, field]`,
`chevrons-up-down` → `[chevrons, up, down]`, `spacing.md` → `[spacing, md]`.
Prefix matching makes `tree` match `trees`, `pane` match `panes`, `editor`
match `editors`, and `edit` match `editing`; it does not invent synonyms.

Why the two-word floor: a single word must keep its owned page. Plan 504's rule
is preserved by construction — `input` is one word, so it can never promote
`inputForeground`. Why rank 4: a partial name match must never outrank a
whole-query name match (`0`), and `mergeResults` already breaks a tie at rank 4
in favour of a page whose own title matches (`sourceRank` `0`), so
`command palette` still lands on the pattern page rather than the roadmap row.

## 4. Files to change

| Path | Change |
| ---- | ------ |
| `apps/docs/src/lib/generated-search.ts` | rename `exactNameRank` → `promotedNameRank`; add `TOKEN_MATCH_RANK`, `words`, `queryWords`, the variant rule |
| `apps/docs/src/lib/search.ts` | import the shared rank and constant; delete the local `TOKEN_RANK_OFFSET`; call the renamed function |
| `apps/docs/src/lib/token-search.test.ts` | update the import; add the spaced camelCase queries |
| `apps/docs/src/lib/roadmap-search.test.ts` | add the singular/prefix roadmap queries |
| `apps/docs/src/lib/icon-search.test.ts` | add the spaced icon-name query |
| `apps/docs/src/lib/capability-search.test.ts` | add the spaced scenario query |
| `apps/docs/src/lib/generated-search.test.ts` | new unit suite for the rank function, both directions |
| `apps/docs/README.md` | one paragraph in `## Search` naming the rule and its guard |

No package, token or preview file changes.

## 5. Steps

1. **Write the failing tests first** (files in §4), then run:

   ```sh
   nub run --filter docs test -- src/lib/generated-search.test.ts \
     src/lib/roadmap-search.test.ts src/lib/token-search.test.ts \
     src/lib/icon-search.test.ts src/lib/capability-search.test.ts
   ```

   Expected before the fix: `generated-search.test.ts` fails to import
   `promotedNameRank`, and every variant query assertion fails with the measured
   first URL from §1.

2. **Implement the rule** in `generated-search.ts` exactly as §3 describes.
   Keep the doc comment; it must say why the two-word floor exists and that the
   rank equals the token offset.

3. **Wire it** in `search.ts`:

   ```ts
   import {
     promotedNameRank,
     TOKEN_MATCH_RANK,
     type GeneratedSearchEntry,
   } from "./generated-search";
   ```

   Replace `exactNameRank(generated, query)` and use `TOKEN_MATCH_RANK` for the
   existing `TOKEN_RANK_OFFSET` (delete the duplicate constant).

4. Run the same five files. Expected: all pass.

5. Run the full docs suite, then the workspace gate:

   ```sh
   nub run --filter docs test
   nub run check
   nub run lint
   ```

   Expected: `78`+ test files pass (the new file adds one), `check` exits `0`,
   `lint` exits `0`.

6. Rebuild and re-measure the ten queries from §1 against the production build:

   ```sh
   nub run --filter docs build
   nub run --filter docs preview --port 4178
   ```

   Expected: each first result is the page in the "should land" column; the
   controls in §1 are unchanged.

7. Update `apps/docs/README.md` (`## Search`) and this plan's status; tick the
   task in `TODO.md`.

## 6. Test plan

**Unit (`generated-search.test.ts`)** — fails if the rule is removed or widened:

- exact name → `0`;
- `file tree` against `File trees` → `TOKEN_MATCH_RANK`;
- `code editor` against `Code editor integration` → `TOKEN_MATCH_RANK`;
- `primary foreground` against `primaryForeground` → `TOKEN_MATCH_RANK`;
- `chevrons up down` against `chevrons-up-down` → `TOKEN_MATCH_RANK`;
- **single** `primary` against `primaryForeground` → `undefined`;
- `tree wallpaper` (one word absent) → `undefined`;
- `zzz` → `undefined`;
- `TOKEN_MATCH_RANK` is greater than `0`.

**Integration** — the same rule through the real index:

- roadmap: `file tree`, `log viewer`, `code editor`, `split panes`,
  `property editor`, `inspector panel` each return `/docs/roadmap` first;
- tokens: `primary foreground` and `destructive soft` return the colour table
  URL first;
- icons: `chevrons up down` returns `/docs/components/icon` first;
- capabilities: `modal focus` returns `/docs/capabilities` first;
- controls: `input`, `label`, `search`, `copy`, `list` keep their pages;
  `command palette` keeps `/docs/patterns/command-palette`.

**Two-direction proof** (record the exact output in §7 when done):

1. Pre-fix run: the new suites fail with the URLs measured in §1.
2. Remove the `terms.length < 2` floor: `search("input")` moves off
   `/docs/components/text-input` (or `promotedNameRank(entry, "primary")`
   returns a rank), so the plain-word test fails.
3. Return `0` for a variant instead of `TOKEN_MATCH_RANK`: three unit
   assertions fail and `search("virtual-list")` returns `/docs/roadmap`, because
   `Virtualized lists` would then tie the capability scenario at rank `0` and win
   on title length. The exact rank is load-bearing.
4. Restore the rule: everything passes.

## 7. Result

Implemented 2026-10-19 on `agent/docs-site`.

- `promotedNameRank` is shared by every generated index; rank `0` is exact,
  rank `4` is a multiword variant, and a single word is never promoted.
- Measured after the fix, from the production build: `file tree`,
  `log viewer`, `code editor`, `split panes`, `property editor` and
  `inspector panel` → `/docs/roadmap`; `primary foreground` and
  `destructive soft` → `/docs/theming#semantic-roles`; `chevrons up down` →
  `/docs/components/icon`; `modal focus` → `/docs/capabilities`.
- Controls unchanged: `input` → `/docs/components/text-input`, `label` →
  `/docs/components/label`, `search` → `/docs/components/search-input`,
  `command palette` → `/docs/patterns/command-palette`, `theming` →
  `/docs/theming`.
- `generated-search.test.ts` (8 tests) plus four new integration cases across
  the roadmap, token, icon and capability suites; the full docs suite is 79
  files / 557 tests, and `nub run check`, `nub run lint`,
  `nub run --filter docs test` are green.
- Two forced defects were measured and reverted: removing the two-word floor
  fails the plain-word unit test and the token promotion test (`input` would
  promote `inputForeground`); returning `0` for a variant fails three unit
  assertions and `virtual-list`, because `Virtualized lists` would then tie the
  capability scenario at rank `0` and win on title length.

## 8. STOP conditions

Stop and report with the measured output if any of these happen:

- a single-word control (`input`, `label`, `theme`, `search`, `copy`, `list`)
  stops returning its page first;
- `command palette`, `popover placement`, `button loading` or `theming` stop
  returning their documented first result;
- the rule needs stemming beyond prefix matching or a synonym list to pass a
  queried case — report that case instead of adding one;
- an existing search test fails for a reason other than the deliberate
  pre-fix failure.

## 9. Acceptance

- the ten §1 queries return the documented pages from the production index;
- the five control queries are unchanged;
- the unit and integration tests fail when the two-word floor or the rank is
  removed, and pass with the rule;
- `nub run --filter docs test`, `nub run check` and `nub run lint` exit `0`;
- `apps/docs/README.md` names the rule and its guards.
