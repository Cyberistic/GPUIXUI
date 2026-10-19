# Plan 571 — Avatar: the initials stay painted behind the picture

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 111, 117, 391, 392 |
| Status | **landed** — 1 changed + 1 new native case (Avatar 10); both fail on the old conditional (2 failed / 8 passed), pass with the fix (10/10); check, lint and type-check green; native suite 710 passing with the 55 pre-existing plan-540 binding failures |
| Claimed number | first free across every worktree on 2026-10-19 (`569`, `570` are taken by `tokens-theme` and `playground`); recorded in `PLAN.md` D30 |

## 0. Why this plan exists

`Avatar` renders **either** the initials or the picture:

```tsx
{src === undefined ? <text>…initials…</text> : <img src={src} … />}
```

`@gpuix/native@0.10.0` has no image-load failure event (`ImgProps` carries only
`src`, `objectFit`, `alt` — measured in
`~/.local/share/nub/store/v1/trees/@gpuix+native@0.10.0/dist/host.d.ts:383`), so
a `src` that 404s leaves the disc **empty** and the initials are gone. The module
header claims "an avatar is never blank"; `docs/avatar.mdx` §Limitations and the
`COMPONENTS.md` row already admit the contradiction.

A placeholder can be honest and still robust: keep the initials painted and lay
the picture over them. A successful image covers the initials; a failed one
paints nothing, so the initials show through. No load event is required.

Measured 2026-10-19 in the real `TestRenderer`: `position: "absolute"` resolves
against the nearest positioned ancestor, not the window, when that ancestor sets
`position: "relative"` (200×200 parent at `100,100` with an absolute 50×50 child
at `top:10,left:20` measured the child at `120,110`). The avatar's inner disc is
therefore a safe positioning context, and the presence dot already uses the same
mechanism against the root (line ~132 of `src/avatar.tsx`).

## 1. Exact files to change

1. `packages/components/src/avatar.tsx`
2. `packages/components/src/behaviour/avatar.test.tsx`
3. `packages/components/examples/avatar.example.tsx`
4. `packages/components/docs/avatar.mdx`
5. `COMPONENTS.md` (Avatars row)
6. `.agents/slop/plans/README.md` (index row)
7. `TODO.md` (tick the new task)
8. `PLAN.md` (D30 note: `571`)

Do **not** touch `packages/components/docs/*.mdx` other than `avatar.mdx`, and do
not touch any other package.

## 2. Implementation

### 2.1 `src/avatar.tsx`

Replace the inner disc's conditional with a layered stack:

```tsx
<div
  style={{
    position: "relative",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    borderRadius: theme.radius.full,
    overflow: "hidden",
    backgroundColor: theme.colors.muted,
  }}
>
  <text
    testId={testId === undefined ? undefined : `${testId}-initials`}
    style={{
      ...textStyle(theme, "label"),
      fontSize: Math.round(diameter * 0.4),
      color: theme.colors.foreground,
    }}
  >
    {initials(name)}
  </text>
  {src === undefined ? null : (
    <img
      src={src}
      alt={name}
      objectFit="cover"
      testId={testId === undefined ? undefined : `${testId}-image`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  )}
</div>
```

Notes:

- The image is the **last** child, so it paints over the text.
- `alt={name}` and the root's `role="img"`/`aria-label` stay unchanged; the
  accessible name is still the person's (plan 392).
- The `initials(name)` call is unchanged; no new state, no lifecycle.
- Update the module header comment: "the initials stay painted behind the
  picture, so a failed load degrades to the initials; there is still no loading
  state."

### 2.2 `src/behaviour/avatar.test.tsx`

Change the existing `"shows the picture when given a src"` case and add one:

- Replace `expect(avatar.renderer.getAllText()).toEqual([])` with
  `expect(avatar.renderer.getAllText()).toEqual(["AL"])` and a comment: the
  fallback must still be in the tree when a picture is requested.
- Add `"layers the picture over the initials so a failed load still shows them"`:

```tsx
const avatar = renderComponent(
  <Avatar testId="avatar" name="Ada Lovelace" src="/photos/missing.png" />,
);

const root = requireBounds(avatar, "avatar");
const image = requireBounds(avatar, "avatar-image");
expect(avatar.renderer.getAllText()).toEqual(["AL"]);
expect(image).toEqual(root);           // the picture covers the disc exactly
expect(avatar.renderer.findByTestId("avatar-image")?.customProps?.src).toBe(
  "/photos/missing.png",
);
```

(`requireBounds` is in `src/internal/interaction.ts`; `boundsOf` returns an
`Option` if a non-throwing form is preferred.) This case fails on the old code at
the `getAllText()` assertion and again at `requireBounds("avatar-image")`
because no image test id existed.

Keep the existing initials-only, a11y, presence, dot, size and style cases
unchanged.

### 2.3 `examples/avatar.example.tsx`

Give one member a real `src` so the example exercises the picture path. Use a
tiny inline SVG data URL (GPUix accepts `data:` URLs — `ImgProps.src` documents
"Filesystem path, data URL, or http(s) URL"):

```tsx
const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='%236b7cff'/%3E%3C/svg%3E";
```

Add `readonly src?: string` to the member type, set it on the first member, pass
`src={member.src}`, and update the example's header comment to say the initials
remain behind the picture.

### 2.4 `docs/avatar.mdx`

- Opening paragraph: replace lines 6–10 with: given `src` the picture paints over
  the initials; the initials stay underneath, so a missing file still shows them.
- Usage block: leave as is.
- Add one sentence under **Usage** showing the fallback contract.
- **Accessibility**: the image's `alt` is `name`, the root keeps `role="img"` and
  the name.
- **Limitations**: replace the "No image loading or error state" bullet with:
  "No loading state: the runtime reports no image load, so the initials stay
  painted behind the picture and a failed load degrades to them. There is no
  spinner, no fade and no error callback."
- **Verification**: change `(9 tests)` to `(10 tests)` and mention the fallback.

### 2.5 `COMPONENTS.md`

In the Avatars row replace

> No image loading/error state in v1 — a missing file paints nothing and does not restore the initials

with

> No loading state — the initials stay painted behind the picture, so a failed load degrades to them (no error callback)

and update the count from `9 native behaviour tests` to `10`.

### 2.6 `avatarMeta`

Update the `limitations` array in `src/avatar.tsx` to the same sentence as the
docs so the inventory test keeps the two in sync.

### 2.7 Index and tracking

- `.agents/slop/plans/README.md`: add a row in the components table
  (`| 571 | Avatar: the initials stay painted behind the picture | F | 110, 111, 117, 391, 392 | done — … |`).
- `TODO.md`: under the Tier 2 hardening list add `[x] Avatar initials behind the
  picture — plan 571; …`.
- `PLAN.md` D30: append "the next components overflow plan is `572`".

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`:

```sh
nub run --filter @gpuixui/components test:behaviour -- avatar
```

Expected: `avatar.test.tsx` **10 passed**; no other file runs.

```sh
nub run --filter @gpuixui/components test
```

Expected: all unit files pass (426+ tests; `inventory.test.ts` checks the docs
count, parts table and example registry).

```sh
nub run check
nub run lint
```

Expected: exit `0` for both. (`nub run check` includes lint, formatting and
type-check.)

```sh
nub run --filter @gpuixui/components test:perf
```

Measured 2026-10-19: this suite is **already red at `HEAD`** with
`focusedTestId` reading `row-0` where it expects `row-1` after a
`focusElement` + `ArrowDown` — the plan-540 binding focus defect. It does not
import Avatar, so this plan cannot change it; record the same failure before and
after and do not "fix" it here.

Full native suite (end-of-task):

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected baseline at `HEAD`: **55 failed / 709 passed** — all 55 are the
plan-540 binding failures (34 position, 24 focus/blur, 1 scroll; see
`TODO.md` → Interlocks). This change must keep `709 + 1 = 710` passing and the
failure count at 55. Any new failure is a STOP.

## 4. Both-direction proof

1. With the new code, the new case passes.
2. Temporarily restore the old conditional (text only when `src === undefined`)
   and delete the image `testId`; run the avatar suite. The picture case and the
   new layering case must fail (text is `[]`, image test id missing).
3. Restore the fix and re-run: 10/10 green.
4. Record both outputs in the plan's status line / commit message.

`scripts/verify-two-directions.sh` is not usable (it calls `jj`, which is not
installed — D1); do the two runs by hand and paste the pass/fail counts into the
commit body.

## 5. STOP conditions

- Absolute positioning resolves against the window instead of the disc on any
  host (image bounds not equal to the root bounds) — stop and report; do not add
  layout hacks.
- The `<img>` paints over the initials **and** the root's accessible name
  changes (for example `nodesWithRole` returns two image nodes) — stop; the
  a11y contract must stay one named `image`.
- The native suite gains a failure that is not one of the 55 recorded plan-540
  cases.
- `inventory.test.ts` reports a docs-count/suite mismatch after the update —
  fix the count, not the check.

## 6. Acceptance

- `src/avatar.tsx` always renders the initials and only adds the picture on top.
- The new native case fails on the previous code and passes on the new code.
- Docs, `avatarMeta`, `COMPONENTS.md`, the plan index and `TODO.md` all state the
  new behaviour and the count (10).
- `nub run check` and `nub run lint` exit `0`; unit tests pass; the native suite
  is 710 passing / 55 known binding failures.
- One commit: `fix(components): keep the avatar's initials behind its picture (plan 571)`.
