import { createStart } from "@tanstack/react-start";

// Registers the TanStack Start global augmentation for route `server` handlers
// with no extra middleware.
export const startInstance = createStart(() => ({}));
