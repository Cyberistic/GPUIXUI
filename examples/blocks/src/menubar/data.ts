/** The menu-bar extra's sample state: what Killua's monitor watches. */

export interface Watch {
  readonly id: string;
  readonly label: string;
  readonly on: boolean;
}

export const watches: ReadonlyArray<Watch> = [
  { id: "arena", label: "Heavens Arena bouts", on: true },
  { id: "auction", label: "Yorknew auction", on: false },
  { id: "exam", label: "Hunter Exam results", on: true },
  { id: "island", label: "Greed Island trades", on: false },
];

/** The sync the footer's progress shows, 0 – 1. */
export const syncProgress = 0.62;
