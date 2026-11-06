export interface KeyValueStore {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

export const guarded = <A>(run: () => A): A | undefined => {
  try {
    return run();
  } catch {
    return undefined;
  }
};

export const browserStore = (): KeyValueStore | undefined =>
  typeof window === "undefined"
    ? undefined
    : guarded(() => window.localStorage);
