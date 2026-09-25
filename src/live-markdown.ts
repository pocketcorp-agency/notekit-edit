/**
 * Helpers for rendering Markdown live while it streams in. No `obsidian` import, so the logic is
 * testable under Node; the chat view injects the real renderer.
 */

const FENCE_OPEN = /^((?:\s{0,3}>\s?)*)( {0,3})(`{3,}|~{3,})(.*)$/;

/**
 * Closes blocks that a partial answer has opened but not yet closed, so the text renders as it
 * will once complete: an unclosed fenced code block gets its closing fence (and so shows as a code
 * block with highlighting while it streams), an unclosed `$$` math block gets `$$`.
 */
export function closeOpenBlocks(md: string): string {
  let fence: { prefix: string; char: string; len: number } | null = null;
  let math = false;
  for (const line of md.split("\n")) {
    if (fence) {
      const m = line.match(FENCE_OPEN);
      if (m && m[3][0] === fence.char && m[3].length >= fence.len && m[4].trim() === "") fence = null;
      continue;
    }
    const m = line.match(FENCE_OPEN);
    // A backtick fence's info string may not contain backticks (``` inline ``` is inline code).
    if (m && !(m[3][0] === "`" && m[4].includes("`"))) {
      fence = { prefix: m[1], char: m[3][0], len: m[3].length };
      continue;
    }
    if (line.trim() === "$$") math = !math;
  }
  let out = md;
  const nl = () => (out.endsWith("\n") ? "" : "\n");
  if (fence) out += `${nl()}${fence.prefix}${fence.char.repeat(fence.len)}`;
  else if (math) out += `${nl()}$$`;
  return out;
}

export interface Clock {
  set(fn: () => void, ms: number): number;
  clear(id: number): void;
  now(): number;
}

/**
 * Schedules re-renders of streaming Markdown. At most one render runs at a time; updates that
 * arrive meanwhile are coalesced, and the pause between renders grows with how long a render takes
 * (twice its duration, between 50 and 400 ms), so long answers throttle themselves.
 */
export class LiveRender {
  private latest = "";
  private shown: string | null = null;
  private inFlight: Promise<void> | null = null;
  private timer: number | null = null;
  private lastMs = 0;
  private done = false;
  private disposed = false;

  constructor(
    private render: (md: string) => Promise<void>,
    private clock: Clock,
  ) {}

  /** The latest (partial) text; rendered on the next free slot. */
  update(md: string): void {
    if (this.done || this.disposed) return;
    this.latest = md;
    if (!this.inFlight && this.timer === null && md !== this.shown) this.schedule(this.shown === null ? 0 : this.delay());
  }

  /** Renders the final text once, after any render in flight; later updates are ignored. */
  async finish(md: string): Promise<void> {
    this.done = true;
    this.cancelTimer();
    if (this.inFlight) await this.inFlight;
    if (this.disposed || md === this.shown) return;
    this.shown = md;
    await this.render(md).catch(() => undefined);
  }

  dispose(): void {
    this.disposed = true;
    this.cancelTimer();
  }

  private delay(): number {
    return Math.min(400, Math.max(50, 2 * this.lastMs));
  }

  private schedule(ms: number): void {
    this.timer = this.clock.set(() => {
      this.timer = null;
      this.run();
    }, ms);
  }

  private cancelTimer(): void {
    if (this.timer !== null) this.clock.clear(this.timer);
    this.timer = null;
  }

  private run(): void {
    if (this.done || this.disposed || this.latest === this.shown) return;
    const md = this.latest;
    const started = this.clock.now();
    this.inFlight = this.render(md)
      .catch(() => undefined)
      .then(() => {
        this.lastMs = this.clock.now() - started;
        this.shown = md;
        this.inFlight = null;
        if (!this.done && !this.disposed && this.latest !== this.shown) this.schedule(this.delay());
      });
  }
}
