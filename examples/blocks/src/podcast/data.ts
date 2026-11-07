export interface Episode {
  readonly id: string;
  readonly title: string;
  readonly show: string;
  readonly seconds: number;
  readonly seed: number;
}

export const episodes: ReadonlyArray<Episode> = [
  {
    id: "exam",
    title: "The 287th Hunter Exam",
    show: "Whale Island Radio",
    seconds: 2536,
    seed: 7,
  },
  {
    id: "yorknew",
    title: "Yorknew City",
    show: "Whale Island Radio",
    seconds: 3482,
    seed: 11,
  },
  {
    id: "greed",
    title: "Greed Island",
    show: "Whale Island Radio",
    seconds: 3100,
    seed: 23,
  },
  {
    id: "chimera",
    title: "Chimera Ant",
    show: "Whale Island Radio",
    seconds: 3972,
    seed: 31,
  },
  {
    id: "nen",
    title: "Nen: Ten, Zetsu, Ren, Hatsu",
    show: "Whale Island Radio",
    seconds: 2850,
    seed: 43,
  },
];
