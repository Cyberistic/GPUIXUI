/**
 * Browser preview for the Ripple button page.
 *
 * The native action spreads a wash from the press point; the preview records
 * the point and expands a wash circle from it, one layer per press.
 */

import { useRef, useState, type MouseEvent } from "react";

interface Ripple {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export function RippleButtonDemo() {
  const [ripples, setRipples] = useState<ReadonlyArray<Ripple>>([]);
  const nextId = useRef(0);

  const press = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = nextId.current + 1;
    nextId.current = id;
    const ripple = {
      id,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setRipples((current) => [...current, ripple]);
    setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== id));
    }, 520);
  };

  return (
    <button className="gx-ripple-btn" onClick={press} type="button">
      Deploy
      {ripples.map((ripple) => (
        <span
          aria-hidden="true"
          className="gx-ripple-wash"
          key={ripple.id}
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </button>
  );
}

export const rippleButtonDemoSource = `import { RippleButton } from "@gpuixui/components/ripple-button";

<RippleButton variant="primary" onClick={deploy}>
  Deploy
</RippleButton>;`;
