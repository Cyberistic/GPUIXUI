/**
 * The film says the library works with these packages. Each runs here, under a
 * real GPUix tree, so the claim is not taken on trust. A package that stops
 * working fails its case by name, and its chip comes out of the film.
 *
 * Effect, TanStack Table, Virtual, Hotkeys and Form are the library's own
 * dependencies and have their suites in `packages/`. react-doctor is a CLI that
 * reads source; it is run over `examples/blocks` by hand (plan 069).
 */
import { createTestRoot } from "@gpuix/react/testing";
import { EventType } from "@tanstack/ai";
import { stream, useChat } from "@tanstack/ai-react";
import { createCollection, localOnlyCollectionOptions } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { createRouterClient, os } from "@orpc/server";
import { createAuthClient } from "better-auth/react";
import * as Arr from "effect/Array";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect, useState, type ReactNode } from "react";

let root: ReturnType<typeof createTestRoot> | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

const mount = (view: ReactNode) => {
  root = createTestRoot({ width: 400, height: 300 });
  root.render(view);
  root.renderer.flush();
  return root;
};

const painted = (id: string): string => {
  const element = root?.renderer.findByTestId(id);
  return String(element?.customProps?.["aria-label"] ?? "");
};

/** Polls the tree until `id` reads `expected`, and returns what it read. */
const settled = async (id: string, expected: string): Promise<string> => {
  for (let i = 0; i < 200 && painted(id) !== expected; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    root?.renderer.flush();
  }
  return painted(id);
};

describe("the npm line", () => {
  it("TanStack DB: a live query repaints the tree when the collection changes", async () => {
    const hunters = createCollection(
      localOnlyCollectionOptions({
        id: "hunters",
        getKey: (hunter: { id: string; name: string }) => hunter.id,
        initialData: [{ id: "gon", name: "Gon" }],
      }),
    );
    const Hunters = () => {
      const { data } = useLiveQuery((q) => q.from({ hunter: hunters }));
      const names = Arr.map(data, (hunter) => hunter.name).join(",");
      return <div testId="names" aria-label={names} />;
    };
    mount(<Hunters />);
    expect(await settled("names", "Gon")).toBe("Gon");
    hunters.insert({ id: "killua", name: "Killua" });
    expect(await settled("names", "Gon,Killua")).toBe("Gon,Killua");
  });

  it("TanStack AI: useChat streams an assistant reply into the tree", async () => {
    const Chat = () => {
      const { messages, sendMessage } = useChat({
        threadId: "whale-island",
        connection: stream(async function* () {
          const base = { model: "fake", timestamp: 0 };
          yield {
            ...base,
            type: EventType.RUN_STARTED,
            runId: "r",
            threadId: "t",
          };
          yield {
            ...base,
            type: EventType.TEXT_MESSAGE_START,
            messageId: "m",
            role: "assistant" as const,
          };
          yield {
            ...base,
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId: "m",
            delta: "Ten",
          };
          yield { ...base, type: EventType.TEXT_MESSAGE_END, messageId: "m" };
          yield {
            ...base,
            type: EventType.RUN_FINISHED,
            runId: "r",
            threadId: "t",
            finishReason: "stop" as const,
          };
        }),
      });
      const text = Arr.map(messages, (message) =>
        Arr.map(message.parts, (part) =>
          part.type === "text" ? part.content : "",
        ).join(""),
      ).join("|");
      useEffect(() => {
        void sendMessage("Nen?");
      }, []);
      return <div testId="chat" aria-label={text} />;
    };
    mount(<Chat />);
    expect(await settled("chat", "Nen?|Ten")).toBe("Nen?|Ten");
  });

  it("oRPC: a typed procedure's answer paints the tree", async () => {
    const licensed = os.handler(() => "Gon is licensed");
    const client = createRouterClient({ licensed });
    const License = () => {
      const [text, setText] = useState("");
      useEffect(() => {
        void client.licensed().then(setText);
      }, []);
      return <div testId="license" aria-label={text} />;
    };
    mount(<License />);
    expect(await settled("license", "Gon is licensed")).toBe("Gon is licensed");
  });

  it("Better Auth: the client fetches the session and paints the user", async () => {
    const auth = createAuthClient({
      baseURL: "http://whale.island",
      fetchOptions: {
        customFetchImpl: async () =>
          new Response(
            JSON.stringify({
              session: { id: "s", userId: "gon", token: "t" },
              user: { id: "gon", name: "Gon Freecss", email: "gon@hunter.org" },
            }),
            { headers: { "content-type": "application/json" } },
          ),
      },
    });
    // `useSession` never fetches here: better-auth skips it when `window` is
    // undefined, and a native app runs under Node. The client's calls work.
    const Account = () => {
      const [name, setName] = useState("");
      useEffect(() => {
        void auth
          .getSession()
          .then(({ data }) => setName(data?.user.name ?? ""));
      }, []);
      return <div testId="user" aria-label={name} />;
    };
    mount(<Account />);
    expect(await settled("user", "Gon Freecss")).toBe("Gon Freecss");
  });
});
