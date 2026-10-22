import { useEffect, useRef, useState } from "react";
import {
  closedTip,
  describeTip,
  tipAfter,
  tipTiming,
  type TipEvent,
  type TipState,
} from "./tooltip-preview";

/**
 * Browser previews for the Tooltip page.
 *
 * The shipped component wraps `@gpuix/react/tooltip`, so the clock below is the
 * runtime's, not a lookalike: hover opens at the provider's 0 ms delay, a
 * leaving pointer gets 80 ms to reach the tip, a press or Escape closes it and
 * it stays shut until the pointer leaves, and a `Tab` traversal never opens it
 * because a window does not run the trigger's `onFocus` (measured on 0.11.0).
 * The readout is the preview's own, so a reader can watch the grace a
 * screenshot cannot show.
 */

const tipContent = "Booked revenue, net of refunds.";

/** One trigger whose tip is driven by the preview's clock. */
const ClockedTip = () => {
  const [state, setState] = useState<TipState>(closedTip);
  /** Whether the last focus arrived from a `Tab` rather than a pointer. */
  const tabbed = useRef(false);
  /** When the tip last closed, for the 300 ms reopen window. */
  const closedAt = useRef<number | null>(null);

  const send = (event: TipEvent): void =>
    setState((current) => {
      const next = tipAfter(current, event);
      if (current.open && !next.open) closedAt.current = Date.now();
      return next;
    });

  useEffect(() => {
    if (state.timer === null) return;
    const timer = setTimeout(
      () => send({ type: "elapsed" }),
      state.timer.after,
    );
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Tab") tabbed.current = true;
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="gx-tooltip-demo">
      <div className="gx-tip-anchor">
        <button
          aria-description={tipContent}
          className="gx-btn gx-btn-outline"
          onBlur={() => send({ type: "blur" })}
          onClick={() => send({ type: "press" })}
          onFocus={() => {
            if (tabbed.current) {
              tabbed.current = false;
              send({ type: "traversal" });
              return;
            }
            send({ type: "focus" });
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") send({ type: "escape" });
          }}
          onMouseDown={() => {
            tabbed.current = false;
            send({ type: "press" });
          }}
          onMouseEnter={() => {
            tabbed.current = false;
            const since = closedAt.current;
            send({
              type: "enter",
              recentlyClosed:
                since !== null && Date.now() - since <= tipTiming.skipDelay,
            });
          }}
          onMouseLeave={() => send({ type: "leave" })}
          type="button"
        >
          Revenue definition
        </button>
        {state.open ? (
          <span
            className="gx-tip"
            onMouseEnter={() => send({ type: "enter-tip" })}
            onMouseLeave={() => send({ type: "leave" })}
            role="tooltip"
          >
            {tipContent}
          </span>
        ) : null}
      </div>
      <p className="gx-tip-readout" role="status">
        tip <b>{describeTip(state)}</b>
      </p>
    </div>
  );
};

/** The two states a caller owns: `defaultOpen` and a controlled tip. */
const TipStates = () => {
  const [held, setHeld] = useState(false);

  return (
    <div className="gx-tooltip-demo gx-tooltip-states">
      <div className="gx-tip-anchor">
        <span className="gx-btn gx-btn-ghost">First run</span>
        <span className="gx-tip">Hover anything with a label.</span>
      </div>
      <div className="gx-tip-anchor">
        <button
          aria-description="Held open by the caller."
          aria-expanded={held}
          className="gx-btn gx-btn-outline"
          onClick={() => setHeld((current) => !current)}
          type="button"
        >
          {held ? "Release the hint" : "Hold the hint"}
        </button>
        {held ? (
          <span className="gx-tip" role="tooltip">
            Held open by the caller.
          </span>
        ) : null}
      </div>
      <p className="gx-tip-readout">
        controlled <b>{held ? "open" : "closed"}</b>
      </p>
    </div>
  );
};

const tooltipSource = `import { Icon } from "@gpuixui/icons";
import { IconButton, Tooltip, useTheme } from "@gpuixui/primitives";

const theme = useTheme();

export const RevenueHelp = () => (
  <Tooltip content="Booked revenue, net of refunds." side="bottom">
    <IconButton
      icon={
        <Icon
          color={theme.colors.mutedForeground}
          name="info"
          size={theme.iconSize.sm}
        />
      }
      label="Revenue definition"
    />
  </Tooltip>
);`;

const tipStatesSource = `import { useState } from "react";
import { Button, Tooltip } from "@gpuixui/primitives";

export const Hints = () => {
  const [held, setHeld] = useState(false);

  return (
    <>
      {/* defaultOpen holds the first-run hint open with no interaction. */}
      <Tooltip content="Hover anything with a label." defaultOpen>
        <Button variant="ghost">First run</Button>
      </Tooltip>

      {/* A controlled tip paints only while open is true; the trigger still
          reports every request through onOpenChange. */}
      <Tooltip
        content="Held open by the caller."
        onOpenChange={setHeld}
        open={held}
      >
        <Button onActivate={() => setHeld((current) => !current)}>
          {held ? "Release the hint" : "Hold the hint"}
        </Button>
      </Tooltip>
    </>
  );
};`;

export const TooltipDemo = () => (
  <div className="gx-demo gx-demo-column gx-tooltip-scene">
    <p className="gx-demo-label">Hover the trigger — or press it</p>
    <ClockedTip />
  </div>
);

export const TooltipStates = () => (
  <div className="gx-demo gx-demo-column gx-tooltip-scene">
    <p className="gx-demo-label">defaultOpen and a controlled tip</p>
    <TipStates />
  </div>
);

export { tipStatesSource, tooltipSource };
