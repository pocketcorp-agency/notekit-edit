/**
 * Child-process helpers shared by the desktop plugin and the bridge server.
 * Nothing here imports `obsidian`; the plugin only calls into this file on
 * desktop, where Electron exposes Node's `require`.
 */

export interface LineProcess {
  write(line: string): void;
  /** Closes stdin so the child sees EOF. */
  endInput(): void;
  /** Called for every complete line on stdout. */
  onLine(cb: (line: string) => void): void;
  onStderr(cb: (text: string) => void): void;
  onExit(cb: (code: number | null, signal: string | null) => void): void;
  kill(): void;
  readonly pid: number | undefined;
  readonly exited: boolean;
}

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
}

type NodeRequire = (id: string) => unknown;

interface NodeModules {
  child_process: typeof import("child_process");
  os: typeof import("os");
  path: typeof import("path");
  fs: typeof import("fs");
  process: typeof import("process");
}

/**
 * Electron exposes Node's `require` on desktop; on mobile it doesn't exist, so
 * every Node module is resolved lazily through this function and never at
 * module top level. The plugin only reaches this code after checking
 * `Platform.isDesktopApp` (see `requireDesktop()` in ai.ts).
 */
function nodeRequire<K extends keyof NodeModules>(id: K): NodeModules[K] {
  const r = (globalThis as { require?: NodeRequire }).require;
  if (typeof r !== "function") {
    throw new Error("Local agents can only run on desktop. On mobile, point an OpenAI-compatible agent at the bridge server instead.");
  }
  return r(id) as NodeModules[K];
}

export function canSpawn(): boolean {
  try {
    nodeRequire("child_process");
    return true;
  } catch {
    return false;
  }
}

/** Directories where CLI tools usually live but which GUI apps don't have on PATH. */
function extraPathDirs(): string[] {
  const os = nodeRequire("os");
  const path = nodeRequire("path");
  const fs = nodeRequire("fs");
  const home = os.homedir();
  const dirs = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    path.join(home, ".local", "bin"),
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".volta", "bin"),
    path.join(home, ".bun", "bin"),
    path.join(home, ".claude", "local"),
    path.join(home, "AppData", "Roaming", "npm"),
  ];
  // nvm / fnm keep one bin dir per Node version.
  for (const base of [path.join(home, ".nvm", "versions", "node"), path.join(home, ".fnm", "node-versions")]) {
    try {
      for (const v of fs.readdirSync(base)) {
        dirs.push(path.join(base, v, "bin"), path.join(base, v, "installation", "bin"));
      }
    } catch {
      /* not installed */
    }
  }
  return dirs;
}

/** PATH with the usual CLI locations appended, so `claude`/`npx` resolve from inside Obsidian. */
export function augmentedEnv(extra: Record<string, string> = {}): Record<string, string> {
  const path = nodeRequire("path");
  const env: Record<string, string> = { ...(nodeRequire("process").env as Record<string, string>) };
  const current = env.PATH ?? env.Path ?? "";
  const parts = new Set(current.split(path.delimiter).filter(Boolean));
  for (const d of extraPathDirs()) parts.add(d);
  env.PATH = Array.from(parts).join(path.delimiter);
  // Don't let a spawned Claude Code think it's nested inside another session.
  for (const k of Object.keys(env)) {
    if (k === "CLAUDECODE" || k.startsWith("CLAUDE_CODE_")) delete env[k];
  }
  return { ...env, ...extra };
}

/** Resolves a bare command name against the augmented PATH; returns it unchanged if it has a directory part. */
export function resolveCommand(command: string): string {
  const path = nodeRequire("path");
  const fs = nodeRequire("fs");
  if (command.includes("/") || command.includes("\\")) return expandHome(command);
  const exts = nodeRequire("process").platform === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];
  for (const dir of augmentedEnv().PATH.split(path.delimiter)) {
    for (const ext of exts) {
      const candidate = path.join(dir, command + ext);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        /* keep looking */
      }
    }
  }
  return command; // let spawn produce the ENOENT
}

function expandHome(p: string): string {
  if (!p.startsWith("~")) return p;
  return nodeRequire("os").homedir() + p.slice(1);
}

/** Splits a command line into argv, honouring double/single quotes. */
export function splitCommandLine(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

export function spawnLineProcess(command: string, args: string[], opts: SpawnOptions = {}): LineProcess {
  const cp = nodeRequire("child_process");
  const resolved = resolveCommand(command);
  const child = cp.spawn(resolved, args, {
    cwd: opts.cwd,
    env: augmentedEnv(opts.env),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    shell: nodeRequire("process").platform === "win32" && /\.(cmd|bat)$/i.test(resolved),
  });

  const lineCbs: Array<(line: string) => void> = [];
  const errCbs: Array<(text: string) => void> = [];
  const exitCbs: Array<(code: number | null, signal: string | null) => void> = [];
  let exited = false;
  let buf = "";

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buf += chunk;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (line.trim()) for (const cb of lineCbs) cb(line);
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    for (const cb of errCbs) cb(chunk);
  });
  child.on("error", (err: Error) => {
    exited = true;
    for (const cb of errCbs) cb(`spawn error: ${err.message}\n`);
    for (const cb of exitCbs) cb(-1, null);
  });
  child.on("exit", (code: number | null, signal: string | null) => {
    exited = true;
    if (buf.trim()) for (const cb of lineCbs) cb(buf);
    buf = "";
    for (const cb of exitCbs) cb(code, signal);
  });

  return {
    write: (line) => {
      if (!exited) child.stdin.write(line.endsWith("\n") ? line : line + "\n");
    },
    endInput: () => {
      try {
        child.stdin.end();
      } catch {
        /* ignore */
      }
    },
    onLine: (cb) => void lineCbs.push(cb),
    onStderr: (cb) => void errCbs.push(cb),
    onExit: (cb) => void exitCbs.push(cb),
    kill: () => {
      if (!exited) {
        try {
          child.stdin.end();
        } catch {
          /* ignore */
        }
        child.kill();
      }
    },
    get pid() {
      return child.pid;
    },
    get exited() {
      return exited;
    },
  };
}

/** Spawns a process, writes `stdin` to it, closes stdin, and yields stdout lines until exit. */
export async function* runLines(
  command: string,
  args: string[],
  stdin: string,
  opts: SpawnOptions & { signal?: AbortSignal; onStderr?: (t: string) => void } = {},
): AsyncGenerator<string, { code: number | null; stderr: string }, undefined> {
  const proc = spawnLineProcess(command, args, opts);
  const queue: string[] = [];
  let stderr = "";
  let done: { code: number | null } | null = null;
  let wake: (() => void) | null = null;
  const notify = () => {
    wake?.();
    wake = null;
  };
  proc.onLine((l) => {
    queue.push(l);
    notify();
  });
  proc.onStderr((t) => {
    stderr += t;
    opts.onStderr?.(t);
  });
  proc.onExit((code) => {
    done = { code };
    notify();
  });
  const onAbort = () => proc.kill();
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    proc.write(stdin);
    proc.endInput();
    for (;;) {
      while (queue.length) yield queue.shift()!;
      if (done) break;
      await new Promise<void>((r) => (wake = r));
    }
    return { code: (done as { code: number | null } | null)?.code ?? null, stderr };
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
    proc.kill();
  }
}
