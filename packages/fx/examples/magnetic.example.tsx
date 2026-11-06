/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";
import { Magnetic } from "../src/magnetic.js";
import { MotionProvider } from "@gpuixui/components/motion";

const Panel = ({
  title,
  detail,
  onOpen,
}: {
  readonly title: string;
  readonly detail: string;
  readonly onOpen: () => void;
}) => (
  <Magnetic style={{ width: 200 }}>
    <Card onClick={onOpen}>
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
