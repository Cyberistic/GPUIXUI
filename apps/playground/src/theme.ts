/**
 * The playground's own semantic colour roles.
 *
 * This is deliberately app-local and temporary: GPUix paints a CSS colour, and
 * the library's real tokens land in `@gpuixui/tokens`. It exists so the shell
 * and scenarios do not scatter hex literals.
 *
 * // TODO: replace with @gpuixui/tokens once the tokens workstream lands; this
 * // file is app-local and is deleted at that point.
 */
export const theme = {
  surface: "#11111b",
  panel: "#1e1e2e",
  panelAlt: "#181825",
  border: "#313244",
  text: "#cdd6f4",
  muted: "#a6adc8",
  faint: "#6c7086",
  accent: "#89b4fa",
  accentText: "#11111b",
  danger: "#f38ba8",
  success: "#a6e3a1",
} as const;
