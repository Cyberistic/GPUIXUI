export const columns = ["Backlog", "In progress", "Done"] as const;
export type Column = (typeof columns)[number];

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly tag: string;
  readonly owner: string;
}

export const board: Readonly<Record<Column, ReadonlyArray<Task>>> = {
  Backlog: [
    {
      id: "icons",
      title: "Icon set for the dock",
      tag: "Design",
      owner: "Kurapika Kurta",
    },
    {
      id: "docs",
      title: "Blocks gallery copy",
      tag: "Docs",
      owner: "Leorio Paladiknight",
    },
    {
      id: "a11y",
      title: "Screen reader labels",
      tag: "Access",
      owner: "Bisky Krueger",
    },
    { id: "grid", title: "Virtualised data grid", tag: "Data", owner: "Kite" },
  ],
  "In progress": [
    {
      id: "theme",
      title: "Follow the Omarchy theme",
      tag: "Tokens",
      owner: "Killua Zoldyck",
    },
    {
      id: "terminal",
      title: "Terminal resize in-band",
      tag: "Runtime",
      owner: "Gon Freecss",
    },
    {
      id: "film",
      title: "Launch film sound pass",
      tag: "Media",
      owner: "Ging Freecss",
    },
  ],
  Done: [
    {
      id: "switch",
      title: "Native switch metrics",
      tag: "Primitives",
      owner: "Isaac Netero",
    },
    {
      id: "slider",
      title: "Slider detents",
      tag: "Primitives",
      owner: "Knuckle Bine",
    },
  ],
};
