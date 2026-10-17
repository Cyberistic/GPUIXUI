# apps/docs — the Fumadocs site

**Status: Phase B deliverable. Not created yet — the plan comes first.**

The docs site is a **browser** application. It documents and showcases the
native library; it does not render it. `MISSION.md` is explicit that a fake
HTML/CSS reimplementation presented as native is not acceptable, so the preview
strategy is a Phase A/B decision with four honest options (embed a real native
surface if the runtime supports it; otherwise a companion native playground with
run instructions; browser previews only when labelled as illustrative
approximations; source + real screenshots + a limitation notice for unsupported
interactions).

## What Phase B must create

- A real Fumadocs site on Fumadocs' supported architecture — not a bespoke docs
  framework. `packages/deploy/alchemy.run.docs.ts` already declares the
  Cloudflare resources with `rootDir: "../../apps/docs"`, so the app's location
  and build command are fixed by that stack.
- The information architecture from `MISSION.md`: Introduction, Installation,
  Getting started, Architecture, Theming, Typography, Components, Layouts,
  Workspace, Data display, Patterns, Examples, API reference, Contributing,
  License and attribution.
- Structured component metadata so navigation, status and the component index
  are generated consistently rather than hand-maintained.
- Light and dark docs themes, component search, a clear sidebar, readable code
  blocks and a useful landing page.

## Required first page

The Phase B exit condition is *one fully working component running in GPUix and
documented here* — a real page with a description, variants, sizes and states,
usage, API/prop docs, composition examples, keyboard notes, theming behaviour,
accessibility notes and limitations, and its implementation status.
