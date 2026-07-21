import { createAssistantHandler } from "./handler.ts";

type EdgeRuntime = typeof globalThis & {
  Deno: {
    env: {
      get(name: string): string | undefined;
    };
    serve(handler: (request: Request) => Promise<Response>): void;
  };
};

const runtime = globalThis as EdgeRuntime;

runtime.Deno.serve(
  createAssistantHandler({
    env: runtime.Deno.env,
    fetch: (input, init) => fetch(input, init)
  })
);
