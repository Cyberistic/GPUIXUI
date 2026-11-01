/**
 * The film's score: an original solo-piano piece, written as notes and saved as
 * a Standard MIDI File, rendered by `fluidsynth` with the Salamander Grand Piano
 * (CC BY 3.0, Alexander Holm) — see README §Sound.
 *
 * 120 BPM, D major opening on its relative minor (Bm – G – D – A). Sixteen
 * bars for the v4 film (plan 066): four of theme from the first beat, four
 * lifted an octave, four of climax in octaves, a bar of chord stabs (one per
 * beat, under the four words, 24–26 s) and the final chord held for the mark. The playing
 * is humanised with a fixed seed, so every render is the same file.
 *
 *   nub media/launch/sound/piano.ts media/launch/sound/piano.mid
 */
import { writeFileSync } from "node:fs";

export const BPM = 120;
const PPQ = 480;

/** A note: start and length in beats, MIDI pitch, velocity 1–127. */
type Note = readonly [
  start: number,
  length: number,
  pitch: number,
  velocity: number,
];

const N = {
  B2: 47,
  G2: 43,
  D3: 50,
  A2: 45,
  A3: 57,
  D4: 62,
  Fs4: 66,
  A4: 69,
  B4: 71,
  Cs5: 73,
  D5: 74,
  E5: 76,
  Fs5: 78,
  G5: 79,
  A5: 81,
  B5: 83,
  Cs6: 85,
  D6: 86,
} as const;

/** The four chords, each a root and the tones its arpeggio climbs through. */
const chords = [
  { root: N.B2, tones: [54, 59, 62] }, // Bm: F#3 B3 D4
  { root: N.G2, tones: [50, 55, 59] }, // G: D3 G3 B3
  { root: N.D3, tones: [57, 62, 66] }, // D: A3 D4 F#4
  { root: N.A2, tones: [52, 57, 61] }, // A: E3 A3 C#4
] as const;

/** One bar of left hand: root, fifth, octave, tenth, then back down, in eighths. */
const arpeggio = (
  bar: number,
  chord: (typeof chords)[number],
  velocity: number,
): Note[] => {
  const [fifth, octave, tenth] = chord.tones;
  return [chord.root, fifth, octave, tenth, fifth, octave, tenth, octave].map(
    (pitch, i): Note => [
      bar * 4 + i * 0.5,
      i === 0 ? 2 : 0.5,
      pitch,
      i === 0 ? velocity + 8 : velocity,
    ],
  );
};

/** Right-hand phrases, one bar each, as [beat, length, pitch]. */
type Phrase = ReadonlyArray<readonly [number, number, number]>;

const theme: ReadonlyArray<Phrase> = [
  [
    [0, 1, N.Fs5],
    [1, 0.5, N.E5],
    [1.5, 0.5, N.D5],
    [2, 1.5, N.B4],
    [3.5, 0.5, N.D5],
  ],
  [
    [0, 1.5, N.D5],
    [1.5, 0.5, N.E5],
    [2, 1, N.G5],
    [3, 1, N.Fs5],
  ],
  [
    [0, 1, N.Fs5],
    [1, 0.5, N.E5],
    [1.5, 0.5, N.D5],
    [2, 1, N.A4],
    [3, 0.5, N.D5],
    [3.5, 0.5, N.E5],
  ],
  [
    [0, 2, N.E5],
    [2, 0.5, N.Cs5],
    [2.5, 0.5, N.D5],
    [3, 1, N.E5],
  ],
];

const lift: ReadonlyArray<Phrase> = [
  [
    [0, 0.5, N.B5],
    [0.5, 0.5, N.A5],
    [1, 1, N.Fs5],
    [2, 0.5, N.D5],
    [2.5, 0.5, N.E5],
    [3, 1, N.Fs5],
  ],
  [
    [0, 1, N.G5],
    [1, 0.5, N.Fs5],
    [1.5, 0.5, N.E5],
    [2, 1, N.D5],
    [3, 0.5, N.E5],
    [3.5, 0.5, N.Fs5],
  ],
  [
    [0, 1.5, N.A5],
    [1.5, 0.5, N.Fs5],
    [2, 1, N.D5],
    [3, 1, N.Fs5],
  ],
  [
    [0, 1, N.E5],
    [1, 1, N.Cs5],
    [2, 1, N.E5],
    [3, 1, N.A5],
  ],
];

const climax: ReadonlyArray<Phrase> = [
  [
    [0, 1.5, N.D6],
    [1.5, 0.5, N.Cs6],
    [2, 1, N.B5],
    [3, 1, N.Fs5],
  ],
  [
    [0, 1, N.G5],
    [1, 1, N.B5],
    [2, 1, N.D6],
    [3, 1, N.B5],
  ],
  [
    [0, 1.5, N.A5],
    [1.5, 0.5, N.B5],
    [2, 1, N.A5],
    [3, 1, N.Fs5],
  ],
  [
    [0, 2, N.E5],
    [2, 2, N.Cs6],
  ],
];

/** A deterministic wobble for timing and velocity (a linear congruential generator). */
const wobble = (() => {
  let seed = 104;
  return (span: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return ((seed / 2147483648) * 2 - 1) * span;
  };
})();

const notes: Note[] = [];
const phrase = (
  bar: number,
  p: Phrase,
  velocity: number,
  octaveBelow = false,
) => {
  for (const [beat, length, pitch] of p) {
    notes.push([bar * 4 + beat, length, pitch, velocity]);
    if (octaveBelow)
      notes.push([bar * 4 + beat, length, pitch - 12, velocity - 14]);
  }
};

// Theme, lift and climax, four bars each from the first beat.
const sections: ReadonlyArray<
  readonly [ReadonlyArray<Phrase>, number, number, boolean]
> = [
  [theme, 70, 54, false],
  [lift, 80, 60, false],
  [climax, 94, 72, true],
];
let at = 0;
for (const [bars, right, left, octaves] of sections) {
  bars.forEach((p, i) => {
    notes.push(...arpeggio(at + i, chords[i]!, left));
    phrase(at + i, p, right, octaves);
  });
  at += bars.length;
}
// The bar after the sections: a stab on each beat — Bm, G, D, A — one under each word.
const STAB = at;
chords.forEach((chord, beat) => {
  for (const pitch of [chord.root, ...chord.tones, chord.tones[2] + 12])
    notes.push([STAB * 4 + beat, 0.8, pitch, 84]);
});
// The next three bars: the final D-major chord, held for the mark.
for (const pitch of [38, N.D3, N.A3, N.Fs4, N.A4, N.D5])
  notes.push([(STAB + 1) * 4, 12, pitch, 70]);

/** The whole piece, in bars and beats. */
const BARS = STAB + 4;
export const BEATS = BARS * 4;

const vlq = (value: number): number[] => {
  const bytes = [value & 0x7f];
  for (let v = value >> 7; v > 0; v >>= 7) bytes.unshift((v & 0x7f) | 0x80);
  return bytes;
};

const track = (): number[] => {
  const events: Array<{ tick: number; data: number[] }> = [];
  const tick = (beat: number) => Math.max(0, Math.round(beat * PPQ));
  for (const [start, length, pitch, velocity] of notes) {
    const at = start + wobble(0.02);
    const v = Math.max(1, Math.min(127, Math.round(velocity + wobble(5))));
    events.push(
      { tick: tick(at), data: [0x90, pitch, v] },
      { tick: tick(at + length * 0.95), data: [0x80, pitch, 0] },
    );
  }
  // The sustain pedal, re-pressed on every bar (and held through the ending).
  for (let bar = 0; bar < BARS; bar += 1) {
    if (bar <= STAB + 1)
      events.push({ tick: tick(bar * 4) + 10, data: [0xb0, 64, 0] });
    events.push({ tick: tick(bar * 4) + 30, data: [0xb0, 64, 100] });
  }
  events.push({ tick: tick(BEATS), data: [0xb0, 64, 0] });
  events.sort((a, b) => a.tick - b.tick || a.data[0]! - b.data[0]!);
  const tempo = Math.round(60_000_000 / BPM);
  const out = [
    0x00,
    0xff,
    0x51,
    0x03,
    (tempo >> 16) & 0xff,
    (tempo >> 8) & 0xff,
    tempo & 0xff,
    0x00,
    0xc0,
    0x00,
  ];
  let last = 0;
  for (const { tick: t, data } of events) {
    out.push(...vlq(t - last), ...data);
    last = t;
  }
  out.push(...vlq(PPQ), 0xff, 0x2f, 0x00);
  return out;
};

const u32 = (n: number) => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];
/** The chunk tags: "MThd" and "MTrk". */
const MTHD = [0x4d, 0x54, 0x68, 0x64];
const MTRK = [0x4d, 0x54, 0x72, 0x6b];
const body = track();
const file = Uint8Array.from([
  ...MTHD,
  ...u32(6),
  0,
  0,
  0,
  1,
  (PPQ >> 8) & 0xff,
  PPQ & 0xff,
  ...MTRK,
  ...u32(body.length),
  ...body,
]);

const [, , out] = process.argv;
if (out !== undefined) writeFileSync(out, file);
