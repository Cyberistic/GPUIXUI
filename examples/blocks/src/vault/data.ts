/** The vault's sample notes: a Hunter's field journal, linked by `[[id]]`. */

export interface VaultNote {
  readonly id: string;
  readonly title: string;
  readonly folder: string;
  /** A paragraph per entry; `[[id]]` is a link to another note. */
  readonly body: ReadonlyArray<string>;
  /** Where the note sits on the graph, as fractions of its box. */
  readonly at: readonly [x: number, y: number];
}

export const vaultNotes: ReadonlyArray<VaultNote> = [
  {
    id: "nen",
    title: "Nen",
    folder: "Training",
    at: [0.5, 0.46],
    body: [
      "The manipulation of aura. Everything starts with [[ten]] and every Hunter ends up with a [[hatsu]] of their own.",
      "Wing teaches it through the Water Divination test. The glass overflowed for [[gon]] on the first try.",
    ],
  },
  {
    id: "ten",
    title: "Ten",
    folder: "Training",
    at: [0.2, 0.22],
    body: [
      "Keep the aura from leaving the body. The first of the four principles of [[nen]] and the last to master.",
      "Held for an hour on the first day, three on the second.",
    ],
  },
  {
    id: "hatsu",
    title: "Hatsu",
    folder: "Training",
    at: [0.82, 0.24],
    body: [
      "A personal ability, shaped by type. Jajanken came from [[gon]] after [[nen]] and a bout at [[arena]] that went badly.",
      "Six types around one hexagon; the further from your own, the less of it you keep.",
    ],
  },
  {
    id: "gon",
    title: "Gon Freecss",
    folder: "Hunters",
    at: [0.78, 0.74],
    body: [
      "Enhancer. Whale Island. Looking for his father, and passed the 287th exam on the first try.",
      "Trained at [[arena]] with Killua and then learned [[nen]] under Wing.",
    ],
  },
  {
    id: "arena",
    title: "Heavens Arena",
    folder: "Places",
    at: [0.22, 0.76],
    body: [
      "Two hundred and fifty-one floors of bouts. Past floor 200 nobody fights without [[nen]] at hand.",
      "The record sits on the page for [[gon]] now.",
    ],
  },
];
