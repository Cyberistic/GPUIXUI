/**
 * The stats block's sample data: Heavens Arena, as the fighters' manager sees it.
 */
export const ranges = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;
export type Range = (typeof ranges)[number]["value"];

export interface Tile {
  readonly label: string;
  readonly value: string;
  readonly change: string;
  readonly trend: ReadonlyArray<number>;
}

export interface Dataset {
  readonly tiles: ReadonlyArray<Tile>;
  /** Bout wins per period, by fighter. */
  readonly labels: ReadonlyArray<string>;
  readonly wins: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly values: ReadonlyArray<number>;
  }>;
  /** Average aura output per period. */
  readonly aura: ReadonlyArray<number>;
}

export const datasets: Readonly<Record<Range, Dataset>> = {
  week: {
    tiles: [
      {
        label: "Bouts",
        value: "128",
        change: "+12%",
        trend: [8, 11, 9, 14, 13, 18, 21],
      },
      {
        label: "Wins",
        value: "87",
        change: "+9%",
        trend: [5, 7, 6, 9, 10, 12, 15],
      },
      {
        label: "Top floor",
        value: "200",
        change: "+50",
        trend: [150, 150, 170, 180, 190, 190, 200],
      },
      {
        label: "Aura",
        value: "64",
        change: "+6",
        trend: [52, 55, 54, 58, 60, 61, 64],
      },
    ],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    wins: [
      { key: "gon", label: "Gon", values: [3, 5, 4, 6, 6, 8, 9] },
      { key: "killua", label: "Killua", values: [4, 4, 6, 5, 7, 7, 8] },
    ],
    aura: [52, 55, 54, 58, 60, 61, 64],
  },
  month: {
    tiles: [
      {
        label: "Bouts",
        value: "512",
        change: "+31%",
        trend: [80, 96, 120, 128, 140, 150],
      },
      {
        label: "Wins",
        value: "341",
        change: "+27%",
        trend: [50, 61, 79, 87, 98, 104],
      },
      {
        label: "Top floor",
        value: "200",
        change: "+100",
        trend: [100, 130, 150, 170, 190, 200],
      },
      {
        label: "Aura",
        value: "61",
        change: "+14",
        trend: [47, 50, 53, 57, 59, 61],
      },
    ],
    labels: ["W1", "W2", "W3", "W4"],
    wins: [
      { key: "gon", label: "Gon", values: [18, 24, 31, 41] },
      { key: "killua", label: "Killua", values: [22, 27, 33, 38] },
    ],
    aura: [47, 53, 57, 61],
  },
};

/** The Nen types among the arena's fighters this season. */
export const nenTypes = [
  { key: "enhancer", label: "Enhancer", value: 34 },
  { key: "transmuter", label: "Transmuter", value: 22 },
  { key: "emitter", label: "Emitter", value: 18 },
  { key: "conjurer", label: "Conjurer", value: 12 },
  { key: "manipulator", label: "Manipulator", value: 9 },
  { key: "specialist", label: "Specialist", value: 5 },
] as const;
