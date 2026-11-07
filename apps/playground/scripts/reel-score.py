#!/usr/bin/env python3
"""The film's original score, piano and violin only. Usage: uv run --with mido reel-score.py <soundfont.sf2> <out.wav> [--piano-only]"""
import random, subprocess, sys, tempfile
import mido

font, out, *flags = sys.argv[1:]
WITH_VIOLIN = "--piano-only" not in flags
BEAT = 480
TEMPO = mido.bpm2tempo(90)
# Bar 0 is the first bar after the burn, at 5 s; bar 2 is the first cut; bar 13 lands on the logo.
LEAD = 5.0 / (2 / 3)
N = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def note(s):
    sharp = "#" in s
    return 12 * (int(s[-1]) + 1) + N[s[0]] + (1 if sharp else 0)

CHORDS = {
    "Am": "A2 E3 C4 E4 A4", "F": "F2 C3 A3 C4 F4", "C": "C3 G3 E4 G4 C5", "G": "G2 D3 B3 D4 G4",
    "E7": "E2 B2 G#3 D4 B4", "A": "A2 E3 C#4 E4 A4",
}
HARMONY = ["Am", "F", "Am", "F", "C", "G", "Am", "F", "C", "E7", "F", "G", "Am", "A"]
MELODY = {
    2: "E5:4", 3: "C5:4", 4: "G4:2 C5:2", 5: "D5:4",
    6: "E5:2 A5:2", 7: "F5:4", 8: "G5:2 E5:2", 9: "G#4:4",
    10: "A4:2 C5:2", 11: "D5:4", 12: "C5:2 B4:2", 13: "A4:8",
}
INTRO = [(1.05, "E5", 34), (3.05, "A5", 30), (5.05, "C6", 28)]

random.seed(148)
piano, violin = [], []
def press(events, beat, length, pitch, velocity, channel):
    jitter = random.uniform(-0.02, 0.02)
    events.append((beat + jitter, "on", pitch, velocity, channel))
    events.append((beat + jitter + length, "off", pitch, 0, channel))

for beat, name, velocity in INTRO:
    press(piano, beat, 3.5, note(name), velocity, 0)

for bar, name in enumerate(HARMONY):
    start = LEAD + bar * 4
    tones = [note(x) for x in CHORDS[name].split()]
    if bar == 13:
        for i, pitch in enumerate(tones):
            press(piano, start + i * 0.25, 7.0, pitch, 38, 0)
        continue
    # One slow roll a bar, in quarter notes, and nothing faster anywhere.
    for i, pitch in enumerate(tones[:4]):
        press(piano, start + i, 3.8 - i * 0.5, pitch, 26 if i == 0 else 30, 0)

if WITH_VIOLIN:
    for bar, phrase in MELODY.items():
        beat = LEAD + bar * 4
        for item in phrase.split():
            name, beats = item.split(":")
            press(violin, beat, float(beats), note(name), 58, 1)
            beat += float(beats)

def swells():
    """One slow rise and fall per four bars, never per note."""
    out = []
    for beat in range(0, 12 * 4 + 8, 2):
        share = abs(((beat % 16) / 8) - 1)
        out.append((LEAD + 2 * 4 + beat, "cc", 11, round(92 - 26 * share), 1))
    return out

pedal = []
for bar in range(-2, 14):
    beat = LEAD + bar * 4
    if beat < 0:
        continue
    pedal += [(beat - 0.02, "cc", 64, 0, 0), (beat + 0.06, "cc", 64, 110, 0)]

timeline = sorted(piano + violin + swells() + pedal, key=lambda e: e[0])
mid = mido.MidiFile(ticks_per_beat=BEAT)
track = mido.MidiTrack()
mid.tracks.append(track)
track.append(mido.MetaMessage("set_tempo", tempo=TEMPO, time=0))
track.append(mido.Message("program_change", program=0, channel=0, time=0))
track.append(mido.Message("program_change", program=40, channel=1, time=0))
now = 0
for beat, kind, a, b, channel in timeline:
    tick = max(now, round(beat * BEAT))
    delta, now = tick - now, tick
    if kind == "on":
        track.append(mido.Message("note_on", note=a, velocity=b, channel=channel, time=delta))
    elif kind == "off":
        track.append(mido.Message("note_off", note=a, velocity=0, channel=channel, time=delta))
    else:
        track.append(mido.Message("control_change", control=a, value=b, channel=channel, time=delta))
with tempfile.NamedTemporaryFile(suffix=".mid") as f:
    mid.save(f.name)
    subprocess.run(["fluidsynth", "-ni", "-g", "0.8", "-r", "48000", "-R", "1", "-C", "0", "-o", "synth.reverb.room-size=0.85", "-o", "synth.reverb.level=0.7", "-F", out, font, f.name], check=True, stdout=subprocess.DEVNULL)
