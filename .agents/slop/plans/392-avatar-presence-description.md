# 392 — Avatar announces its presence state

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `111` (Avatar), `117` (behaviour split), `391` (the measured name rule) |
| Status | done — 2 native cases (Avatar 9, behaviour 598); both-direction proof (removing the description fails the status case) |
| Source | `COMPONENTS.md` → Tier 2 → Avatars ("presence dot"); `docs/avatar.mdx` §Accessibility |

This plan is self-contained. It closes the documented gap that the presence dot
is purely visual, using the one description mechanism 0.10.0 supports.

---

## 1. Why

`Avatar` draws a presence dot and already names the root `role="img"` from
`name`. The dot is invisible to assistive technology: `docs/avatar.mdx` says so
and the example compensates by printing the status as text. That puts the burden
on every consumer and makes an avatar-only row (a people list, a comment author)
silently lose the state.

`@gpuix/native@0.10.0` has no `aria-describedby`, but it **does** expose
`aria-description` (the same mechanism `Field` uses for its message). A presence
state is a description of the image, not part of the person's name, so
`aria-description` is the honest fit: the label stays `name`.

## 2. The rule

- With a `status` and no authored `aria-description`, the root carries
  `aria-description={status}` — the four tokens are already English words.
- The caller's own `aria-description` wins, like every other part's props.
- Without a `status`, no description is added; a present dot always has one, so
  the visual and announced states cannot disagree.
- The accessible name is unchanged: `name`, never `"Ada, online"`. The
  description is the presence, not part of the identity.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/avatar.tsx` | compute the description from `status` (authored wins) and pass it on the root |
| `packages/components/src/behaviour/avatar.test.tsx` | two new cases (§4) |
| `packages/components/docs/avatar.mdx` | Accessibility: the dot is described; the example's printed status note is updated if it claims the dot is unannounced |
| `COMPONENTS.md` | Avatars row: replace "presence dot" silence with the `aria-description` rule and the new count |
| `TODO.md` | Phase F row, ticked |
| `.agents/slop/plans/README.md` | index this plan |

No new module: the rule is one expression in the component, not a reusable
policy.

## 4. Test plan — `src/behaviour/avatar.test.tsx`

| # | Case | Mutation that must fail it |
| - | ---- | -------------------------- |
| 1 | A status avatar's root describes itself with the status (`aria-description: "away"`), and its name stays `name` | drop the description prop → the `customProps` assertion fails; append status to the name → the name assertion fails |
| 2 | No status → no `aria-description`; a caller's `aria-description` wins over the status | let the status overwrite the caller's description → the authored assertion fails |

Assert on `renderer.findByTestId("avatar")?.customProps` (the `Field` suite reads
descriptions that way) and on the existing `nodesWithRole(..., "image")` name
assertion, which must stay `["Ada Lovelace"]` with a status present.

**Both-direction proof:** add case 1 first, run it against the current component
— it fails; add the rule — it passes. Then make the status append to the name and
confirm the name half fails, restoring afterwards.

## 5. Commands and expected results

```sh
cd packages/components
nub run --filter @gpuixui/components test:behaviour  # Avatar 9/9 (7 + 2), behaviour 598
nub run --filter @gpuixui/components check-types      # exit 0
cd ../..
nub run check                                         # exit 0
nub run lint                                          # exit 0
```

## 6. STOP conditions

Stop and report if:

- `aria-description` does not reach the host node for `role="img"` (measured
  through `findByTestId().customProps` or the a11y dump) — 0.10.0 may accept it
  on inputs only; then record the limitation and do not fake a second label;
- the caller's `aria-description` cannot be read from `rest` because the prop is
  dropped by the host type — use the authored prop through `Props` and report
  the gap.

## 7. Acceptance criteria

- A status avatar carries the status as `aria-description`; authored descriptions
  win; the accessible name is still `name`.
- Two new native cases pass and each is proven to fail with its named mutation.
- The Avatar docs, `COMPONENTS.md` and `TODO.md` agree, and the full gates pass.
