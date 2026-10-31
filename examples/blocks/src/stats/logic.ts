/**
 * The stats block's rule: a value the range control reports is one of its ranges.
 */
import * as Arr from "effect/Array";
import { ranges, type Range } from "./data.js";

export const isRange = (value: string): value is Range =>
  Arr.some(ranges, (range) => range.value === value);
