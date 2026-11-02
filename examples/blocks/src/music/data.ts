/** The player's queue: four tracks, each with its own art and waveform seed. */
export interface Track {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly seconds: number;
  readonly seed: number;
}

export const tracks: ReadonlyArray<Track> = [
  {
    id: "snowfall",
    title: "Snowfall",
    artist: "Lofi Girl",
    seconds: 192,
    seed: 7,
  },
  {
    id: "cosmic",
    title: "Cosmic Waves",
    artist: "Weaver Beats",
    seconds: 215,
    seed: 11,
  },
  {
    id: "cobalt",
    title: "Cobalt",
    artist: "Hunter Sound",
    seconds: 168,
    seed: 23,
  },
  {
    id: "drift",
    title: "Drift",
    artist: "Arena Tapes",
    seconds: 204,
    seed: 31,
  },
];
