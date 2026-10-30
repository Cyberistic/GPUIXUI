import { retroTheme, themes } from "@gpuixui/tokens";
import { toCssText } from "../../lib/theme-css";
import { HighlightedCode } from "../highlighted-code";
import { PersonalizationWindow } from "./personalization-demo";

const aero = retroTheme(themes.dark, "aero");

/**
 * Windows 7's Personalization screen in the Aero look, then the stylesheet it
 * compiles to.
 *
 * Both halves read `retroTheme(themes.dark, "aero")`: the drawing through
 * `toCssVars`, the code block through `toCssText`. A transcribed copy of the
 * CSS could disagree with the drawing; this one cannot.
 */
export function AeroTheme() {
  return (
    <div className="gx-aero not-prose">
      <PersonalizationWindow />
      <HighlightedCode code={toCssText(aero, ".aero")} lang="css" />
    </div>
  );
}
