/**
 * Browser preview for the Magnetic page.
 *
 * The native surface leans its content toward the pointer while it is over it;
 * the preview tracks the pointer and offsets the card toward the box centre.
 */

import { useState, type CSSProperties, type MouseEvent } from "react";

const strength = 0.35;

export function MagneticDemo() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const move = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    setOffset({ x: dx * strength, y: dy * strength });
  };

  return (
    <div
      className="gx-magnetic"
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      onMouseMove={move}
    >
      <div
        className="gx-magnetic-card"
        style={
          {
            "--mx": `${offset.x}px`,
            "--my": `${offset.y}px`,
          } as CSSProperties
        }
      >
        <p className="gx-magnetic-title">Notes</p>
        <p className="gx-magnetic-copy">
          The card leans toward the pointer, up to the offset cap.
        </p>
      </div>
    </div>
  );
}

export const magneticDemoSource = `import { Magnetic } from "@gpuixui/components/magnetic";

<Magnetic onClick={open}>
  <Card>
    <CardTitle>Notes</CardTitle>
  </Card>
</Magnetic>;`;
