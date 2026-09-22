import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";

export { assert };

/** OpenAI-compatible mock server that mimics Hermes' SSE stream (including its custom event lines). */
export function startMockServer(port: number): Promise<Server> {
  const words = ["Hi ", "there, ", "friend."];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.headers.authorization !== "Bearer secret") {
        res.writeHead(401, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "bad key" } }));
      }
      if (req.method === "GET" && req.url === "/v1/models") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ data: [{ id: "hermes-agent" }, { id: "other" }] }));
      }
      const j = JSON.parse(body) as { stream?: boolean };
      if (j.stream) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write('event: hermes.tool.progress\ndata: {"tool":"web_search","status":"start"}\n\n');
        let i = 0;
        const t = setInterval(() => {
          if (i < words.length) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: words[i++] } }] })}\n\n`);
          else { res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`); clearInterval(t); res.end(); }
        }, 5);
      } else {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { content: words.join("") }, finish_reason: "stop" }] }));
      }
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

export async function collect(gen: AsyncIterable<{ type: string; text: string }>): Promise<string[]> {
  const out: string[] = [];
  for await (const ev of gen) if (ev.type === "text") out.push(ev.text);
  return out;
}
