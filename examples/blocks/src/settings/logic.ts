/**
 * The Appearance pane's rule: a value the Look control reports is one of its looks.
 */
import * as Arr from "effect/Array";
import { looks, type Look } from "./data.js";

export const isLook = (value: string): value is Look =>
  Arr.some(looks, (look) => look.value === value);
