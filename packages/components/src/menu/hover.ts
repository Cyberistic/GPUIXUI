/**
 * The pointer intent of a menu, with Base UI's menu timings.
 *
 * Base UI opens a submenu when the pointer **rests** on its trigger and closes it
 * after a short grace, so a diagonal trip from the trigger into the submenu does
 * not dismiss it; the whole menu closes when the pointer leaves its surface and
 * every submenu's. Its own implementation is a safe polygon (`safePolygon`) tracing
 * the triangle between trigger and surface. A retained tree sees one pointer point
 * and no polygon, so this takes the grace that polygon buys: 100 ms of rest before
 * an open, and 80 ms before a close.
 *
 * The holds and the one timer are `internal/hover.ts`'s, so a menu and a hover
 * card cannot disagree about what "the pointer left" means — including the quirk
 * it documents, that the runtime delivers the new element's `mouseEnter` before
 * the old one's `mouseLeave`.
 */
import { createContext } from "react";
import type { HoverControls } from "../internal/hover.js";

/** Milliseconds the pointer rests on a submenu trigger before it opens. */
export const submenuOpenDelayMs = 100;

/** Milliseconds after the pointer leaves a surface before it closes. */
export const menuCloseGraceMs = 80;

/**
 * The pointer-leave close of a Context menu's whole tree, held by its root
 * surface and by every submenu's: the menu disappears once the pointer is in
 * neither. A Dropdown menu has no such intent — its surface closes on a press, a
 * key or a focus move, never because the pointer left.
 */
export const MenuPointer = createContext<HoverControls | undefined>(undefined);
