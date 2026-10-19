/**
 * The description a modal surface announces.
 *
 * `@gpuix/react@0.10.0` has no `aria-describedby`, so `DialogDescription` and
 * `DrawerDescription` register their plain text here and the surface hands it to
 * `aria-description` — the same channel the avatar and disabled controls use
 * (plans 392 and 516). Ids let two registered descriptions coexist, and make an
 * unmount clear only its own entry.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useRef, useState } from "react";

interface Entry {
  readonly id: number;
  readonly text: string;
}

/** The description a modal root exposes to its surface. */
export interface DescriptionRegistry {
  /** The first description registered by a mounted part. */
  readonly description: string | undefined;
  /** Register one description part; returns its unsubscribe. */
  readonly register: (text: string) => () => void;
}

/** Track the description parts mounted under one modal root. */
export const useDescriptionRegistry = (): DescriptionRegistry => {
  const nextId = useRef(0);
  const [entries, setEntries] = useState<ReadonlyArray<Entry>>([]);

  const register = useCallback((text: string) => {
    const id = nextId.current++;
    setEntries((current) => [...current, { id, text }]);
    return () => {
      setEntries((current) => Arr.filter(current, (entry) => entry.id !== id));
    };
  }, []);

  return {
    description: Option.getOrUndefined(
      Option.map(Arr.head(entries), (entry) => entry.text),
    ),
    register,
  };
};
