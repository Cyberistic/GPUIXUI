# SPEC — "Feel it"

Plan: `.agents/slop/plans/060-launch-film-feel.md` (the reference analysis lives there).

```text
GOAL:    a developer feels that GPUIxUI controls are physical and native everywhere, and goes to gpuixui.sudokw.com
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    33.0 s x 30 = 990 frames; no music yet (sound is the tactile layer)
LOOK:    ground #F2F2F7 (the macOS look's own page, so the takes meet it without a seam), no texture;
         ink #1D1D1F; accent #5F4BDB (the logo's) on the URL and the mark only;
         captions Inter 700, 84 px, tracking -0.035em, one centred line at y = 175, lowercase, no periods;
         the medium is the product's own UI, captured real; window shadow is the theme's own elevation
OBJECTS: the Switch, the Slider and the primary Button at 6-8x; the Settings block in macOS, Windows 11 and
         GNOME frames; a Ghostty window; an Omarchy desktop (Waybar strip, Hyprland tiles, the theme's
         wallpaper); the mark (assets/logo.svg)
MOTION:  arrivals expo.out / power4.out; camera power3.inOut 0.9 s; exits power2.in at 60% of the entry;
         captions: opacity 0.3 -> 1 with blur 6 -> 0 px in 0.35 s, still once landed, out with 6 px blur in 0.2 s;
         cursor press: scale 0.86 in 2 frames, back in 4; the mark's release springs at damping ~0.75 (back.out 1.6)
SOUND:   every visible press has a sound, placed one frame after its picture (sound/kit.sh):
         thock + tick (switch), a rising tick per detent (slider), thud + click (button), wood / plastic / felt
         (the Look control per platform), key ticks (terminal), a glass tick per Omarchy theme, lift + thunk (kanban),
         a keycap per stack word, the deepest thock on the mark
BANNED:  dark void with floating UI; glow; particles; three cards in a row; docked logo; fade-and-slide-up;
         tilted 3D UI; synthesised beeps or chimes; captions over UI; a sound with no press on screen
```

| # | t (s) | Shot | Hero move | Line | Sound |
| - | ----- | ---- | --------- | ---- | ----- |
| 1 | 0.0–2.4 | Switch, 8x, macOS | the real knob springs across | feel every press | press 0.73, land 0.97 |
| 2 | 2.4–4.6 | Slider, 6x | thumb snaps across 8 detents | every detent | detent-1..8 at the snaps |
| 3 | 4.6–6.4 | Button "Save changes", 6x | pressed state | every click | thud 5.23, up 5.53 |
| 4 | 6.4–10.6 | pull back from the button into Settings, macOS | camera 6.4x -> 0.8x in 0.95 s | native on mac | press/land 8.63, 9.57 |
| 5 | 10.6–14.0 | the Look control restyles the window: Windows 11, then Linux | the window itself | on windows · on linux | look-win 10.83, look-linux 12.43 |
| 6 | 14.0–17.5 | Ghostty: `nub run terminal` typed, the block paints, Dark mode pressed | the terminal frame | and in your terminal | keys 14.25-15.0, press 16.38 |
| 7 | 17.5–21.9 | Omarchy desktop through 4 real themes | the desktop repaints | follows your omarchy theme | glass at 18.87, 19.93, 20.87 |
| 8 | 21.9–26.5 | push in; a card dragged to Done | camera 1 -> 1.5, the card | start from blocks | lift 22.40, drop 24.07 |
| 9 | 26.5–29.0 | GPUI · React · shadcn · Tailwind | each word pressed in | — | cap-0..3 |
| 10 | 29.0–33.0 | the cursor presses the mark; wordmark wipes in; URL | the press | gpuixui.sudokw.com | mark 29.63 |

QA frames: 0.0 (thumbnail: switch + cursor), 0.95, 3.5, 5.3, 6.7, 8.8, 11.2, 12.8, 15.4, 16.6, 19.0, 21.2, 23.2, 27.9, 30.2, 32.5.
