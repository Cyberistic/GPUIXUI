# 031 — `packages/icons`

**Phase:** B (Tier 1, "Icons"). **Owner:** primitives workstream.
**Depends on:** `020-gpuix-runtime-capability.md`. **Status:** `planned`

---

## 1. What GPUix gives us

One host element, `svg` (`SvgProps` in `@gpuix/native/host`):

```ts
export interface SvgProps extends HostProps {
  src?: string      // desktop local path
  source?: string   // raw SVG markup, rendered directly by GPUI
}
```

with the comment *"Props for monochrome SVGs tinted by `style.color`"*. So:

- an icon **is** an SVG markup string — data, fully testable without a runtime;
- tint comes from `style.color`, so an icon inherits text colour like a glyph;
- there is no icon font, no `<path>` child element, no `<defs>` composition we
  control from React, and no per-path styling.

Consequences: icons must be **flattened, monochrome, self-contained** markup
using `currentColor`, and any icon that needs two colours or an internal
gradient is out of scope (document it, do not fake it).

## 2. Files to create

```
packages/icons/
  package.json
  tsconfig.json
  README.md
  src/
    index.ts
    names.ts          IconName union + ICON_NAMES (ordered, for docs)
    registry.ts       Record<IconName, string> — 24x24 markup, currentColor
    sizes.ts          IconSize = "xs" | "sm" | "md" | "lg" | "xl"  -> {12,14,16,20,24}
    Icon.tsx          <Icon name size tone aria-label />
    names.test.ts
    registry.test.ts
    sizes.test.ts
    Icon.test.ts
```

`packages/` gets a new workspace entry; `primitives` declares
`"@gpuixui/icons": "workspace:*"`.

## 3. API

```tsx
<Icon name="chevron-down" size="sm" />                    // decorative
<Icon name="check" size="md" aria-label="Saved" />        // announced
```

- `size` resolves through `sizes.ts` to a number; a raw number is also accepted.
- The `svg` element gets `role="img"` **only** when `aria-label` is given;
  otherwise `role="presentation"` — a decorative icon must not be announced.
  (GPUix: a node enters the accessibility tree only with a role, and
  `"presentation"` produces no node.)
- `tone` (`inherit | muted | primary | destructive`) resolves through the theme
  when `@gpuixui/primitives`' theme port is available, and to `currentColor`
  otherwise. Keep this the only coupling to the design system: **`icons` must
  build with no theme at all**, so the tokens/primitives workstreams cannot
  block it.

## 4. Icon set and licensing

Start with ~40 generic UI glyphs (chevrons, arrows, check, x, plus, minus,
search, settings, folder, file, copy, trash, pencil, eye, lock, info, warning,
error, success, spinner-adjacent shapes, panel toggles, ellipsis, external-link,
refresh, upload, download, filter, sort, calendar, clock, user, users, home,
link, list, grid, dots). Add only what a Tier 1/Tier 2 component actually uses —
a large unused set is dead weight.

**Provenance:** author the 24×24 grid ourselves, taking geometry inspiration from
**Lucide** (ISC licence). Do **not** copy GPUix's `examples/assets/icons` or
GPUI Kit's `crates/assets` glyph files without checking their licence and
attribution first — and never copy a logo or brand mark (MISSION). Record the
decision in `LICENSES/README.md` (owner: not this workstream — raise it as a
`TODO.md` item) and in this package's `README.md`.

## 5. Exact commands and expected results

```sh
nub install
nub run --filter @gpuixui/icons check-types   # expect: exit 0
nub run --filter @gpuixui/icons test          # expect: all suites pass
nub run check                                 # expect: green
node -e '...'                                 # see the invariant test below
```

## 6. Test plan

| Suite | Must catch |
| ----- | ---------- |
| `registry.test.ts` | an icon whose markup is not `viewBox="0 0 24 24"`, has no `<path`, hard-codes a `fill="#..."`/`stroke="#..."` instead of `currentColor`, or contains `<script`/`<image`/`<foreignObject`. This is the test that stops a broken icon shipping. |
| `names.test.ts` | a name in `ICON_NAMES` with no registry entry, or a registry key missing from `ICON_NAMES` — the union and the runtime table must not drift |
| `sizes.test.ts` | a size that resolves to `0`, `NaN`, or a value that is not on the scale |
| `Icon.test.ts` | a decorative icon getting an accessibility role, or a labelled one failing to set `role="img"` + `aria-label` (assert on the React element's props — no renderer needed; see 020 §3) |

Each test asserts something the source can get wrong; the malformed-icon test in
particular is written as a *property over every registry entry*, so adding a
bad icon fails the suite rather than slipping through.

## 7. STOP conditions

- An icon needs multi-colour, a gradient, or a non-24 grid → stop; that is a
  capability gap (GPUix tints monochrome SVGs by `style.color`). Document it.
- `svg` `source` turns out not to scale from the `viewBox` — this needs a
  runtime probe, and there is none here (020 §3). Record it as an *unverified*
  assumption in `README.md` and in `COMPONENTS.md` rather than asserting it.
- The licence of any glyph source is unclear → do not use it.

## 8. Acceptance criteria

- `nub run check` green; every invariant test above passes.
- `Icon` works with no theme provider (icons are usable before tokens lands).
- `COMPONENTS.md` "Icons" row is `wip` with the evidence note: markup and sizing
  verified; **on-screen tint/scale not runtime-verified on this machine**.
- Package `README.md` lists the size scale, the accessibility rule and the
  provenance decision.
