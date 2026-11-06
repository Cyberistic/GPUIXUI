import { createContext } from "react";
import type { HoverControls } from "../internal/hover.js";

export const submenuOpenDelayMs = 100;

export const menuCloseGraceMs = 80;

export const MenuPointer = createContext<HoverControls | undefined>(undefined);
