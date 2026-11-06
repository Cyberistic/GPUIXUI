import { useEffect, useRef, useState } from "react";

const OPEN_MS = 700;
const CLOSE_MS = 300;

export function HoverCardDemo() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const later = (delay: number, next: boolean): void => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  };

  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="gx-hovercard-scene">
      {}
      <div className="gx-hovercard-frame">
        <p className="gx-hovercard-line">
          Assigned to{" "}
          <span className="gx-hovercard-anchor">
            <button
              aria-expanded={open}
              className="gx-hovercard-trigger"
              onBlur={() => later(CLOSE_MS, false)}
              onClick={() => setOpen((value) => !value)}
              onFocus={() => setOpen(true)}
              onMouseEnter={() => later(OPEN_MS, true)}
              onMouseLeave={() => later(CLOSE_MS, false)}
              type="button"
            >
              @ada
            </button>
            {open ? (
              <div
                aria-label="Ada Lovelace"
                className="gx-hovercard"
                onBlur={() => later(CLOSE_MS, false)}
                onFocus={() => setOpen(true)}
                onMouseEnter={() => {
                  if (timer.current !== undefined) clearTimeout(timer.current);
                }}
                onMouseLeave={() => later(CLOSE_MS, false)}
                role="group"
              >
                <p className="gx-hovercard-title">Ada Lovelace</p>
                <p className="gx-hovercard-body">
                  Mathematician · Analytical Engine
                </p>
                <button
                  className="gx-btn gx-btn-outline gx-btn-sm gx-hovercard-action"
                  type="button"
                >
                  Open profile
                </button>
              </div>
            ) : null}
          </span>
        </p>
      </div>
    </div>
  );
}

export const hoverCardDemoSource = `import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@gpuixui/components/hover-card";

<HoverCard>
  <HoverCardTrigger>@ada</HoverCardTrigger>
  <HoverCardContent label="Ada Lovelace" side="bottom" align="center">
    <text>Ada Lovelace</text>
    <text>Mathematician · Analytical Engine</text>
    <Button size="sm">Open profile</Button>
  </HoverCardContent>
</HoverCard>;`;
