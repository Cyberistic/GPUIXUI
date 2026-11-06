import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { Folder, Note } from "./data.js";

/** The notes in a folder, newest edit first. */
export const notesIn = (
  all: ReadonlyArray<Note>,
  folder: Folder,
): ReadonlyArray<Note> =>
  Arr.filter(all, (note) => folder === "All notes" || note.folder === folder);

/** The two lines a list row shows: the body, collapsed and cut at `limit`. */
export const excerpt = (body: string, limit = 64): string => {
  const flat = Str.trim(body.replace(/\s+/g, " "));
  return flat.length <= limit
    ? flat
    : `${Str.trimEnd(flat.slice(0, limit - 1))}…`;
};

/** Replace one note's body, keeping the rest. */
export const editNote = (
  all: ReadonlyArray<Note>,
  id: string,
  body: string,
): ReadonlyArray<Note> =>
  Arr.map(all, (note) => (note.id === id ? { ...note, body } : note));
