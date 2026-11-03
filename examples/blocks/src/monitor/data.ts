/** The monitor's sensors, memory, network, drives and processes. */
export interface Sensor {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly seed: number;
  readonly load: number;
  readonly temp: number;
  readonly clock: string;
  readonly fan: string;
}

export const sensors: ReadonlyArray<Sensor> = [
  {
    id: "cpu",
    label: "CPU",
    detail: "Intel Core i9-13900K",
    seed: 7,
    load: 6,
    temp: 34,
    clock: "5100MHz",
    fan: "2323RPM",
  },
  {
    id: "gpu",
    label: "GPU",
    detail: "NVIDIA RTX 4090",
    seed: 19,
    load: 11,
    temp: 50,
    clock: "225MHz",
    fan: "0RPM",
  },
];

/** The windows the range control offers, in minutes. */
export const ranges = [1, 5, 15] as const;
export type Range = (typeof ranges)[number];

export const memory = { used: 26, total: "32 GB" } as const;

export const network = {
  up: "5 KB/s",
  down: "6 KB/s",
  interface: "iCUE",
  total: "17 KB/s",
} as const;

export interface Drive {
  readonly letter: string;
  readonly used: number;
  readonly label: string;
}

export const drives: ReadonlyArray<Drive> = [
  { letter: "C:", used: 674 / 954, label: "674GB / 954GB" },
  { letter: "D:", used: 1.6 / 1.8, label: "1.6TB / 1.8TB" },
  { letter: "E:", used: 1.2 / 1.8, label: "1.2TB / 1.8TB" },
];

export interface Process {
  readonly name: string;
  readonly cpu: string;
  readonly gpu: string;
  readonly ram: string;
  readonly down: string;
  readonly up: string;
}

export const processes: ReadonlyArray<Process> = [
  {
    name: "chrome",
    cpu: "1%",
    gpu: "1%",
    ram: "4579MB",
    down: "2.1KB/s",
    up: "2.8KB/s",
  },
  {
    name: "System",
    cpu: "1%",
    gpu: "0%",
    ram: "0MB",
    down: "0B/s",
    up: "0B/s",
  },
  {
    name: "slack",
    cpu: "0%",
    gpu: "2%",
    ram: "405MB",
    down: "0B/s",
    up: "0B/s",
  },
  {
    name: "WindowServer",
    cpu: "0%",
    gpu: "3%",
    ram: "612MB",
    down: "0B/s",
    up: "0B/s",
  },
];
