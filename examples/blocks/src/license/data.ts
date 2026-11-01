/** The Hunter License block's sample data: the Association's registry. */

export const specialties = [
  "Treasure",
  "Blacklist",
  "Beast",
  "Gourmet",
  "Contract",
] as const;
export type Specialty = (typeof specialties)[number];

export interface Hunter {
  readonly id: string;
  readonly name: string;
  readonly specialty: Specialty;
  /** Stars: a single, double or triple-star hunter, or none yet. */
  readonly stars: 0 | 1 | 2 | 3;
  readonly licence: string;
  readonly exam: number;
  readonly since: string;
}

export const hunters: ReadonlyArray<Hunter> = [
  {
    id: "gon",
    name: "Gon Freecss",
    specialty: "Treasure",
    stars: 0,
    licence: "HL-287-0405",
    exam: 287,
    since: "2025-01-05",
  },
  {
    id: "killua",
    name: "Killua Zoldyck",
    specialty: "Contract",
    stars: 0,
    licence: "HL-288-0099",
    exam: 288,
    since: "2026-01-07",
  },
  {
    id: "kurapika",
    name: "Kurapika",
    specialty: "Blacklist",
    stars: 1,
    licence: "HL-287-0404",
    exam: 287,
    since: "2025-01-05",
  },
  {
    id: "leorio",
    name: "Leorio Paradinight",
    specialty: "Contract",
    stars: 0,
    licence: "HL-287-0403",
    exam: 287,
    since: "2025-01-05",
  },
  {
    id: "ging",
    name: "Ging Freecss",
    specialty: "Treasure",
    stars: 2,
    licence: "HL-267-0001",
    exam: 267,
    since: "2006-01-09",
  },
  {
    id: "bisky",
    name: "Biscuit Krueger",
    specialty: "Treasure",
    stars: 2,
    licence: "HL-232-0007",
    exam: 232,
    since: "1971-01-11",
  },
  {
    id: "menchi",
    name: "Menchi",
    specialty: "Gourmet",
    stars: 1,
    licence: "HL-271-0012",
    exam: 271,
    since: "2010-01-08",
  },
  {
    id: "knuckle",
    name: "Knuckle Bine",
    specialty: "Beast",
    stars: 0,
    licence: "HL-276-0033",
    exam: 276,
    since: "2015-01-06",
  },
];

/** What a licence opens, and whether the holder has it on. */
export interface Privilege {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
}

export const privileges: ReadonlyArray<Privilege> = [
  {
    id: "restricted",
    label: "Restricted areas",
    detail: "Entry to 90% of the world's closed regions",
  },
  {
    id: "records",
    label: "Public records",
    detail: "Read access to national registries",
  },
  {
    id: "transit",
    label: "Free transit",
    detail: "Public transport at no charge",
  },
  {
    id: "loans",
    label: "Association loans",
    detail: "Credit against the licence",
  },
];
