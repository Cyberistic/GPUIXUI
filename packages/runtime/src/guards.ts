/**
 * Compile-time capability guards.
 *
 * Each guard asserts an *absence* in the pinned runtime (`@gpuix/react@0.11.0`
 * over `@gpuix/native@0.11.0`). The annotated assignment is a type error today,
 * so the `@ts-expect-error` directive is "used" and the build is silent.
 *
 * Direction of failure: the moment GPUix adds the key — `transform`,
 * `gridColumn` or `gridRow` to `StyleDesc`, or a `CanvasProps` draw surface to
 * `@gpuix/react` — the assertion stops erroring, the directive turns unused,
 * and TypeScript fails with TS2578 "Unused '@ts-expect-error' directive". That
 * is the point: `capabilities` cannot drift stale without failing the build.
 */

import type { StyleDesc } from "@gpuix/react";
import type * as GPUix from "@gpuix/react";

// @ts-expect-error GPUix `StyleDesc` has no `transform` (nor rotate/scale/translate/skew).
const _transformGap: keyof StyleDesc = "transform";
// @ts-expect-error GPUix `StyleDesc` has no `gridColumn` (only `gridColumnMin`).
const _gridColumnGap: keyof StyleDesc = "gridColumn";
// @ts-expect-error GPUix `StyleDesc` has no `gridRow` (only `gridRowMin`).
const _gridRowGap: keyof StyleDesc = "gridRow";
// @ts-expect-error GPUix `canvas` is a blank host element — no `CanvasProps` draw surface.
type _CanvasProps = GPUix.CanvasProps;
const _canvasProps: _CanvasProps | undefined = undefined;

// Keep the guards live under `noUnusedLocals`; the values are never produced.
void _transformGap;
void _gridColumnGap;
void _gridRowGap;
void _canvasProps;
