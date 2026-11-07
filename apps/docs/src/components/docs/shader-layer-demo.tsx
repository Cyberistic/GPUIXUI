export function ShaderLayerDemo() {
  return (
    <video
      aria-label="Water ripple, gum stretch, edge scan, glitch, black hole and dissolve effects playing over real GPUIxUI components"
      autoPlay
      loop
      muted
      playsInline
      src="/media/shader-layer.mp4"
      style={{ width: "100%", borderRadius: 12 }}
    />
  );
}

export const shaderLayerDemoSource = `import { liquidMetal, ShaderLayer, useShaderClock } from "@gpuixui/fx/shader-layer";

export function ShaderLayerDemo() {
  const time = useShaderClock();
  return <ShaderLayer fx={liquidMetal({ rect, radius: 28, time })} />;
}`;
