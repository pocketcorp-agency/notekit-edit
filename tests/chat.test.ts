import { flattenConversation } from "../src/ai";
import { buildChatSystem, buildContextBlock, type ChatTurn, conversationForRequest, locateText, NOTE_CONTEXT_LIMIT } from "../src/chat";
import { assert } from "./helpers";

const turn = (role: ChatTurn["role"], content: string, status: ChatTurn["status"] = "done"): ChatTurn => ({ id: `${role}-${content}`, role, content, thinking: "", status });

// ---- single-prompt backends (CLIs, ACP)
assert.equal(flattenConversation([{ role: "user", content: "only" }]), "only", "one message is sent unchanged, like edits");
const flat = flattenConversation([
  { role: "user", content: "Q1" },
  { role: "assistant", content: "A1" },
  { role: "user", content: "Q2" },
]);
assert.match(flat, /<user>\nQ1\n<\/user>\n\n<assistant>\nA1\n<\/assistant>\n\n<user>\nQ2\n<\/user>/);
assert.match(flat, /Reply to the last user message/);

// ---- context block: always built from the text passed in (the note's latest content)
const noteBlock = buildContextBlock("Plan", "# Plan\nShip it.", "note", "");
assert.match(noteBlock, /<note name="Plan">\n# Plan\nShip it.\n<\/note>/);
assert.match(noteBlock, /whole note/);
assert.doesNotMatch(noteBlock, /<selection>/);
const selBlock = buildContextBlock('My "quoted" note', "a b c", "selection", "b");
assert.match(selBlock, /<note name="My 'quoted' note">/, "quotes in the name cannot break the tag");
assert.match(selBlock, /<selection>\nb\n<\/selection>/);
const huge = buildContextBlock("Big", "x".repeat(NOTE_CONTEXT_LIMIT + 10), "note", "");
assert.ok(huge.includes("only its first"), "oversized notes are cut and the model is told");
assert.ok(huge.length < NOTE_CONTEXT_LIMIT + 500);

// ---- request messages: context only in front of the first question, failed turns skipped
const ctx = "<note>CTX</note>";
let msgs = conversationForRequest([], "What is this?", ctx);
assert.deepEqual(msgs, [{ role: "user", content: `${ctx}\n\n---\n\nWhat is this?` }]);

msgs = conversationForRequest(
  [turn("user", "Q1"), turn("assistant", "A1"), turn("user", "Q2"), turn("assistant", "", "error"), turn("user", "Q3"), turn("assistant", "partial", "cancelled")],
  "Q4",
  ctx,
);
assert.deepEqual(msgs.map((m) => m.role), ["user", "assistant", "user"], "roles alternate; failed and cancelled exchanges are left out");
assert.equal(msgs[0].content, `${ctx}\n\n---\n\nQ1`);
assert.equal(msgs[1].content, "A1");
assert.equal(msgs[2].content, "Q4");
assert.equal(msgs.filter((m) => m.content.includes(ctx)).length, 1, "context is sent once per request");

// ---- finding the passage again for "Replace selection"
const doc = "alpha beta alpha gamma alpha";
assert.deepEqual(locateText(doc, "alpha", 0), { from: 0, to: 5 });
assert.deepEqual(locateText(doc, "alpha", 12), { from: 11, to: 16 }, "nearest occurrence to where it was selected");
assert.deepEqual(locateText(doc, "alpha", 100), { from: 23, to: 28 });
assert.equal(locateText(doc, "delta", 0), null);
assert.equal(locateText(doc, "", 0), null);

// ---- system prompt
assert.match(buildChatSystem(""), /inside Obsidian/);
assert.match(buildChatSystem("Answer in German."), /Additional instructions from the user:\nAnswer in German\./);

console.log("chat: ok");
