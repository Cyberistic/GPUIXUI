/**
 * `live-key-routing` — where a key goes in a real GPUix window.
 *
 * Plan `344` found that the live window behaves differently from the offscreen
 * `TestRenderer`: a focused List row received a key while the List root's
 * `onKeyDown` never ran. This probe isolates the rule with three independent
 * handlers on one tree — the focused child, its ancestor, and the app-level
 * window handler — so a component author can choose a path that works.
 *
 * Plan `390` corrected the companion observation: React's `onFocus` for a live
 * click is **window-state dependent** (measured `0` and `1` for the same code on
 * the same host). Plan `603` measured the same for `autoFocus`: the counter read
 * `0` in earlier runs and `1` in the plan-599 gate. So the scenario asserts
 * native focus and key delivery, not any `onFocus` counter; both counters stay
 * in the readout as observations.
 *
 * The counters are the observation: a readout, never a screenshot. Focus is
 * read from the renderer the runner owns (`AsyncSmokeHost.focused`), not from
 * the automation tree.
 */
import { useState } from "react";
import { useWindowSize } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import { useWindowKey } from "../window-key.js";

/** Two focusable boxes and the three counters that explain key delivery. */
export const KeyRoutingView = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [inner, setInner] = useState(0);
  const [middle, setMiddle] = useState(0);
  const [outer, setOuter] = useState(0);
  const [innerFocus, setInnerFocus] = useState(0);
  const [outerFocus, setOuterFocus] = useState(0);
  const [windowKeys, setWindowKeys] = useState(0);
  const [chords, setChords] = useState(0);

  useWindowKey((event) => {
    if (event.key === "x") setWindowKeys((count) => count + 1);
    if (event.key === "k" && event.modifiers?.cmd === true) {
      setChords((count) => count + 1);
    }
  });

  return (
    <div
      testId="key-outer"
      aria-id="key-outer"
      tabIndex={0}
      onKeyDown={() => setOuter((count) => count + 1)}
      onFocus={() => setOuterFocus((count) => count + 1)}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="key-middle"
        aria-id="key-middle"
        onKeyDown={() => setMiddle((count) => count + 1)}
        style={{ padding: theme.spacing.md }}
      >
        <div
          testId="key-inner"
          aria-id="key-inner"
          tabIndex={0}
          autoFocus
          onKeyDown={() => setInner((count) => count + 1)}
          onFocus={() => setInnerFocus((count) => count + 1)}
          style={{
            width: 320,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.card,
            color: theme.colors.foreground,
          }}
        >
          <text>Focused probe</text>
        </div>
      </div>
      <Readout testId="key-routing-readout">
        {`inner=${inner} middle=${middle} outer=${outer} innerFocus=${innerFocus} outerFocus=${outerFocus} window=${windowKeys} chords=${chords}`}
      </Readout>
    </div>
  );
};
