import { parseHeaders, streamChat, streamEdit, testProvider } from "../src/ai";
import { DEFAULT_SETTINGS, migrateSettings, type Provider } from "../src/settings";
import { assert, collect, lastRequest, startMockServer } from "./helpers";

const PORT = 18642;
const hermes: Provider = { id: "h", name: "Hermes", type: "openai", baseUrl: `http://127.0.0.1:${PORT}/v1`, apiKey: "secret", model: "hermes-agent", effort: "medium", headers: "X-Hermes-Session-Key: obsidian", command: "", allowTools: false };
const settings = { ...DEFAULT_SETTINGS, providers: [hermes], defaultProviderId: "h" };
const ctx = { vaultPath: "/tmp" };
const req = { instruction: "greet", selection: "Hello world", before: "", after: "", fileName: "t" };

const server = await startMockServer(PORT);
try {
  const chunks = await collect(streamEdit(hermes, settings, ctx, req, new AbortController().signal));
  assert.deepEqual(chunks, ["Hi ", "there, ", "friend."], "SSE deltas stream; foreign event lines are ignored");
  const editBody = lastRequest.body as { messages: Array<{ role: string }> };
  assert.deepEqual(editBody.messages.map((m) => m.role), ["system", "user"], "edits still send one system and one user message");

  // multi-turn chat: the whole conversation reaches the server as separate turns
  const convo = [
    { role: "user" as const, content: "context + first question" },
    { role: "assistant" as const, content: "first answer" },
    { role: "user" as const, content: "follow-up" },
  ];
  const chatChunks = await collect(streamChat(hermes, settings, ctx, "chat system", convo, new AbortController().signal));
  assert.deepEqual(chatChunks, ["Hi ", "there, ", "friend."]);
  const chatBody = lastRequest.body as { messages: Array<{ role: string; content: string }>; stream: boolean };
  assert.deepEqual(chatBody.messages, [{ role: "system", content: "chat system" }, ...convo]);
  assert.equal(chatBody.stream, true);

  await assert.rejects(collect(streamEdit({ ...hermes, apiKey: "wrong" }, settings, ctx, req, new AbortController().signal)), /Authentication failed.*bad key/);

  // a browser-level fetch failure (CORS) falls back to requestUrl, non-streaming
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
  try {
    const fb = await collect(streamEdit(hermes, settings, ctx, req, new AbortController().signal));
    assert.deepEqual(fb, ["Hi there, friend."]);
  } finally { globalThis.fetch = realFetch; }

  assert.match(await testProvider(hermes, ctx), /connected, “hermes-agent” available/);

  // settings migration
  const legacy = migrateSettings({ apiKey: "sk-old", model: "claude-sonnet-5", effort: "high" });
  assert.equal(legacy.providers.length, 1);
  assert.equal(legacy.providers[0].type, "anthropic");
  assert.equal(legacy.providers[0].apiKey, "sk-old");
  assert.equal(legacy.setupDone, true);
  const fresh = migrateSettings(null);
  assert.equal(fresh.setupDone, false);
  assert.equal(fresh.providers[0].type, "claude-code", "fresh installs default to local Claude Code");
  const dangling = migrateSettings({ providers: [{ id: "x", name: "H", type: "openai", baseUrl: "u", apiKey: "", model: "m" }], defaultProviderId: "nope" });
  assert.equal(dangling.defaultProviderId, "x");
  assert.deepEqual(parseHeaders("A: 1\nbad\n B : x:y "), { A: "1", B: "x:y" });
  console.log("backends: ok");
} finally {
  server.close();
}
