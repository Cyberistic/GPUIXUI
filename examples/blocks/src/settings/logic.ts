import * as Arr from "effect/Array";
import { looks, type Look } from "./data.js";

export const isLook = (value: string): value is Look =>
  Arr.some(looks, (look) => look.value === value);
