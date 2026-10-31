# REVIEW — render of 2026-10-31

Checked from the rendered file (`gpuixui-launch.mp4`, 33.0 s, 1920×1080, H.264 + AAC)
and from `npx hyperframes snapshot` at the SPEC's QA frames.

**Picture.** Every QA frame shows what SPEC.md says. The pull-back from the button
close-up into Settings reads as one move: the close-up's last frame is clipped to the
button and handed over at ~3× scale, where the 6× and 1× layouts differ by about a
pixel. Captions never sit over UI. The end lockup is centred (mark 606–774, wordmark
814–1310).

**Sound.** Measured, not heard: −22.4 LUFS integrated, −2.8 dBFS peak, LRA 11.3 LU.
Every onset lands one frame after its picture (0.74 press, 0.97 land, 8 detents from
3.24, 5.24 thud, 10.87 / 12.44 Look clicks, 16.64 terminal press, 18.90 / 19.96 /
20.90 Omarchy, 22.41 lift, 24.07 drop, 27.29–28.19 caps, 29.64 mark). Quiet against
the −16 to −14 LUFS social target because the track is sparse transients with no
bed; raising it would clip the peaks.

**Check.** `npx hyperframes check`: no errors. Kept warnings: three
`nested_media_start_basis_ambiguous` (the starts are scene-local, as intended) and
`line_unread` on the typed terminal command (typing, not a line to read).

**Known.** The terminal shot's press is placed 3 frames before the measured repaint
(README: Terminal timing). Avatars keep their fixed diameter under the 2× terminal
theme (`// TODO:` in `magnify.ts`). No music.
