/** @jsxImportSource @gpuix/react */
import { useEffect, useState, type ReactNode } from "react";
import { useMotionPreference } from "@gpuixui/components/authoring";
import type { Fx } from "./shaders/pack.js";

export * from "./shaders/fire.js";
export * from "./shaders/firesim.js";
export * from "./shaders/light.js";
export * from "./shaders/nen.js";
export * from "./shaders/pack.js";
export { DISTORT } from "./shaders/wgsl.js";

const Shader = "gpuixui-shader" as unknown as (
  props: Record<string, unknown>,
) => ReactNode;

export interface ShaderLayerProps {
  readonly fx: Fx | null;
}

export const ShaderLayer = ({ fx }: ShaderLayerProps): ReactNode =>
  fx === null ? null : (
    <Shader
      source={fx.source}
      time={fx.time}
      params={fx.params}
      data={fx.data}
      readsBackdrop={fx.readsBackdrop}
      simulationSource={fx.simulationSource}
      simulationGrid={fx.simulationGrid}
      simulationUniform={fx.simulationUniform}
      style={{
        position: "absolute",
        left: fx.box.x,
        top: fx.box.y,
        width: fx.box.w,
        height: fx.box.h,
      }}
    />
  );

export const useShaderClock = (fps = 60): number => {
  const still = useMotionPreference() === "reduced";
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (still) return;
    const start = performance.now();
    const tick = setInterval(
      () => setTime((performance.now() - start) / 1000),
      1000 / fps,
    );
    return () => clearInterval(tick);
  }, [fps, still]);
  return time;
};
