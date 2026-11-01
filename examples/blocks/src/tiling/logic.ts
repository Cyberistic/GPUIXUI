/**
 * The tiling desktop's pure logic: focus order and the decoded themes.
 */
import {
  decodeOmarchyPalette,
  paletteToTokens,
  type Theme,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { palettes, tiles, type PaletteName, type TileId } from "./data.js";

/** A palette's theme, decoded from its `colors.toml`. */
export const paletteTheme = (name: PaletteName): Theme =>
  paletteToTokens(decodeOmarchyPalette(palettes[name]).palette);

/** The tile focus lands on after `Super+→` (1) or `Super+←` (−1), wrapping. */
export const nextFocus = (current: TileId, step: 1 | -1): TileId => {
  const index = Arr.findFirstIndex(tiles, (tile) => tile.id === current);
  const at =
    ((index._tag === "Some" ? index.value : 0) + step + tiles.length) %
    tiles.length;
  return tiles[at]?.id ?? current;
};

/** The bar's title for the focused tile. */
export const titleOf = (id: TileId): string =>
  Arr.findFirst(tiles, (tile) => tile.id === id).pipe((found) =>
    found._tag === "Some" ? found.value.title : "",
  );
