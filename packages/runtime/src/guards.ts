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

void _transformGap;
void _gridColumnGap;
void _gridRowGap;
void _canvasProps;
