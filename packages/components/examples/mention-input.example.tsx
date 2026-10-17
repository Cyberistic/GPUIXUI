/**
 * Mention input example: a comment composer with three people.
 *
 * Typing `@` opens the ranked list; Enter inserts the highlighted name, or a
 * press picks a row.
 */

import { useState } from "react";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "../src/mention-input.js";

const people = ["ana", "anna", "joan"];

/** A comment field with mention suggestions. */
export const MentionInputExample = () => {
  const [comment, setComment] = useState("");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 360 }}
    >
      <MentionInput label="Comment" value={comment} onValueChange={setComment}>
        <MentionInputList>
          {people.map((person) => (
            <MentionInputItem key={person} value={person} />
          ))}
        </MentionInputList>
      </MentionInput>
      <text>{comment === "" ? "Say something…" : comment}</text>
    </div>
  );
};
