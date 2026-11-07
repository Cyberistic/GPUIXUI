/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { Knob } from "../src/knob.js";

export const KnobExample = () => {
  const [gain, setGain] = useState(60);
  return <Knob label="Gain" value={gain} onValueChange={setGain} />;
};
