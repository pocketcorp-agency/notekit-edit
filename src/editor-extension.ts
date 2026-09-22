import { Annotation, StateEffect, StateField, type Transaction } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";

export type JobStatus = "target" | "generating" | "done" | "error";

/** A tracked range in the document: the passage the AI is (about to be) editing. */
export interface EditJob {
  id: string;
  from: number;
  to: number;
  status: JobStatus;
  /** Shown in the progress badge while generating (agent name). */
  label?: string;
}

/** Upsert a job (by id). */
export const setJob = StateEffect.define<EditJob>();
/** Remove a job by id. */
export const removeJob = StateEffect.define<string>();
/** Marks transactions dispatched by the plugin itself (streamed text, final replacement). */
export const aiTransaction = Annotation.define<string>();

/**
 * Holds every in-flight edit job for this editor. Ranges are mapped through
 * document changes so a job keeps pointing at the right text even while the
 * user edits elsewhere in the note. `to` maps with assoc=1 so text the plugin
 * inserts at the end of the range becomes part of the range.
 */
export const jobsField = StateField.define<EditJob[]>({
  create: () => [],
  update(jobs, tr) {
    let next = jobs;
    if (tr.docChanged && next.length && !tr.annotation(aiTransaction) && replacesWholeDoc(tr)) {
      // The note was swapped out from under us (file reload, select-all + paste, …):
      // every tracked range is meaningless now, so drop them rather than edit the wrong text.
      next = [];
    }
    if (tr.docChanged) {
      next = next.map((j) => ({
        ...j,
        from: tr.changes.mapPos(j.from, -1),
        to: tr.changes.mapPos(j.to, 1),
      }));
    }
    for (const e of tr.effects) {
      if (e.is(setJob)) {
        next = next.filter((j) => j.id !== e.value.id).concat(e.value);
      } else if (e.is(removeJob)) {
        next = next.filter((j) => j.id !== e.value);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field, buildDecorations),
});

function replacesWholeDoc(tr: Transaction): boolean {
  const len = tr.startState.doc.length;
  let whole = false;
  tr.changes.iterChangedRanges((fromA, toA) => {
    if (fromA === 0 && toA === len) whole = true;
  });
  return whole;
}

const marks: Record<JobStatus, Decoration> = {
  target: Decoration.mark({ class: "ai-edit-range ai-edit-target" }),
  generating: Decoration.mark({ class: "ai-edit-range ai-edit-generating" }),
  done: Decoration.mark({ class: "ai-edit-range ai-edit-done" }),
  error: Decoration.mark({ class: "ai-edit-range ai-edit-error" }),
};

/** Shown at the cursor while a job has no text yet (insert mode, before the first token). */
class CaretWidget extends WidgetType {
  constructor(private status: JobStatus) {
    super();
  }
  eq(other: CaretWidget): boolean {
    return other.status === this.status;
  }
  toDOM(): HTMLElement {
    return createSpan({ cls: `ai-edit-caret ai-edit-caret-${this.status}`, attr: { "aria-hidden": "true" } });
  }
  ignoreEvent(): boolean {
    return true;
  }
}

/** Inline "Claude Code..." badge with a spinner shown right after a range that is being generated. */
class ProgressWidget extends WidgetType {
  constructor(private label: string) {
    super();
  }
  eq(other: ProgressWidget): boolean {
    return other.label === this.label;
  }
  toDOM(): HTMLElement {
    const el = createSpan({ cls: "ai-edit-progress", attr: { "aria-label": `${this.label} is generating` } });
    el.createSpan({ cls: "ai-edit-spinner" });
    el.createSpan({ cls: "ai-edit-progress-label", text: this.label });
    return el;
  }
  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(jobs: EditJob[]): DecorationSet {
  const ranges = [];
  for (const j of jobs) {
    if (j.to > j.from) ranges.push(marks[j.status].range(j.from, j.to));
    else ranges.push(Decoration.widget({ widget: new CaretWidget(j.status), side: 1 }).range(j.from));
    if (j.status === "generating") {
      ranges.push(Decoration.widget({ widget: new ProgressWidget(j.label ?? "AI"), side: 2 }).range(j.to));
    }
  }
  return Decoration.set(ranges, true);
}

export function getJob(view: EditorView, id: string): EditJob | undefined {
  return view.state.field(jobsField, false)?.find((j) => j.id === id);
}
