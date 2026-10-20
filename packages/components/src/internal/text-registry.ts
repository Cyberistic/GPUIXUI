/**
 * The text parts a container registers so that it can name itself.
 *
 * `@gpuix/react@0.10.0` has no `aria-labelledby`/`aria-describedby` and does not
 * lift a `div`'s contents into its accessible name, so a part that owns the text
 * hands it to its root, which delivers it through `aria-label` or
 * `aria-description` (plans 392, 516, 627, 788). Ids let two parts coexist, and
 * make an unmount clear only its own entry.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useRef, useState } from "react";

interface Entry {
  readonly id: number;
  readonly kind: string;
  readonly text: string;
}

/** The text a container holds for each kind of part mounted under it. */
export interface TextRegistry {
  /** The first text registered for `kind`. */
  readonly textOf: (kind: string) => string | undefined;
  /** Register one text part; returns its unsubscribe. */
  readonly register: (kind: string, text: string) => () => void;
}

/** Track the text parts mounted under one root. */
export const useTextRegistry = (): TextRegistry => {
  const nextId = useRef(0);
  const [entries, setEntries] = useState<ReadonlyArray<Entry>>([]);

  const register = useCallback((kind: string, text: string) => {
    const id = nextId.current++;
    setEntries((current) => [...current, { id, kind, text }]);
    return () => {
      setEntries((current) => Arr.filter(current, (entry) => entry.id !== id));
    };
  }, []);

  const textOf = useCallback(
    (kind: string) =>
      Option.getOrUndefined(
        Option.map(
          Arr.findFirst(entries, (entry) => entry.kind === kind),
          (entry) => entry.text,
        ),
      ),
    [entries],
  );

  return { register, textOf };
};
