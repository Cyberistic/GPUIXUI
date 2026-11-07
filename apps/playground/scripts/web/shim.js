import init, { GpuixRenderer } from "/wasm/gpuix-web.js";
await init({ module_or_path: "/wasm/gpuix-web_bg.wasm" });
export { GpuixRenderer };
export const isTerminal = () => false;
