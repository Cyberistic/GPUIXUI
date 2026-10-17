/**
 * Runtime disposal that survives StrictMode.
 *
 * React StrictMode mounts, unmounts and remounts effects without recreating the
 * component's state — including the `ManagedRuntime` held in it. Disposing in the
 * first cleanup would hand the remount a dead runtime, so disposal waits one
 * microtask: a remount marks the lifecycle active again before the microtask
 * runs, and a real unmount lets it through.
 *
 * The native test renderer does not reproduce StrictMode's double effect
 * invocation, which is why the rule is a pure module with its own suite rather
 * than a component test that cannot fail here.
 */

/** A two-state guard around a one-way resource. */
export interface RuntimeLifecycle {
  /** Mark the runtime in use; cancels a disposal already scheduled. */
  readonly mount: () => void;
  /** Schedule disposal unless `mount` runs before the microtask. */
  readonly unmount: () => void;
}

/** Wrap `dispose` so a mount/unmount/remount sequence keeps the runtime alive. */
export const createRuntimeLifecycle = (
  dispose: () => void,
): RuntimeLifecycle => {
  let active = false;
  return {
    mount: () => {
      active = true;
    },
    unmount: () => {
      active = false;
      queueMicrotask(() => {
        if (!active) dispose();
      });
    },
  };
};
