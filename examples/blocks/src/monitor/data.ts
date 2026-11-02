/** The monitor's sensors, cores and windows. */
export interface Sensor {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly seed: number;
  readonly base: number;
}

export const sensors: ReadonlyArray<Sensor> = [
  {
    id: "cpu",
    label: "CPU Temp",
    detail: "Intel Core i9-13900K",
    seed: 7,
    base: 68,
  },
  {
    id: "gpu",
    label: "GPU Temp",
    detail: "NVIDIA RTX 4090",
    seed: 19,
    base: 74,
  },
];

export const cores: ReadonlyArray<number> = [38, 54, 47, 71, 62, 44, 58, 33];

/** The windows the range control offers, in minutes. */
export const ranges = [1, 5, 15] as const;
export type Range = (typeof ranges)[number];

export const memory = [
  { key: "used", label: "Used", value: 6.1 },
  { key: "free", label: "Free", value: 5.9 },
] as const;
