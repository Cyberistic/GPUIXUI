/**
 * The tiling desktop's content: four real Omarchy themes and what the panes say.
 *
 * Each palette is the theme's `colors.toml` as Omarchy ships it (MIT,
 * basecamp/omarchy), decoded by `decodeOmarchyPalette` — the same file an app
 * reads from `~/.local/state/omarchy/current/theme/` when the desktop changes.
 */

export const palettes = {
  "tokyo-night": `
mode = "dark"

accent = "#7aa2f7"
selection = "#292e42"
muted = "#414868"

background = "#1a1b26"
dark_background = "#13141c"
darker_background = "#0e0e14"
lighter_background = "#24283b"

foreground = "#a9b1d6"
dark_foreground = "#565f89"
light_foreground = "#b4bee6"
bright_foreground = "#c0caf5"

red = "#f7768e"
yellow = "#e0af68"
orange = "#eb927b"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
brown = "#75493d"

bright_red = "#ff7a93"
bright_yellow = "#ff9e64"
bright_green = "#b9f27c"
bright_cyan = "#0db9d7"
bright_blue = "#7da6ff"
bright_magenta = "#bb9af7"
`,
  catppuccin: `
mode = "dark"

accent = "#89b4fa"
selection = "#45475a"
muted = "#585b70"

background = "#1e1e2e"
dark_background = "#161622"
darker_background = "#101019"
lighter_background = "#313244"

foreground = "#cdd6f4"
dark_foreground = "#6c7086"
light_foreground = "#bac2de"
bright_foreground = "#cdd6f4"

red = "#f38ba8"
yellow = "#f9e2af"
orange = "#f6b6ab"
green = "#a6e3a1"
cyan = "#94e2d5"
blue = "#89b4fa"
magenta = "#f5c2e7"
brown = "#7b5b55"

bright_red = "#f38ba8"
bright_yellow = "#f9e2af"
bright_green = "#a6e3a1"
bright_cyan = "#94e2d5"
bright_blue = "#89b4fa"
bright_magenta = "#f5c2e7"
`,
  kanagawa: `
mode = "dark"

accent = "#dcd7ba"
selection = "#363646"
muted = "#54546D"

background = "#1f1f28"
dark_background = "#17171e"
darker_background = "#111116"
lighter_background = "#223249"

foreground = "#dcd7ba"
dark_foreground = "#727169"
light_foreground = "#c8c093"
bright_foreground = "#dcd7ba"

red = "#c34043"
yellow = "#c0a36e"
orange = "#c17158"
green = "#76946a"
cyan = "#6a9589"
blue = "#7e9cd8"
magenta = "#957fb8"
brown = "#60382c"

bright_red = "#e82424"
bright_yellow = "#e6c384"
bright_green = "#98bb6c"
bright_cyan = "#7aa89f"
bright_blue = "#7fb4ca"
bright_magenta = "#938aa9"
`,
  "rose-pine": `
mode = "light"

accent = "#56949f"
selection = "#dfdad9"
muted = "#cecacd"

background = "#faf4ed"
dark_background = "#ede7e1"
darker_background = "#e1dbd5"
lighter_background = "#f2e9e1"

foreground = "#575279"
dark_foreground = "#9893a5"
light_foreground = "#6e6a86"
bright_foreground = "#575279"

red = "#b4637a"
yellow = "#ea9d34"
orange = "#cf8057"
green = "#286983"
cyan = "#d7827e"
blue = "#56949f"
magenta = "#907aa9"
brown = "#67402b"

bright_red = "#b4637a"
bright_yellow = "#ea9d34"
bright_green = "#286983"
bright_cyan = "#d7827e"
bright_blue = "#56949f"
bright_magenta = "#907aa9"
`,
} as const;

export type PaletteName = keyof typeof palettes;

export const paletteNames = Object.keys(palettes) as ReadonlyArray<PaletteName>;

/** The tiles, in focus order, and the title the bar shows for each. */
export const tiles = [
  { id: "settings", title: "Settings" },
  { id: "terminal", title: "Alacritty — fastfetch" },
  { id: "monitor", title: "btop" },
] as const;

export type TileId = (typeof tiles)[number]["id"];

/** fastfetch's summary, as the terminal tile prints it. */
export const system = (palette: PaletteName) =>
  [
    ["OS", "Omarchy 3.1 x86_64"],
    ["WM", "Hyprland 0.51"],
    ["Kernel", "6.17.2-arch1-1"],
    ["Shell", "zsh 5.9"],
    ["Terminal", "Alacritty 0.16"],
    ["Theme", palette],
    ["UI", "GPUIxUI on GPUI"],
  ] as const;

/** btop's six cores: the last minute of load, oldest first. */
export const cores = [
  [12, 18, 15, 30, 44, 38, 52, 47, 61, 58],
  [8, 9, 14, 12, 20, 26, 22, 31, 28, 35],
  [40, 35, 42, 38, 33, 45, 52, 49, 44, 41],
  [5, 7, 6, 12, 9, 15, 13, 18, 22, 19],
  [22, 28, 25, 31, 36, 30, 27, 33, 38, 44],
  [14, 11, 16, 21, 18, 24, 29, 26, 23, 30],
] as const;

/** The last three commits, as the terminal's `git log --oneline` prints them. */
export const commits = [
  ["3bff42d", "feat(data): charts in the landing's style"],
  ["2bfe42c", "feat(slang): name the calculator app Slang"],
  ["e275e56", "feat(calculator): the fx-991ES Plus as the device"],
] as const;

export const memory = { used: 6.1, total: 32 } as const;
