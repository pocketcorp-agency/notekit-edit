import { type Clock, closeOpenBlocks, LiveRender } from "../src/live-markdown";
import { assert } from "./helpers";

// ---- closeOpenBlocks
const same = (md: string, why: string) => assert.equal(closeOpenBlocks(md), md, why);
same("# Title\n\nSome **bold** text.", "plain Markdown is untouched");
same("```js\nlet a = 1;\n```\n\nAfter.", "a closed fence is untouched");
same("Use ``` inline ``` here.", "triple backticks inside a line are inline code, not a fence");
same("```js ``` not a fence", "a backtick fence's info string cannot contain backticks");

assert.equal(closeOpenBlocks("Intro\n\n```js\nlet a = 1;"), "Intro\n\n```js\nlet a = 1;\n```", "open fence is closed");
assert.equal(closeOpenBlocks("```py\n"), "```py\n```", "no extra blank line when the text ends with a newline");
assert.equal(closeOpenBlocks("````md\n```js\ninner\n```\n"), "````md\n```js\ninner\n```\n````", "a shorter fence does not close a longer one");
assert.equal(closeOpenBlocks("~~~\ncode\n```"), "~~~\ncode\n```\n~~~", "a different fence char does not close");
assert.equal(closeOpenBlocks("~~~\ncode"), "~~~\ncode\n~~~");
assert.equal(closeOpenBlocks("   ```\nindented fence"), "   ```\nindented fence\n```", "fences may be indented up to 3 spaces");
assert.equal(closeOpenBlocks("> [!note]\n> ```js\n> let a"), "> [!note]\n> ```js\n> let a\n> ```", "fence inside a callout keeps its prefix");
assert.equal(closeOpenBlocks("```\na\n```\n```\nb"), "```\na\n```\n```\nb\n```", "only the last, unclosed fence is closed");
assert.equal(closeOpenBlocks("$$\nx^2"), "$$\nx^2\n$$", "open math block is closed");
same("$$\nx^2\n$$", "closed math block is untouched");
assert.equal(closeOpenBlocks("```\n$$\n"), "```\n$$\n```", "$$ inside a code block is code, not math: only the fence is closed");

// ---- LiveRender with a fake clock and an async render we resolve by hand
class FakeClock implements Clock {
  t = 0;
  private timers = new Map<number, { at: number; fn: () => void }>();
  private next = 1;
  set(fn: () => void, ms: number): number {
    const id = this.next++;
    this.timers.set(id, { at: this.t + ms, fn });
    return id;
  }
  clear(id: number): void {
    this.timers.delete(id);
  }
  now(): number {
    return this.t;
  }
  /** Advances time, firing due timers in order. */
  advance(ms: number): void {
    const until = this.t + ms;
    for (;;) {
      const due = [...this.timers.entries()].filter(([, v]) => v.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.t = due[1].at;
      due[1].fn();
    }
    this.t = until;
  }
  get pending(): number {
    return this.timers.size;
  }
}
const tick = () => new Promise<void>((r) => setImmediate(r));

const clock = new FakeClock();
const rendered: string[] = [];
let inFlight = 0;
let maxInFlight = 0;
const gates: Array<() => void> = [];
const live = new LiveRender(async (md) => {
  inFlight++;
  maxInFlight = Math.max(maxInFlight, inFlight);
  await new Promise<void>((r) => gates.push(r));
  rendered.push(md);
  inFlight--;
}, clock);
const release = async (ms = 0) => {
  clock.t += ms; // render duration
  gates.shift()?.();
  await tick();
};

live.update("a");
assert.equal(clock.pending, 1, "first render is scheduled right away");
clock.advance(0);
assert.equal(inFlight, 1);
live.update("ab");
live.update("abc");
assert.equal(clock.pending, 0, "no second render is scheduled while one is in flight");
await release(40);
assert.deepEqual(rendered, ["a"]);
assert.equal(clock.pending, 1, "text changed during the render, so another is scheduled");
clock.advance(79);
assert.equal(inFlight, 0, "the pause is twice the render time, at least 50 ms (80 ms here)");
clock.advance(1);
assert.equal(inFlight, 1);
await release(300);
assert.deepEqual(rendered, ["a", "abc"], "intermediate updates are coalesced into the latest text");
assert.equal(clock.pending, 0, "nothing new, nothing scheduled");
live.update("abcd");
assert.equal(clock.pending, 1);
clock.advance(399);
assert.equal(inFlight, 0, "slow renders throttle harder (capped at 400 ms)");
clock.advance(1);
assert.equal(inFlight, 1);

// finish(): waits for the render in flight, then renders the final text once
const finishing = live.finish("abcd-final");
live.update("ignored after finish");
await release(10);
await tick();
assert.equal(inFlight, 1, "final render starts after the one in flight");
await release(10);
await finishing;
assert.deepEqual(rendered, ["a", "abc", "abcd", "abcd-final"]);
assert.equal(maxInFlight, 1, "never more than one render at a time");
assert.equal(clock.pending, 0);

// finish() with text already shown renders nothing more
const clock2 = new FakeClock();
const r2: string[] = [];
const live2 = new LiveRender(async (md) => void r2.push(md), clock2);
live2.update("done");
clock2.advance(0);
await tick();
await live2.finish("done");
assert.deepEqual(r2, ["done"]);

// dispose(): nothing renders afterwards
const clock3 = new FakeClock();
const r3: string[] = [];
const live3 = new LiveRender(async (md) => void r3.push(md), clock3);
live3.update("x");
live3.dispose();
clock3.advance(1000);
await tick();
await live3.finish("y");
assert.deepEqual(r3, [], "a disposed renderer never renders");

console.log("live-markdown: ok");
