"""Mix the launch film's sound design: earshot effects over a quiet sub bed."""

import json
import pathlib

import numpy as np
import soundfile as sf
import soxr

SR = 48_000
DURATION = 27.2
SFX = pathlib.Path("/tmp/film/audio/sfx")

CUES = [
    (0.10, "sub", -14),
    (0.62, "soft", -13),
    (1.15, "tink", -19),
    (1.45, "pop_soft", -23),
    (3.50, "pop_soft", -15),
    (4.30, "pop_step", -15),
    (5.12, "pop_boop", -13),
    (5.20, "punch", -13),
    (7.18, "swish_bright", -13),
    (7.24, "knock_wood", -19),
    (8.66, "swish_flick", -15),
    (8.72, "knock_wood", -19),
    (10.06, "swish_flick", -15),
    (10.12, "knock_wood", -19),
    (11.36, "swish_flick", -15),
    (11.42, "knock_wood", -19),
    (12.58, "kick", -14),
    (14.06, "punch", -12),
    (14.45, "snap", -19),
    (14.85, "snap", -19),
    (15.25, "snap", -19),
    (17.42, "sub_long", -18),
    (17.62, "pop_boop", -13),
    (18.08, "tink", -19),
    (18.62, "knock_wood", -17),
    (19.02, "knock_wood", -18),
    (19.42, "knock_desk", -17),
    (20.12, "swish_zing", -15),
    (21.78, "kick", -14),
    (21.95, "knock_desk", -19),
    (24.30, "swell", -17),
    (24.50, "glock", -13),
    (25.10, "chime", -17),
    (26.60, "rumble", -24),
]

# The tick run under the counter: the same click rising in pitch and force.
for index in range(13):
    at = 12.90 + index * 0.085
    CUES.append((at, "tink" if index % 2 == 0 else "tink_hi", -17 + index * 0.7))


def load(name: str) -> np.ndarray:
    data, rate = sf.read(SFX / f"{name}.wav", dtype="float32", always_2d=True)
    if rate != SR:
        data = soxr.resample(data, rate, SR)
    if data.shape[1] == 1:
        data = np.repeat(data, 2, axis=1)
    return data


def place(mix: np.ndarray, sample: np.ndarray, start: float, gain_db: float) -> None:
    start_index = int(round(start * SR))
    end_index = min(len(mix), start_index + len(sample))
    if start_index >= len(mix):
        return
    span = sample[: end_index - start_index] * (10 ** (gain_db / 20))
    mix[start_index:end_index] += span


mix = np.zeros((int(DURATION * SR), 2), dtype=np.float32)
cache: dict[str, np.ndarray] = {}

for at, name, gain in CUES:
    cache.setdefault(name, load(name))
    place(mix, cache[name], at, gain)

# A sub bed: 45 Hz with its octave, faded in and out, so the cuts have a floor.
time = np.arange(len(mix)) / SR
fade_in = np.clip(time / 3.0, 0, 1) ** 2
fade_out = np.clip((DURATION - time) / 2.4, 0, 1) ** 2
bed = (
    np.sin(2 * np.pi * 45 * time)
    + 0.5 * np.sin(2 * np.pi * 90 * time + 0.7)
    + 0.22 * np.sin(2 * np.pi * 135 * time + 1.9)
) * (0.012 * fade_in * fade_out)
mix += np.stack([bed, bed], axis=1)

# A soft limiter, then leave headroom for the loudness pass.
peak = float(np.max(np.abs(mix)))
if peak > 0:
    mix = mix / peak * 1.6
mix = np.tanh(mix * 0.9)
mix *= 0.89 / max(1e-9, float(np.max(np.abs(mix))))

sf.write("/tmp/film/mix.wav", mix, SR, subtype="PCM_24")
print("wrote mix:", round(len(mix) / SR, 2), "s, peak", round(float(np.max(np.abs(mix))), 3))
