import type { StyleDesc } from "@gpuix/react";
import { classesToStyle } from "@gpuixui/tw";
import type { Theme } from "@gpuixui/tokens";

export const recipeStyle = (recipe: string, theme: Theme): StyleDesc =>
  classesToStyle(recipe, theme).style;
