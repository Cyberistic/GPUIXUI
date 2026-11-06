import type { StyleDesc } from "@gpuix/react";
import { createRecipeCache } from "@gpuixui/tw";
import type { Theme } from "./theme.js";

export const recipeStyle: (recipe: string, theme: Theme) => StyleDesc =
  createRecipeCache(256);
