# REVIEW — v3 render of 2026-11-01

Checked from the rendered file (27.5 s, 1920×1080) and from `npx hyperframes snapshot`
across every section.

**Picture.** Eight different controls are each pressed in the first four seconds;
every later shot shows its block reacting to real input on a beat. The terminal
window fits the frame so its toasts stay visible. Captions are prose about building
GPU-powered apps and never sit over UI.

**Sound.** Measured, not heard: −18.9 LUFS integrated, −4.1 dBFS peak. That is quieter
than v2 (−15.8) on purpose: the score sits at 0.55 and the 58 tactile cues at 0.5×.

**Check.** `npx hyperframes check`: no errors. Kept warnings: scene-local media
starts (intended) and `line_unread` on the fast-typed terminal command.
