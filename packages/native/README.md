# `@gpuixui/native`

GPUix's native binary with one addition: GPUI's `paint_shader`, a WGSL fragment
shader drawn in painter order that can read what was drawn before it. GPUix's
stock binary cannot do this, because stock GPUI has no user shader primitive.

```tsx
import "@gpuixui/native/register"; // first import: it selects the binary
import { render } from "@gpuix/react";
import { Shader } from "@gpuixui/native/shader";

const source = `fn shade(p: vec2f) -> vec4f {
  return vec4f(p.x / size().x, 0., frame.params[0].x, 1.);
}`;

render(<Shader source={source} params={[0.5]} style={{ width: 200, height: 80 }} />);
```

## The shader contract

A shader defines `shade(point: vec2f) -> vec4f`. `point` is in logical pixels from
the element's top-left. The result is **premultiplied**, so `vec4f(rgb, 0.)` adds
light. The prelude provides:

| Name | Meaning |
| ---- | ------- |
| `frame.time` | the `time` prop |
| `frame.params[0..8]` | the `params` prop, up to 32 numbers packed into `vec4f`s |
| `frame.scale` | device pixels per logical pixel |
| `size()` | the element's size in logical pixels |
| `backdrop_at(point)` | what was drawn before this element; needs `readsBackdrop` |

`readsBackdrop` ends and reopens the render pass, and copies the element's visible
rectangle, so it costs more than a plain shader. A shader that fails to compile logs
once and draws nothing; the rest of the frame is unaffected.

`register` must be imported before anything that loads `@gpuix/native`. It sets
napi-rs's override only for that load, because every napi-rs package reads the same
variable. Without a binary for the platform it does nothing, and `<Shader>` paints
nothing.

## How the binary is made

`nub run --filter @gpuixui/native build` checks out GPUix at a pinned revision,
applies `patches/gpui/0002-paint-shader.patch` to its Zed submodule and links the
crate here against it, the addon route GPUix documents under "Your own native
elements". No fork of either project is involved.

## Backends

| Platform | Backend | State |
| -------- | ------- | ----- |
| macOS | Metal | pixel-tested |
| Linux | wgpu | pixel-tested through wgpu's Metal adapter; not yet on Linux |
| Browser, WebGPU | wgpu | run in Chrome, backdrop reads included |
| Browser, WebGL2 | wgpu | run in Chrome; shaders that read a backdrop are skipped |
| Windows | DirectX 11 | not implemented; `paint_shader` draws nothing |
