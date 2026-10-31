# Launch film — "Feel it"

`gpuixui-launch.mp4`: 33 seconds, 1920×1080, 30 fps. An Apple-style launch for
gpuixui.sudokw.com in which **sound stands in for haptics**: every press on screen
has its own tactile sound. `SPEC.md` is the cut shot by shot; plan 060
(`.agents/slop/plans/060-launch-film-feel.md`) holds the reference analysis.

## Every frame of product is the product

Each shot is a real GPUIxUI tree, driven by real input and captured frame by frame
(`apps/playground/src/film`):

| Take | What it is |
| --- | --- |
| `switch`, `slider`, `button` | a Switch, Slider and primary Button under a theme magnified 8× / 6× (`magnify.ts`), so the macro is rendered, not upscaled |
| `settings` | the Settings block (`apps/playground/src/blocks/settings.tsx`); its own Look control restyles it to Windows 11 and Linux |
| `terminal` | the same block painted by GPUix's terminal platform in a pty, decoded from its kitty-graphics stream (`terminal-take.ts`) |
| `omarchy` | Kanban and Inbox tiled on an Omarchy desktop, themed from four real `colors.toml` files, then a card dragged to Done |

`take.ts` moves the pointer through GPUI's own hit testing (a press is a real
mouse-down, a drag real moves holding the button) and steps the paused motion clock
one frame at a time, so a take is repeatable byte for byte (`take.test.tsx`). The
pointer path is written to `cursor.json`; the composition draws the cursor there.

Drawn by the film, not the library: the window frames (an offscreen capture has no OS
chrome), the Ghostty window, the Waybar strip, captions, the cursor and the end card.

**Terminal timing.** In the capture rig a 2048×1152 frame crosses the pty pipe as
base64 zlib and arrives about 0.8 s after the click; terminal mode also repaints on
input, not on the motion clock, so the switch lands without its spring. The film
places the press 3 frames before the measured repaint.

## Build

```sh
nub run --filter playground build
for take in switch slider button settings omarchy; do
  nub apps/playground/dist/film/takes.js $take media/launch/takes/$take
done
nub apps/playground/dist/film/terminal-take.js media/launch/takes/terminal
for take in switch slider button settings terminal omarchy; do
  ffmpeg -framerate 30 -pattern_type glob -i "media/launch/takes/$take/*.png" \
    -c:v libx264 -preset slow -crf 12 -pix_fmt yuv420p media/launch/assets/footage/$take.mp4
done
ffmpeg -sseof -0.05 -i media/launch/assets/footage/button.mp4 -frames:v 1 media/launch/assets/footage/button-last.png
sh media/launch/sound/kit.sh ~/.claude/skills/media-use/audio/assets/sfx
cd media/launch && npx hyperframes check && npx hyperframes render -o gpuixui-launch.mp4 --crf 14
```

The cursor paths in `compositions/*.html` are the takes' `cursor.json`, scaled to the
display (Settings ×0.9375, Omarchy ×0.625). Re-paste them if a take's pointer changes.

## Sound

`sound/kit.sh` builds one sound per kind of press: a short pitched body with an
exponential decay (the felt part) under a recorded click from HyperFrames' bundled
library, re-pitched and filtered per control. 52 cues in `index.html`, each one
frame after its picture. There is no music bed yet.

## Credits

Omarchy palettes and wallpapers: [basecamp/omarchy](https://github.com/basecamp/omarchy)
(MIT). Kanagawa's wallpaper is Hokusai's *The Great Wave off Kanagawa* (public domain).
Clicks: HyperFrames' bundled sound library.
