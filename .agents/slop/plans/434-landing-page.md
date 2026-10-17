# Plan 434: The landing page — a "Hunter License" identity over a stacked-native hero

## Why

The landing page is the first impression of a library whose whole claim is *one component
set, three native looks, AI-native surfaces*. It has to do two jobs at once:

1. **Show the product**, not a screenshot of a website — the same component in macOS,
   Windows and Linux, side by side, switching live.
2. **Carry an identity** strong enough to remember, in the register of `cap.so` / `klack`
   — big type, one confident idea, motion that feels physical rather than decorative.

## The idea

**"The Hunter License."** A play on *GP UI X UI*: the **X** is the license — the thing you
earn, carry, and show. It gives the brand a motif (a licence card with the holder's
platform), a voice ("Certified for macOS, Linux, Windows"), and a structure (the four
tiers become four ranks).

**Original artwork only.** No Hunter × Hunter characters, logos, typefaces, or art. The
motif is *a hunter licence as an identity system* — a card, a seal, a rank — drawn from
scratch. Trademarks stay out of the product; the freedom is in the typography, the card,
and the copy.

**The hero is the product.** Three stacked native windows — macOS, Windows, Linux — showing
the **same** component (the Dialog or the message scroller), with parallax on scroll and a
live platform toggle. The stacked windows *are* the pitch.

## Page structure

1. **Hero** — wordmark + one line; three windows **stacked as a physical deck** that
   auto-shuffles **macOS → Windows 11 → Linux/Arch** on a slow cadence (each card lifts,
   rotates slightly and slides to the back). The hero line tracks the top card —
   "Certified on macOS" → "Certified on Windows 11" → "Certified on Linux/Arch" — so the
   copy and the window always agree. Hover pauses the shuffle; the platform switch
   overrides it and pauses it; `prefers-reduced-motion` stops the shuffle and leaves the
   switch. A single CTA into the docs.
2. **The licence card** — the library's promise as a "licence": components, both themes,
   three platforms, native runtime, documented limits. A copyable card component that
   doubles as a real component in the library.
3. **The three platforms** — the **default** styles side by side: **macOS**, **Windows 11**
   and **Linux/Arch**, each with its real theme file. These are what a consumer gets out of
   the box; no themed variant is presented as a default.
4. **Make it yours** — the same component with a platform's style reshaped: **Windows XP /
   Windows 7 Aero**, and a **Linux/Arch** style that follows Omarchy's live theme (plan
   `433`). The point: a platform style is a starting point, not a fixed skin.
5. **The library** — a component grid (from `COMPONENTS.md`) with status chips; the AI
   surfaces (`206` scroller, `207` chat/message) called out as the differentiator.
6. **Proof** — the native suite count, the both-theme matrix, the documented limitations.
   No fake "trusted by" logos.
7. **Footer** — docs, licence/attribution (shadcn, base-gpui, adabraka, GPUI Kit, Omarchy),
   repository.

## Visual direction

- **Type**: one display face with real character (licensed, recorded in `LICENSES/`) at
  huge sizes, tight leading; body in the docs face. The wordmark is typographic, not a
  drawn logo.
- **Colour**: near-black canvas with one saturated accent (the "X" green), semantic tokens
  from the library — the landing uses the same tokens it sells.
- **Motion**: windows stack and lift on scroll; the platform switch cross-fades the frame
  chrome, never the content. All motion respects `prefers-reduced-motion` and never gates
  content behind an animation.
- **Texture**: a fine grain/scanline over the dark canvas, static (no video).

## Constraints

- **Honesty rule.** The native windows show a **real native capture** (the playground
  produces them) or are clearly labelled illustrative — never a browser mock passed off as
  native. This is the same rule the component pages follow.
- **Performance.** The landing is the heaviest page; it gets a bundle budget and no
  heavyweight dependency (no 3D library, no animation framework beyond what the docs
  already ship).
- **Responsive**: the stacked windows become one window with the platform switch on
  narrow screens; no horizontal scroll.
- **A11y**: the platform switch is a real control with labels and keyboard support; the
  contrast is verified by the tokens' contrast contract (`074`).
- **Build**: the landing is a route in `apps/docs` (Fumadocs), not a separate app.

## Acceptance

- [ ] The hero stacks the three windows and **auto-shuffles**, with the hero line tracking
      the top card; hover pauses, the platform switch overrides and pauses, and
      `prefers-reduced-motion` stops the shuffle.
- [ ] The **same** component is shown in all three, with real captures or a clear label.
- [ ] The licence card is a real component, reused in the library.
- [ ] The three-platform section shows the **default** macOS / Windows 11 / Linux-Arch
      styles; the XP/Aero and Omarchy recipes live in a separate "Make it yours" section.
- [ ] Reduced-motion, keyboard and contrast checks pass; no console errors.
- [ ] The bundle budget is met and recorded.
- [ ] Attribution footer lists every reference with its licence.

## STOP conditions

- A real native capture cannot be produced for the hero → ship the labelled illustrative
  version and record it; do not claim it is native.
- The motion cannot be made respectful of `prefers-reduced-motion` → cut the motion, keep
  the layout.
- A font or illustration has no licence recorded → do not ship it.

## References (behaviour and register, not assets)

- `https://cap.so` — big-type hero, product-as-proof, restrained motion.
- `klack` — the tactile, physical register: sound/feel translated into motion.
- the "alcove"/halcyon register the owner named — verify the exact reference before
  copying a tone; borrow the *feeling*, not the layout.
