export const FADED_IDS = {
  probe: "faded-probe",
  before: "faded-before",
  control: "faded-control",
  coveredTarget: "faded-covered-target",
  cover: "faded-cover",
  inertTarget: "faded-inert-target",
  inertCover: "faded-inert-cover",
  readout: "faded-readout",
} as const;

export const FADED_OPACITY = 0;

export const FADED_WIDTH = 200;
export const FADED_HEIGHT = 32;

export const FADED_KEY = "a";

export interface FadedPresses {
  readonly faded: number;

  readonly keys: number;

  readonly cover: number;

  readonly target: number;

  readonly inertCover: number;

  readonly inertTarget: number;
}

export const fadedReadout = (presses: FadedPresses): string =>
  `faded=${presses.faded} keys=${presses.keys} cover=${presses.cover} target=${presses.target} inertCover=${presses.inertCover} inertTarget=${presses.inertTarget}`;

export const FADED_CHECKS = 3 + 5 + 1 + 1 + 1 + 4 + 4;

export const FADED_PRESS_CASES: ReadonlyArray<{
  readonly aimedAt: string;
  readonly hears: keyof FadedPresses;
  readonly rule: string;
}> = [
  {
    aimedAt: FADED_IDS.control,
    hears: "faded",
    rule: "a share of zero removes the ink, not the box it was painted on",
  },
  {
    aimedAt: FADED_IDS.coveredTarget,
    hears: "cover",
    rule: "a transparent cover is still in the pointer's path",
  },
  {
    aimedAt: FADED_IDS.inertTarget,
    hears: "inertTarget",
    rule: "pointerEvents none lets the press through, while the cover's own handler still runs",
  },
];
