/**
 * The local binding extension's type: `StyleDesc.zIndex`.
 *
 * The published `@gpuix/native@0.11.0` `StyleDesc` has no stacking field and
 * paints siblings in tree order. This repository builds its own darwin-x64
 * binding from a pinned revision with `apps/playground/patches/gpuix-zindex.patch`
 * applied, so the runtime this app runs against **does** read `zIndex`; only the
 * published typings do not know it. The probe `z-index-lifecycle` measures it,
 * and the library must not depend on it — a component shipped against the
 * published package cannot set the field.
 *
 * Scoped to `apps/playground`: nothing in `packages/` compiles this file.
 */
declare module "@gpuix/native/host" {
  interface StyleDesc {
    /**
     * Stacking level among `absolute`/`fixed` siblings: a higher value paints
     * later and hit-tests first. In-flow children ignore it and keep tree order.
     */
    zIndex?: number;
  }
}

export {};
