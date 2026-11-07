#!/usr/bin/env python3
"""The film's original concerto at the reference's 90 BPM. Usage: uv run --with mido reel-score.py <soundfont.sf2> <out.wav>"""
import random, subprocess, sys, tempfile
import mido

font, out = sys.argv[1:]
BEAT, TEMPO = 480, mido.bpm2tempo(90)
# Bar 0 starts the effects at 5 s, bar 3 is the first cut, bar 7 the reference's entrance, bar 14 the logo.
LEAD = 5.0 / (2 / 3)
FULL = 7
N = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def note(s):
    return 12 * (int(s[-1]) + 1) + N[s[0]] + ("#" in s)

CHORDS = {
    "Am": "A2 E3 A3 C4 E4 A4", "F": "F2 C3 F3 A3 C4 F4", "C": "C3 G3 C4 E4 G4 C5", "G": "G2 D3 G3 B3 D4 G4",
    "E7": "E2 B2 E3 G#3 D4 B4", "A": "A2 E3 A3 C#4 E4 A4",
}
HARMONY = ["Am", "F", "G", "Am", "F", "C", "G", "Am", "F", "C", "E7", "F", "G", "Am", "A"]
MELODY = {
    3: "E5:2 D5:1 C5:1", 4: "A4:3 C5:1", 5: "G4:2 E5:2", 6: "D5:3 B4:1",
    7: "C5:1 E5:1 A5:2", 8: "G5:1 F5:1 C5:2", 9: "E5:1 G5:1 C5:2", 10: "B4:2 G#4:2",
    11: "A4:1 C5:1 F5:2", 12: "E5:1 D5:1 B4:2", 13: "C5:2 B4:1 G#4:1", 14: "A4:8",
}
INTRO = [(1.05, "E5", 40), (2.55, "A5", 36), (4.05, "C6", 34), (5.55, "B5", 38), (6.3, "G5", 36)]
PIANO, VIOLIN, STRINGS, PIZZ, CELLO, HORN = range(6)
PROGRAM = {PIANO: 0, VIOLIN: 40, STRINGS: 49, PIZZ: 45, CELLO: 42, HORN: 60}

random.seed(148)
events = []
def press(beat, length, pitch, velocity, channel, loose=0.012):
    at = beat + random.uniform(-loose, loose)
    events.append((at, "on", pitch, max(1, min(127, velocity + random.randint(-3, 3))), channel))
    events.append((at + length, "off", pitch, 0, channel))
def cc(beat, control, value, channel):
    events.append((beat, "cc", control, value, channel))

for beat, name, velocity in INTRO:
    press(beat, 2.4, note(name), velocity, PIANO)
    press(beat, 2.4, note(name) - 12, velocity - 12, PIANO)

ROLL = [0, 2, 3, 4, 5, 4, 3, 2]
for bar, name in enumerate(HARMONY):
    start = LEAD + bar * 4
    tones = [note(x) for x in CHORDS[name].split()]
    full = bar >= FULL
    cc(start - 0.02, 64, 0, PIANO)
    cc(start + 0.06, 64, 110, PIANO)
    if bar == 14:
        for i, pitch in enumerate(tones + [note("C#5"), note("A5")]):
            press(start + i * 0.18, 7.5, pitch, 64 - i, PIANO)
        for pitch in tones[1:]:
            press(start, 8, pitch, 62, STRINGS)
        press(start, 8, tones[0], 66, CELLO)
        press(start, 8, tones[3], 50, HORN)
        continue
    for i, degree in enumerate(ROLL):
        press(start + i * 0.5, 1.2, tones[degree], (46 if full else 36) + (8 if i in (0, 4) else 0), PIANO)
    press(start, 3.9, tones[0] - 12 if full else tones[0], 52 if full else 38, PIANO)
    if bar == 13:
        for i, pitch in enumerate(["A3", "C4", "E4", "A4", "C5", "E5", "G#5", "B5"]):
            press(start + 2 + i * 0.25, 0.5, note(pitch), 44 + i * 3, PIANO)
    for pitch in tones[1:5]:
        press(start, 3.95, pitch, 62 if full else 46, STRINGS, 0.03)
    press(start, 3.95, tones[0], 66 if full else 50, CELLO, 0.03)
    for pos in (0, 8, 10, 14) if full else (0, 8):
        press(start + pos / 4, 0.4, tones[0] + 12, (62 if pos in (0, 8) else 46) if full else 44, PIZZ)
    if full:
        press(start, 3.9, tones[3], 46, HORN, 0.03)

for bar, phrase in MELODY.items():
    beat = LEAD + bar * 4
    for item in phrase.split():
        name, beats = item.split(":")
        press(beat, float(beats) * 0.99, note(name), 56 if bar < FULL else 64, VIOLIN, 0.02)
        if FULL <= bar < 14:
            press(beat, float(beats), note(name) + 12, 40, PIANO)
        beat += float(beats)

for beat in range(0, 60, 2):
    share = abs(((beat % 16) / 8) - 1)
    cc(LEAD + beat, 11, round(100 - 22 * share), STRINGS)
    cc(LEAD + beat, 11, round(96 - 18 * share), VIOLIN)

def render(channels, path, reverb):
    mid = mido.MidiFile(ticks_per_beat=BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)
    track.append(mido.MetaMessage("set_tempo", tempo=TEMPO, time=0))
    for channel in channels:
        track.append(mido.Message("program_change", program=PROGRAM[channel], channel=channel, time=0))
    now = 0
    for beat, kind, a, b, channel in sorted((e for e in events if e[4] in channels), key=lambda e: e[0]):
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
        subprocess.run(["fluidsynth", "-ni", "-g", "0.8", "-r", "48000", "-R", "1", "-C", "0", "-o", "synth.reverb.room-size=0.85", "-o", f"synth.reverb.level={reverb}", "-F", path, font, f.name], check=True, stdout=subprocess.DEVNULL)

with tempfile.TemporaryDirectory() as tmp:
    render({PIANO, STRINGS, PIZZ, CELLO, HORN}, f"{tmp}/band.wav", 0.6)
    render({VIOLIN}, f"{tmp}/violin.wav", 0.8)
    # The solo sits behind the piano with its top rolled off.
    mix = "[1:a]lowpass=f=2800,highshelf=f=1800:g=-5,volume=-4dB[v];[0:a][v]amix=inputs=2:duration=longest:normalize=0[a]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmp}/band.wav", "-i", f"{tmp}/violin.wav", "-filter_complex", mix, "-map", "[a]", out], check=True)
