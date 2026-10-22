/**
 * Magnetic example: a row of workspace cards whose contents lean toward the
 * pointer, and the same row under the reduced preference.
 *
 * `Magnetic` wraps whatever it is given, so the cards keep their own layout,
 * surface and click behaviour — only the plate inside travels. The second row is
 * the policy answer: the same surface, the same pointer, no lean.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../src/card.js";
import { Magnetic } from "../src/magnetic.js";
import { MotionProvider } from "../src/motion.js";

/** One card: a document the reader can open. */
const Panel = ({
  title,
  detail,
  onOpen,
}: {
  readonly title: string;
  readonly detail: string;
  readonly onOpen: () => void;
}) => (
  <Magnetic onClick={onOpen} style={{ width: 200 }}>
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
      <CardContent>
        <text>Open</text>
      </CardContent>
    </Card>
  </Magnetic>
);

/** Three cards that lean, plus a reduced row that does not. */
export const MagneticExample = () => {
  const [opened, setOpened] = useState("none");

  const card = (title: string, detail: string) => (
    <Panel
      title={title}
      detail={detail}
      onOpen={() => setOpened(title.toLowerCase())}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <text>{`Last opened: ${opened}`}</text>
      <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
        {card("Notes", "A scratch document")}
        {card("Spec", "The current draft")}
        {card("Logs", "This morning's run")}
      </div>
      <MotionProvider preference="reduced">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <text>Reduced motion</text>
          <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
            {card("Notes", "No lean, same actions")}
          </div>
        </div>
      </MotionProvider>
    </div>
  );
};
