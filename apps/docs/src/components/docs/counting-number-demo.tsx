import { useEffect, useState } from "react";

export const CountingNumberDemo = () => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const t = Math.min(step / 36, 1);
      setValue(Math.round(1240 * (1 - (1 - t) ** 3)));
      if (t === 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="gx-count-scene">
      <span className="gx-count-value">{value.toLocaleString("en-US")}</span>
      <span className="gx-count-label">tokens counted</span>
    </div>
  );
};

export const countingNumberDemoSource = `import { CountingNumber } from "@gpuixui/components/counting-number";

<CountingNumber value={1240} />;`;
