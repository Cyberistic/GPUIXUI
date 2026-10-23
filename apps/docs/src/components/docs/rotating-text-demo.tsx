/**
 * Browser preview for the Rotating text page.
 *
 * The native line changes phrase on an interval with a short fade; the preview
 * runs the same interval and fades each step in place.
 */

import { useEffect, useState } from "react";

const phrases = ["Faster builds", "Safer releases", "One runtime"];

export function RotatingTextDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handle = setInterval(
      () => setIndex((current) => (current + 1) % phrases.length),
      2200,
    );
    return () => clearInterval(handle);
  }, []);

  const phrase = phrases[index] ?? phrases[0];

  return (
    <div className="gx-rotating">
      <p className="gx-rotating-value" key={phrase}>
        {phrase}
      </p>
      <p className="gx-rotating-readout">
        {index + 1} of {phrases.length}
      </p>
    </div>
  );
}

export const rotatingTextDemoSource = `import { RotatingText } from "@gpuixui/components/rotating-text";

<RotatingText
  phrases={["Faster builds", "Safer releases", "One runtime"]}
  intervalMs={3000}
/>;`;
