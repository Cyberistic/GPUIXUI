/** @jsxImportSource @gpuix/react */
import { Button } from "@gpuixui/primitives/button";
import {
  liquidMetal,
  ShaderLayer,
  sparkles,
  useShaderClock,
} from "../src/shader-layer.js";

const RECT = { x: 40, y: 40, w: 240, h: 56 };

export const ShaderLayerExample = () => {
  const time = useShaderClock();
  return (
    <div style={{ position: "relative", width: 320, height: 136 }}>
      <ShaderLayer
        fx={liquidMetal({ rect: RECT, radius: 28, time, flow: 0.25 })}
      />
      <ShaderLayer fx={sparkles({ rect: RECT, radius: 28, time, count: 8 })} />
      <div
        style={{
          position: "absolute",
          left: RECT.x,
          top: RECT.y,
          width: RECT.w,
          height: RECT.h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Button variant="ghost">Deploy</Button>
      </div>
    </div>
  );
};
