/** The notes block's sample data: Kurapika's field notes and the guild's. */

export const folders = ["All notes", "Field work", "Exam"] as const;
export type Folder = (typeof folders)[number];

export interface Note {
  readonly id: string;
  readonly folder: Exclude<Folder, "All notes">;
  readonly title: string;
  readonly body: string;
  /** ISO date. */
  readonly edited: string;
}

export const notes: ReadonlyArray<Note> = [
  {
    id: "n1",
    folder: "Field work",
    title: "Yorknew auction",
    body: "Phantom Troupe sighted near the Cemetery Building. Leorio keeps the car ready at the north gate.",
    edited: "2026-10-30",
  },
  {
    id: "n2",
    folder: "Exam",
    title: "Phase two menu",
    body: "Menchi wants sushi. Nobody knows what sushi is. Gon caught a fish anyway.",
    edited: "2026-10-29",
  },
  {
    id: "n3",
    folder: "Field work",
    title: "Greed Island cards",
    body: "Killua's binder: 0 restricted slots left. Trade the Plot of Land for a Magnetic Force.",
    edited: "2026-10-27",
  },
  {
    id: "n4",
    folder: "Exam",
    title: "Trick Tower routes",
    body: "The majority-rule path takes seventy-two hours. Tonpa will vote no on everything.",
    edited: "2026-10-24",
  },
  {
    id: "n5",
    folder: "Field work",
    title: "Heavens Arena floors",
    body: "Floor 200 needs Nen. Wing says no fights for two months.",
    edited: "2026-10-20",
  },
];
