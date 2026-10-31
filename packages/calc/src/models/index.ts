/** The model registry. A TI-84 lands here as a second entry, not a second app. */

import * as Option from "effect/Option";
import type { CalculatorModel } from "../model.js";
import { fx991es } from "./fx991es.js";

export const models: Readonly<Record<string, CalculatorModel>> = { fx991es };

export type ModelId = "fx991es";

export const defaultModel: CalculatorModel = fx991es;

/** The model a stored id names, or `None` for an id this build does not ship. */
export const modelOf = (id: string): Option.Option<CalculatorModel> =>
  Option.fromUndefinedOr(models[id]);

export { fx991es };
