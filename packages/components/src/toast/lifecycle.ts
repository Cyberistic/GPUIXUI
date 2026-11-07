export interface RuntimeLifecycle {
  readonly mount: () => void;

  readonly unmount: () => void;
}

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
