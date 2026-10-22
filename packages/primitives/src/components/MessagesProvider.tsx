/**
 * The words a tree announces: the provider seam for {@link PrimitiveMessages}.
 *
 * `ThemeProvider` hands its `messages` to this provider, so the common case is
 * one wrapper. It is published on its own as well, because the words are
 * interface copy and a sub-tree may speak another language while it keeps the
 * theme: a nested provider **extends** the table above it, and one that names
 * no words keeps the outer ones rather than resetting them.
 *
 * The context default is the shipped table — a primitive with no provider above
 * it still announces something true, unlike a missing theme, which is a defect
 * (`useTheme` throws). Words have a legitimate default; a palette does not.
 */

import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  defaultMessages,
  resolveMessages,
  type PrimitiveMessages,
} from "../core/messages.js";

const MessagesContext = createContext<PrimitiveMessages>(defaultMessages);

/** {@link MessagesProvider} props. */
export interface MessagesProviderProps {
  /**
   * The words to announce. A named group replaces its default group whole; a
   * group left out keeps the table above this provider. Omit the prop to keep
   * that table untouched.
   */
  readonly messages?: Partial<PrimitiveMessages>;
  readonly children: ReactNode;
}

/** Provide the words a primitive announces to every control below it. */
export const MessagesProvider = ({
  messages,
  children,
}: MessagesProviderProps): ReactElement => {
  const inherited = useContext(MessagesContext);
  return (
    <MessagesContext.Provider value={resolveMessages(messages, inherited)}>
      {children}
    </MessagesContext.Provider>
  );
};

/**
 * The words controls announce in this tree.
 *
 * Always returns a complete table: the shipped words when no provider names
 * any, so a component never has to fall back word by word.
 */
export const useMessages = (): PrimitiveMessages => useContext(MessagesContext);
