import { EditorState, Transaction } from "@codemirror/state";
import { aiTransaction, jobsField, removeJob, setJob } from "../src/editor-extension";
import { normalizeReplacement } from "../src/ai";
import { assert } from "./helpers";

// Mirrors what runEdit does: replace on the first delta, append at `to` afterwards, then restore + final.
let state = EditorState.create({ doc: "Intro. Hello world, this is a test. Outro.", extensions: [jobsField] });
const job = () => state.field(jobsField).find((j) => j.id === "j1")!;
const quiet = (spec: Parameters<typeof state.update>[0]) => {
  state = state.update({ ...spec, annotations: [Transaction.addToHistory.of(false), aiTransaction.of("j1")] }).state;
};

state = state.update({ effects: setJob.of({ id: "j1", from: 7, to: 35, status: "generating" }) }).state;
assert.equal(state.sliceDoc(job().from, job().to), "Hello world, this is a test.");

state = state.update({ changes: { from: 0, insert: "XX " } }).state;
assert.equal(state.sliceDoc(job().from, job().to), "Hello world, this is a test.", "range survives edits before it");

const original = state.sliceDoc(job().from, job().to);
quiet({ changes: { from: job().from, to: job().to, insert: "Hi " } });
for (const d of ["there, ", "friend."]) quiet({ changes: { from: job().to, insert: d } });
assert.equal(state.sliceDoc(job().from, job().to), "Hi there, friend.", "appended deltas grow the range");

state = state.update({ changes: { from: state.doc.length, insert: " end" } }).state;
quiet({ changes: { from: job().from, to: job().to, insert: original } });
assert.equal(state.sliceDoc(job().from, job().to), original, "original restored before the final replace");
state = state.update({ changes: { from: job().from, to: job().to, insert: normalizeReplacement("```\nHi there, friend.\n```", original) }, effects: setJob.of({ ...job(), status: "done" }) }).state;
assert.equal(state.doc.toString(), "XX Intro. Hi there, friend. Outro. end");
state = state.update({ effects: removeJob.of("j1") }).state;
assert.equal(state.field(jobsField).length, 0);

// cursor-insert mode: an empty range grows with streamed text
let s2 = EditorState.create({ doc: "Line one.\n\nLine three.", extensions: [jobsField] });
const j2 = () => s2.field(jobsField).find((j) => j.id === "j2")!;
s2 = s2.update({ effects: setJob.of({ id: "j2", from: 10, to: 10, status: "generating" }) }).state;
s2 = s2.update({ changes: { from: 10, to: 10, insert: "Line " }, annotations: [aiTransaction.of("j2")] }).state;
s2 = s2.update({ changes: { from: j2().to, insert: "two." }, annotations: [aiTransaction.of("j2")] }).state;
assert.equal(s2.sliceDoc(j2().from, j2().to), "Line two.");

// a whole-document replacement (file reload) drops every job
let s3 = EditorState.create({ doc: "abc def", extensions: [jobsField] });
s3 = s3.update({ effects: setJob.of({ id: "j3", from: 4, to: 7, status: "generating" }) }).state;
s3 = s3.update({ changes: { from: 0, to: s3.doc.length, insert: "completely new note" } }).state;
assert.equal(s3.field(jobsField).length, 0);

// output normalisation
assert.equal(normalizeReplacement("Foo", "\n  bar\n\n"), "\n  Foo\n\n", "edge whitespace preserved");
assert.equal(normalizeReplacement("x", "   "), "   ", "whitespace-only selection untouched");
assert.equal(normalizeReplacement("```js\nlet a\n```", "```js\nlet b\n```"), "```js\nlet a\n```", "fenced original keeps its fence");
assert.equal(normalizeReplacement("```\ntext\n```", ""), "text", "insert mode strips a stray fence");
console.log("state-field: ok");
