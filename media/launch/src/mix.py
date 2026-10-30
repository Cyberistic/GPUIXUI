"""The blocks cut's sound design: a quiet bed, a cue on every section, a tick on every press."""
import pathlib
import numpy as np
import soundfile as sf
import soxr

SR = 48_000
DURATION = 20.53
SFX = pathlib.Path("/tmp/film/audio/sfx")

CUES = [
    (0.10, "sub", -13),
    (0.55, "soft", -17),
    (1.05, "tink", -22),
    (1.58, "swish_flick", -17),
    (1.62, "knock_wood", -21),
    (3.80, "click_soft", -14),
    (4.08, "swish_flick", -17),
    (4.12, "knock_wood", -21),
    (6.20, "click_soft", -15),
    (6.58, "swish_flick", -17),
    (6.62, "knock_wood", -21),
    (8.50, "click_soft", -15),
    (9.08, "swish_flick", -17),
    (9.12, "knock_wood", -21),
    (10.90, "click_soft", -15),
    (11.58, "swish_flick", -17),
    (11.62, "knock_wood", -21),
    (13.50, "click_soft", -15),
    (14.08, "swish_bright", -15),
    (14.14, "glock", -13),
    (15.40, "click_soft", -16),
    (16.88, "swell", -16),
    (16.98, "glock", -13),
    (17.50, "chime", -17),
    (19.60, "rumble", -21),
]


def load(name: str) -> np.ndarray:
    data, rate = sf.read(SFX / f"{name}.wav", dtype="float32", always_2d=True)
    if rate != SR:
        data = soxr.resample(data, rate, SR)
    if data.shape[1] == 1:
        data = np.repeat(data, 2, axis=1)
    return data


mix = np.zeros((int(DURATION * SR), 2), dtype=np.float32)
cache: dict[str, np.ndarray] = {}
for at, name, gain in CUES:
    sample = cache.setdefault(name, load(name))
    start = int(round(at * SR))
    end = min(len(mix), start + len(sample))
    if start < len(mix):
        mix[start:end] += sample[: end - start] * (10 ** (gain / 20))

# A bed: a slow, low triad with a breathing filter, under everything.
time = np.arange(len(mix)) / SR
fade = np.clip(time / 2.2, 0, 1) ** 2 * np.clip((DURATION - time) / 1.6, 0, 1) ** 2
breath = 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * time)
bed = (
    0.55 * np.sin(2 * np.pi * 55 * time)
    + 0.3 * np.sin(2 * np.pi * 82.5 * time + 0.4)
    + 0.18 * np.sin(2 * np.pi * 110 * time + 1.2)
    + 0.08 * np.sin(2 * np.pi * 220 * time + 2.1)
) * (0.020 * fade * breath)
mix += np.stack([bed, bed], axis=1)

mix = np.tanh(mix * 0.9)
mix *= 0.89 / max(1e-9, float(np.max(np.abs(mix))))
sf.write("/tmp/film/mix3.wav", mix, SR, subtype="PCM_24")
print("mix3:", round(len(mix) / SR, 2), "s")
