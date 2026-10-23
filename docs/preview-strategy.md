# Preview strategy — what a component page shows, and how

`MISSION.md` sets the constraint: the library renders through **GPUix**, the
documentation site runs in a **browser**, and a browser preview may not pretend
to be the native surface. This file records the strategy the site uses, the
theming rule that keeps a preview honest, and the template every component page
follows.

## The strategy: labelled approximation, plus real source

Of the four strategies the mission allows —

1. embed a real GPUix surface in the page,
2. ship a companion native playground,
3. render a browser approximation **labelled as one**,
4. give source, screenshots and a limitation notice where the interaction cannot
   be shown,

this site uses **3 for the paint and geometry, and 2 for the runtime**:

- A `<ComponentPreview>` (or `<BlockPreview>`) renders a browser reproduction of
  the component's geometry, palette and states. Every preview carries a note:
  *"Browser preview: the geometry, palette and states of the native component.
  The shipped component renders through GPUix, not the DOM."*
- The same page shows the **copyable source** (`<ComponentSource>`), so the
  reader can run the real component in `apps/playground` — the companion native
  playground — rather than trust the drawing.
- Where the runtime lacks a capability (no `aria-checked`, no `transform`, no
  caret position), the page says so in **Limitations** instead of drawing
  behaviour that does not exist. `COMPONENTS.md` carries the same evidence per
  row.

A preview is never the authority. If a preview and the component disagree, the
component is right and the preview is a bug.

One drawing is deliberately coarser, and this file records it: an **overlay
surface**. The native dialog, popover and menu compile a fixed recipe radius
(`rounded-4xl`, 32px) and paint the theme's `elevation.lg` beside the recipe's
1px `foreground` ring, while the preview's `.gx-dialog` draws
`border-radius: calc(var(--radius) + 8px)` and a single CSS shadow. The platform
switch therefore reshapes the preview's corner and not the native one, so the two
agree on palette and lift and differ in radius — an approximation, not a
measurement of the shipped surface.

The same is true, more narrowly, of a **carousel's track corner**.
`CAROUSEL_TRACK` names `rounded-lg`, which the recipe compiler resolves to a
fixed 8px, while `.gx-carousel-card` draws the platform radius plus the two
pixels between the `md` and `lg` steps (`calc(var(--radius) + 2px)`). The two
agree in the default style and differ where a platform's `radius.md` is 8. The
carousel page prints the fixed metric, and its preview is a rendering like every
other.

A **table's row height** follows the platform's density in the preview, while
the native row is a fixed recipe: `TABLE_CELL` is shadcn's `px-3 py-2 text-sm`,
so every shipped row is an 8px inset around a 20px line — 36px — whatever the
platform. The preview's `.gx-table-row` is
`calc(var(--control-height-sm) + var(--spacing-md))`, so the platform switch
resizes it (40px at macOS compact, 48px at Linux spacious) and the native table
does not move. The page says its previews are approximations; this is one of the
ways, and it is the reason a reader comparing the two heights sees a difference.
The rule and the header are **not** approximations: the native header paints no
strip of its own (it sits on the table's card) and every row's line is
`dividerOn` on the fill the row crosses, so the drawing's header is the card and
its four derived rules (`--divider-card`, `--divider-selected`,
`--divider-hover`, `--divider-accent`) are the lines the shipped rows paint.

A **collapsible's body** is drawn with the browser's own mount, not the native
measured reveal. The native body reports its painted height and tweens the
clipping box to that number, stays painted for its 200 ms collapse and then
unmounts; the preview removes the body the moment it closes, so the two agree
about the state contract (the body's own values go with it, the caller's
survive) and differ about the journey: the preview fades the mounted body in and
never animates a height. Its trigger is a real `<button>` where the native one is
a `div role="button"`, because the browser button carries the same tab stop and
Enter/Space activation; the page reads the native role from the source.

A **color picker's swatch** is a real `<button>` in the preview where the native
cell is a `div role="button"` that the component gives a tab stop. Both carry the
same name (the colour), the same `aria-selected` mark, Enter/Space activation and
one tab stop per cell — there is no roving arrow grid in either — so the element
name is the difference, not the interaction. The six defaults are drawn from the
theme the switch resolved, so a platform switch repaints them and resizes the
cells from its density; the page prints the roles.

A **time picker's focus** is drawn one level up from the native ring. The
component declares the runtime's `focusVisible` outline on each segment and on
the clear control, so the ring hugs the 26px input that took the focus; the
preview draws one `:focus-within` outline around the `.gx-time-field` group,
because a browser `<input>` cannot declare the runtime's outline at rest. Both
rings exist, sit inside the same field box and take `colors.ring`; they differ in
which box they wrap. Nothing else about the field is an approximation: the
height comes from the platform's density, the segment width and the clear
target are the component's own constants, and the clock the preview runs is the
component's.

A **context menu** is drawn one frame removed from the native placement. The
native surface is an `anchored` layer at **window** coordinates; the preview
places it at the point the browser event reported **inside its own frame**, so a
scroll of the page moves the native surface with its window and the drawing with
its frame. Both routes are the component's: the drawing listens for the
browser's `contextmenu` event where the native one reads `onAuxClick` +
`isRightClick`, and `Shift+F10` opens at the trigger's bottom-left in both. Two
smaller differences: the second level opens on a press or `ArrowRight` in the
drawing while the native row also opens on hover, and the drawing removes the
surface at once where the native one keeps it for its 200 ms exit frame without
taking a press.

### Strategy 1 is real: the GPUix web build

`@gpuix/native@0.11.0` ships a second target beside the `.node` binding: a
`browser` entry (`browser.mjs`) over a **19.2 MiB** wasm renderer. It is not the
headless test renderer. It is GPUI's browser platform: it creates its own
`<canvas>`, appends it to `<body>`, paints through WebGPU with a WebGL2 fallback,
and drives the same retained tree the native window does.

That makes strategy 1 available for the first time — a docs route could show the
real library instead of a drawing of it — but it is a **whole-page** surface,
not a preview inside a page, because the platform is a singleton with three
measured constraints:

- **One document-owned canvas and one top-level window per page load.** A second
  `init()` fails with `GPUIX web is already running`, and a closed window cannot
  be reopened. Leaving a live surface therefore means a reload.
- **The document must be cross-origin isolated.** The wasm instantiates
  `WebAssembly.Memory` with `shared: true`, so it needs
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`; without them `SharedArrayBuffer`
  does not exist and the module does not start.
- **WebGPU first, WebGL2 fallback.** A browser with neither backend gets no
  surface at all, so a live route owes a plain-text fallback rather than a blank
  canvas.

**The site mounts it, on one route.** `/live` boots the browser build and paints
a real card with a `@gpuixui/primitives` filled action on it, through
`@gpuix/react`'s reconciler; every other page keeps the labelled DOM reproduction
above, because the platform hosts one surface per document and a component page
needs room for its prose. `src/lib/gpuix-web.test.ts` holds this status to the
tree in both directions: the policy cannot claim the surface is mounted while no
route boots the build, and it cannot claim a route that is not there. The guard
also reads the installed package, so the size, the memory requirement and the
browser entry it quotes cannot drift silently. Plan `440-live-gpuix-web-surface`
is the record of how the route was reached; this section is its outcome.
`/docs/runtime` publishes the same three constraints, the build's size and the
reconciler mount to a reader, and the guard holds that page to this policy.

`/live` is **not** the native macOS runtime — it is the same renderer compiled to
wasm — and its label says so.

### The paint is measured

Plan `440`'s riskiest step — whether a real GPUix surface paints at all in a
browser — is now measured, not assumed.
`scripts/live-surface-probe.ts` serves a cross-origin-isolated page, boots the
published glue against the published wasm, applies one mutation batch (a
420×200 `div` with a `text` child), captures the frame over the DevTools
protocol and reads a pixel back out of the PNG. It passes only when the renderer
started, appended its `<canvas>`, the retained tree carries the text the batch
set, **and the sampled pixel is the fill the batch set** — a blank frame captures
perfectly well, so its existence proves nothing.

Run it with `nub apps/docs/scripts/live-surface-probe.ts`; the frames land in
`.artifacts/live/`. They are **local evidence** for the run and nothing under
`.artifacts/` is site content: the directory is **gitignored**
(`build-outputs.test.ts` asks git, so a removed rule fails), and a frame is read
and then deleted rather than staged.
`scripts/live-frame.ts` is the frame contract it judges against, and
`src/lib/live-frame.test.ts` holds both directions: a frame that reported itself
healthy while its pixels were white fails by name.

What it settled, measured on macOS 15.8.1 x86_64 with headless Google Chrome
155.0.8059.80 over SwiftShader:

- **A headless browser is enough.** `crossOriginIsolated` is true under
  `COOP: same-origin`/`COEP: require-corp`, `SharedArrayBuffer` exists, WebGL2 is
  available and `navigator.gpu.requestAdapter()` returns an adapter — so the
  backend question the plan had no tool to answer is answered on this host.
- **`browser.mjs` is a bundler entry, not a browser one.** Its
  `import … with { type: "file" }` is a bundler convention; the probe initialises
  `wasm/gpuix-web.js` directly with the wasm URL, which is the path a Vite rule
  must reproduce.
- **`getPaintedText()` is not a paint report.** It returned `[]` on a frame whose
  screenshot shows the fill and the label, because the report is written by a
  frame the probe never ticks. A paint claim has to read the pixels.
- **The CLI screenshot flags cannot prove it.** `--screenshot` captures at load
  and `--virtual-time-budget` fast-forwards the page's timers, so both captured a
  white frame while the surface painted a moment later; the probe drives Chrome
  over DevTools and captures after the page reports itself.

That is the spike's feasibility half. The route built on it is §The live surface.

### The live surface

`/live` is the strongest preview the mission allows: the real renderer, in the
browser, painting the library's own styles. It is a whole-page route because the
platform is a document-level singleton.

- `src/routes/live.tsx` is the route; `src/components/docs/live-surface.tsx`
  boots the renderer inside an effect (never at module scope, so the server build
  never evaluates the wasm) and reports what it painted.
- `src/lib/live-scene.tsx` is the screen, written with `@gpuix/react`'s JSX
  runtime: a card, a heading, a sentence, a filled action and a status line.
  Every `StyleDesc` comes from `@gpuixui/primitives/core` — `controlStyle` for
  the button, `textStyle` for the type, `surfaceStyle` for the card — so the
  paint is the recipe the package ships, not a copy written for the docs.
- The mount is `createRoot(renderer).render(<App />)`, not
  `render(<App />, { renderer })`: `render()` also installs Node error handlers,
  and the browser bundle's `process` shim has no `.on`, so it throws before the
  first frame. The renderer's own callback routes each event through
  `handleGpuixEvent`, which is what makes the React `onClick` fire.
- `src/lib/gpuix-native.ts` is the browser entry: `browser.mjs` loads the wasm
  with `import … with { type: "file" }`, which Vite leaves as an absolute
  filesystem path inside a pre-bundled dependency. The shim re-exports the same
  class through the `gpuix-web-wasm` rule, and `vite.config.ts` resolves
  `@gpuix/native` to it for the client graph.
- The theme is the platform switch's: `resolvePlatformTheme(platform, "dark",
  look)` from `?platform=` and `?look=`, falling back to the remembered choice,
  so the surface changes with the rest of the site's previews.
- A press goes through the automation locator, which calls
  `renderer.simulateClick` — the renderer's own input path — and the React
  handler repaints the banner's fill and counts the press. Nothing in the page
  calls the handler directly.
- The bar above the surface is DOM and says what the surface is; the page falls
  back to a sentence when there is no WebGPU or WebGL2, and says "reload to
  mount it again" when the platform reports `GPUIX web is already running`.

The paint is measured, not assumed. `scripts/live-route-probe.ts` loads the
running dev server's `/live`, reads the element bounds the page reports, samples
the button's fill and the banner's resting fill out of the PNG, presses through
the renderer, and samples the banner again. It fails if the page does not report
`painting`, if the button's pixel is not `controlStyle`'s fill, if the press does
not reach the listener, or if the banner does not change. Run it with the dev
server up:

```sh
nub run --filter @gpuixui/docs dev
nub apps/docs/scripts/live-route-probe.ts
```

Frames land in `.artifacts/live/docs-live-route-{before,after}.png` as **local
evidence**: the directory is ignored by the repository root, so a frame is read
and then deleted rather than staged.
Measured on 2026-10-22, macOS 15.8.1 x86_64,
headless Google Chrome 155.0.8059.80 over SwiftShader: the button sampled
`#a7a9ff` (`controlStyle`'s dark primary), the banner `#1e222a` (`muted`), and
after a press `#0e5135` (`successSoft`) with the status reading "Pressed 1 time".

The reconciler mount was measured on 2026-10-23 against the same host and
browser: the page reported `status=painting`, the retained text read
`A real GPUix frame,Painted by the wasm renderer through the React reconciler.,
Press me,Waiting for a press`, the button sampled `#a7a9ff` at `41,113`, the
banner `#1e222a` at `500,149`, and after one press through the automation locator
the banner sampled `#0e5135` with the status reading "Pressed 1 time" — the same
four claims, now painted by a React tree instead of a hand-fed batch.

### The press path is measured

A strategy-3 preview is React in the browser, so a capture of the server-rendered
markup proves the paint and **nothing about an interaction**. Measured: a capture
taken while the dev server was still compiling the route tree found `0` DOM nodes
carrying a React fiber, and a press on the carousel's next control moved nothing;
the same page, once hydrated, moved its readout `Slide 1 of 4` → `Slide 2 of 4`
and back. A cold dev server took **~10.5 s** to hydrate (every route module,
including the three docs collections, compiles before the client entry commits);
a warm load is under two seconds. A fiber is not the precondition a press needs —
the control's `__reactProps.onClick` is, because the tree attaches node by node.

`apps/docs/scripts/preview-press-probe.ts` measures that path on the served
Carousel page. It waits for the workflow demo's next control to carry
`__reactProps.onClick`, then presses **Next** and **Previous** and reads the slide
out of `Slide N of 4`, so the assertion is the demo's own state, not a pixel.
Run it with a dev server up:

```sh
nub run --filter @gpuixui/docs dev
nub apps/docs/scripts/preview-press-probe.ts
```

Measured 2026-10-22 on macOS 15.8.1 x86_64, headless Google Chrome 155.0.8059.80:
hydrated after 10.7 s with 1 366 nodes carrying a fiber, `next: Slide 1 of 4 →
Slide 2 of 4`, `previous: Slide 2 of 4 → Slide 1 of 4`, exit `0`. The negative
control is the hydration budget itself — `--timeout 500` prints
`FAIL the demo never hydrated within 500 ms` and exits `1`. Like the other
browser probes this is a run against a dev server, not part of `nub run test`;
`src/lib/preview-press.test.ts` holds this policy to the probe (the ready-check,
both directions and the commands) and the readout parser to its contract.

### The palette switch is a measured click

The palette axis (`?mode=`, the sidebar's **Palette** group) is the one control
that lets a reader see a component in both of the library's themes, and it is
React state: `?mode=light` in the address bar proves the surface resolved a
palette on the server, not that pressing *Light* changes one. `String` state
crosses three places — the query parameter, the remembered choice and the
provider — so the click is measured rather than assumed.

`apps/docs/scripts/palette-switch-probe.ts` presses the group on the served
Button page. It waits for the **Light** button to carry `__reactProps.onClick`
(the same hydration precondition as the press probe), reads every preview
surface's `data-mode`, `data-platform` and the `--background` variable the bridge
wrote, and holds each against `platformTheme(themes[mode], platform)` — so the
expected fill is the library's own value, and a palette edit moves the probe with
it. It presses **Light**, requires every surface to follow (`3 of 3` on the Button
page), the group's `aria-pressed` to move, and the address bar to carry
`mode=light`; then it presses **Dark** and requires the URL back. Run it with a
dev or preview server up:

```sh
nub run --filter @gpuixui/docs dev
nub apps/docs/scripts/palette-switch-probe.ts
```

Measured 2026-10-23 on macOS 15.8.1 x86_64, headless Google Chrome 155.0.8059.80
against `vite preview`: `light: 3 of 3 surfaces painted #F6F8FA`, exit `0` — the
Default platform's light page fill, with the dark page `#11141A` before the
press. The negative control is a link that opens on the other palette:
`--url '…/docs/components/button?mode=light'` prints
`FAIL a preview opened in light, not dark`, the fill it read beside the dark one
it expected, and the group's pressed position, then exits `1`.
`src/lib/palette-switch.test.ts` holds the policy, the command, both measurements
and the parser the assertions read.

### The platform switch is a measured click

The platform axis (`?platform=`, the sidebar's **Platform style** group) is the
mission's acceptance: *a reader toggles macOS → Windows and every preview
changes*. The URL half is server-rendered — `?platform=win32` reaches the
surface — but a reader changes it by pressing a button, and that press is React
state: it writes the address bar and re-resolves `platformTheme` for every
`PreviewSurface`, which no `?platform=` capture proves.

`apps/docs/scripts/platform-switch-probe.ts` presses **Windows**, then **macOS**,
on the served Button page. It waits for the Windows button to carry
`__reactProps.onClick`, then reads every preview surface's `data-platform`,
`data-mode`, the `--control-height-md` variable the bridge wrote and the address
bar. The height is held against
`platformTheme(themes[mode], platform).density.controlHeight.md`, so the expected
geometry is the library's own and a density edit moves the probe with it. It
requires every surface to follow (`3 of 3` on the Button page) and the URL to
carry `platform=win32`, then `platform=darwin`. Run it with a dev or preview
server up:

```sh
nub run --filter @gpuixui/docs dev
nub apps/docs/scripts/platform-switch-probe.ts
```

Measured 2026-10-23 on macOS 15.8.1 x86_64, headless Google Chrome 155.0.8059.80
against the dev server: `Windows: 3 of 3 surfaces at 32px` and
`macOS: 3 of 3 surfaces at 28px`, exit `0`. The negative control is a probe that
expects the macOS height on every platform: it prints
`FAIL the Windows preview paints --control-height-md 32px, not 28px`, the read
beside the expected value, and exits `1`. A switch that did not follow a press
fails the other way — `only 2 of 3 preview surfaces followed the platform switch
to Windows` — so a page whose one preview never re-resolved cannot pass on the
surfaces that did. `src/lib/platform-switch.test.ts` holds the policy, the
command, both measurements and the parser the assertions read.

### The look picker is a measured click

The authored looks are the third axis (`?look=luna|aero|omarchy`), and the
sidebar deliberately does not carry them: the platform switch stays the
mission's four names. The control lives on `/docs/theming`
(`src/components/docs/look-picker.tsx`), so the press has its own page to be
measured on. The same probe opens the theming page after the platform steps,
waits for the picker's first button to carry `__reactProps.onClick`, then
presses **Windows XP (Luna)**, **Windows 7 (Aero)** and **Omarchy**. It reads
the first preview surface's `data-look`, its `data-platform` and `data-mode`,
the `--background` the bridge wrote and the address bar. The background is held
to `resolvePlatformTheme(platform, mode, look).colors.background`, the exact
theme the provider resolves, because a look owns the palette for the mode and a
constant would pass on the wrong one.

Measured 2026-10-23 on macOS 15.8.1 x86_64, headless Google Chrome 155.0.8059.80
against the dev server: `Windows XP (Luna): #101E33 over darwin`,
`Windows 7 (Aero): #101C27 over darwin`, `Omarchy: #1A1B26 over darwin`, exit
`0`. The negative control is a wiring that drops `setLook`: the URL and every
surface stay unchanged and the probe prints
`FAIL pressing Windows XP (Luna) left no preview surface on luna` — the same
line for `aero` and `omarchy` — exit `1`. `src/lib/platform-switch.test.ts`
holds the section, the command, the three readouts and the look readout parser.

### The docs theme switch is a measured click

The site has **two** palettes, and they are deliberately independent:

- the **docs chrome** — the sidebar, the page and the prose — reads its own
  `:root`/`.dark` values from `src/styles/app.css`;
- a **preview** paints the library's theme, resolved from `?mode=`, `?platform=`
  and `?look=`, so a component can be read in the dark palette while the page is
  light.

The chrome's switch is React state held by next-themes, so no static read proves
it: `?theme=dark` in a URL, or the class on `<html>` at load, says nothing about
whether pressing the toggle moves one and leaves the other. The separation is the
honesty rule of this file — a preview **does not follow the docs chrome's theme**,
because the library's palette is what the page documents, not the page's own
skin.

`apps/docs/scripts/docs-theme-probe.ts` presses `[data-theme-toggle]` on the
served Button page once per direction. It waits for the toggle to carry
`__reactProps.onClick`, then reads, as one line:

- the scheme `<html>` carries (`light`/`dark`),
- the chrome's computed `--background`, held to the value `app.css` declares for
  that scheme (read from the sheet, never a hex of the probe's own),
- the scheme `localStorage` remembers,
- every `.gx-demo[data-mode]` surface's `mode:platform:fill`, each fill held to
  `platformTheme(themes[mode], platform).colors.background` — the library's own
  role, so a palette edit moves the probe with it.

It requires the chrome to move both ways, the remembered choice to agree with the
paint, and the **whole preview set to stay put** — compared field by field,
because the previews are objects and a `join(",")` reads `[object Object]` for
every one of them. Run it with a dev or preview server up:

```sh
nub run --filter @gpuixui/docs dev
nub apps/docs/scripts/docs-theme-probe.ts
```

Measured 2026-10-23 on macOS 15.8.1 x86_64, headless Google Chrome 155.0.8059.80
against the dev server: `light: chrome #ffffff, 3 previews stayed on dark darwin
at #1C1C1E`, exit `0` — the chrome in its light palette while three previews
stayed on the library's dark macOS page, then back to light. The negative
control is the hydration budget: `--timeout 500` prints
`FAIL the docs theme toggle never hydrated within 500 ms (it carries no React
onClick)` and exits `1`. A preview that followed the chrome fails the other way —
`FAIL a preview followed the docs theme (dark:darwin:#1C1C1E became
light:darwin:#F6F8FA)` — so a page whose drawings inherited the docs skin cannot
pass on the chrome's own readout. `src/lib/docs-theme-switch.test.ts` holds the
readout parser (a truncated line and an unreadable preview are refused, not
guessed), the comparison, both presses, the sheet-derived fills, this section and
the command.

### Pages the package writes

Each package writes the page a component ships with. The site mounts those
directories as Fumadocs collections and renders the files as-is, so a component
cannot ship a page the site does not show and the two cannot drift:

| Collection | Source | Route | Sidebar |
| ---------- | ------ | ----- | ------- |
| Primitives | `packages/primitives/docs` | `/docs/primitives` | Primitives |
| Icons | `packages/icons/docs` | `/docs/icons` | Icons |
| Components | `packages/components/docs` | `/docs/components` | Components |
| Data | `packages/data/docs` | `/docs/data-display` | Data display |
| Code surfaces | `packages/editor/docs` | `/docs/editor` | Workspace |
| File surfaces | `packages/files/docs` | `/docs/files` | Workspace |
| Shell surfaces | `packages/shell/docs` | `/docs/shell` | Workspace |
| Panel surfaces | `packages/dock/docs` | `/docs/dock` | Workspace |
| Media surfaces | `packages/media/docs` | `/docs/media` | Workspace |

The table is the mounted set, not an illustration: `package-docs.test.ts` reads
it against `packageCollections` in both directions, so a collection the site mounts
and this table omits fails, and so does a row no collection backs.

A page that ships a demo mounts it exactly as a curated page does, so
that page's preview is **strategy 3**: a browser approximation, labelled, with
the real API tables and limitations beside it. A page that ships none has only
its source and limitations: **strategy 4**. A component page ships none when the
interaction has no honest browser reproduction to draw; today the files and
shell lanes still ship none, the dock lane draws its split and its panel group
(`split-pane` through `panel-preview`, `panel-group`), while the media lane
draws all six of its surfaces
(`crop-area`, `qr-code`, `image-preview`, `file-upload`, `drop-zone`,
`media-player`)
and the editor lane draws all four of its own (`code-editor`, `diff-viewer`,
`markdown-editor`, `search-replace`). Those drawings run the packages' own
**logic** — `@gpuixui/dock`'s `logic` (`clampSize`, `dragSize`, `resizeByKey`,
`normalizePanels`, `resizePanels`, `resizePanelsByKey`,
`togglePanelCollapsed`), `@gpuixui/media`'s `crop/logic`,
`qr/encode` and `upload/queue`, and `@gpuixui/editor`'s `diff/logic`,
`markdown/logic` and `search/logic` — so a group's fractions and its resize,
collapse and step reducers, the crop's masks and handlers, the symbol's modules,
the queue's lifecycle, the diff's edit script, the fence a preview must close
and the matches a replace-all removes are the components', and only the paint is
the browser's. The panel group's preview is a fixed 620px frame where the shipped group
measures its own pane space in `onLayout`, so the two convert a pixel gesture
against the same rule and different numbers; the page prints that difference,
and its split sibling prints the 220–380px bounds its drawing owns.
The data lane's Property panels page was the first drawer outside the component and
primitive lanes — one object read by a preview, a field, a table and a metric
card, every one of which the browser can draw honestly. Either way
the page opens with a note saying the drawing is not the shipped frame and
naming the command that opens the companion playground — `nub run
dev:playground`, read from the root manifest rather than typed twice — with a
link to [the native playground page](/docs/playground), which catalogues every
probe and gives the scoped run commands.
`src/components/docs/native-run-note.test.tsx` holds the command to the manifest's
script, the link to a heading the installation page has, and the page frame to
mounting the note. The primitive layer is one sidebar section even though two
packages write its pages, because a reader looks for a lane of the library, not
for a package boundary. `src/lib/collection-routes.ts` is the single registry;
`src/lib/package-docs.test.ts` holds it to every `packages/*/docs` directory and
checks that the primitives index links every page in the section at the address
that documents it — the curated page, for the five primitives that have one.

**A snippet is code, not prose.** Every `ts` and `tsx` fence on every mounted
page — the site's own and each package's — has its `@gpuixui/*` imports resolved
against the package source by `src/lib/page-snippets.test.ts`, because the build
renders a snippet with the wrong export name exactly like a right one. A plain
`ts` fence counts: `/docs/runtime` prints its capability calls in one, and a walk
that read only `tsx` fences never saw it. The walk found one page that named a
symbol its package does not publish — `primitives/docs/tooltip.mdx` imported
`Icon` from `@gpuixui/primitives`, while `Icon` lives in `@gpuixui/icons` — and
the primitives workstream fixed the page; the defect record was deleted in the
same pass rather than left standing empty.

**A source accordion is the real file.** A curated page's `<ComponentSource>`
names a key in `src/components/docs/sources.ts`, and MDX does not typecheck that
prop: the Dropdown menu page passed a *demo* key, so the accordion under
Installation printed an empty code block. `src/lib/component-source.test.ts`
holds the three things that must agree — the key is registered, the `file` the
page labels the accordion with is the file the registry's `?raw` import reads,
and that file exists — and reads the registry from the other side, so a key no
page mounts is not shipped dead.

**An install block resolves too.** `<Install packageName importName>` writes the
`nub add` command and the import line as strings, so `src/lib/install-block.test.ts`
resolves both props through the workspace symbol index: the package must be an
entry point the workspace publishes, and the name must be one that entry point
exports. A renamed package or a misspelled export would otherwise teach a
command that cannot resolve on the section a reader follows first.

A curated page in `content/docs/components/` wins its URL and adds the previews,
the install block and the copyable source.
Curated today: Accordion, Alert, Avatar, Badge, Breadcrumb, Button, Card,
Carousel, Checkbox, Collapsible, Color picker, Combobox, Command menu,
Confirmation dialog, Context menu, Date picker, Dialog, Drawer, Dropdown menu,
Empty state, Field and inline validation, Form, Inline edit, List,
Navigation menu, Pagination, Popover, Search input, Select, Stepper, Switch,
Table, Tag input, Tabs, Time picker, Timeline, Tooltip, Toast.
`src/lib/component-preview.test.ts` holds the preview registry from both sides:
every `<ComponentPreview name>` on a page names a registered demo, and every demo
is mounted by a page (a key nobody renders is dead code, and a typo throws in the
browser rather than failing the build). Both directions compare names, so
`src/lib/preview-demo-render.test.tsx` mounts every registered demo in the light
and dark palettes: a demo that throws while it renders is a page that crashes in
the browser, which no name check can see.

**One component, one page.** Five of those curated pages document a primitive —
Button, Checkbox, Select, Switch and Tooltip — so the package page for each was a
second live copy of one component: the sidebar listed two entries with one title,
a search returned both, and the sitemap advertised two addresses. The curated
page is canonical, because it is the fuller page and it sits where a reader
browses a component. `src/lib/curated-twins.ts` is the one list of the five
retired addresses: `/docs/primitives/<name>` answers a **301** to the curated
page with the reader's query preserved, and the sidebar fill, the search index,
the sitemap and `/llms.txt` all read the list, so none of them can serve the
twin. The package keeps its Markdown and the tests that hold its API table to
the props it declares; the site simply does not render a second page for the
component. `src/lib/curated-twins.test.ts` derives the duplicate set from the two
trees by title, so curating a sixth primitive without retiring its package page
fails by name rather than shipping two pages again.

### The dependency line is generated, not written

`MISSION.md` asks every component page for the packages it needs, and the
package pages are Markdown the site mounts while the curated pages are MDX the
site writes. Asking every page author to keep a list beside their imports would
drift the first time an import moved, so the site reads the component's own
module instead:

- `src/lib/page-dependencies.ts` is the model: a page's component imports,
  grouped by workspace package (`@gpuixui/*`, `@gpuix/*`), with the page that
  documents each one. A package the site has no page for stays plain text.
- `src/lib/page-dependencies-source.ts` resolves the page's component. The
  published symbol wins, because a page stem is not always a file name: `grid`
  finds the `Grid` declared in `Stack.tsx`, `spacer` finds `Separator.tsx`. A
  family that publishes no symbol under its own name falls back to the file of
  the same name (`chat` → `chat.tsx`). A page that resolves to no module is
  reported, not guessed, and the guard fails until it has a source to read. A
  **curated** page names its module in the `<ComponentSource file>` it shows, and
  that is the module the strip reads — `/docs/components/button` lists the
  primitives' imports even though the components package documents its own
  wrapper at another URL.
- `plugins/page-dependencies-plugin.ts` serves that index as a build-time
  module, so neither the browser bundle nor the Worker opens the workspace.
- `<DependencyStrip>` prints it under the status strip, names the module the
  imports were read from, and links each package to its page. It renders nothing
  on a page whose author wrote `## Dependencies` itself (today,
  `packages/primitives/docs/tooltip.mdx`) or whose component imports no
  workspace package. Both frames mount it, so the curated page a reader lands on
  lists its packages beside the source block it shows.

`src/lib/page-dependencies.test.ts` holds both directions of the reading — every
workspace import the module makes is listed and nothing invented — and keeps
every printed link on a mounted page. It also holds a curated page's entry to its
own `ComponentSource` file. Deleting either frame's mount fails the frame case;
emptying the index or dropping the curated half fails the curated case and both
strip cases.

### The related line is generated, not written

`MISSION.md` asks every component page for its related components, and that row
was the one the package pages could not satisfy: a page is Markdown the site
mounts, so it cannot resolve the URL of its siblings, and when the strip landed
most of the mounted pages had no `## Related` section while this file claimed the
template guard enforced one. Both frames mount the generated line, so the curated
page a reader lands on carries the same siblings as the package page it shadows.

- `src/lib/related.ts` is the model: a named **family** per layer — the actions,
  the text fields, the overlays, the table surfaces, the panels — each family a
  list of the pages a reader is choosing between, with the page's own
  frontmatter title as the label. A family may hold a curated page beside a
  package page, because the curated page is the URL the site serves.
- `<RelatedStrip url sections>` prints the family at the end of every page — after
  the prose on a curated page, after the source block on a package page — and
  leaves the page itself out of the list. The
  sections are the table of contents Fumadocs already built, so a page that
  writes `## Related` keeps its section and the strip stays silent. It renders
  nothing for the pages argued as solos in `soloPages`: the theme provider and
  the one-page icon set.
- Both frames mount the strip with the page's table of contents, so a page that
  writes `## Related` keeps its section and no page prints the links twice.

`related-strip.test.tsx` holds the rendered line (a sibling's href and label,
the page's own href absent), the curated frame's mount, the media player's
siblings, and the silence for a page that writes the section.

`related.test.ts` holds the model to the pages the site serves, in both
directions: every mounted package page and curated component page is in a family
or an argued solo (the MediaPlayer shipped with neither and no page noticed),
every family has at least two distinct pages, every link resolves to an address
the site answers — a retired primitive through its 301 — and every solo is a
page the site serves with a reason and no family.

### The source block is generated, not written

`MISSION.md` asks every component page for copyable source, and a package page
is Markdown: it can describe the component but cannot embed it. Before this
block, only the curated pages carried a source accordion — a reader of a package
page could read behaviour, theming and API and still not see the file they would
own if they copied the component.

The site resolves the module a page documents at build time, reusing the
decision the dependency line already makes (`page-dependencies-source.ts`'s
`readPackagePages`; the published symbol wins, a page-stem file is the fallback)
and prints that file's own text:

- `src/lib/page-source.ts` is the model: a page's module, a loader for it, and
  the cache that keeps one promise per page so a re-render cannot suspend on a
  fresh one.
- `plugins/page-source-plugin.ts` serves each module as a **dynamic** import of
  `<absolute path>?raw`, so a page downloads its own component and not the
  workspace's ninety-six modules.
- `<SourceAccordion>` is the one block both callers render: a curated page hands
  it a hand-named file (`sources.ts`), a package page hands it the resolved
  module. It is collapsed, shows the repository-relative path and links the file
  on GitHub.
- `<PackageSource url>` mounts at the end of the package page frame — after the
  page's own prose, so the component's behaviour still opens the page.

`src/lib/page-source.test.ts` holds both directions: every package page resolves
to a readable module (with a floor, so a scan that stopped matching cannot
pass), the text it prints **is** the file on disk rather than a second copy, a
page with no loader is reported instead of rendering an empty Code block, and
the mount sits on the package frame rather than the curated one. Measured both
ways: removing the mount fails the frame case (`expected … to contain
'<PackageSource url={url} />'`), and pointing the loader at another file fails
the copy case with the wrong text. Verified in a browser on
`/docs/primitives/switch`: the accordion opens, prints `Switch.tsx` in full — the
same text the file holds, not a summary copy — and the GitHub link is that
file's own path. The file is printed whole, so a character count here would be a
second measurement of someone else's file; the policy names the file, not its
length.

### The status strip is generated, not written

A component page — curated or package — describes its component but does not
decide whether that component is shipped. `src/components/docs/status-strip.tsx`
prints the `COMPONENTS.md` row — its status and its GPUix support verdict — above
the page, joined by the page title: `src/lib/inventory-status.ts` normalises
punctuation and a trailing plural, and names the few titles whose row reads
differently (`Text` → `Text / typography`, `Toast` → `Toasts / notifications`).
A title is not an identity, though: `@gpuixui/data` and `@gpuixui/files` each
ship a `PropertyPanel`, so both pages are titled `Property panels` and only the
address says which component a page is about. The strip therefore hands the join
its page's URL, and `pageRowsByUrl` pins the one page whose row its title cannot
name — the files panel's `Inspector panels` and `Property editors` rows, while
the data page keeps the `Property panels` row. The address also travels to the
index, so a tile cannot wear its neighbour's verdict.
The strip reads the inventory, so a row that moves to `done` moves on the page in
the same commit with no docs change. Both frames mount it, so the curated page a
reader lands on reports the same verdict as the package page the URL shadows —
the verdict is not left to the index tile alone.

A page the inventory has no row for renders no strip rather than a guess. The
argued exemption is `ThemeProvider`, a provider rather than a component, and
`inventory-status.test.ts` fails when a new page needs an entry, when an alias
names a row that is gone, when an alias reports the row its title already names,
when an exemption outlives its page, or when a title two rows could answer would
report the wrong verdict. `Grid` was the second exemption until its Tier 1 row
landed; the strip now reports it.

The same row marks the index row, because the strip is on a page the reader has
not opened yet. `src/lib/component-index-data.ts` resolves every page title
through that one alias table and `buildIndex` copies the two cells onto the
entry; `verdictMark` stays silent for `done` on `yes` and names each axis that
is not whole (`partial`, `todo · unknown`), so the list cannot wear a mark the
inventory does not support. The query indexes those words too, which is what
makes `partial` a way to find the components the runtime covers only in part.
`component-index.test.ts` holds the resolution, both axes and the silent case,
`component-index.test.tsx` holds the badge on the rendered rows, and
`component-page.test.ts` requires the index page to say what the mark means. The
query is not a dead end: a filter the composed lane cannot answer names the lower
lane that does hold it, with the matching pages linked, so typing a primitive's
name here finds the primitive.

Because the package writes Markdown and the site compiles MDX, the packages'
files must satisfy both: valid YAML frontmatter and no raw `<tag>` outside code.
`src/lib/package-docs.test.ts` holds that line, and a collection fails whole
when it is crossed.

## Theming: a preview paints the library's theme, not the site's

The site has its own identity (a neutral shadcn palette on `/docs` and the
landing's own vocabulary); the components have the library's tokens (iris). A
preview must show the latter, and it must follow the platform switch, the palette
switch and the look picker. All three are library values: the platform names
come from `platformStyles`, the palettes are the library's own light and dark
themes, and the looks are the authored `retroStyles` — Windows XP (Luna),
Windows 7 (Aero) and Omarchy — which are styles of the same shape, not a fifth
platform (the mission's toggle stays
macOS · Linux · Windows · Default, and the sidebar offers platforms only; the
look picker is the Theming page's own control, not a sidebar group). Each is
written to the URL (`?platform=…&mode=…&look=…`) so a link carries what the
reader saw.

The palette is the one axis a reader chooses to see a component in both themes:
the switch opens on the library's dark identity (`previewMode` in
`src/lib/platform.ts`) and `?mode=light` paints the light theme. What stays fixed
is the site's own light/dark mode — a preview does not follow the docs chrome's
theme, because a preview is a picture of the library and not of the site; the
palette axis is explicit, shareable and remembered, and `/docs/theming` prints
the mode a preview opens in rather than leaving a reader in light mode to wonder
why the previews did not change.

The site's own palette is the one thing that is not a library theme, so it is
held to the library's contract instead: `src/styles/app.css` declares the
Fumadocs variables once for `:root` and once for `.dark`, and
`src/lib/docs-theme.test.ts` measures the pairs a reader reads — body text,
secondary text, the label on every filled surface, error text — at the library's
own floors, plus the focus ring at the 3:1 boundary floor on the page, a card and
the sidebar. It found the light scheme's ring at 2.33:1, under the floor, and the
ring is now `#5c7a00` (4.65:1) in light while the dark scheme keeps the bright
lime at 8.03:1. The guard also fails when a colour is declared in one scheme and
not the other, so a scheme cannot silently inherit a variable from its sibling.

- `src/lib/theme-css.ts` is the one bridge: a `Theme` becomes CSS variables
  (`primaryForeground` → `--primary-foreground`, `radius.md` → `--radius`, both
  families, and the density's control heights and paddings). The theme editor
  and every preview use it.
- `src/components/docs/preview-surface.tsx` wraps a preview in `.gx-demo` and
  applies `toCssVars` of the **resolved platform theme** from
  `src/lib/platform.ts` (`platformTheme(themes.dark, platform)`, then the
  authored look over it when one is chosen), plus `data-platform` and
  `data-look` markers.
- `.gx-demo` is the **scene** a preview draws in and declares no variable, so it
  inherits whatever its surface wrote. `.gx-base` carries the dark theme's roles
  and its comfortable density as defaults for a scene with no surface above it —
  today only the landing's product window. Both classes used to be one: a demo's
  own scene root carries `gx-demo` too, so every scene inside a surface
  re-declared the dark theme and stopped following the platform switch.
  Measured in a headless browser on `/docs/components/checkbox` — the macOS
  surface's `--control-height-md` is `28px` and its scene read `32px`, the dark
  default, while `?platform=win32` read `32px` in both; with the split the macOS
  scene reads `28px` and Windows `32px`.
- `src/lib/theme-css.test.ts` holds the seam: every `var(--…)` a preview style
  sheet reads must exist in the bridge, the `.gx-base` defaults must equal
  `themes.dark` (colour roles and density alike), `.gx-demo` must declare no
  variable, every `gx-demo` element outside the landing's window must sit under a
  `PreviewSurface`, every control-shaped preview rule must take its height from a
  density variable, and no preview rule may carry a library colour literal. A preview therefore cannot drift from the
  tokens, and a wider platform variant — macOS compact, Linux spacious, Windows
  comfortable — repaints and re-sizes the site with no docs change.

The exception is the dashboard block: its `--dash-*` palette is its own, because
the landing renders the same markup in a light and a dark window. It is labelled
as a browser reproduction and is excluded from the literal guard.

The theme editor follows the switch too, with one difference: it stores only the
roles a reader changed and resolves those over `platformThemes(platform, look)`
for the mode on screen. Switching the platform therefore re-bases the editor's
preview and its inputs while the edits stay, and **Copy theme** prints the
resolved values — what a reader copies is what they saw. `theme-editor.test.tsx`
renders the same surface over the Windows style and fails if the colour inputs
still print the identity's roles; `theme-editor-logic.test.ts` holds the pins to
the base in both directions and keeps the persistence boundary (`parseState`)
rejecting a pinned value the renderer cannot paint.

The readout under the preview is the whole audit, not a contrast check: all fourteen
`auditTheme` reports are flattened into one list (`auditFindings`), each worded
for a reader, because a theme that paints a divider into itself, drops a `NaN`
radius, erases a disabled label, inverts a radius ladder or hides a chart series
is still broken and none of those is a text pair. The page prints the number as a
word derived from the gate's own keys, so a fifteenth report cannot land while
`/docs/themes` promises fourteen, and every report has a case in
`theme-editor-logic.test.ts` — the cases for the reports no contrast pair covers
also prove the colour reports stay silent on that brand, so only the new line can
fail the gate.

## The site's own keyboard path

The site documents keyboard contracts, so its own chrome carries one. A docs page
puts the whole sidebar before the page it documents, and without a bypass a
keyboard reader traverses every navigation link again on every navigation. The
root shell renders a **skip link** (`src/components/skip-link.tsx`) as its first
focusable element — before `RootProvider`, so it precedes the sidebar in tree
order — and the link targets `#gx-main`, the id every content surface carries:
the docs article, the landing's `<main>`, the live route and the 404. The docs
article also takes `tabIndex={-1}`, because a fragment navigation scrolls
without moving the keyboard's position unless the target can hold focus.

The link is off-screen at rest and shown on `:focus` by `.gx-skip-link` in
`src/styles/app.css`, painted from the site's own `--background`/`--ring` roles so
it reads in both docs schemes. `skip-link.test.tsx` holds both halves of the
contract — the shell order and every target surface — plus the two CSS rules and
this section, so a route added later cannot silently drop the target.

## The component page template

Every page in `content/docs/components/` follows this order. Sections that do not apply are omitted, not faked.

| Section | Contents |
| ------- | -------- |
| frontmatter | `title`, one-sentence `description` |
| preview | `<ComponentPreview name="…" />` |
| Installation | `<Install packageName importName />` + `<ComponentSource name file />` |
| Usage | one snippet a reader copies |
| Composition | a `text` tree of the parts, only for a compound component |
| API reference | tables: part → prop → type → default |
| Limitations | at most three one-line runtime facts |

The page is the sentence, the preview, the example, the API and the limits. A
rationale, a measured story or a section that restates the API belongs in the
commit or the source comment instead.

`src/lib/component-page.test.ts` checks every curated page for the required
sections and their order, a preview, and the package it installs from. It also
**resolves the API table**: every backticked name in a table's prop column must
be a prop an interface declares or a part an exported component declares, in
`packages/primitives`, `packages/components` or `packages/data`.

Resolution is one direction only — a name the page prints must exist. The same
guard holds the other direction: every prop the type a table documents
**declares** has a row. The type is not derivable from a part's name
(`ContextMenuItem` is `MenuItemProps`, `DialogTrigger` is `ButtonProps`), so the
suite carries a page → table → type map and reads each declaration through
`extends`, an alias intersection or union, and `Omit`, with the runtime's own
`Props` surface left opaque. The page's own package wins a shared name: `Field`
is two components called `FieldProps`, and `InputProps` is an alias of the
primitives package's field. A row may name several props at once
(`` `leading` / `trailing` ``, or a part's whole host surface on one line), which
is how the shared interaction and address props stay readable. A `Member` list —
`useTable`'s fields, which are values a hook returns rather than props a caller
passes — is the one table the completeness rule exempts, and the map says so.

The **Limitations** section has a shared half as well as a per-component one. A
page states what its own control does and cannot do; the runtime's ARIA budget —
the role-required rule, the attributes it publishes, the attributes it refuses
and the absent live region — is the cross-cutting contract on
`/docs/accessibility`, so a page does not have to restate the runtime in order
to be honest. `src/lib/accessibility-page.test.ts` holds that page's attribute
table and refused list to the capability record's row, so a runtime bump that
changes the budget fails the page rather than leaving it teaching the previous
release. `src/lib/aria-budget.test.ts` holds the record and every mounted page to
the installed `@gpuix/native` typings. `src/lib/package-page-template.test.ts`
holds every package page to its own `## API` and `## Limitations`.

The package's own pages are the component's doc file: a page that ships a demo
mounts it as a labelled browser approximation (strategy 3), a lane with no demo
shows none (strategy 4).

### The page's own file

The footer of every page — curated or package — names the Markdown that renders
it and links that file's GitHub edit view. It is not a template row an author
writes, for the same reason the related line and the status strip are not: the
site knows which collection served the page, so `src/lib/page-edit.ts` derives
the path from the page's `origin` and `path` and `src/components/docs/edit-page.tsx`
renders it. A curated page keeps its URL over the package page it shadows, so
`/docs/components/dialog` edits `apps/docs/content/docs/components/dialog.mdx`
rather than the package's displaced copy — a link to a file no reader's page
came from would send a contributor to edit the wrong page.

`page-edit.test.ts` walks the site's collection and every mounted package
collection, resolves each served page to a file, and fails on one that does not
exist; it also pins the two trees apart and the curated page to its own file.
`edit-page.test.tsx` holds the rendered href, the printed path and the frame's
mount. The floors are real — the site's own collection and every mounted package
collection carry a minimum page count — so a scan that stopped matching cannot
pass on an empty set.

## The getting-started page

`/docs/getting-started` is the one page that writes the code a reader copies
before they know the components, so it is held to the workspace rather than
reviewed by eye: `src/lib/getting-started.test.ts` resolves every
`@gpuixui/*` import to a symbol the package publishes, holds
`nub run dev:playground` to the root manifest, requires every numbered step to
link the page it depends on, and pairs each `useState` value with the table row
that says who owns it. It is not a component page: there is no preview, because
a whole screen drawn in the browser would be the approximation this file opens
by ruling out, and the runnable artefact is the snippet plus the playground
command.

## The lane pages

Three pages sit outside the component and block folders because they describe a
**composition lane**, not a single component: [Layouts](/docs/layouts),
[Workspace](/docs/workspace) and [Data display](/docs/data-display). They are
where a reader lands when the question is "how do I assemble these parts", so
they have their own contract.

| Section | Contents |
| ------- | -------- |
| frontmatter | `title`, one-sentence `description` |
| intro | what the lane is, and how much of it is unbuilt |
| The lane | `<LaneTable lane="…" />` — the generated inventory |
| What ships today | `<LanePages lane="…" />` — every page the lane's packages mount, generated from their collections |
| Today | the shipped pieces that compose the lane, each linked to its page, or a runnable composition preview |
| Gaps | the missing rows, each with its evidence and the strongest honest alternative |
| Where a change goes | which package owns the next change in the lane |

**The table is generated.** `src/lib/inventory.ts` parses the tier tables in
`COMPONENTS.md`; `<LaneTable>` renders the rows the lane names and prints "N
rows · N shipped · N to build" from the same parse. A lane page therefore cannot
call a row shipped while the inventory says `todo`, and a new inventory row
appears without a docs change. `src/lib/inventory.test.ts` holds the parse (a
malformed row is reported, not dropped), `lane-table.test.tsx` proves every row
reaches the rendered table, and `lane-page.test.ts` proves each page mounts its
table, names the inventory and sits in the sidebar.

**The page list is generated too.** The packages that fill a lane ship their own
pages, and a hand-written list of them had already lost three data pages and
every workspace package but the dock and shell: `<LanePages>` reads the same
component index the grid does, groups each lane's pages by the package that
ships them, and prints their descriptions. `src/components/docs/lane-pages.test.tsx`
walks the packages' docs folders independently and requires every page's link,
title and description in the rendered list, so a new page cannot arrive only in
the sidebar.

**No preview for a component that does not exist.** A lane preview is either a
shipped component (`<ComponentPreview>`) or a composition of shipped parts
(`<ComponentPreview>` with `composition: true`, which changes the note to "a
composition of native parts, not a new component"). A docking layout, a table or
a chart is described in prose and its gap is recorded — never drawn as if it
were shipped.

## The patterns page

[Patterns](/docs/patterns) is the one page that describes a **workflow** rather
than a component or a lane. A reader who knows what a Dialog is still has to
decide who owns `open`, what happens to the focus, and what they see when the
save fails; those answers cross components, so they cannot live on any single
component page. Each pattern is a section with:

| Part | Contents |
| ---- | -------- |
| heading | the pattern's title, in the page so the "On this page" list reaches it |
| `<Pattern>` | the situation, a parts table, the state owner, the ordered steps, the failure it prevents, and the runnable example |

**The parts table is generated from `src/lib/patterns.ts`**, and the guard is
what keeps it true: `patterns.test.ts` walks `content/docs` and every
`packages/*/docs` directory, requires each linked URL to be a page that exists,
and requires the named part to appear in that page's own text. A renamed part or
a moved page therefore fails the docs suite instead of leaving a confident link
to nothing. The example each pattern names must be a file the example registry
publishes (`packages/*/examples/*.example.tsx`), so "run this" cannot point at a
file that is gone.

**The chooser is data too.** `patternChoices` answers "which component?" with the
one to use and **when it is the wrong answer**, checked by the same guard, so the
table cannot recommend a component the library does not ship. It is the one place
the site compares components instead of documenting each in isolation.

**No workflow preview.** A pattern is native behaviour with state, timing and
failure paths, and the site has no native surface — so a pattern shows the real
source file and the component pages' limitations rather than a drawing of a
conversation that only works in the browser. That is strategy 4 from the top of
this file, chosen for the same reason the package pages use it.

## Examples: source, never a rendering

Every package ships a worked example beside its components — a screen that owns
its state, not a gallery of props — and `/docs/examples` lists all of them. The
page shows each file's source and the summary the file writes in its own header.
It does **not** render the example: a GPUix screen drawn in the DOM would be the
approximation this strategy warns about, with no component page to anchor it, and
the file a reader copies is the stronger artefact. `examples.test.ts` holds the
registry to the files on disk in both directions, so a new example appears
without a docs change and a deleted one leaves no dead row.

The link runs the other way too. A page that an example owns carries a
**Worked example** strip under its title (`page-example.tsx`), generated from the
same registry, pointing at the row's own fragment — `<package>-<id>`, so
`/docs/examples#components-card`. The fragment is the file's package and id
rather than the page title, because two packages ship a `form` and a retitled
page would otherwise move the anchor. A grouped example owns no single page, so
no component page claims it, and a page with no example renders no strip rather
than borrowing one. `page-example.test.tsx` proves the href is the rendered row's
anchor, that every owned page resolves, and that a page with no row stays empty.

## Generated specimens

A preview whose content *is* the tokens is generated, not drawn. The typography
page's `<TypeScale>` enumerates the theme's text roles, prints each resolved
`size/leading · weight` and paints the specimen at those metrics on a
`PreviewSurface`, so the platform switch changes the families while the sizes
stay the theme's. `type-scale.test.tsx` holds the role list to
`themes.dark.typography` and checks every row's metrics against the theme, so a
role added to `@gpuixui/tokens` fails the docs until the page describes it.

`<TokenScales>` on [Theming](/docs/theming#scales) follows the same rule for the
geometry: the spacing, radius, border, icon and density rows are read from the
theme the platform switch resolves, and `token-scales.test.tsx` holds every step
and its printed pixel value to the theme, the elevation list to the theme's
levels, and the density table to the presets. A step added to the token package
therefore appears without a docs change, and a step removed fails the suite.

## Adding a preview

1. Add the rendering and its `source` string to `src/components/docs/demos.tsx`
   (or `blocks.tsx` for a page-level recipe). Use only classes that exist in
   `demos.css`, and colour roles through variables — never a hex.
2. Reference it from the page with `<ComponentPreview name="…" />`. The name is
   the demo key; a wrong key throws at render instead of drawing nothing.
3. If the demo's state changes (open, selected, loading), give it a real
   interaction path in the demo rather than a static picture of the end state.
4. If the component publishes a pure logic subpath (`@gpuixui/media/crop/logic`,
   `@gpuixui/editor/search/logic`, …), run **that** logic in the demo rather
   than copying it: the paint is the browser's approximation, the arithmetic is
   the package's. The media and editor demos are the worked examples.
5. Run `nub run --filter @gpuixui/docs test` — the style-sheet guards fail on a
   hardcoded colour or an unknown variable.
6. Run `nub run --filter @gpuixui/docs build` before pushing: an SSR-only error
   in a preview (a missing provider) shows up here, not in `vitest`.

## Block pages

A block is a page-level recipe: a browser reproduction of the composition plus
the real `@gpuixui/*` source. Each page mounts its reproduction by registry key
(`<BlockPreview name="dashboard-01" />`), and `src/lib/block-page.test.ts` holds
the two inventories together in both directions — a page naming an unregistered
key throws at render, and a registered block with no page is dead code — plus the
blueprint sidebar entry.

A block that draws must state the runtime's measured rule, not a browser one: one
`<svg source>` paints **one tint** (a shape's own `fill` never reaches the
frame), so a multi-series chart is one stacked element per colour. The dashboard
page teaches that and its recipe composes `@gpuixui/data`'s charts, which do the
stacking themselves — the page links their own docs page rather than
reimplementing the geometry; the evidence is `docs/gpuix-capabilities.md`
§Inline SVG painting.

**A block's source is code too.** A recipe is a `source` string in
`src/components/docs/blocks.tsx`, not a fence, so the page-snippet walk never
read it: a renamed export would leave every block's Code tab teaching an import
that no longer resolves while the build stayed green. `src/lib/block-source.test.ts`
walks the registry instead — it resolves each block's `source` through the
workspace symbol index, follows a constant the registry imports from another
module (the dashboard's lives in `dashboard.tsx`), and fails a block whose source
is nearly empty, because a Code tab that prints nothing is the same lie as a
wrong import. Directions measured: `Input` → `Inputt` in `loginSource` fails
`login-01: @gpuixui/primitives does not export Inputt`, and emptying that
constant fails the near-empty case.

## The examples page

`/docs/examples` is the registry of the worked examples the packages ship. It is
generated from `packages/*/examples/*.example.tsx` — one row per file — so it
cannot advertise an example that does not exist, and a new file appears with no
docs change.

Three rules keep the rows honest:

- **The summary is the file's own.** Every example opens with a
  `<Name> example: <what it shows>.` header; the row prints the half after the
  colon. A page therefore cannot describe an example differently from the file
  it links. `examples.test.ts` holds each summary to its file, and fails on an
  unmounted file, a dead link or a grouped row sent to a guessed page.
- **A row links to the page that owns it, or to the lane.** An exact page name
  wins; a sole page that extends the id is accepted (`otp` → `otp-field`); an
  ambiguous match is not guessed, it points at the lane index and says the
  example is grouped.
- **The source is read, never rendered.** These are GPUix modules. The page
  shows the source behind a labelled toggle and says so in prose; a browser
  rendering would be the fake preview this file opens by ruling out. The source
  is absent from the first paint (`examples-index.test.tsx`), because a reader
  should not pay for fifty code blocks to scan the list.

The page also names how the examples are run today: the primitives package
mounts all of its examples in `runtime/examples.runtime.test.tsx`, and the
components' registry runs through the playground's `examples-mount` scenario,
which pages through every entry one screen at a time and reads the result back
from the renderer. Both commands are resolved to the workspace manifest and the
scenario registry on disk by `examples-page.test.ts`, and that guard also holds
this file to the command the page prints — so the policy cannot promise a
registry that is gone, or deny one that exists. The scenario's checks and
negative controls are in `apps/playground/README.md` §The example gallery.

## A page's claims about the runtime

`src/lib/runtime-version.test.ts` reads the pin from the workspace catalogue and
fails any page under `content/docs` that names another version, in prose or in a
code block.

The runtime's `aria-*` set is closed — `role` plus seven attributes — and the
capability record in `docs/gpuix-capabilities.md` is where it is stated.
`src/lib/aria-budget.test.ts` reads that row beside the installed
`@gpuix/native` typings, so a bump that publishes an eighth attribute fails the
record; it then reads every curated page's `## Limitations`, so the same bump
fails the page that would still tell a reader the control cannot announce it.
`/docs/accessibility` prints the set and `accessibility-page.test.ts` holds it to
the record.

## The reference page is generated, and it says so

`/docs/reference` is the one page that claims to be the workspace's whole
public surface, so it is generated twice over and held to both sources.

- **Entry points** come from the packages' `exports` maps
  (`src/lib/public-api.ts`): the specifier a consumer may import and the file
  it resolves to.
- **Symbols** come from the source behind them. A Vite plugin
  (`apps/docs/plugins/public-symbols-plugin.ts`) reads the workspace once at
  build time and serves an index of every published name, its kind, the file
  that declares it and its doc comment. The browser bundle carries the index,
  not the two megabytes of TypeScript it came from.

Three rules keep that honest:

- **A page that needs something heavy imports it itself.** The shared MDX
  surface (`apps/docs/src/components/mdx.tsx`) holds the small components; the
  reference page imports `ApiReference` directly, so the symbol index travels
  with that page's chunk instead of with every page on the site.
- **The index is read at build time, so it is as fresh as the build.** A new
  export appears on the next build rather than the next edit — the price of not
  shipping the workspace source to every reader.
- **A symbol links the page its file ships with.** `docsUrlFor` maps the
  declaring module to the page named after it (`IconButton.tsx` →
  `/docs/primitives/icon-button`, acronyms included) and returns nothing unless
  the site mounts that page, so a helper or a package with no docs collection
  keeps its plain name and module path rather than a link to a 404.
  `api-reference.test.tsx` holds every rendered link to the mounted page list and
  `public-symbols.test.ts` the mapping's refusals.

`src/lib/public-symbols-source.ts` does the reading. It scans a module's export
statements the way the compiler sees them — an `export` inside a comment, a
string or a template literal is not an export, and a statement that spans lines
is one export — follows the re-exports, and resolves each name to the module
that declares it. `public-symbols.test.ts` holds it to the workspace in both
directions: every published module yields the symbols its source declares, and
the scanner's rules are pinned by fixtures that fail when a form is missed.

## The testing page

[Testing](/docs/testing) documents `@gpuixui/testing`. Its snippets are held to
the packages' published symbols by `src/lib/page-snippets.test.ts`, like every
other page's.

