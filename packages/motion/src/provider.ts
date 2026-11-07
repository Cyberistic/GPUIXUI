import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { preferenceOf, type MotionPreference } from "./timing.js";

const MotionPreferenceContext = createContext<MotionPreference>("animated");

export interface MotionProviderProps {
  readonly preference?: unknown;
  readonly children?: ReactNode;
}

export const MotionProvider = ({ preference, children }: MotionProviderProps) =>
  createElement(
    MotionPreferenceContext.Provider,
    { value: preferenceOf(preference) },
    children,
  );

export const useMotionPreference = (): MotionPreference =>
  useContext(MotionPreferenceContext);
