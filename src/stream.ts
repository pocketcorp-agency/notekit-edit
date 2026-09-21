/** A piece of model output: visible text that goes into the note, or reasoning shown only in the edit log. */
export interface StreamEvent {
  type: "text" | "thinking";
  text: string;
}

export const textEvent = (text: string): StreamEvent => ({ type: "text", text });
export const thinkingEvent = (text: string): StreamEvent => ({ type: "thinking", text });
