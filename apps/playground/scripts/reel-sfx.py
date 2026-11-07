#!/usr/bin/env python3
"""The film's sound effects, synthesised and placed from each scene's events. Usage: uv run --with numpy --with scipy reel-sfx.py <out.wav>"""
import subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt
from reel_edits import C, FLEX, OPENING

SR = 48000
rng = np.random.default_rng(148)
def span(seconds):
    return np.arange(int(seconds * SR)) / SR
def noise(seconds):
    return rng.standard_normal(int(seconds * SR))
def band(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
def tone(f0, f1, seconds, decay):
    t = span(seconds)
    freq = f0 * (f1 / f0) ** (t / seconds)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * decay)

def click():
    x = tone(1400, 900, 0.03, 150) * 0.5
    h = band(noise(0.012), 1500, 7000) * np.exp(-span(0.012) * 500) * 0.7
    x[: len(h)] += h
    return x
def press():
    n = int(0.09 * SR); x = np.zeros(n); c = tone(1800, 1100, 0.03, 160) * 0.5; x[:len(c)] += c
    b = tone(210, 110, 0.09, 40) * 0.45; x += b[:n]; h = band(noise(0.008), 2000, 8000) * 0.5; x[:len(h)] += h; return x
def toggle():
    x = press(); x2 = np.zeros(int(0.14 * SR)); x2[:len(x)] += x; d = tone(700, 500, 0.05, 90) * 0.35; x2[int(0.07 * SR):int(0.07 * SR) + len(d)] += d; return x2
def tick():
    return tone(2600, 2100, 0.01, 500) * 0.35
def key():
    return band(noise(0.018), 900, 5200) * np.exp(-span(0.018) * 260) * 0.4
def pad():
    return tone(240, 120, 0.11, 34) * 0.5 + (band(noise(0.11), 400, 2600) * np.exp(-span(0.11) * 70)) * 0.3
def pop():
    return tone(520, 980, 0.05, 55) * 0.3
def whoosh(seconds=0.42, lo=350, hi=4200, gain=0.35):
    x = noise(seconds); t = np.linspace(0, 1, len(x)); env = np.sin(np.pi * t) ** 1.6
    return (band(x, lo, lo * 3) * (1 - t) + band(x, hi / 3, hi) * t) * env * gain
def cut():
    return whoosh(0.16, 500, 5200, 0.1)
def thump():
    return tone(95, 42, 0.32, 9) * 0.8 + band(noise(0.32), 60, 500) * np.exp(-span(0.32) * 16) * 0.3
def zap(seconds=0.4, gain=0.3):
    x = band(noise(seconds), 1500, 9000); gate = (rng.random(int(seconds * 90) + 1) > 0.45).astype(float)
    g = np.repeat(gate, SR // 90 + 1)[: len(x)]; return x * g * np.exp(-span(seconds) * (2 / seconds)) * gain + tone(120, 90, seconds, 3) * 0.08 * np.sign(np.sin(span(seconds) * 2 * np.pi * 120))
def shimmer(seconds=0.9, gain=0.12, count=16):
    x = np.zeros(int(seconds * SR))
    for k in range(count):
        at = int(rng.uniform(0, 0.5) * len(x)); f = rng.uniform(3000, 8200); y = tone(f, f * 1.03, seconds * 0.5, 16)
        x[at:at + len(y)] += y[: len(x) - at]
    return x * gain
def metal():
    t = span(0.8); return sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((1180, 0.22, 7), (2740, 0.14, 10), (4310, 0.08, 14))) + whoosh(0.8, 500, 3000, 0.1)
def glass():
    x = whoosh(0.55, 400, 3600, 0.3); t = span(0.55); return x + np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 11) * 0.08
def swell(seconds=0.6):
    t = np.linspace(0, 1, int(seconds * SR)); return band(noise(seconds), 120, 900) * np.sin(np.pi * t) * 0.12
def crackle(seconds):
    x = np.zeros(int(seconds * SR)); base = band(noise(seconds), 100, 800) * 0.07
    for _ in range(int(seconds * 34)):
        at = rng.integers(0, max(1, len(x) - 300)); y = band(noise(0.006), 1500, 8000) * rng.uniform(0.1, 0.34); x[at:at + len(y)] += y
    t = np.linspace(0, 1, len(x)); return (x + base) * np.minimum(1, np.minimum(t * 12, (1 - t) * 12))
def roar():
    t = span(0.7); return band(noise(0.7), 90, 1200) * np.exp(-t * 3.5) * (1 - np.exp(-t * 30)) * 0.5
def drop():
    a = tone(240, 1150, 0.1, 18) * 0.5; n = int(0.36 * SR); x = np.zeros(n); x[:len(a)] += a
    b = tone(420, 1500, 0.07, 26) * 0.26; x[int(0.1 * SR):int(0.1 * SR) + len(b)] += b
    r = tone(800, 340, 0.2, 18) * 0.12; x[int(0.15 * SR):int(0.15 * SR) + len(r)] += r; return x
def water(seconds):
    x = band(noise(seconds), 200, 1400) * 0.1; t = np.linspace(0, 1, len(x)); lap = 0.6 + 0.4 * np.sin(2 * np.pi * 3 * t * seconds)
    y = np.zeros(len(x))
    for _ in range(int(seconds * 14)):
        at = rng.integers(0, max(1, len(x) - 3000)); f = rng.uniform(500, 1500); b = tone(f, f * 1.6, 0.05, 50) * 0.08; y[at:at + len(b)] += b
    return (x * lap * t ** 0.5 + y) * np.minimum(1, (1 - t) * 8)
def stretch():
    t = span(0.4); f = 150 * (700 / 150) ** (t / 0.4) * (1 + 0.04 * np.sin(2 * np.pi * 34 * t)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t * 18) * 0.26
def snap():
    x = tone(900, 90, 0.26, 12) * 0.46; h = band(noise(0.02), 1500, 8000) * 0.5; x[:len(h)] += h; return x
def sonar():
    x = np.zeros(int(0.8 * SR)); p = tone(1420, 1400, 0.45, 8) * 0.32; x[:len(p)] += p; e = tone(1420, 1400, 0.3, 11) * 0.12; x[int(0.28 * SR):int(0.28 * SR) + len(e)] += e; return x + whoosh(0.8, 900, 5000, 0.05)
def sub():
    t = span(0.72); f = 210 * (32 / 210) ** (t / 0.72); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t * 8) * 0.6 + whoosh(0.72, 300, 2400, 0.25)[::-1]
def dissolve():
    n = int(1.2 * SR); x = np.zeros(n)
    for k in range(240):
        at = int((k / 240) ** 0.8 * (n - 700)); f = 5200 - 4400 * k / 240; y = tone(f, f, 0.01, 400) * rng.uniform(0.05, 0.18); x[at:at + len(y)] += y
    return x + whoosh(1.2, 300, 4000, 0.09)

EIGHTH = 1 / 3
def key_hits():
    out = []
    for n in range(24):
        m = n % 16
        if m in (0, 3, 5, 8, 11, 13) or m % 4 == 2 or m in (6, 7, 10, 14, 15):
            out.append((n * EIGHTH, pad))
    return out
TYPE = [(0.3 + i * 0.1, key) for i in range(13)]
# Scene time, sound. A long sound is placed once, where its event falls inside a cut.
SCENES = {
    "hello": [(0.1, whoosh), (0.68, toggle)],
    "settings": [(0.42, toggle), (0.55, press)] + [(0.75 + i * 0.05, tick) for i in range(9)],
    "diff": [(0.05, lambda: whoosh(0.46, 300, 2800, 0.3))] + [(0.06 + i * 0.05, tick) for i in range(8)],
    "table": [(i * 0.055, tick) for i in range(25)],
    "today": [(0.3, lambda: whoosh(0.3, 500, 2500, 0.14)), (0.9, lambda: whoosh(0.6, 250, 3000, 0.3))],
    "op1": [(0.0, swell)],
    "nowplaying": [(0.35, glass)] + [(1.05 + i * 0.07, pop) for i in range(5)],
    "launcher": [(0.0, swell)],
    "ask": TYPE + [(1.55, press), (1.6, lambda: whoosh(0.4, 400, 3600, 0.24))] + [(2.0 + i * 0.12, pop) for i in range(4)],
    "library": sum(([(t, press), (t + 0.03, thump)] for t in (0.5, 1.1667, 1.8333)), []),
    "fire": [(0.95, press), (0.96, roar)],
    "pricing": [(0.55, tick), (1.25, press), (1.28, zap)],
    "deploy": [(0.7, press), (0.72, metal), (1.6, press), (1.64, metal), (1.66, shimmer)],
    "keys": key_hits(),
    "logo": [(0.08 + i * 0.03, pop) for i in range(30)] + [(0.2, lambda: shimmer(1.6, 0.05, 20))],
    "card": [(2.9, lambda: shimmer(1.2, 0.04, 10))],
}
placed = []
for edit in C:
    scene, start, dur, t0 = edit[:4]
    at = OPENING + FLEX + start
    if start > 0:
        placed.append((at, cut))
    for t, sound in SCENES.get(scene, []):
        if t0 <= t < t0 + dur:
            placed.append((at + t - t0, sound))
    if scene == "fire":
        placed.append((at, lambda d=dur: crackle(d)))
    if scene == "pricing":
        placed.append((at, lambda d=dur: zap(d, 0.05)))

F = OPENING
BEAT = 2 / 3
# Water Divination runs 4 beats with a drop every eighth; Godspeed and Bungee Gum fire twice.
placed += [(F + 0.02 + i * EIGHTH, drop) for i in range(8)] + [(F + 0.02 + i * EIGHTH, click) for i in range(8)] + [(F, lambda: water(2.667))]
g = F + 4 * BEAT
placed += [(g, cut), (g + 0.02, stretch), (g + 0.44, snap), (g + 0.7, stretch), (g + 1.11, snap)]
e = g + 2 * BEAT
placed += [(e, cut), (e, sonar)]
s = e + BEAT
placed += [(s, cut), (s, lambda: zap(0.66, 0.34)), (s + BEAT, lambda: zap(0.66, 0.34))]
n = s + 2 * BEAT
placed += [(n, cut), (n, sub)]
z = n + BEAT
placed += [(z, cut), (z + 0.05, dissolve)]

length = int(46 * SR)
mix = np.zeros(length)
for at, sound in placed:
    x = sound()
    i = int(at * SR)
    mix[i:i + len(x)] += x[: max(0, length - i)]
mix = mix / max(1.0, np.abs(mix).max()) * 0.8
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-ac", "2", sys.argv[1]], input=mix.astype("<f4").tobytes(), check=True)
print(f"{len(placed)} sounds, peak {np.abs(mix).max():.2f}")
