/**
 * Terminal QR codes for the bridge (Node only; not part of the plugin bundle).
 */
import qrcode from "qrcode-generator";

/** Builds the QR module matrix for `text` (byte mode, error correction M). `true` = dark. */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/**
 * Renders a QR code with half-block characters (two modules per character) in black on white via
 * ANSI colours, so it scans on dark and light terminals alike. `colour: false` omits the escapes.
 */
export function renderQr(text: string, { quiet = 2, colour = true }: { quiet?: number; colour?: boolean } = {}): string {
  const m = qrMatrix(text);
  const n = m.length;
  const dark = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && m[r][c];
  const lines: string[] = [];
  for (let r = -quiet; r < n + quiet; r += 2) {
    let line = "";
    for (let c = -quiet; c < n + quiet; c++) {
      const top = dark(r, c);
      const bottom = dark(r + 1, c);
      line += top && bottom ? "█" : top ? "▀" : bottom ? "▄" : " ";
    }
    lines.push(colour ? `\x1b[30;47m${line}\x1b[0m` : line);
  }
  return lines.join("\n");
}
