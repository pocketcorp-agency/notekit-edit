import { Events } from "obsidian";

export type EditStatus = "running" | "done" | "error" | "cancelled";

/** One AI edit, as shown in the sidebar log. */
export interface EditRecord {
  id: string;
  startedAt: number;
  finishedAt?: number;
  file: string;
  agent: string;
  mode: "edit" | "insert";
  instruction: string;
  original: string;
  output: string;
  thinking: string;
  status: EditStatus;
  error?: string;
}

export const HISTORY_LIMIT = 50;

/** In-memory list of edits with change events; persisted by the plugin. */
export class EditHistory extends Events {
  records: EditRecord[] = [];

  load(records: EditRecord[] | undefined): void {
    this.records = (records ?? []).map((r) => (r.status === "running" ? { ...r, status: "cancelled", error: "Interrupted by restart" } : r));
  }

  add(record: EditRecord): void {
    this.records.unshift(record);
    if (this.records.length > HISTORY_LIMIT) this.records.length = HISTORY_LIMIT;
    this.trigger("change", record.id);
  }

  get(id: string): EditRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  update(id: string, patch: Partial<EditRecord>): void {
    const r = this.get(id);
    if (!r) return;
    Object.assign(r, patch);
    this.trigger("change", id);
  }

  append(id: string, field: "output" | "thinking", text: string): void {
    const r = this.get(id);
    if (!r) return;
    r[field] += text;
    this.trigger("change", id);
  }

  clear(): void {
    this.records = this.records.filter((r) => r.status === "running");
    this.trigger("change", "");
  }
}
