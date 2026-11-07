#!/usr/bin/env python3
"""The film's original score, piano and violin only. Usage: uv run --with mido reel-score.py <soundfont.sf2> <out.wav>"""
import random, subprocess, sys, tempfile
import mido

font, out = sys.argv[1:]
BEAT = 480
TEMPO = mido.bpm2tempo(90)
# Bar 0 is the first bar after the burn, at 5 s; bar 2 is the first cut; bar 13 lands on the logo.
LEAD = 5.0 / (2 / 3)
N = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def note(s):
    sharp = "#" in s
    return 12 * (int(s[-1]) + 1) + N[s[0]] + (1 if sharp else 0)

CHORDS = {
    "Am": "A2 E3 A3 C4 E4 A4", "F": "F2 C3 F3 A3 C4 F4", "C": "C3 G3 C4 E4 G4 C5", "G": "G2 D3 G3 B3 D4 G4",
    "E7": "E2 B2 E3 G#3 D4 B4", "A": "A2 E3 A3 C#4 E4 A4",
}
HARMONY = ["Am", "F", "Am", "F", "C", "G", "Am", "F", "C", "E7", "F", "G", "Am", "A"]
MELODY = {
    0: "E4:4", 1: "F4:2 E4:2",
    2: "E5:2 D5:1 C5:1", 3: "A4:3 C5:1", 4: "G4:2 E5:2", 5: "D5:3 B4:1",
    6: "C5:1 E5:1 A5:2", 7: "G5:1 F5:1 C5:2", 8: "E5:1 G5:1 C6:2", 9: "B5:2 G#5:2",
    10: "A5:1 C6:1 F6:2", 11: "E6:1 D6:1 B5:2", 12: "C6:2 B5:1 G#5:1", 13: "A5:8",
}
INTRO = [(1.05, "E5", 44), (2.55, "A5", 40), (4.05, "C6", 38), (5.55, "B5", 42), (6.3, "G5", 40)]

random.seed(148)
piano, violin = [], []
def press(events, beat, length, pitch, velocity, channel):
    jitter = random.uniform(-0.012, 0.012)
    events.append((beat + jitter, "on", pitch, max(1, min(127, velocity + random.randint(-4, 4))), channel))
    events.append((beat + jitter + length, "off", pitch, 0, channel))

for beat, name, velocity in INTRO:
    press(piano, beat, 2.4, note(name), velocity, 0)
    press(piano, beat, 2.4, note(name) - 12, velocity - 14, 0)

for bar, name in enumerate(HARMONY):
    start = LEAD + bar * 4
    tones = [note(x) for x in CHORDS[name].split()]
    if bar == 13:
        for i, pitch in enumerate(tones + [note("C#5"), note("A5")]):
            press(piano, start + i * 0.1, 7.5, pitch, 62 - i, 0)
        continue
    rise = bar / 12
    step = 0.5 if bar < 9 else 0.25
    pattern = [0, 2, 3, 4, 5, 4, 3, 2] if step == 0.5 else [0, 2, 3, 4, 5, 4, 3, 2, 1, 3, 4, 5, 4, 3, 2, 3]
    for i, degree in enumerate(pattern):
        press(piano, start + i * step, step * 2.4, tones[degree], round(38 + 18 * rise + (8 if i == 0 else 0)), 0)

for bar, phrase in MELODY.items():
    beat = LEAD + bar * 4
    for item in phrase.split():
        name, beats = item.split(":")
        press(violin, beat, float(beats) * 0.985, note(name), 72 + min(bar, 10), 1)
        if bar >= 6 and bar < 13:
            press(piano, beat, float(beats), note(name), 46 + 2 * (bar - 6), 0)
        beat += float(beats)

def swells(events):
    out = []
    for beat, kind, pitch, _, channel in events:
        if kind != "on" or channel != 1:
            continue
        ends = min(b for b, k, p, _, c in events if k == "off" and p == pitch and c == 1 and b > beat)
        for i in range(13):
            k = i / 12
            level = 62 + 46 * (min(1.0, k * 3.0) * (1 - 0.32 * max(0.0, k - 0.6) / 0.4))
            out.append((beat + (ends - beat) * k, "cc", 11, round(level), 1))
    return out

pedal = []
for bar in range(-2, 14):
    beat = LEAD + bar * 4
    if beat < 0:
        continue
    pedal += [(beat - 0.02, "cc", 64, 0, 0), (beat + 0.06, "cc", 64, 110, 0)]

timeline = sorted(piano + violin + swells(violin) + pedal, key=lambda e: e[0])
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
    subprocess.run(["fluidsynth", "-ni", "-g", "0.8", "-r", "48000", "-R", "1", "-C", "0", "-o", "synth.reverb.room-size=0.72", "-o", "synth.reverb.level=0.55", "-F", out, font, f.name], check=True, stdout=subprocess.DEVNULL)
