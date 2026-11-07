/**
 * The shadcn scene's script, read by both sides: the take paints the component
 * each line of code describes, and the film types that line on the same frame.
 */
import * as Arr from "effect/Array";

export const CHARS_PER_FRAME = 8;

/** The title holds alone this long, then the code slides in under it. */
export const INTRO = 20;
const THEME_AT = 64;
const THEME_EVERY = 12;
const themeAt = (index: number): number => THEME_AT + index * THEME_EVERY;

export interface CodeLine {
  readonly text: string;
  /** The frame this line starts typing. */
  readonly frame: number;
}

const LINES = [
  "<Card>",
  "  <CardHeader>",
  "    <CardTitle>Hunter License</CardTitle>",
  "    <CardDescription>The 287th exam</CardDescription>",
  "  </CardHeader>",
  "  <CardContent>",
  '    <Input placeholder="gon@whale-island" />',
  "    <Button>Apply</Button>",
  "    <BarChart series={applicants} />",
  "  </CardContent>",
  "</Card>",
];

const framesOf = (text: string): number =>
  Math.ceil(text.length / CHARS_PER_FRAME);

/** One line after another, from just after the code has slid in. */
export const CODE: ReadonlyArray<CodeLine> = Arr.map(LINES, (text, i) => ({
  text,
  frame:
    INTRO +
    4 +
    Arr.reduce(Arr.take(LINES, i), 0, (sum, line) => sum + framesOf(line)),
}));

/** The first frame each part of the card is on screen: its line's last character. */
const typed = (index: number): number => {
  const line = CODE[index];
  return line === undefined ? 0 : line.frame + framesOf(line.text);
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
  readonly name: string;
  readonly frame: number;
  readonly mode: "light" | "dark";
  /** The theme's own variables, trimmed from tweakcn's registry. */
  readonly css: string;
}

/** Four real themes from tweakcn.com's registry (`/r/themes/<name>.json`). */
export const THEMES: ReadonlyArray<BuilderTheme> = [
  {
    name: "bubblegum",
    frame: themeAt(0),
    mode: "light",
    css: `:root {
  --background: oklch(0.9399 0.0203 345.6985);
  --foreground: oklch(0.4712 0 0);
  --card: oklch(0.9498 0.0500 86.8891);
  --card-foreground: oklch(0.4712 0 0);
  --primary: oklch(0.6209 0.1801 348.1385);
  --primary-foreground: oklch(1.0000 0 0);
  --muted-foreground: oklch(0.5795 0 0);
  --border: oklch(0.6209 0.1801 348.1385);
  --input: oklch(0.9189 0 0);
  --chart-1: oklch(0.7002 0.1597 350.7532);
  --chart-2: oklch(0.8189 0.0799 212.0892);
  --chart-3: oklch(0.9195 0.0801 87.6670);
  --radius: 0.4rem;
}`,
  },
  {
    name: "cyberpunk",
    frame: themeAt(1),
    mode: "dark",
    css: `.dark {
  --background: oklch(0.1649 0.0352 281.8285);
  --foreground: oklch(0.9513 0.0074 260.7315);
  --card: oklch(0.2542 0.0611 281.1423);
  --card-foreground: oklch(0.9513 0.0074 260.7315);
  --primary: oklch(0.6726 0.2904 341.4084);
  --primary-foreground: oklch(1.0000 0 0);
  --muted-foreground: oklch(0.6245 0.0500 278.1046);
  --border: oklch(0.3279 0.0832 280.7890);
  --input: oklch(0.3279 0.0832 280.7890);
  --chart-1: oklch(0.6726 0.2904 341.4084);
  --chart-2: oklch(0.5488 0.2944 299.0954);
  --chart-3: oklch(0.8442 0.1457 209.2851);
  --radius: 0.5rem;
}`,
  },
  {
    name: "claude",
    frame: themeAt(2),
    mode: "light",
    css: `:root {
  --background: oklch(0.9818 0.0054 95.0986);
  --foreground: oklch(0.3438 0.0269 95.7226);
  --card: oklch(0.9818 0.0054 95.0986);
  --card-foreground: oklch(0.1908 0.0020 106.5859);
  --primary: oklch(0.6171 0.1375 39.0427);
  --primary-foreground: oklch(1.0000 0 0);
  --muted-foreground: oklch(0.6059 0.0075 97.4233);
  --border: oklch(0.8847 0.0069 97.3627);
  --input: oklch(0.7621 0.0156 98.3528);
  --chart-1: oklch(0.5583 0.1276 42.9956);
  --chart-2: oklch(0.6898 0.1581 290.4107);
  --chart-3: oklch(0.8816 0.0276 93.1280);
  --radius: 0.5rem;
}`,
  },
  {
    name: "catppuccin",
    frame: themeAt(3),
    mode: "dark",
    css: `.dark {
  --background: oklch(0.2155 0.0254 284.0647);
  --foreground: oklch(0.8787 0.0426 272.2767);
  --card: oklch(0.2429 0.0304 283.9110);
  --card-foreground: oklch(0.8787 0.0426 272.2767);
  --primary: oklch(0.7871 0.1187 304.7693);
  --primary-foreground: oklch(0.2429 0.0304 283.9110);
  --muted-foreground: oklch(0.7510 0.0396 273.9320);
  --border: oklch(0.3240 0.0319 281.9784);
  --input: oklch(0.3240 0.0319 281.9784);
  --chart-1: oklch(0.7871 0.1187 304.7693);
  --chart-2: oklch(0.8467 0.0833 210.2545);
  --chart-3: oklch(0.8577 0.1092 142.7153);
  --radius: 0.35rem;
}`,
  },
];

export const SHADCN_FRAMES = 120;
