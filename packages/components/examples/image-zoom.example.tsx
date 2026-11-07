/** @jsxImportSource @gpuix/react */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../src/card.js";
import { ImageZoom } from "../src/image-zoom.js";
import { MotionProvider } from "../src/motion.js";

const chart =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYCAYAAACbU/80AAAAr0lEQVR42mOQllf/D8KfcqOwYmLlTauuYcWE5BkG0nKQHMNAWo7TAaRECyWWg6OAEsuxOYDUkGGgxHJ0B5ATLQyUWI7sAHLTBAMllsMcQEmCZBgtB0bLAb152f+RMUwSXRyX/IPNNigYJo8ujkuegRLL0R1AquUoDiDHcmQHkGM53AHkWg5zALmWgx1AieXI8uRYDnfAQFkOzoYDaTlOB5ASLZRYjpENR8uBEVkOAADdl8xbOrEIugAAAABJRU5ErkJggg==";

export const ImageZoomExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Harbour chart</CardTitle>
        <CardDescription>Point at the chart to magnify it</CardDescription>
      </CardHeader>
      <CardContent>
        <ImageZoom
          src={chart}
          alt="A chart of the harbour with four coloured approaches"
          width={360}
          height={200}
        />
      </CardContent>
    </Card>
    <text>Reduced motion: the same magnification, no journey</text>
    <MotionProvider preference="reduced">
      <ImageZoom
        src={chart}
        alt="The same harbour chart at a stronger magnification"
        width={240}
        height={140}
        scale={2.4}
      />
    </MotionProvider>
  </div>
);
