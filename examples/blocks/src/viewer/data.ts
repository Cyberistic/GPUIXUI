export const albums = [
  { id: "arena", label: "Heavens Arena" },
  { id: "island", label: "Greed Island" },
] as const;

export interface Photo {
  readonly id: string;
  readonly album: (typeof albums)[number]["id"];
  readonly caption: string;

  readonly tint: 0 | 1 | 2 | 3 | 4;
}

export const photos: ReadonlyArray<Photo> = [
  { id: "p1", album: "arena", caption: "Floor 50", tint: 0 },
  { id: "p2", album: "arena", caption: "Gon vs Gido", tint: 1 },
  { id: "p3", album: "arena", caption: "Floor 200 lobby", tint: 2 },
  { id: "p4", album: "arena", caption: "Wing's lesson", tint: 3 },
  { id: "p5", album: "island", caption: "Masadora", tint: 4 },
  { id: "p6", album: "island", caption: "The binder", tint: 0 },
  { id: "p7", album: "island", caption: "Bisky's rock", tint: 1 },
];
