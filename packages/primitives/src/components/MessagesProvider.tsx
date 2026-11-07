/** @jsxImportSource @gpuix/react */
import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  defaultMessages,
  resolveMessages,
  type MessagesSource,
  type PrimitiveMessages,
} from "../core/messages.js";

const MessagesContext = createContext<PrimitiveMessages>(defaultMessages);

export interface MessagesProviderProps {
  readonly messages?: MessagesSource | null;
  readonly children: ReactNode;
}

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

export const useMessages = (): PrimitiveMessages => useContext(MessagesContext);
