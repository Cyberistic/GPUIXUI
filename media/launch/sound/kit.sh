#!/bin/sh
# The film's tactile kit: one sound per kind of press, written to assets/sfx/.
#
# A haptic press is a felt body and an audible edge. The body is a short pitched
# thump with an exponential decay (aevalsrc); the edge is a recorded click from
# HyperFrames' bundled library, re-pitched and filtered per control so no two
# kinds of press share a sound. Deterministic: same input, same files.
#
#   sh media/launch/sound/kit.sh <bundled-sfx-dir>
set -eu
SRC=${1:?bundled sfx dir}
OUT=$(dirname "$0")/../assets/sfx
mkdir -p "$OUT"
FF="ffmpeg -v error -y"
R=48000
# calc <expr>: arithmetic with a leading zero, which ffmpeg needs.
calc() { awk "BEGIN { printf \"%.5f\", $1 }"; }

# body <name> <from Hz> <to Hz> <decay s> <length s> <gain>: a gliding sine, decaying.
body() {
  $FF -f lavfi -i "aevalsrc='$6*sin(2*PI*($3+($2-$3)*exp(-t/0.012))*t)*exp(-t/$4)':s=$R:d=$5" "$OUT/.body-$1.wav"
}
# edge <name> <src> <rate> <highpass> <lowpass> <length> <gain>: a recorded click, re-pitched.
edge() {
  $FF -i "$SRC/$2.mp3" -af "asetrate=$R*$3,aresample=$R,highpass=f=$4,lowpass=f=$5,atrim=0:$6,afade=t=out:st=$(calc "$6*0.6"):d=$(calc "$6*0.4"),volume=$7" -ac 1 "$OUT/.edge-$1.wav"
}
# mix <name> <parts…>: sum the parts, stereo, peak at -1 dBFS.
mix() {
  name=$1; shift
  inputs=""; n=0
  for part in "$@"; do inputs="$inputs -i $OUT/.$part.wav"; n=$((n + 1)); done
  $FF $inputs -filter_complex "amix=inputs=$n:normalize=0,alimiter=limit=0.89:level=false,aformat=channel_layouts=stereo" "$OUT/$name.wav"
}

# The switch: a soft thock going down, a crisp tick as the knob lands.
body press 190 120 0.030 0.16 0.9;   edge press click-soft 0.82 300 5200 0.09 0.8;  mix press body-press edge-press
body land 260 210 0.012 0.08 0.35;   edge land click 1.18 1600 12000 0.06 0.9;      mix land body-land edge-land

# The slider's detents: ten ticks, each a semitone higher than the last.
for i in 0 1 2 3 4 5 6 7 8 9; do
  rate=$(calc "exp(log(2)*$i/12)*1.05")
  edge "detent$i" click-soft "$rate" 900 9000 0.05 0.75
  mix "detent-$i" "edge-detent$i"
done

# The primary button: a deep thud down, a clean click up.
body thud 140 82 0.050 0.22 1.0;     edge thud click-soft 0.7 200 3800 0.08 0.6;    mix thud body-thud edge-thud
edge up click 1.0 700 11000 0.08 0.85; mix up edge-up

# The Look control, voiced per platform: wood (macOS), plastic (Windows), felt (Linux).
body wood 420 360 0.018 0.10 0.5;    edge wood click 0.92 500 7000 0.07 0.8;        mix look-mac body-wood edge-wood
edge plastic click 1.3 1200 14000 0.05 1.0;                                         mix look-win edge-plastic
body felt 230 180 0.025 0.12 0.6;    edge felt click-soft 0.95 150 2600 0.08 0.7;   mix look-linux body-felt edge-felt

# Keys for the terminal command: four takes of one keystroke, rotated.
for i in 0 1 2 3; do
  edge "key$i" key-press "$(calc "0.94+$i*0.04")" 400 10000 0.12 0.7
  mix "key-$i" "edge-key$i"
done

# The Omarchy flips: a short glassy edge with a room tail.
for i in 0 1 2; do
  $FF -i "$SRC/click.mp3" -af "asetrate=$R*$(calc "1.5+$i*0.12"),aresample=$R,highpass=f=2500,atrim=0:0.08,aecho=0.8:0.5:40|71:0.35|0.2,volume=0.8" -ac 1 "$OUT/.edge-glass$i.wav"
  mix "glass-$i" "edge-glass$i"
done

# The kanban card: lifted with a soft pluck, dropped with a thunk.
body lift 300 380 0.020 0.12 0.35;   edge lift click-soft 1.1 600 8000 0.06 0.6;    mix lift body-lift edge-lift
body drop 120 70 0.070 0.30 1.0;     edge drop click 0.75 200 5000 0.10 0.7;        mix drop body-drop edge-drop

# The stack words: one keycap each, a step lower every time.
for i in 0 1 2 3; do
  body "cap$i" "$(calc "210-$i*18")" "$(calc "150-$i*14")" 0.030 0.16 0.8
  edge "cap$i" key-press "$(calc "1.0-$i*0.05")" 300 9000 0.10 0.8
  mix "cap-$i" "body-cap$i" "edge-cap$i"
done

# The mark: the film's deepest press.
body mark 96 52 0.110 0.55 1.0;      edge mark click-soft 0.6 120 3000 0.12 0.7;    mix mark body-mark edge-mark
$FF -i "$SRC/whoosh-short.mp3" -af "volume=0.5" -ac 2 -ar $R "$OUT/air.wav"

rm -f "$OUT"/.*.wav
