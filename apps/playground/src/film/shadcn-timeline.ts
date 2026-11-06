/**
 * The shadcn scene's script, read by both sides: the take paints the component
 * each line of code describes, and the film types that line on the same frame.
 */
export const CHARS_PER_FRAME = 3;

export interface CodeLine {
  readonly text: string;
  /** The frame this line starts typing. */
  readonly frame: number;
}

export const CODE: ReadonlyArray<CodeLine> = [
  { text: "<Card>", frame: 6 },
  { text: "  <CardHeader>", frame: 10 },
  { text: "    <CardTitle>Hunter License</CardTitle>", frame: 14 },
  { text: "    <CardDescription>The 287th exam</CardDescription>", frame: 26 },
  { text: "  </CardHeader>", frame: 40 },
  { text: "  <CardContent>", frame: 44 },
  { text: '    <Input placeholder="gon@whale-island" />', frame: 48 },
  { text: "    <Button>Apply</Button>", frame: 60 },
  { text: "    <BarChart series={applicants} />", frame: 68 },
  { text: "  </CardContent>", frame: 78 },
  { text: "</Card>", frame: 82 },
];

/** The first frame each part of the card is on screen: its line's last character. */
const typed = (index: number): number => {
  const line = CODE[index];
  return line === undefined
    ? 0
    : line.frame + Math.ceil(line.text.length / CHARS_PER_FRAME);
};

export const SHOWN = {
  card: typed(0),
  title: typed(2),
  description: typed(3),
  input: typed(6),
  button: typed(7),
  chart: typed(8),
};

export interface BuilderTheme {
  readonly frame: number;
  readonly mode: "light" | "dark";
  /** The builder's export, as the film shows it being pasted. */
  readonly css: string;
}

/** Three exports in the form shadcn's theme builders write them. */
export const THEMES: ReadonlyArray<BuilderTheme> = [
  {
    frame: 92,
    mode: "light",
    css: `:root {
  --background: oklch(0.98 0.01 300);
  --card: oklch(1 0 0);
  --primary: oklch(0.55 0.22 295);
  --primary-foreground: oklch(0.98 0 0);
  --muted-foreground: oklch(0.5 0.04 295);
  --border: oklch(0.9 0.02 295);
  --radius: 1rem;
}`,
  },
  {
    frame: 112,
    mode: "light",
    css: `:root {
  --background: oklch(0.97 0.02 85);
  --card: oklch(0.99 0.01 85);
  --primary: oklch(0.62 0.17 45);
  --primary-foreground: oklch(0.99 0 0);
  --muted-foreground: oklch(0.5 0.05 60);
  --border: oklch(0.88 0.03 85);
  --radius: 0.25rem;
}`,
  },
  {
    frame: 132,
    mode: "dark",
    css: `.dark {
  --background: oklch(0.16 0.02 165);
  --card: oklch(0.21 0.02 165);
  --foreground: oklch(0.96 0.01 165);
  --card-foreground: oklch(0.96 0.01 165);
  --primary: oklch(0.78 0.17 165);
  --primary-foreground: oklch(0.2 0.03 165);
  --muted-foreground: oklch(0.7 0.03 165);
  --border: oklch(0.32 0.02 165);
  --radius: 0.625rem;
}`,
  },
];

export const SHADCN_FRAMES = 150;
