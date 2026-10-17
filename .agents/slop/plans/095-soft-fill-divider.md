# 095 — A divider inside a soft status fill uses the designed edge

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth and the contrast contract) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `076` (soft surface floor), `080` (the decorative divider), `090` (the soft status edge), `094` (the skeleton on row washes) |
| Status | planned |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

While auditing the remaining compositions for plan `094`, the decorative
`border` role was measured on the four soft status fills for the first time. It
is **below the 1.05:1 divider floor** in three dark sets:

| Set | Surface | Measured |
| --- | ------- | -------- |
| Windows dark | `successSoft` | **1.015:1** |
| identity dark | `successSoft` | **1.023:1** |
| identity dark | `destructiveSoft` | **1.040:1** |
| Linux dark | `successSoft` | **1.047:1** |

The tempting fix — darken the two soft fills — was measured and rejected. The
value that makes the divider clear the floor in the identity dark set
(`successSoft` `#0A3E28`, `destructiveSoft` `#66191B`) drops the fill's own
perceivability on the card from **1.53/1.44** to **1.09/1.08**, so every Alert,
Badge and Toast on a dark card becomes visibly weaker — the tint sits close to
the card it was designed to stand off. The same squeeze is
needed in Windows and Linux dark, which inherit those fills. Plan `076` created
the surface floor precisely because that perceivability had already been lost
once.

There is a designed alternative, and it already ships: every soft surface has an
opaque edge role (`xSoftBorder`) whose whole purpose is to draw a boundary on
that fill, held to the divider floor on it (plan `090`). A divider inside an
Alert or Toast is therefore `xSoftBorder`, not `border`.

So this plan **moves no colour and adds no pair**. It records the decision, and
guards both halves of it: that the alternative clears its floor everywhere, and
that the palette squeeze it replaced is not silently applied later.

## 2. Design decisions (do not re-litigate)

1. **`border` is not guaranteed on a soft status fill.** The role is tuned for
   the canvas, the raised surface and the fills a bordered control paints. Inside
   an Alert, Badge or Toast the designed `xSoftBorder` edge is the divider.
2. **No soft fill moves.** The perceivability of the tint outranks a divider
   composition the design system already answers with a role.
3. **No new pair.** Adding `border` on the four fills would fail the suite and
   force the rejection above; the contract's job is not to invent a value the
   palette cannot hold. The decision is documented and guarded by a test instead.
4. **The guard is two-directional in spirit:** `xSoftBorder` must clear its
   floor on every shipped variant (it does), and the rejected squeeze must
   demonstrably cost the surface floor (it does), so a future editor sees why.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/095-soft-fill-divider.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the `095` row and paragraph |
| `packages/tokens/src/soft-divider.test.ts` | **new** — the substitution and the rejected squeeze |
| `packages/tokens/src/docs.test.ts` | the quoted figures |
| `packages/tokens/README.md` | one sentence in Status tones |
| `docs/tokens.md` | one paragraph in Status tones |
| `docs/design-system.md` | the §7 decorative-divider bullet |
| `COMPONENTS.md` | *Design tokens* row clause |
| `TODO.md` | tick the row |

No source value changes. Do **not** edit `apps/*`, `packages/components`,
`packages/primitives` or any other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/soft-divider.test.ts` (new)

Header: the finding (three dark sets, 1.015–1.047 on `successSoft`/
`destructiveSoft`), the measured cost of the squeeze (surface 1.53/1.44 →
1.09/1.08), and the decision.

Tests:

1. **The designed edge clears the divider floor on every soft fill** — sixteen
   variants × four tones, using `statusTone(theme, tone).border` against its own
   fill. (The existing suite covers the ten default/AAA sets; this one names the
   substitution and covers the AAA platform variants too.)
2. **The rejected squeeze costs the surface floor** — on identity dark, assert
   `contrastRatio("#0A3E28", card)` and `("#66191B", card)` are below 1.10 while
   the shipped fills are at or above 1.40, and that the squeezed values would
   make `border` pass. This is the evidence for the decision, and it fails if
   someone applies the squeeze without revisiting the tint.
3. **`border` stays out of the soft-fill contract** — assert no
   `contrastPairs` entry pairs `border` with a soft fill, so the omission is
   deliberate rather than forgotten, and the reason lives in the JSDoc above.

Keep the file under ~80 lines.

### 4.2 `packages/tokens/src/contrast.ts`

No pair changes. Extend the `softBorderPairs` JSDoc with one sentence: the
designed edge is also what a divider inside a soft surface uses, because the
decorative `border` is tuned for the canvas and measures 1.015–1.047:1 on the
dark `successSoft`/`destructiveSoft` fills (plan `095`).

### 4.3 `docs/tokens.md`

In the Status tones section, after the argument for the separate `xText`
tonality:

> A divider inside a soft status surface is `xSoftBorder`, not `border`. The
> decorative role is tuned for the canvas and the plain fills; on `successSoft`
> and `destructiveSoft` in the dark sets it measures 1.015:1 (Windows),
> 1.023:1 (identity) and 1.047:1 (Linux), under its 1.05:1 floor. Darkening the
> fills far enough to fix that would drop their own perceivability on the card
> from 1.53:1 to 1.09:1, so the designed edge is the answer and the tints stay.

The three ratios are derived in `docs.test.ts` from the shipped colours.

### 4.4 `docs/design-system.md`

§7 `border` bullet gains: "Inside a soft status surface the divider is
`xSoftBorder`; `border` is not guaranteed on a status tint, because the tint's
own perceivability outranks it."

### 4.5 `packages/tokens/README.md`

Status tones paragraph gains one sentence with the same rule and the figures.

### 4.6 `packages/tokens/src/docs.test.ts`

A quoted-figures test builds the three ratios and the squeeze figures from the
colours, and requires the sentence in §4.3; the design-system sentence is
required too.

### 4.7 `COMPONENTS.md` and `TODO.md`

- *Design tokens* row: one clause — a divider on a soft fill is `xSoftBorder`,
  with the reason.
- `TODO.md`: tick the row and reword it from "defect" to the decision. Bar
  `62/82` → `63/82`.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes with 33 files.

**Two-direction proof:**

1. Change the identity dark contract to include `border` on `successSoft`: the
   shipped-theme loop must fail at 1.023 and the deliberate-omission test must
   fail. Restore.
2. Set identity dark `successSoft` to `#0A3E28`: the rejected-squeeze test must
   fail (the surface ratio is now below 1.10) and the surface-floor test must
   report it. Restore.
3. Confirm the final suite is green.

Record the exact failure text in §8.

## 6. STOP conditions

- **A soft edge stops clearing the divider floor in a shipped set.** That is a
  real defect (plan `090`'s contract); stop and report the set.
- **The squeeze figures no longer cost the surface floor.** Then the palette may
  have moved and the decision deserves a fresh measurement; stop rather than
  keeping a stale rationale.
- **Someone adds `border` on a soft fill to `contrastPairs` to "fix" the gap.**
  That is the change this plan documents against; do not ship it silently.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `soft-divider` #1 | unit | a designed edge that stops clearing its fill |
| `soft-divider` #2 | unit | the squeeze being applied without the tint's cost being re-measured |
| `soft-divider` #3 | unit | `border` quietly added to the soft-fill contract |
| `docs.test.ts` figures | unit | a document quoting ratios the palette no longer produces |

## 8. Outcome

Filled in after execution; the numbers and the commands that produced them are
recorded here, not predicted.

## 9. Acceptance

- [ ] The decision is documented in `docs/tokens.md`, `docs/design-system.md`
      and the package README, with figures derived from the implementation.
- [ ] `xSoftBorder` is proved to clear the divider floor on every soft fill in
      every shipped variant.
- [ ] The rejected squeeze and the deliberate absence of a `border` pair are
      guarded by tests.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] The plan index row is marked done and the `TODO.md` row is ticked.
