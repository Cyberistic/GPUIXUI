# 624 — The avatar's picture is decorative, so the person is announced once

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `111`, `117`, `391`, `392`, `571` |
| Status | planned |
| Blocker | none — the assertion reads the accessibility tree, not bounds or focus events, so the plan-540 binding defects stay out of scope |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

`Avatar` is a single `role="img"` named by `name`. When `src` is present the
component also paints an `<img alt={name}>` inside that node. The real renderer
therefore exposes **two** image nodes with the same name, so a screen reader
announces the person twice.

Measured in the real `TestRenderer` on 2026-10-19 with the probe below:

```tsx
<Avatar name="Ada Lovelace" src="/photos/ada.png" testId="avatar" />
```

`nodesWithRole(renderer, "image")` returned two nodes, both named
`"Ada Lovelace"`. Adding `role="presentation"` and `alt=""` to the picture
returned exactly one node named `"Ada Lovelace"` — so the runtime honours the
presentation role and drops the picture from the tree.

The same probe with `alt=""` alone still returned two nodes (the second
unnamed), so removing the alt text is **not** the fix; the role must be
presentational.

The docs already claim "The root is a single `role="img"` node" and "The image
also carries `alt={name}`", which is the bug: the picture must not be a second
named image.

Scope:

- the picture (`<img>`) becomes decorative: `role="presentation"`, `alt=""`;
- the root keeps `role="img"`, `aria-label={name}` and `aria-description`;
- one native regression case plus docs, `COMPONENTS.md`, `TODO.md`,
  `PLAN.md` and the plan index.

**Out of scope** (do not add): image loading/error state, a second accessible
description on the picture, changing the initials fallback, the diameter scale,
or any change to `AvatarStatus`.

## 2. What exists today (read these first)

- `packages/components/src/avatar.tsx`:
  - the root is `role="img"` with `aria-label={name}` and the caller's
    `aria-description` winning over `status`;
  - the picture is
    `<img src={src} alt={name} objectFit="cover" testId="<id>-image" ...>`;
  - the initials are always rendered behind the picture.
- `packages/components/src/behaviour/avatar.test.tsx` — 10 native cases. The
  "names itself for assistive technology" case renders **without** `src`, so it
  never saw the second node. `nodesWithRole` comes from
  `../internal/a11y.js`.
- `packages/components/docs/avatar.mdx` — Accessibility bullets and the
  canonical `(10 tests)` verification line.
- `packages/components/src/inventory.ts` — `avatarMeta`; `inventory.test.ts`
  holds the stated count to the suite, so the docs, `COMPONENTS.md` and the test
  must land in one commit.
- `@gpuix/native@0.10.0` `HostProps` has `role?: string` and `ImgProps` has
  `alt?: string`; there is no `aria-hidden`. The measured way to remove the
  picture from the accessibility tree is `role="presentation"`.

Baseline on this host, 2026-10-19: unit `454 passed`; behaviour `788 passed /
35 failed of 823` where every failure is a recorded plan-540 binding defect. Do
not attribute those failures to this change.

## 3. Design

In `Avatar`'s picture element:

```tsx
<img
  src={src}
  // The avatar itself is the accessible image (role="img" + name above).
  // A named <img> here is a second announcement of the same person.
  role="presentation"
  alt=""
  objectFit="cover"
  testId={testId === undefined ? undefined : `${testId}-image`}
  style={{ ... }}
/>
```

Keep the root exactly as it is: `role="img"`, `aria-label={name}`, and the
`aria-description` rule. Keep the initials and the picture's style. Do not move
the picture out of the disc or change its bounds.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/avatar.tsx` | picture: `role="presentation"`, `alt=""`, and the comment |
| `packages/components/src/behaviour/avatar.test.tsx` | one native case; guarded-bug header line |
| `packages/components/docs/avatar.mdx` | Accessibility truth; verification count 10 → 11 |
| `COMPONENTS.md` | Avatars row: count 10 → 11 and the single-announcement rule |
| `TODO.md` | add and tick the hardening row |
| `PLAN.md` | D30: append plan 624 to the numbering sentence |
| `.agents/slop/plans/README.md` | index this plan after 620 |

## 5. Test plan

Every test must be able to fail. Add the guarded bug to the suite header
comment.

### 5.1 Native (`src/behaviour/avatar.test.tsx`)

Add:

```tsx
it("announces the person once when a picture is present", () => {
  const avatar = renderComponent(
    <Avatar testId="avatar" name="Ada Lovelace" src="/photos/ada.png" />,
  );

  // The picture is still painted …
  expect(avatar.renderer.findByType("img")).toHaveLength(1);
  // … but it is decorative: only the avatar itself is an image node.
  const images = nodesWithRole(avatar.renderer, "image");
  expect(images).toHaveLength(1);
  expect(images.map((node) => node.name)).toEqual(["Ada Lovelace"]);

  avatar.unmount();
});
```

Measured at `HEAD`: two nodes, both named `"Ada Lovelace"`, so the length
assertion fails. With the fix: one node.

### 5.2 Both directions (AGENTS §3)

1. Before implementing, run the new case at `HEAD` and record the failure (two
   image nodes).
2. Add the two picture attributes and rerun: the case passes and the other ten
   Avatar cases keep their verdicts.
3. Remove only `role="presentation"` (leave `alt=""`) and confirm the case fails
   again with two nodes; then restore. This proves the role, not the alt text,
   is the fix.
4. Record the measured counts in the commit message.

### 5.3 Regression

- `nub run test:behaviour -- -t "Avatar"` — 11 cases pass; the suite still
  carries the recorded plan-540 failures in other files.
- `nub run --filter @gpuixui/components test` — 454 unit tests pass (the
  inventory check parses the new docs count).
- the all-example native contract still passes (no example change);
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. Commands and expected results

Run from `workspaces/components/packages/components`:

```sh
nub run test:behaviour -- -t "announces the person once"
# at HEAD: 1 failed (two image nodes); after the fix: 1 passed
nub run test:behaviour -- -t "Avatar"
# 11 passed (plus the suite's recorded plan-540 failures in other files)
cd ../..
nub run --filter @gpuixui/components test
# 454 passed
nub run --filter @gpuixui/components check-types
# exit 0
nub run check
nub run lint
nub run test
```

`nub run test:behaviour` runs every behaviour file; `-t` is a name filter, not
an include. Use the package's vitest through `nub`; a bare `node`/vitest fails
with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.

## 7. Docs, inventory and TODO

- `docs/avatar.mdx` → Accessibility:
  - keep "The root is a single `role="img"` node whose accessible name is
    `name`";
  - replace "The image also carries `alt={name}`" with: the picture is
    decorative (`role="presentation"`, `alt=""`) because the avatar already
    names it; without that the runtime exposes a second image node and the
    person is announced twice;
  - `## Verification`: `(11 tests)` and name the new case.
- `COMPONENTS.md` Avatars row: "10 native behaviour tests" → "11 native
  behaviour tests"; add that the picture is decorative so a photo and the
  initials are announced once.
- `src/inventory.ts` limitations: no change; the existing limitation is about
  loading, not semantics.
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick `The avatar's picture is decorative, so the person is announced once —
  plan 624; ...`.
- `.agents/slop/plans/README.md`: index `624` after `620` with the measured
  status.
- `PLAN.md` D30: append `; `621`–`623` went to tokens-theme and the
  playground, so the avatar picture plan takes `624`` to the overflow-numbering
  sentence, having checked every worktree.

## 8. STOP conditions

Stop and report instead of improvising when:

- the new case does **not** fail at `HEAD` — the probe measured two named image
  nodes; a different result means the binding changed, so record it before
  touching source;
- `role="presentation"` on the picture leaves it in the accessibility tree in
  this runtime — record the dump and stop; do not invent a different semantic
  (no `aria-hidden` exists in 0.10.0);
- an existing Avatar case fails for a reason other than the recorded plan-540
  binding defects — list the case and stop;
- the inventory count check fails — fix the stated counts, not the check.

## 9. Acceptance

- With `src`, the accessibility tree contains exactly one image node, named by
  `name`, while the picture is still painted.
- Without `src`, the existing initials/name behaviour is unchanged.
- One native case passes and fails on the pre-fix source (both directions
  recorded).
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index agree with the
  measured count: Avatar 11, unit 454.
