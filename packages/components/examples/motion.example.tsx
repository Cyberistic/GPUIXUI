/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../src/accordion.js";
import { Button } from "../src/internal/button.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../src/dialog.js";
import { MotionProvider } from "../src/motion.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

const Column = ({
  motion,
  label,
}: {
  readonly motion: "animated" | "reduced";
  readonly label: string;
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <MotionProvider preference={motion}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {label}
        </text>
        <Button testId={`motion-open-${motion}`} onClick={() => setOpen(true)}>
          Open the dialog
        </Button>
        <Accordion type="multiple" defaultValue={["one"]}>
          <AccordionItem value="one">
            <AccordionTrigger>Notifications</AccordionTrigger>
            <AccordionContent>
              <text style={{ color: theme.colors.mutedForeground }}>
                The panel grows to its measured height.
              </text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="two">
            <AccordionTrigger>Appearance</AccordionTrigger>
            <AccordionContent>
              <text style={{ color: theme.colors.mutedForeground }}>
                The panel grows to its measured height.
              </text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent label="Motion" testId={`motion-dialog-${motion}`}>
            <DialogHeader>
              <DialogTitle>Fade and offset</DialogTitle>
              <DialogDescription>
                The surface rises 8px into place; it never scales.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MotionProvider>
  );
};

export const MotionExample = () => {
  const theme = useTheme();

  return (
    <Card style={{ maxWidth: 720 }} variant="elevated">
      <CardHeader>
        <CardTitle>Motion</CardTitle>
        <CardDescription>
          The same surfaces with the reader&apos;s preference either way.
        </CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.xl,
          padding: theme.spacing.lg,
          paddingTop: 0,
          alignItems: "flex-start",
        }}
      >
        <Column motion="animated" label="Animated" />
        <Column motion="reduced" label="Reduced" />
      </div>
    </Card>
  );
};
