import { retroTheme, themes } from "@gpuixui/tokens";
import { toCssText } from "../../lib/theme-css";
import { HighlightedCode } from "../highlighted-code";
import { ThemePreview } from "./theme-editor";

const aero = retroTheme(themes.dark, "aero");

/**
 * The Aero look as the editor's own panel, then the stylesheet it compiles to.
 *
 * Both halves read `retroTheme(themes.dark, "aero")`: the preview through
 * `toCssVars`, the code block through `toCssText`. A transcribed copy of the
 * CSS could disagree with the preview; this one cannot.
 */
export function AeroTheme() {
  return (
    <div className="gx-aero not-prose">
      <ThemePreview theme={aero} />
      <HighlightedCode code={toCssText(aero, ".aero")} lang="css" />
    </div>
  );
}
