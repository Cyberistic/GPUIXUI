import { retroTheme, themes } from "@gpuixui/tokens";
import { toCssText } from "../../lib/theme-css";
import { HighlightedCode } from "../highlighted-code";
import { PersonalizationWindow } from "./personalization-demo";

const aero = retroTheme(themes.dark, "aero");

export function AeroTheme() {
  return (
    <div className="gx-aero not-prose">
      <PersonalizationWindow />
      <HighlightedCode code={toCssText(aero, ".aero")} lang="css" />
    </div>
  );
}
