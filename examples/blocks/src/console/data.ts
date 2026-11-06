/**
 * The console block's sample data: the Hunter Association's deploys.
 */
import type { IconName } from "@gpuixui/icons";

export const sections: ReadonlyArray<readonly [IconName, string]> = [
  ["home", "Overview"],
  ["upload", "Deploys"],
  ["users", "Hunters"],
  ["terminal", "Logs"],
];

export interface Deploy {
  readonly id: string;
  readonly target: string;
  readonly by: string;
  readonly when: string;
  readonly ok: boolean;
}

export const deploys: ReadonlyArray<Deploy> = [
  {
    id: "d8",
    target: "Hunter Website",
    by: "Biscuit Krueger",
    when: "just now",
    ok: true,
  },
  {
    id: "d7",
    target: "Heavens Arena floors",
    by: "Wing",
    when: "1m ago",
    ok: true,
  },
  {
    id: "d6",
    target: "Meteor City",
    by: "Chrollo Lucilfer",
    when: "4h ago",
    ok: false,
  },
  {
    id: "d4",
    target: "Greed Island",
    by: "Killua Zoldyck",
    when: "2m ago",
    ok: true,
  },
  {
    id: "d3",
    target: "Heavens Arena",
    by: "Gon Freecss",
    when: "18m ago",
    ok: true,
  },
  {
    id: "d2",
    target: "Yorknew City",
    by: "Kurapika Kurta",
    when: "1h ago",
    ok: false,
  },
  {
    id: "d1",
    target: "Whale Island",
    by: "Leorio Paladiknight",
    when: "3h ago",
    ok: true,
  },
];
