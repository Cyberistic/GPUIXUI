"""The cut's sound design: earshot takes placed on every cut."""
import pathlib
import numpy as np
import soundfile as sf
import soxr

SR = 48_000
DURATION = 19.4
SFX = pathlib.Path("/tmp/film/audio/sfx")

CUES = [
    (0.12, "sub", -12),
    (0.55, "soft", -16),
    (1.10, "tink", -22),
    (1.80, "swish_flick", -18),
    (1.84, "knock_wood", -22),
    (3.40, "swish_flick", -19),
    (4.60, "swish_flick", -19),
    (6.00, "swish_flick", -19),
    (7.20, "swish_flick", -19),
    (8.60, "swish_flick", -19),
    (9.80, "kick", -13),
    (9.84, "punch", -14),
    (10.80, "swish_flick", -19),
    (12.00, "swish_flick", -19),
    (13.20, "swish_bright", -17),
    (15.60, "swell", -18),
    (15.80, "glock", -14),
    (16.30, "chime", -18),
    (18.40, "rumble", -22),
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

time = np.arange(len(mix)) / SR
fade = np.clip(time / 2.0, 0, 1) ** 2 * np.clip((DURATION - time) / 1.8, 0, 1) ** 2
bed = (np.sin(2 * np.pi * 45 * time) + 0.5 * np.sin(2 * np.pi * 90 * time + 0.7)) * (0.012 * fade)
mix += np.stack([bed, bed], axis=1)

mix = np.tanh(mix * 0.9)
mix *= 0.89 / max(1e-9, float(np.max(np.abs(mix))))
sf.write("/tmp/film/mix2.wav", mix, SR, subtype="PCM_24")
print("mix2:", round(len(mix) / SR, 2), "s")
