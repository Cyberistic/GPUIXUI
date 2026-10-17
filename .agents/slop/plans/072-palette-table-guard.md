# 072 — Guard the palette ramps in `docs/tokens.md`

| Field | Value |
| ----- | ----- |
| Phase | F (documentation truth) — the last hand-written value table without a guard |
| Owner | **tokens-theme workstream** (`packages/tokens/src/docs.test.ts`, `docs/tokens.md`) |
| Depends on | plans `056`, `058`, `062`, `066` (all landed) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`docs/tokens.md` is the public catalogue: "if a token is not here, it is not
public". Plans `056`, `058`, `059`, `062`, `065`, `066` and `071` hold every
other value table in that page to the implementation:

| Table | Guarded by |
| ----- | ---------- |
| semantic colour roles, default and high contrast | `docs.test.ts` (056) |
| typography, spacing, radius, density, elevation, motion, borders, icons, avatars | `docs.test.ts` (058) |
| status families | `docs.test.ts` (064) |
| platform variants | `docs.test.ts` (063) |
| contrast pairs and floors | `docs.test.ts` (071) |
| **palette ramps** | **nothing** |

The palette table is hand-written markdown. `color.test.ts` checks that the
palette holds paintable hex values; no test checks that the values printed in
the catalogue are the values the package ships. A ramp edit that is not mirrored
in the document — or a document edit that is not mirrored in the palette —
ships a catalogue that lies while the whole suite stays green. That is exactly
the failure plan `058` closed for every other numeric table.

The palette is not dead data: it is the documented escape hatch for the rare
case with no semantic role, and the docs site is allowed to read it. It has to
be accurate.

## 2. Design decision

Use the same one-way containment guard as `058` instead of a markdown parser:
build the exact documented row from `palette` and require the markdown to
contain it.

```ts
const row = Object.entries(steps)
  .map(([step, hex]) => `${step} \`${hex}\``)
  .join(" · ");
expect(markdown, `palette.${ramp}`).toContain(`| \`${ramp}\` | ${row} |`);
```

Two assertions, both able to fail:

1. **Values and steps** — every ramp in `palette` has exactly the documented
   steps, in the documented order, with the shipped hex value. Removing a step
   from the palette fails it (the document still lists that step); editing a hex
   fails it; changing the palette's insertion order fails it because the row is
   built in `Object.entries` order.
2. **Ramp order** — the six ramps appear in the table in `palette` declaration
   order, so a consumer reading the table sees the same order the export
   declares. This also fails when a ramp is absent (position `-1`).

`Object.entries` on the ramps returns integer-like keys (`0`, `25`, `50`, …,
`950`, `1000`) in ascending numeric order, which is the order the table already
uses. The guard therefore documents the real ordering rule rather than a second
copy of it.

Do **not** add an API, a dependency, a schema or a markdown parser. This is a
test-only truth guard plus the documentation sentence that records it.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/072-palette-table-guard.md` | **create** (this file) |
| `packages/tokens/src/docs.test.ts` | **edit** — import `palette`; add `describe("docs/tokens.md palette table")` with the two assertions above; update the header comment to name the palette |
| `docs/tokens.md` | **edit** — Verification: state that `docs.test.ts` also holds the palette ramps |
| `packages/tokens/README.md` | **no change** — it has no palette table; do not add one |
| `COMPONENTS.md` | **edit** — add "and the palette ramps" to the design-tokens row's guard list |
| `TODO.md` | **edit** — add one ticked task under *Design tokens and theming*; update the bar from `38/54` to `39/55` |
| `.agents/slop/plans/README.md` | **edit** — index row for `072`, a short paragraph, and correct the block heading (`050–053` → `050–099`) |

**Do not change** `packages/tokens/src/color.ts` or any other product source.
If a guard exposes a genuine mismatch, the implementation is the source of truth:
fix `docs/tokens.md` and record the mismatch in the commit message.

## 4. The assertions

Inside `docs.test.ts`, next to the other table guards:

```ts
import { colorRoles, palette } from "./color.js";

describe("docs/tokens.md palette table", () => {
  it("lists every ramp and step at its real value", () => {
    Object.entries(palette).forEach(([ramp, steps]) => {
      const row = Object.entries(steps)
        .map(([step, hex]) => `${step} \`${hex}\``)
        .join(" · ");
      expect(markdown, `palette.${ramp}`).toContain(`| \`${ramp}\` | ${row} |`);
    });
  });

  it("lists the ramps in declaration order", () => {
    const positions = Object.keys(palette).map((ramp) =>
      markdown.indexOf(`| \`${ramp}\` |`),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });
});
```

Typing rules: no casts, no `any`, no non-null assertions. `steps` is inferred
from `palette`; every value is a string literal, so `hex` is a `string`.

Expected current result: **green without a document edit** — the table already
matches. If it is red, stop (see §6) and fix the document first.

## 5. Documentation edits

`docs/tokens.md`, **Verification**, in the paragraph about `docs.test.ts`, add
the palette to the list it already makes:

> … the type table to `textRoles` order and content, the status-tone table to
> `statusTones` order and content, the platform rows to `platformNames` order,
> **and the palette ramps to `palette` order and values** …

`COMPONENTS.md`, design-tokens row: extend the guard sentence with
"including the palette ramps", so the inventory does not claim the page is held
to the implementation while one table is not.

`TODO.md`: add under *Design tokens and theming*

> `[x]` Guard the palette ramps in `docs/tokens.md` — the last hand-written
> value table without a drift test (plan 072)

and change the section bar to `39/55` (recount with §7's command; the bar counts
tasks, not the bar line).

`.agents/slop/plans/README.md`: add `072` to the table (`done`, depends on
`058`, `066`) and one sentence to the workstream paragraph explaining that the
palette is the last unguarded table.

## 6. STOP conditions

Stop and report if:

- the first run of the new guard is **red** — the document and the
  implementation disagree; report the exact ramp/step, do not "fix" it by
  changing the palette (a palette edit is a product change with its own tests);
- the table gains a column (for example a "Use" column) — the builder no longer
  describes it; update this plan before changing the test;
- you are about to write a general markdown table parser — do not; use the
  builder in §4;
- the palette export is no longer a record of plain hex strings — stop; that is
  a product shape change, not a docs task.

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; record the observed test count
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run test                                   # exit 0
```

Recount the tokens section:

```sh
awk '/### Design tokens and theming/{f=1} /^## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[x\]`'   # done, including the bar line
awk '/### Design tokens and theming/{f=1} /^## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[ \]`'   # pending
awk '/### Design tokens and theming/{f=1} /^## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[!\]`'   # blocked
```

The bar is done / (done + pending + blocked), excluding the bar line itself.

## 8. Test plan and both directions

1. **Palette edit without a doc edit (must fail).** Change
   `palette.neutral[500]` from `#737C8C` to `#747C8C`, run the package suite:
   the palette-value test fails naming `palette.neutral`. Revert; green.
2. **Document edit without a palette edit (must fail).** Change the `iris` row's
   `500 #7567F2` to `500 #7567F3`, run the suite: the palette-value test fails
   naming `palette.iris`. Revert; green.
3. **Dropped step (must fail).** Delete `850: "#222730"` from
   `palette.neutral`; the same test fails because the document still lists 850.
   Revert; green.
4. **Ramp order (must fail).** Move the `amber` row above `red` in
   `docs/tokens.md`; the order test fails. Revert; green.
5. Record the observed failures in the commit message. Do not claim a direction
   that was not run.

## 9. Acceptance criteria

- Both palette assertions run in `docs.test.ts` and fail on each mutation in §8.
- `docs/tokens.md` and `COMPONENTS.md` state that the palette table is guarded;
  `TODO.md` carries the ticked task and an honest bar; the plan index lists `072`.
- No product source change, no new dependency, no markdown parser.
- `nub run check`, `nub run lint` and `nub run test` exit 0, and every failing
  direction in §8 was observed.
