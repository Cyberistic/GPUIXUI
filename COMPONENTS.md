# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## Design system

| Capability | Status | GPUix support | Notes / limitations |
| ---------- | ------ | ------------- | ------------------- |
| Design tokens | wip | yes (inline style values) | 62 semantic roles, 10 type roles, spacing/radii/density/elevation/icon+avatar sizes; light + dark; `colorRoles` and `textRoles` index the colour and type roles and `densityNames` the density presets for generated doc tables; selection applies through the inherited `selectionColor` (`selectionStyle`), and `scrollbar` is reserved because 0.10.0 exposes no `scrollbarColor`/`scrollbarWidth`; elevation levels are geometry plus an alpha composed with the single `shadow` tint (`elevationShadow`, and `elevationShadows` for a compositing renderer), so a brand retints every level by editing one role (plan 085); WCAG floors in the test suite, including the selected secondary text, the wash's own perceivability (plan 087) and every interactive fill on the panel it paints on (plan 309), and `docs/tokens.md` and `docs/design-system.md` are both held to the implementation by `docs.test.ts`, including every value table, the palette ramps and the ratios and selection-wash percentages those pages quote in prose (plan 075), and it also fails if any value export is missing from the reference page and holds the design-system's platform-family sentence and icon-gap rule; the package README is held by `readme.test.ts`, including an install path that matches the manifest's `private` flag (plan 070). Native visual proof is the playground's theme gallery (plan 150): `colorRoles` and every type role are painted and asserted against the runtime's own `paintedStyle` across dark/light/high-contrast dark, 14/14 green. The gallery asserts each type role's size and family; leading and weight are not yet asserted, and the retained `style` it reads cannot prove them (a cross-team row tracks a bounds-based check). The gallery last ran against an earlier, smaller role set; every current role rides the same `colorRoles` loop, and the newest roles are covered by the contrast test. The soft status surfaces were re-tinted so they stay perceivable (1.05:1) on every shipped platform canvas, not just the identity's (plan 076); the loading skeleton is held to the same floor on the `muted` panel and the `hover`/`active`/`selected` washes a loading row paints, and each dark platform style carries its own value so a placeholder never disappears into its card or a pressed row (plans 078 and 094); and secondary text is checked on the `hover`/`active`/`accent`/`selected` washes a row paints behind it, which caught macOS dark at 4.41:1 and 3.55:1 (plan 079); status text is checked on the same washes, which caught a warning label in a pressed row at 4.22–4.36:1 on the light platform styles (plan 083); the functional control boundary is checked on the `muted` panel and those washes, which caught six sets at 2.52–2.97:1 and high-contrast dark at 4.15:1 (plan 084), and on the four soft status fills, which caught the identity dark edge at 2.77–2.97:1 (plan 092); and the decorative `border` is checked on the `secondary`/`hover`/`active`/`accent` fills a bordered control paints, which caught four sets where the edge equalled the fill at 1.00:1 (plan 080), and on the four soft status fills a status panel divides, which caught the inherited dark `successSoft` at 1.015–1.047:1 (plan 095); and brand-toned text has its own role, `primaryText`, because `primary` is a fill — macOS light measured 4.21:1 on its canvas and macOS dark 2.84:1 on `active` while every suite stayed green (plan 082); and the six filled-control state roles — `primary`/`secondary`/`destructive` at rest, hover and press — are designed, platform-specific, contrast-checked fills, so a state is never an alpha composite over the backdrop (plan 097); and the inactive state is measured rather than exempt — `disabledForeground` holds a 3:1 design floor (4.5:1 at AAA) on its fill, the plain surfaces and the row washes, and a disabled control paints its `border` edge on the `disabled` fill so its shape survives on a quiet panel (plan 306); and the placeholder is measured on the `input` fill and on the four `Surface` tones a transparent field sits on, after identity dark measured 4.03:1 on the quiet panel and the floating surface (plan 317). |
| Theme extension | done | yes (theme switch is a re-render) | `createTheme` / `extendTheme` / `ThemeProvider`, plus `isPlatformName` / `isThemeMode` / `isThemeContrast` / `isDensityName` / `isStatusTone` / `isControlSize` for an unknown choice or payload, so a consumer never retypes a union; `themeModes` / `themeContrasts` are the ordered indexes beside those guards, so a settings row or docs toggle cannot omit a member (plan 305); a theme carries its `contrast` declaration beside its `mode`, and `applyPlatformStyle` / `themeContrastFailures` default to it (plan 073). `createTheme({ mode, contrast })` selects the built-in variant through `getTheme`, so `contrast: "high"` builds on the AAA palette instead of relabelling the default one, and the builder has no claim path — only `extendTheme` declares a level (plan 304). `density` accepts a preset name or metrics that merge size by size, so one control height can move without retyping the other two (plan 089). Docs in `docs/tokens.md`. The provider unit test is a server render; the playground gallery wraps its views in `ThemeProvider` and switches dark → light → high-contrast natively, asserting that each repaint carries the new role values (plan 150). The React entry carries no JSX, so a GPUix consumer needs no jsx-runtime path shim (plan 061). The executed brand example moves the whole primary family — fill, foreground, hover, pressed and text — and is held to `themeContrastFailures`, so the documented template cannot ship below a floor (plan 098). `applyPlatformStyle` declares the level of the palette it carries — naming `"default"` on an AAA base returns a `default` theme instead of claiming floors it misses, while the no-argument call and a shape-only style keep the base's level (plan 301). |
| High-contrast theme | done | yes (values in a `Theme`) | AAA text floors (7:1) and 4.5:1 boundaries; same 62 roles; `getTheme(mode, "high")` or `createTheme({ mode, contrast: "high" })`; each variant declares `contrast: "high"`, so the checks that read a theme default to its own floors; contrast test covers both variants. On the pure black AAA dark canvas a dark scrim cannot darken, so `overlay` veils with light (`#FFFFFF26`, 1.388:1 on the canvas) instead of the invisible `#000000CC` (plan 099). Docs in `docs/tokens.md`. |
| Theme contrast check | done | yes (values in a `Theme`) | `themeContrastFailures(theme, contrast = theme.contrast)` returns every documented pair an edited theme misses — the same 252 contrast pairs, 18 selection pairs, 4 soft-selection text pairs, 9 wash pairs, 4 soft wash pairs, 4 scrim pairs and floor table (7 / 4.5 / 3 / 3 / 1.05 / 1.05 default, 7 / 7 / 4.5 / 4.5 / 1.05 / 3 high contrast) that `color.test.ts` and `platforms.test.ts` enforce, so a copied platform style or brand theme gets the library's guarantee in one assertion. The default is the level the theme declares (plan 073), so a high-contrast theme is checked at 7:1 without a second argument. `contrastRatio`, `compositeOver`, `contrastPairs` and `contrastFloors` expose the parts; the selection wash is measured composited over `background` and `card`, the focus ring on the `hover`/`active`/`selected` washes a focused row paints, status text and the control boundary on `popover` (plan 074), and the soft status surfaces on `background`/`card`/`popover`/`muted`, the loading skeleton and decorative dividers on `background`/`card`/`popover` (plans 076 and 078), and an unparseable role is reported (`NaN`) rather than skipped. Plan 080 closed the decorative divider on the fills a bordered control paints: an outlined control keeps its `border` edge while the fill becomes `secondary`, `hover`, `active` or `accent`, and four shipped sets had the edge equal to the fill (1.00:1), so the edge vanished exactly while pressed — identity light `active`, identity dark `secondary`/`active`/`accent`, macOS dark `hover`/`secondary`/`accent`, and high-contrast dark `active` (2.53:1). The four fills join the `divider` class (70 → 74) and the four dividers moved (`#D6DAE1`, `#343B47`, `#48484A`, `#8A8A8A`), held by `control-edge.test.ts` and the generic loops. Plan 081 closed the selection wash: it was measured on `background` and `card` only, so the nine surfaces a selected glyph actually paints on are `selectionPairs` now — body text on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input` at 7:1, and `selectedForeground` on `selected` at the secondary floor. The audit found high-contrast dark at 6.48:1 on `hover` and 5.49:1 on `active`, Linux dark at 6.92:1 and Windows dark at 6.84:1 on `active`; the three dark wash bases moved to a darker tint of the same accent (`#4C39B54D`, `#1C71D833`, `#0067C033`) with their alpha unchanged, held by `selection-text.test.ts`. Plan 076 fixed the defect the missing surface pairs hid: platform styles changed the canvas but inherited the identity's soft tints, leaving nine pairs below 1.05:1 (Linux dark's `destructiveSoft` measured 1.005:1 on its card). Plan 078 fixed the same defect for the loading skeleton — Linux dark measured 1.004:1 on its own card — so both the soft surfaces and the skeleton are now checked on every variant's own canvas. Plan 079 closed the last painted text surface: secondary text (`mutedForeground`) is painted inside rows whose background changes with state, but the list measured it only on the plain surfaces — macOS dark's row descriptions sat at 4.41:1 on `hover` and 3.55:1 on `active`. The four washes (`hover`, `active`, `accent`, `selected`) are `secondary` pairs now (66 → 70), and the variant's secondary grey and pressed wash moved, so `state-text.test.ts` and the generic platform loop hold them. Plan 082 closed the last role the list measured only as a fill: `primary` is painted as text by the Link variant and the `primary` text tone, but only `primaryForeground` on the fill was ever measured — macOS light measured 4.21:1 on the canvas and 3.44:1 on the pressed wash, macOS dark 3.82:1 on card/popover and 2.84:1 on `active`, Linux light 3.51:1, Linux dark 4.08:1, Windows light 4.30:1, and high-contrast dark 6.94:1 under the AAA floor. A 54th role, `primaryText`, is the readable tonality on the six surfaces a link paints (`background`, `card`, `popover`, `muted`, `hover`, `active`), so the pair list moves 74 → 80 and every platform style carries its own readable step, held by `primary-text.test.ts`. Plan 083 closed the last foreground the list measured only on plain surfaces: status text (`xText`) is painted by labels and indicator dots inside list, table and menu rows, which sit on the `hover`/`active`/`accent`/`selected` wash. Every light set had a warning label below the 4.5:1 floor on the pressed wash — macOS 4.22:1, Linux 4.24:1, Windows 4.36:1 — and high-contrast light measured 5.83:1 on `active` and 6.70:1 on `accent`/`selected` under the AAA 7:1 floor; the four tones join the four washes (80 → 96 pairs) and the two warning steps move (light `#8E5B00` → `#6B4500`, high-contrast light `#6B4500` → `#4B3100`), held by `status-text.test.ts`. Plan 084 closed the functional boundary on the surfaces a bounded control actually sits on: `borderStrong` is the edge of a field and of an unchecked checkbox or radio, which paint on the `muted` panel that groups settings and inside rows whose fill changes with hover, press, accent and selection. Six shipped sets were under the non-text floor there — identity light 2.62:1 on `active` (2.92 on the other four), macOS light 2.52:1, identity dark 2.80–2.81, Linux dark 2.97 on `selected`, high-contrast dark 4.15:1 under 4.5 — so the five surfaces join the `boundary` class (96 → 101 pairs) and five values move one step (identity light `#848E9E` → `#737C8C`, identity dark `#6B7484` → `#77808F`, high-contrast dark `#A0A0A0` → `#AAAAAA`, macOS light `#8A8A8E` → `#6E6E73`, Linux dark `#9A9996` → `#A09F9C`), held by `control-boundary.test.ts`. Plan 086 makes the contract total: the focus ring is measured on the `muted` panel and the `accent` wash a focused control can sit on as well as the plain surfaces and the three state washes (101 → 103 pairs), and a completeness suite fails when a colour role is neither measured by a pair nor on the exemption list recorded in `contrast.test.ts` (plan `099` removed `overlay` from it when the scrim became a measured wash), held by `ring-surfaces.test.ts` and `contrast.test.ts`. Plan 087 closes the selection wash's second text role and the wash's own perceivability: `mutedForeground` joins `selectionPairs` on all nine surfaces (9 → 18 pairs) and `selectionWashPairs` holds the wash to 1.05:1 on each (nine pairs), after seven shipped sets measured 3.49–4.10:1 for selected secondary text; seven `mutedForeground` values move one step away from the canvas. Accent-toned text under a wash stays a documented omission. Plan 088 measures default body text on the quiet panel and the floating surface — an avatar fallback's initials on `muted` and a date picker's month header on `popover` — after both painted in shipped components while the contract measured `foreground` only on the canvas, card and two washes; both pairs pass in all ten shipped sets, so no value moves. Plan 312 measures the default label of a row on the washes the row paints: a selected list title is `foreground` on `selected` (`ListItemTitle` overrides the row's inherited `selectedForeground`), a hovered selectable row is `foreground` on `accent`, a selected row under the pointer keeps `selectedForeground` on `hover`/`active`, and a menu row is `popoverForeground` on `hover`/`active`; the field edge (`border` on `input`) joins the same contract (232 → 239 pairs). All ten shipped sets pass (7.47:1 at the tightest), so no colour moves. Plan 316 adds the `accent` wash a selectable row hovers for the selected row's inherited `selectedForeground` label — plan 312 had documented that fill but measured only `hover`/`active` — so the contract moves 247 → 248 with no colour change (5.81:1 at the tightest). Docs in `docs/tokens.md`; tests in `contrast.test.ts`, `body-text-surfaces.test.ts`, `control-boundary.test.ts`, `control-boundary-soft.test.ts`, `ring-soft.test.ts`, `skeleton-washes.test.ts`, `soft-divider.test.ts`, `control-edge.test.ts`, `primary-text.test.ts`, `selection-secondary.test.ts`, `selection-text.test.ts`, `state-text.test.ts`, `status-soft-border.test.ts` and `status-text.test.ts`. Plan 090 gives the soft status edge a role, `xSoftBorder` (54 → 58 roles): `statusTone(...).border` was a 30% alpha mixture recomputed at runtime, so it was uneditable in a copied style and unmeasured — the high-contrast light `warning` edge measured 1.12:1 on its own fill, under the 3:1 divider floor. The four edges join the `divider` class on their own fills (105 → 109 pairs); the default sets keep today's pixels exactly, and the AAA sets take a designed ramp step (4.41:1 at the lowest). Plan 091 closes the selection wash inside a soft status surface: an Alert's text is selectable, but the four soft fills were not among the selection surfaces — identity light `successSoftForeground` measured 5.83:1 through the wash and Windows dark's wash over `destructiveSoft` 1.005:1. `selectionSoftPairs` and `selectionSoftWashPairs` join the checker (4 + 4 pairs), the light soft foregrounds move one family step darker, the dark ones one step lighter with a 20% identity wash, Windows dark's wash moves to 40% and Linux dark's soft destructive fill to `#3A0B0D`. Plan 092 closes the control boundary inside a soft status surface: an Alert or Toast carries actions — a field, a don't-show-again checkbox — so `borderStrong` is painted on `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`, which the contract never measured. Identity dark's edge measured 2.77:1 on `successSoft`, 2.94:1 on `destructiveSoft` and 2.97:1 on `infoSoft` under the 3:1 floor while every other shipped set cleared it; the four fills join the `boundary` class (109 → 113 pairs), identity dark `borderStrong` moves one half-step to `#868FA0`, and the focus ring on the same four fills follows in plan 093. Plan 093 closes it: a Toast's action button is focused while it sits on `warningSoft` or `destructiveSoft`, but `ring` was measured on the eight surfaces a control normally sits on. Every shipped variant already clears the floor (identity light `destructiveSoft` at 3.18:1 is the tightest after plan 300 moved the soft tints), so no colour moves; `ringSoftPairs` adds the four fills to the `boundary` class (113 → 117 pairs). Plan 094 closes the loading skeleton on the surfaces a loading row paints: the placeholder was measured on `background`, `card` and `popover` only, but skeleton rows are hovered, pressed and selected and also sit on the `muted` panel. Seventeen shipped pairs were under 1.05:1, ten exactly 1.000:1 — the identity and high-contrast skeletons *were* the `active` fill — so the four surfaces join the `surface` class (117 → 121 pairs) and seven skeletons move one ramp step, held by `skeleton-washes.test.ts`. Plan 095 closes the decorative divider on the soft status fills: a status panel separates a footer or an action row with a line, but `border` was measured on the plain surfaces and the control fills only — the inherited dark `successSoft` measured 1.015:1 on Windows, 1.023:1 on the identity and 1.047:1 on Linux, and identity dark's `destructiveSoft` 1.040:1, under the 1.05:1 divider floor. The four fills join the `divider` class (121 → 125 pairs) and the two dark soft fills move one step darker, still clearing the surface floor on every canvas; held by `soft-divider.test.ts`. Plan 097 measures the six filled-control steps with their on-colour foreground, so hover and press are part of the same contract (125 → 129 pairs). Plan 099 measures the modal scrim: `overlayWashPairs` composites `overlay` over `background`/`card`/`muted`/`popover` at the 1.05:1 surface floor (four pairs, reported with `wash: "overlay"`), and `overlay` leaves the exemption list — high-contrast dark's `#000000CC` measured **1.000:1** on its own pure black canvas, so the AAA dark theme veils with `#FFFFFF26` while every other shipped scrim keeps its pixels; held by `overlay-scrim.test.ts`. Plan 300 closes plan 076's defect one surface over: the soft status tints were checked on the canvas, card and popover but not the quiet `muted` panel a sidebar paints, so the platform light variants — which change `muted` and inherit the tints — shipped a sidebar badge at 1.023:1 on Linux, 1.036:1 on macOS and 1.043:1 on Windows. `muted` joins the surface pairs (129 → 133) and the four light tints move one small step (`#DEE9FF` → `#D6E3FF`, `#C2F4D6` → `#B8EDCE`, `#FFE3A3` → `#FFDF9A`, `#FFE0E0` → `#FFD6D6`), clearing the darkest quiet panel at 1.081–1.111 while keeping the soft text (≥9.87:1) and edge (≥1.096:1) floors; held by `soft-quiet-panel.test.ts`. Plan 306 measures the inactive state the contract exempted wholesale: a disabled `Select` item painted `disabledForeground` on the menu's `popover` with no fill behind it — 1.99:1 on Linux dark, 2.09:1 on the identity — while the designed pair itself measured 2.09:1 and `disabled` was the very value of `muted`/`hover`. `inactive` is a new pair class at 3:1 (4.5:1 at AAA) over thirteen surfaces (`inactivePairs`/`inactiveSurfaces`: the `disabled` fill, the four plain surfaces, the four row washes and the four soft status fills a disabled action sits on, `inactiveSoftPairs`), the three inactive values move (`#6E7787` light, `#A1A9B7` dark, `#A9A9A9` AAA dark; AAA light already cleared), and `border` on `disabled` plus the previously unmeasured `border` on `muted` join the divider class (133 → 144 pairs, and `inactiveSoftPairs` takes it to 148), so a disabled control keeps its shape on any panel; the `disabled` fill is measured as a surface, `disabledForeground` leaves the exemption list, and the consumer migration off `opacity: 0.5` is a cross-team row. Plan 308 closes the edge plan 300 left unmeasured: a soft chip is bounded by its designed `xSoftBorder`, but the edge was measured only on its own fill, so the macOS light edge measured 1.036:1 and the Linux light one 1.042:1 on their own pressed washes — with the fill also at 1.00–1.04:1, a warning Badge in a pressed row had no visible boundary. The four edges are `divider` pairs on the eight surfaces a chip sits on (`softBorderSurfacePairs`, 148 → 180 pairs) and the identity light warning edge moves one step (`#FCD47B` → `#EFC055`); held by `soft-edge-surfaces.test.ts`. Plan 309 measures every interactive fill as a surface: `stateFillSurfacePairs` holds the two washes, `accent`, `selected` and the `primary`/`secondary`/`destructive` families at rest, hover and press to 1.05:1 on `background`, `card`, `popover` and the quiet `muted` panel (52 pairs, 180 → 232). The audit found 21 shipped pairs below the floor — the identity light `muted`, `hover` and `secondary` were the same value, the identity dark `hover` was its `muted` and `popover`, macOS light `selected` was 1.021:1 on its canvas, Linux light `accent` 1.001:1 on the panel and the AAA dark `accent` 1.034:1 — so the light quiet panel moves one step toward the card (identity `#FBFCFD`, macOS `#F7F7FA`, Linux `#FBFBFA`, Windows `#F7F7F7`), the two light accents and the AAA dark `accent`/`selected` move one designed step, and the identity dark `hover` becomes a step between the panel and the press; held by `state-fill-surfaces.test.ts`. Plan 314 closes the last three compositions those lists missed: a selected `Select` option paints `popoverForeground` on `selected` (`selectItemStyle`), a status label or dot in a sidebar paints `xText` on the quiet `muted` panel, and a `primaryText` link nested in a selectable row paints on `accent`/`selected`; every shipped set passes (4.53:1 at the tightest), so no colour moves, and the pairs take the contract from 239 to 246. Plan 315 measures typed text on the `background` canvas a transparent field paints — SearchInput, InlineEdit, ColorPicker, TagInput and MentionInput all paint an input there — so 246 → 247; every shipped set passes, so no colour moves. Plan 317 measures the placeholder on that canvas and on the `card`, `popover` and `muted` surfaces a transparent field can sit on, not just the `input` fill: the identity dark `#7C8595` measured 4.03:1 on the quiet panel and the floating surface and the `default` platform plus the XP and Aero dark recipes inherit it, so the four `Surface` tones join the contract (248 → 252) and identity dark moves one designed step to `#858F9F`; a field on a row wash and a disabled field are documented as out of scope, the latter because it reads `disabledForeground` (plan 306). |
| Status tones | done | yes (values in a `Theme`) | Three tonalities per family — solid fill with `xForeground`, soft `xSoft`/`xSoftForeground`, and `xText` for labels, icons and dots on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` state washes; `info` plus the soft pairs, and `statusTone(theme, tone)` returns all four; `alpha(color, amount)`; the contrast test holds soft text and status text on every documented surface to their floors in all four colour sets. The solid fills are surfaces, not foregrounds: light `warning` is 1.78:1 on the canvas, so `xText` carries status text. The soft surface is held to 1.05:1 against `background`, `card`, `popover` and the `muted` quiet panel (plans 076 and 300), so an Alert or Toast never disappears into a platform canvas or a sidebar. Docs in `docs/tokens.md`. |
| Filled control states | done | yes (values in a `Theme`) | Six designed roles complete one matrix: `primaryHover`/`primaryActive`, `secondaryHover`/`secondaryActive` and `destructiveHover`/`destructiveActive`. They are opaque, platform-specific, contrast-checked fills, so a filled control never composites an alpha colour over the surface behind it. Before plan 097 only the two brand hovers existed: `primary`/`secondary`/`destructive` hovered at `alpha(fill, 0.9)` and pressed at `alpha(fill, 0.8)`, which moved the fill *toward* its backdrop — the light primary's hover measured lighter than its resting fill and its press lighter still, and the neutral `secondary` fill's hover moved 1.009:1 (1–2 RGB). Each family now steps `x` → `xHover` → `xActive`, away from the canvas in both modes; `filled-states.test.ts` proves the direction, the 1.05:1 step floor and the on-colour floor on every identity and platform theme, and every real platform style carries its own primary and neutral steps. The generic `hover`/`active` roles remain the washes for ghost and outline controls. Docs in `docs/tokens.md`. |
| Motion tokens | done | yes (motion props only: `width`, `height`, `opacity`, `top`/`right`/`bottom`/`left`, `borderRadius`) | `theme.motion` holds six millisecond levels (`none`, `step`, `fast`, `normal`, `slow`, `pulse`) and four easings (`standard`, `enter`, `exit`, `linear`); `motionTransition` converts to the runtime's seconds. Replaces the `120`/`700` literals in `primitives`. No `transition`/`animation`/`transform` and no reduced-motion query — a theme overrides the levels to `0`. Docs in `docs/tokens.md`. |
| Focus state | done | yes (a zero-blur spread `boxShadow`) | `focusRing(theme)` returns `{ boxShadow }` with zero offset, zero blur and `spreadRadius = borderWidth.strong`. GPUix 0.10.0 has no `outline*` and no `focusVisible`, so a mouse press shows the ring; overlay/menu animation is unavailable. Docs in `docs/tokens.md`; plan 017 corrected the earlier claim that the runtime supports outlines. |
| Density, type and spacing scales | done | yes | Pure values with no runtime dependency; consumed by primitives/components as they land. |
| Platform style variants | done | yes (values in a `Theme`) | Four shipped variants — macOS, Linux, Windows and Default — in `platformStyles`, one editable file per platform under `src/platform-styles/`; `getPlatformTheme(platform, mode, contrast?)` derives a real theme. Default returns the identity unchanged; macOS/Linux/Windows change families, radii, density, motion, surfaces (including their own dark `skeleton`), accent and shadows. High contrast keeps the AAA colour set and applies only families and shape: `applyPlatformStyle` defaults to the level the base declares (plan 073), so a copied style keeps the AAA palette without a third argument, and the skeleton inherits the identity's AAA value. `docs.test.ts` guards the platform table; `platforms.test.ts` proves the variants are distinct and holds each to the identity's contrast floors (plan 063), including the soft status surfaces and skeleton on the variant's own canvas (plans 076 and 078). The playground gallery asserts every type role (plan 150); a visual per-platform comparison is still open. The copy-and-own examples (`resolveEditedPlatformTheme`, `contosoPlatformStyle`) move the whole Contoso primary family and are held to `themeContrastFailures` in both modes, after the documented platform snippet inherited the Windows black foreground and measured 2.96:1 on its fill (plan 310). `platformTheme(base, platform)` remains as the deprecated families-only bridge for the primitives workstream (plan 302); `getPlatformTheme` is the API new code uses. Two recipes — Windows XP (Luna) and Windows 7 (Aero) — ship in `platformRecipes` as editable `PlatformStyle` data, resolved by `getPlatformRecipeTheme` and held to the contrast contract in both modes (plan 311); they are editions of the Windows variant, not a fifth platform, and the docs label the dark halves as interpretations and Aero's glass as a solid-surface approximation. |
| Font registration | unsupported (evidence) | no (unreleased in 0.10.0) | `registerFont` loads `.ttf`/`.otf` bytes under the family in the font's name table, but `@gpuix/native@0.10.0`'s `GpuixRenderer` does not declare it and `useGpuixRequired()` returns that class; it exists only as an unreleased minor changeset on `references/gpuix` main (`515df19`, `.changeset/register-font.md`). Strongest honest alternative: name an **installed** family with `extendTheme(base, { typography: { sans } })`. Plan 052 holds an idempotent `registerFonts` design, ready for the release that exposes it; no font is bundled and `LICENSES/` has no font entry. |
| Native theme gallery | done | yes | `apps/playground` (plan 150): `theme-color-roles` and `theme-type-and-shadow` paint every role and type style and assert the runtime's `paintedStyle`; the suite is 14/14 green. Owner: playground workstream. |

---

## Not provided by GPUix

The owner's explicit ask: **whatever is missing and GPUix does not already
provide** — the rows that need real implementation, not API-shape work over an
existing host element.

Verdicts are against the **published `@gpuix/react` / `@gpuix/native` 0.10.0**
(the version this repo pins), read on 2026-10-17 from
`workspaces/components/node_modules/@gpuix/react/dist/index.d.ts`,
`dist/components/`, `dist/floating.d.ts`, `@gpuix/native/dist/host.d.ts` and
`@gpuix/native/index.d.ts`. They are **not** read from `references/gpuix`, which
is ahead of the published release — the divergence is called out below.

### Provided by GPUix — API-shape work only

| Row | GPUix provides | Verdict |
| --- | -------------- | ------- |
| Text / typography | `<text>` host element | **verified** (published 0.10.0) |
| Icons | `<svg>` (tintable monochrome) + `<img>` | **verified** |
| Separators, Spacers, Stack / layout primitives, Boxes / containers | `div` + flexbox / grid | **verified** |
| Scrollable containers | `overflow: "scroll"` | **verified** |
| Text inputs / Text areas | `<input>`, `<textarea>` | **verified** |
| Selects | `Select` + parts | **verified** |
| Comboboxes | `Combobox` + parts | **verified** |
| Tooltips | `Tooltip` + parts | **verified** |
| Virtualized lists | `<virtual-list>` | **verified** |
| Syntax highlighting | `<code>` (bundled languages) | **verified** |
| Diff viewer | `<diff>` (unified) | **verified** |
| Image preview | `<img>` (path, data URL, http(s)) | **verified** |
| File / folder selection | `GpuixRenderer.promptForPaths` | **verified** |

**Primitives only — still needs implementation:** Popovers / Dropdown menus /
Context menus (`floating`'s `FloatingLayer` + `<anchored>` give positioning and
occlusion, not menu semantics); Toasts / notifications (`AnimatePresence` +
`createPortal` + `<anchored>`); Buttons and Dialogs (**present on
`references/gpuix` `main`, absent from published 0.10.0** — no `./button` or
`./dialog` subpath and no `Button` / `Dialog` in `dist/index.d.ts`); `<canvas>`
custom drawing (**unverified** — the README's Supported Elements table marks it
"Custom drawing (planned)").

**Cross-cutting, verified, partial:** AccessKit `role`, `aria-label`,
`aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
`aria-valuetext`, `aria-level`; native `tabIndex` / `autoFocus` and renderer
`focusElement` / `focusNext` / `focusPrevious` / `focusNextWithin`. There is **no**
`aria-checked`, `aria-valuenow`, `aria-labelledby` or `aria-describedby`.

### Not provided — needs real implementation

Grouped by tier. The GPUix primitive each will be built on is in the row's Notes.

- **Tier 1:** Labels (association needs `aria-labelledby` — unsupported), Button
  groups, Checkboxes, Radio groups, Switches, Progress, Skeletons, Loading
  indicators, Slider, Range slider, Meter, Number Field, OTP Field, Toggle,
  Rating.
- **Tier 2:** Cards, Badges, Avatars, Lists / list items, Empty states, Alerts,
  Inline validation, Toasts / notifications, Dialogs, Confirmation dialogs,
  Popovers, Dropdown menus, Context menus, Command menus, Tabs, Accordions,
  Collapsible sections, Breadcrumbs, Pagination, Search inputs, Date / time
  pickers, Fieldset, Form, Navigation Menu, Preview Card, Drawer, Stepper,
  Timeline, Color picker, Tag / token input, Mention input, Hotkey-recorder
  input, Countdown, Carousel, Inline edit, Keyboard shortcuts / keycap display.
- **Tier 3:** Tables, Sortable tables, Row selection, Column configuration,
  Resizable columns, Filtering controls, Data toolbars, Virtualized tables, Tree
  views, Expandable rows, Key-value displays, Property panels, Statistic /
  metric cards, Charts.
- **Tier 4:** every row — Resizable split panes, Panel groups, Collapsible
  sidebars, Tabbed panels, Detachable / movable tabs, Docking layouts, Nested
  panel arrangements, Workspace layouts, Persistent panel state, Keyboard
  navigation, Command palette, Application menus, Status bars, Toolbars,
  Breadcrumb navigation, Inspector panels, Property editors, File trees, Log
  viewers, Terminal surfaces, Search and replace, Multi-pane editing layouts.
- **Tier 5:** Code editor integration, Rich-text editing, Drag and drop,
  Notification centre, Multi-step forms, Virtualized hierarchical data, Advanced
  filtering / query builders, QR code, File upload, Video / audio player +
  waveform, Crop area.

Nothing in this list may be claimed `done` until it runs in the real runtime or
carries an evidenced limitation. The capability evidence lives in
`docs/gpuix-capabilities.md` (plan `203`); the sequencing is in plan `205`.

---

## Tier 1 — foundational

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Text / typography | todo | yes | `<text>` host element. API-shape work, not implementation. |
| Icons | todo | yes | `<svg>` (tintable monochrome) + `<img>` provided. The icon *set* and sizing rules are ours. API-shape work, not implementation. |
| Separators | todo | yes | `div` + border. API-shape work, not implementation. |
| Spacers | todo | yes | `div`. API-shape work, not implementation. |
| Stack / layout primitives | todo | yes | flexbox + grid provided. API-shape work, not implementation. |
| Boxes / containers | todo | yes | `div`. API-shape work, not implementation. |
| Scrollable containers | todo | yes | `overflow: "scroll"` gives a native scroll container. API-shape work, not implementation. |
| Buttons | todo | ? | `Button` is on `references/gpuix` `main` but **not in published 0.10.0** (verified). Our own keyboard contract is required — plan `030` §3.4. Variants merged here: Floating action button and Copy button (adabraka `floating_action_button`, `copy_button`). |
| Button groups | todo | ? | Variants merged here: Toggle Group (base-gpui `ToggleGroup`) and Segmented control (adabraka `segmented_nav`) — pressed-state variants, not separate rows. |
| Labels | todo | ? | `<text>` exists; control association needs `aria-labelledby`, which GPUix does not expose (verified). |
| Text inputs | todo | yes | `<input>` host element. API-shape work, not implementation. |
| Text areas | todo | yes | `<textarea>` host element. API-shape work, not implementation. |
| Checkboxes | todo | ? | No checkbox host element; `aria-checked` is unsupported. Variant merged here: Checkbox Group (base-gpui `CheckboxGroup`). |
| Radio groups | todo | ? | No radio host element; roving-focus keyboard contract is ours. |
| Selects | todo | yes | `Select` + parts published. API-shape work, not implementation. |
| Switches | todo | ? | Distinct from Toggle (on/off state vs momentary pressed mode). |
| Progress | todo | ? | `div` + width/opacity `motion`. |
| Tooltips | todo | yes | `Tooltip` + parts published. API-shape work, not implementation. |
| Skeletons | todo | ? | `div` + opacity `motion` (GPUix animates opacity only — verified). |
| Loading indicators | todo | ? | **No rotation** in `motion` (verified); use an indeterminate sweep (width/left) or a discrete step cycle. |
| Slider | todo | ? | No slider host element or React export (verified). Track / thumb / indicator from `div`; pointer + keyboard behaviour ours. |
| Range slider | todo | ? | Two-thumb variant of Slider; its own runtime for min/max ordering and thumb crossing. No host element. |
| Meter | todo | ? | Distinct from Progress: a value in a range, not task completion. No host element. |
| Number Field | todo | ? | `<input>` exists (API-shape for the text part); stepper buttons, drag-to-scrub, clamping and locale formatting are ours. |
| OTP Field | todo | ? | `<input>` exists; segmented rendering, paste distribution and keyboard movement are ours. |
| Toggle | todo | ? | Momentary pressed mode, distinct from Switches. No `Button` in published 0.10.0; built on `div` + the shared keyboard contract. |
| Rating | todo | ? | Radio-group-like input; no host element. Reuses the radio roving-focus contract. |

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | todo | ? | `div` + `<text>`. Variant merged here: Expandable card (adabraka `expandable_card`) — see also Collapsible sections. |
| Badges | todo | ? | `div` + `<text>`. |
| Avatars | todo | ? | `<img>` provides the image; the fallback/initials surface is ours. |
| Lists / list items | todo | ? | `div` rows; `<virtual-list>` for long collections. |
| Message scroller | todo | ? | Behaviour ported from **shadcn/ui's Message Scroller** (credited in `LICENSES/`): follows new content while pinned, leaves the reader alone when they scroll up, jump-to-latest with an unread count, streaming rows. `<virtual-list>` + scroll handles; the pin/stream state machine is ours. Plan `206`. |
| Empty states | todo | ? | `div` + `<text>` + Icons. |
| Alerts | todo | ? | `div` + `<text>` + Icons. |
| Inline validation | todo | ? | Variant merged here: Field (base-gpui `FieldRoot/Label/Description/Error/Validity/Item/Control`) — the field wrapper that carries validation state. |
| Toasts / notifications | todo | ? | `AnimatePresence` + `createPortal` + `<anchored>` are published primitives; the toast system is ours. |
| Dialogs | todo | ? | `Dialog` is on `main` but **not in published 0.10.0** (verified). `createPortal` + `div` + `motion` + focus handles. |
| Confirmation dialogs | todo | ? | Dialog + a real form/confirmation workflow. |
| Popovers | todo | ? | `FloatingLayer` + `<anchored>` give positioning/occlusion; the Popover API is ours. |
| Dropdown menus | todo | ? | `FloatingLayer` + `<anchored>`; menu semantics, roving focus and type-ahead are ours. |
| Context menus | todo | ? | As Dropdown menus, triggered by `onAuxClick` / right-click position. |
| Command menus | todo | ? | `<input>` + `FloatingLayer` + `<virtual-list>`. |
| Tabs | todo | ? | Roving focus + `div` + `motion` indicator. Variant merged here: Segmented control (adabraka `segmented_nav`) — also see Button groups. |
| Accordions | todo | ? | `div` + `motion` (height). |
| Collapsible sections | todo | ? | `div` + `motion` (height). Variant merged here too: Expandable card (adabraka `expandable_card`). |
| Breadcrumbs | todo | ? | `div` + `<text>`. |
| Pagination | todo | ? | Button groups + `<text>`. |
| Search inputs | todo | ? | `<input>` exists; the search UI is ours. `useTextSearch`/`findRanges` search rendered text, not an input. |
| Comboboxes | todo | yes | `Combobox` + parts published. API-shape work, not implementation. Variant merged here: Autocomplete (base-gpui `AutocompleteRoot`/`AutocompleteValue`) — the free-text variant; see also Search inputs. |
| Date / time pickers | todo | ? | `div` + `<text>` + keyboard grid; no date host element. |
| Fieldset | todo | ? | Form grouping (`FieldsetRoot`/`Legend` in base-gpui). `div` + `<text>`. |
| Form | todo | ? | Validation orchestration and submit lifecycle (base-gpui `Form`). No host element; Effect-based validation lives in the package, not the renderer. |
| Navigation Menu | todo | ? | 13-part nav whose items open content panels; distinct from Dropdown menus. `FloatingLayer` + `<anchored>`. |
| Preview Card | todo | ? | Hover-triggered rich card with a positioner (base-gpui, 8 parts). `FloatingLayer` + `<anchored>`. |
| Drawer | todo | ? | Edge-anchored panel with swipe-to-dismiss and nesting. `Dialog` is main-only in 0.10.0; `div` + `motion` (width/left/opacity) + `createPortal`. |
| Stepper | todo | ? | Multi-step progress indicator (adabraka `StepItem`/`StepStatus`). `div` + `<text>`. |
| Timeline | todo | ? | Event timeline with connector styles. `div` + `<text>`. |
| Color picker | todo | ? | HSL/RGB/HEX + alpha + swatches. **Limitation (unverified for GPUix):** the saturation/value square needs radial or multi-stop gradients, which GPUix does not support (two-stop linear only — verified). Alternative: a discrete swatch grid or a pre-rendered bitmap. |
| Tag / token input | todo | ? | `<input>` + chip `div`s; the token keyboard contract is ours. |
| Mention input | todo | ? | `<input>` + an anchored suggestion list (`FloatingLayer`). |
| Hotkey-recorder input | todo | ? | Captures `KeyEvent` (`key`, `isHeld`, modifiers) on a focused `div`; the accelerator model is ours. |
| Countdown | todo | ? | `div` + `<text>`; the time source is the app's (Effect `Clock`), never a renderer timer. |
| Carousel | todo | ? | `motion` animates width/left/opacity only — **no transform/scale** (verified). Scroll snap is unavailable; discrete stepping is the honest alternative. |
| Inline edit | todo | ? | Swaps `<text>` for `<input>` in place; focus/commit/cancel contract ours. |
| Keyboard shortcuts / keycap display | todo | ? | Keycap `div`s + a categorised shortcut table. No host element. |

## Tier 3 — data presentation

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Tables | todo | ? | No `<table>` element; grid + `div` rows. |
| Sortable tables | todo | ? | Grid + keyboard headers. |
| Row selection | todo | ? | `aria-selected` is supported (verified). |
| Column configuration | todo | ? | Grid tracks + a menu. |
| Resizable columns | todo | ? | Pointer events + grid tracks. |
| Filtering controls | todo | ? | `div` + `<input>`. |
| Data toolbars | todo | ? | Toolbars + Button groups. |
| Virtualized lists | todo | yes | `<virtual-list>` published (visible-range and scroll-anchor APIs). API-shape work, not implementation. |
| Virtualized tables | todo | ? | `<virtual-list>` rows can host a grid; there is no table element. |
| Tree views | todo | ? | `<virtual-list>` + indentation; hierarchical virtualization is ours. |
| Expandable rows | todo | ? | `motion` height. |
| Key-value displays | todo | ? | `div` + `<text>`. |
| Property panels | todo | ? | Fieldset + Inline validation + Key-value displays. |
| Statistic / metric cards | todo | ? | Cards + `<text>`. |
| Charts | todo | ? | No chart host element. `<svg>` can render static charts; `<canvas>` is "planned" (unverified). |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | ? | Pointer events + `motion`; `col-resize`/`row-resize` cursors are provided (verified). |
| Panel groups | todo | ? | Composition over split panes. |
| Collapsible sidebars | todo | ? | `motion` width (outer clipping container, not inner reflow). |
| Tabbed panels | todo | ? | Tabs + panels. |
| Detachable / movable tabs | todo | ? | Needs a portal/drag model; no drag host feature. |
| Docking layouts | todo | ? | Composition over split panes + tabs. |
| Nested panel arrangements | todo | ? | Composition. |
| Workspace layouts | todo | ? | Composition + persistence. |
| Persistent panel state | todo | ? | App-owned serialisation; no renderer storage. |
| Keyboard navigation | todo | ? | Real native focus handles (verified); the roving-focus model is ours. |
| Command palette | todo | ? | `<input>` + `FloatingLayer` + `<virtual-list>`. Variant merged here: Spotlight (adabraka `spotlight`). |
| Application menus | todo | ? | The macOS menu bar is a renderer API (`README.md` "The macOS menu bar"); cross-platform app menus are ours. |
| Status bars | todo | ? | `div` + `<text>`. |
| Toolbars | todo | ? | `div` + Button groups. |
| Breadcrumb navigation | todo | ? | Breadcrumbs + navigation. |
| Inspector panels | todo | ? | Property panels + panels. |
| Property editors | todo | ? | Fieldset + inputs. |
| File trees | todo | ? | Tree views + `<virtual-list>`. |
| Log viewers | todo | ? | `<virtual-list>` + `<text>`; text search/highlight hooks exist. |
| Terminal surfaces | todo | ? | No terminal host element; **unverified** whether a PTY surface is feasible. |
| Search and replace | todo | ? | `useTextSearch`/`findRanges` highlight rendered text; the replace UI is ours. |
| Multi-pane editing layouts | todo | ? | Composition over split panes + editors. |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | ? | `<code>` renders highlighted code; there is **no editable code surface** (verified). |
| Syntax highlighting | todo | yes | `<code>` renders syntax-highlighted blocks with bundled languages. API-shape work, not implementation. |
| Diff viewer | todo | yes | `<diff>` renders a unified diff. API-shape work, not implementation. |
| Rich-text editing | todo | ? | `<markdown>` renders markdown; editing is not provided (verified). |
| Image preview | todo | yes | `<img>` loads raster and SVG from path/data URL/http(s). API-shape work, not implementation. |
| File / folder selection | todo | yes | `GpuixRenderer.promptForPaths` opens the platform picker. API-shape work, not implementation. |
| Drag and drop | todo | ? | Mouse events exist; there is no drag host feature. `onFileDrop` handles file drops only. |
| Notification centre | todo | ? | Composition over toasts + panels. |
| Multi-step forms | todo | ? | Variant merged here: Form (adabraka `form`) — partial coverage; validation orchestration is the Tier 2 Form row. |
| Virtualized hierarchical data | todo | ? | Tree views + `<virtual-list>`; hierarchical virtualization is ours. |
| Advanced filtering / query builders | todo | ? | Composition over inputs + menus. |
| QR code | todo | ? | Render the matrix as a grid of `div`s or one `<svg>`; both are provided. The encoder is ours (dependency not yet chosen). |
| File upload | todo | ? | Picker provided (`promptForPaths`); the drop surface, progress and validation are ours. `onFileDrop` exists. |
| Video / audio player + waveform | todo | ? | **No media host element** (verified: not in `ElementType`). Playback needs a platform surface — **unverified**; a waveform can only be drawn via `<svg>` or the planned `<canvas>`. |
| Crop area | todo | ? | Draggable handles over `<img>`; crop geometry and constraints are ours. No custom-paint requirement unless the mask is drawn — **unverified**. |
| Chat (AI conversation) | todo | ? | Behaviour ported from **shadcn/ui's AI Elements `chat`** (credited in `LICENSES/`): a message list in a Message scroller, a composer with attachments, submit/stop, `idle/submitting/streaming/error` states, empty state. Plan `207`. |
| Message (AI message row) | todo | ? | Behaviour ported from **shadcn/ui's AI Elements `message`** (credited): `user`/`assistant`/`system` variants; avatar, content (`<markdown>`), actions (copy/retry/feedback), attachments, reasoning, tool calls, sources, streaming indicator. Plan `207`. |
