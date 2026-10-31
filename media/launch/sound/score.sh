#!/bin/sh
# The film's score: piano.ts → MIDI → fluidsynth with the Salamander Grand Piano
# (CC BY 3.0, Alexander Holm; freepats.zenvoid.org) → mastered to −16 LUFS,
# −1 dBTP, written to assets/music/score.wav.
#
#   sh media/launch/sound/score.sh <SalamanderGrandPiano.sf2>
set -eu
SF=${1:?path to the Salamander Grand Piano SF2}
HERE=$(dirname "$0")
OUT=$HERE/../assets/music
mkdir -p "$OUT"
nub "$HERE/piano.ts" "$HERE/piano.mid"
fluidsynth -ni -g 0.9 -r 48000 -R 1 -C 0 -F "$OUT/.raw.wav" "$SF" "$HERE/piano.mid"
ffmpeg -v error -y -i "$OUT/.raw.wav" -af "loudnorm=I=-16:TP=-1:LRA=11" -ar 48000 "$OUT/score.wav"
rm -f "$OUT/.raw.wav"
