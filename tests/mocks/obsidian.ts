// Minimal stand-in for the `obsidian` module so backend and state-field code can run under Node.
export const Platform = { isMobile: false, isDesktop: true, isDesktopApp: true, isMobileApp: false };
export class Plugin {}
export class PluginSettingTab {}
export class Modal {}
export class ItemView {}
export class Events {
  private handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  on(name: string, cb: (...args: unknown[]) => void) { (this.handlers.get(name) ?? this.handlers.set(name, []).get(name)!).push(cb); return { name, cb }; }
  trigger(name: string, ...args: unknown[]) { for (const cb of this.handlers.get(name) ?? []) cb(...args); }
}
export class Notice { constructor(public message: string) {} }
export class Setting {}
export class FileSystemAdapter {}
export function setIcon() {}
// Bound at module load so tests that replace globalThis.fetch still exercise the "native" request path.
const nativeFetch = globalThis.fetch;
export async function requestUrl({ url, method, headers, body }: { url: string; method?: string; headers?: Record<string, string>; body?: string }) {
  const r = await nativeFetch(url, { method, headers, body });
  const text = await r.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: r.status, text, json };
}
