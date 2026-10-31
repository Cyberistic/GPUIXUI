/** The launcher's sample results: the guild's apps, commands and files. */

import type { IconName } from "@gpuixui/icons";

export interface Result {
  readonly id: string;
  readonly group: "Apps" | "Commands" | "Files";
  readonly title: string;
  readonly subtitle: string;
  readonly icon: IconName;
  readonly shortcut?: string;
}

export const results: ReadonlyArray<Result> = [
  {
    id: "releases",
    group: "Apps",
    title: "Releases",
    subtitle: "The pipeline window",
    icon: "git-branch",
    shortcut: "⌘1",
  },
  {
    id: "notes",
    group: "Apps",
    title: "Notes",
    subtitle: "Kurapika's field notes",
    icon: "file-text",
    shortcut: "⌘2",
  },
  {
    id: "new-release",
    group: "Commands",
    title: "New release",
    subtitle: "Start a pipeline item",
    icon: "plus",
    shortcut: "⌘N",
  },
  {
    id: "relock",
    group: "Commands",
    title: "Lock the Hunter License",
    subtitle: "Ask for Touch ID next time",
    icon: "lock",
  },
  {
    id: "rules",
    group: "Files",
    title: "Exam rules.pdf",
    subtitle: "Hunter Exam · 287th",
    icon: "file",
  },
  {
    id: "replays",
    group: "Files",
    title: "Floor 200 replays",
    subtitle: "Heavens Arena",
    icon: "folder",
  },
];
