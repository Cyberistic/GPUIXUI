/**
 * Carousel example: a three-panel gallery with previous/next controls and
 * indicator dots.
 *
 * The slides stay mounted; only the active one is painted, so the others keep
 * their state without taking layout space. Arrow keys work while the carousel
 * has focus, Home/End jump to the ends, and a dot jumps straight to its slide
 * (press, Enter or Space).
 */

import { useState } from "react";
import {
  Carousel,
  CarouselControl,
  CarouselIndicators,
  CarouselSlide,
  CarouselTrack,
} from "../src/carousel.js";

/** One slide's placeholder content. */
const slide = (title: string, body: string) => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 8, padding: 24 }}
  >
    <text>{title}</text>
    <text>{body}</text>
  </div>
);

/** A looped gallery with real controls. */
export const CarouselExample = () => {
  const [index, setIndex] = useState(0);

  return (
    <div style={{ width: 460 }}>
      <Carousel
        label="Workspace previews"
        value={index}
        onValueChange={setIndex}
        loop
      >
        <CarouselTrack>
          <CarouselSlide>
            {slide("Canvas", "Arrange panels freely.")}
          </CarouselSlide>
          <CarouselSlide>
            {slide("Inspector", "Edit the selection.")}
          </CarouselSlide>
          <CarouselSlide>
            {slide("Timeline", "Scrub through history.")}
          </CarouselSlide>
        </CarouselTrack>
        <CarouselIndicators />
        <div style={{ display: "flex", gap: 8 }}>
          <CarouselControl direction="previous" />
          <CarouselControl direction="next" />
        </div>
      </Carousel>
    </div>
  );
};
