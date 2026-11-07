# 760: the reel on GPUIxUI's real components

Owner's rule (2026-11-07): every scene uses the library. When a component falls short, fix the
component with its test and docs, not the scene. Effects move into `@gpuixui/fx` with docs pages.

| Scene | Library parts | Known gap |
| ----- | ------------- | --------- |
| Toggle | `Switch`, `Text` | hero size through `switchMetrics` |
| Settings | `InsetGroup`, `SegmentedControl`, `Switch`, `Slider`, `useThemeCrossfade` | accent swatches |
| Diff | `DiffViewer` split | word marks, inline review comment, file header |
| Table | `VirtualTable` | deterministic scroll in a take |
| Fire | `Sidebar*`, `Message*`, `Card*`, `Button` | sidebar width and channel rows |
| Pricing | `Card*`, `Button`, `Badge` | |
| Ask | chat composer, `Bubble`, `Skeleton` | |
| Deploy | `Tabs`, `Table`, `Badge`, `AvatarGroup`, `SearchInput`, `Select`, `Dialog` | backdrop blur |
| Library, Today | `SegmentedControl`, `Text`, fx | |
| Keys, OP-1 | `Button`, `Card`, fx | no knob |
| Now playing | `Slider` or `Progress`, `Item`, fx | |

Every gap gets: the fix, a test that fails without it, a docs row. Completion: `nub run check`, `lint`,
the affected behaviour suites, and a theirs-vs-ours video per scene.

## Open

- A native click on a `ColorSwatches` swatch missed about 1 run in 6 in the headless renderer; `SegmentedControl`'s press
  passed 6 of 6. The test drives Enter instead, so the press path is unproven. Cause unknown.

## Status, 2026-11-07

Every scene is on real components. Library additions from this plan: `Knob`, `ColorSwatches`, `Tabs` line variant, sliding `SegmentedControl` chip, `Avatar` color/initials/radius, `DiffViewer` word marks, annotations and wrapping, `InsetGroup` options.
Effects live in `@gpuixui/fx/shader-layer`, with one docs page. The score is `apps/playground/scripts/reel-score.py`.
`apps/playground/scripts/web/` runs the film's scenes in Chrome: `nub scripts/web/bundle.mjs`, then `nub scripts/web/probe.mjs <wasm dir> <out>`. It exits non-zero on any logged error. WebGPU and WebGL2 pass at 60 fps; WebGL2 skips backdrop readers and simulations.

Open:
- Effects have one docs page, not one per effect.
- DirectX, real Linux and prebuilt binaries are outstanding, so the addon does not ship to users yet.
