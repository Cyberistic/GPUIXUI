/**
 * The example registry: `id → example`, for the **native** playground.
 *
 * `apps/playground` mounts these in real GPUix. The browser docs site must not
 * render them as live components: they are GPUix host elements, not DOM, so a
 * browser render would be a fake native preview (MISSION.md's preview rules).
 * The docs pages carry the same source as a code block.
 */

import type { ComponentType } from "react";
import { AlertExample } from "./alert.example.js";
import { AvatarExample } from "./avatar.example.js";
import { BadgeExample } from "./badge.example.js";
import { CardExample } from "./card.example.js";

/** Every example, by the id a docs page and the playground both use. */
export const examples: Readonly<Record<string, ComponentType>> = {
  alert: AlertExample,
  avatar: AvatarExample,
  badge: BadgeExample,
  card: CardExample,
};
