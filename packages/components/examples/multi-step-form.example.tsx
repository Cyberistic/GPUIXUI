/**
 * MultiStepForm example: a three-step workspace wizard with a gate per step.
 *
 * The draft belongs to the example (as it belongs to any caller): each step's
 * gate reads it before the step may move, and the last step's submit reports the
 * record the caller would hand to `Form` for the schema decode.
 */

import { Input } from "@gpuixui/primitives";
import * as Option from "effect/Option";
import { useState } from "react";
import { Button } from "../src/internal/button.js";
import { MultiStepForm } from "../src/multi-step-form.js";

const NAME = /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/;

export const MultiStepFormExample = () => {
  const [name, setName] = useState("");
  const [port, setPort] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [applied, setApplied] = useState("");

  return (
    <MultiStepForm
      label="Create a workspace"
      style={{ width: 420 }}
      submitLabel="Create workspace"
      steps={[
        {
          id: "name",
          title: "Name",
          description: "Lowercase, 3–24 characters",
          gate: () =>
            NAME.test(name)
              ? Option.none()
              : Option.some("Use 3 to 24 lowercase letters, digits or hyphens"),
          content: (
            <Input label="Workspace name" value={name} onChange={setName} />
          ),
        },
        {
          id: "port",
          title: "Port",
          description: "1024–65535",
          gate: () => {
            const value = Number(port);
            return /^[0-9]+$/.test(port) && value >= 1024 && value <= 65535
              ? Option.none()
              : Option.some("Enter a port from 1024 to 65535");
          },
          content: <Input label="Port" value={port} onChange={setPort} />,
        },
        {
          id: "review",
          title: "Review",
          gate: () =>
            accepted
              ? Option.none()
              : Option.some(
                  "Accept the checklist before creating the workspace",
                ),
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <text>{`${name || "no name"}:${port || "no port"}`}</text>
              <Button
                testId="example-accept"
                variant={accepted ? "primary" : "secondary"}
                onClick={() => setAccepted(true)}
              >
                Accept the checklist
              </Button>
              {applied === "" ? null : (
                <text testId="example-applied">{applied}</text>
              )}
            </div>
          ),
        },
      ]}
      onSubmit={() => setApplied(`created ${name}:${port}`)}
    />
  );
};
