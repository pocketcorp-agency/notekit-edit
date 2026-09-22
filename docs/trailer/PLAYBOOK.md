# Notekit Edit — trailer playbook & script

**Format:** 1920×1080, 30 fps, ~55 s, no dialogue (music + on-screen copy), optional VO lines included.
**Tone:** fast, confident, "watch it happen". Dark Obsidian UI on a deep charcoal void; purple (#a882ff) is the
only accent. Every scene *moves*: the camera is never static for more than 1.5 s, and every cut is a motion
transition (fly-out, wipe, zoom-through, whip-pan). All AE work happens in one 3D-camera comp (`TRAILER`) with each
scene as a pre-comp on a card in Z-space, so transitions are real camera moves, not slideshow fades.

**Real content rule:** every edit shown is a genuine run of the plugin. Before building, run the three edits below
with the real backend and paste the exact outputs into the frames (script `docs/trailer/run-edits.ts`, see §5).
The UI frames are rendered from the plugin's own `styles.css`; the streaming/typing motion comes from AE
(text reveal by characters) and Higgsfield (image-to-video for the cinematic "live" shots).

---

## 1. Scene list (timeline)

| # | Time | Scene | Camera / motion | Transition out |
|---|------|-------|-----------------|----------------|
| 0 | 0:00–0:03 | **Cold open** — a single sentence in a note, zoomed way in | Slow push-in on the text, slight drift | Whip-pan right → S1 |
| 1 | 0:03–0:10 | **Highlight & edit** — select, right-click, "Ask AI to edit selection", type instruction | Camera follows the cursor; rack-zoom into the context menu, then the prompt box | Prompt box "sends" → whole card flies up-left, next card zooms in from Z |
| 2 | 0:10–0:18 | **Generation** — highlighted range with shimmer + "⟳ Claude Code" badge; text streams in, badge disappears, green flash | Subtle orbit around the note (3D card tilt 6°), then dolly-in on the new bullet list | Vertical wipe (purple edge) → S3 |
| 3 | 0:18–0:26 | **Write at cursor** — empty line under "Packing list", context menu "Ask AI to write here", pulsing caret, list types itself in | Handheld-ish drift; punch-in at the caret; pull back as the list fills | Card zooms *through* the camera → S4 |
| 4 | 0:26–0:34 | **Edits panel** — sidebar slides in; entry expands to Original / Output / Thinking | Camera pans right with the panel; slow tilt down along the expanded card | Panel folds away (3D rotation on Y), title card slams in → S5 |
| 5 | 0:34–0:40 | **Compatibility** — grid of agent logos/names orbiting the plugin icon: Claude Code (subscription), Codex, Anthropic API, OpenAI, Hermes Agent, Ollama, ACP agents; then phone + laptop with the bridge line drawn between them | Continuous orbit; each name flies in on its own vector and locks; phone/laptop slide in from opposite sides | Everything collapses to a point → S6 |
| 6 | 0:44–0:52 | **Setup wizard** — "Claude / Codex" → "Subscription / API key" → ✓ logged in | Quick 3-step dolly through the modal (three cards in depth) | Zoom out to logo |
| 7 | 0:52–0:55 | **Outro** — plugin name, "Free · Obsidian community plugins", GitHub URL | Logo settles, gentle float | Fade to black |

---

## 2. Script (on-screen copy + optional VO)

| Scene | On-screen text (kinetic type) | VO (optional, calm & quick) |
|---|---|---|
| 0 | — | "Your notes. Your words. Now with an editor that listens." |
| 1 | **Select. Right-click. Say what should change.** | "Select a passage, right-click, and tell it what to change." |
| 2 | **It rewrites in place — streaming.** | "It rewrites the passage right there in the note, while you watch." |
| 3 | **No selection? It writes at the cursor.** | "No selection? Put the cursor anywhere and it writes there, using the whole note as context." |
| 4 | **Every edit, logged.** *(sub: original · output · thinking)* | "Every edit is logged — what it saw, what it wrote, and why." |
| 5 | **Your subscription. Or any agent.** *(sub: Claude Code · Codex · API keys · Hermes · Ollama · ACP)* | "Use the Claude or ChatGPT subscription you already pay for — or an API key, a local model, or any agent." |
| 5b | **Desktop and phone.** *(sub: one bridge, no keys on the phone)* | "On desktop and on your phone." |
| 6 | **Set up in ten seconds.** | "Set up in ten seconds. No API key needed." |
| 7 | **Notekit Edit** — *Free in Obsidian community plugins* | "Notekit Edit. Free, for Obsidian." |

---

## 3. Scene-by-scene animation spec

Timing units are seconds from scene start. Easing: all UI moves `easeOutQuint`; camera moves `easeInOutCubic`;
nothing linear except the shimmer. Motion blur ON for the camera; OFF for UI text.

### S0 — Cold open (3 s)
- Frame: `note-plain.png` (the Lisbon note, source-mode-free live preview).
- Camera starts at 220 % zoom on the run-on Saturday sentence, drifts −40 px/s in X, pushes to 250 %.
- 2.4 s: whip-pan right (camera X +1800 px over 0.35 s, 40 px directional blur), cutting into S1 at 200 % zoom.

### S1 — Highlight & edit (7 s)
- 0.0–1.2 selection paints across the sentence word by word (mask reveal on the selection layer).
- 1.2 cursor (a real macOS pointer PNG, 2 % scale wobble) right-clicks: context-menu layer scales 0.92→1.0 with
  6 px Y drop, 180 ms.
- 1.9 rack-zoom into "Ask AI to edit selection" (camera 200 %→260 %, item background pulses purple once).
- 2.6 click → menu pops away (scale to 0.9, opacity 0, 120 ms). Prompt box slides up 8 px + fades in (150 ms).
- 3.0–5.6 instruction types itself, 28 chars/s: **"Split into short sentences and make it a bullet list"**
  (caret blinks at 530 ms).
- 5.8 Enter: send button flashes, box lifts 6 px and dissolves; simultaneously the whole note card flies
  up-left off frame (position −900,−500, rotation −4°) while S2's card scales in from 60 % at Z +800.

### S2 — Generation (8 s)
- 0.0 range gets `ai-edit-generating` look: shimmering purple gradient (AE: gradient ramp + offset expression
  `time*400`) + dotted underline; "⟳ Claude Code (subscription)" badge pops in at range end (scale 0→1, 200 ms,
  spinner rotates 360°/0.8 s).
- 0.3–4.5 the original sentence is replaced by the **real output** (from run #1, see §5) streaming in ~50 chars/s;
  the badge rides along at the end of the growing text.
- Camera: 3D card tilted 6° on Y, slow orbit (−6°→+4° over 6 s), dolly-in 10 %.
- 4.6 badge scales out; range flashes green (`ai-edit-done`, 0.3 s hold, 1.2 s fade).
- 5.2 status-bar text "✦ Claude Code (subscription) editing…" disappears; kinetic caption
  **"It rewrites in place — streaming."** slides in from the bottom-left at 5.0.
- 7.4 vertical wipe: a 40 px purple edge sweeps left→right over 0.4 s revealing S3.

### S3 — Write at cursor (8 s)
- Frame: the note after the edit, with the "Packing list" heading and an empty line below it.
- 0.0 cursor clicks the empty line, 0.5 right-click → context menu (same choreography as S1, item is
  **"Ask AI to write here"**). Prompt box shows "Write at cursor" and the instruction types:
  **"Add a packing list for 4 days of mild weather, walking a lot"**.
- 2.6 Enter → box dissolves; a pulsing purple caret (`ai-edit-caret`, opacity 1↔0.25, 0.9 s) appears with the
  "⟳ Codex (subscription)" badge.
- 3.0–6.6 the **real output** of run #2 types in line by line (each bullet slides in 6 px from the left).
- Camera: small handheld drift (wiggle(0.6, 4) on position), punch-in 10 % at the caret at 2.6, pull back
  to 100 % as the list fills; caption **"No selection? It writes at the cursor."** at 3.2.
- 7.5 the card zooms *through* the camera (scale to 400 %, opacity to 0, 0.45 s) revealing S4 behind it.

### S4 — Edits panel (8 s)
- 0.0 note in the centre; the right sidebar slides in from the right edge (x +340→0, 0.35 s) showing the
  "AI edits" list with the two entries from runs #1 and #2 (spinner on the running one for 1 s, then ✓).
- 1.2 click on the first entry → card expands (height animates), sections **Original / Output / Thinking**
  cascade in (stagger 90 ms).
- Camera pans right 240 px with the panel, then tilts down slowly along the expanded card (Y −180 px, 4 s).
- 2.0 caption **"Every edit, logged."**, 3.0 sub-caption "original · output · thinking" under it.
- 7.2 the panel folds away: 3D Y-rotation 0→−90° around its left edge (0.4 s), the note card scales down and
  a full-frame purple title card slams in from Z (scale 140→100, 0.25 s, 2-frame shake).

### S5 — Compatibility (10 s)
- Title card **"Your subscription. Or any agent."** holds 1.2 s, then the text shrinks to the top-left corner.
- Centre: the plugin icon (✦ on a rounded purple tile). Seven chips orbit in on their own vectors and lock into a
  ring (each 0.35 s, stagger 120 ms): *Claude Code · Codex · Anthropic API · OpenAI · Hermes Agent · Ollama / LM
  Studio · ACP agents*. The ring rotates slowly (12°/s); the camera orbits the opposite way (−6°/s) with a 4°
  Z-tilt so the chips have parallax.
- 5.0 the ring pushes back (Z +600, blur 4 px); a laptop and a phone (flat vector outlines, 2-px purple stroke)
  slide in from left and right; a dashed line draws itself between them (trim paths 0→100 %, 0.6 s) with the
  label **bridge**; caption **"Desktop and phone."**
- 9.4 everything collapses toward the centre point (scale 0, 0.35 s) and the point expands into S6's modal.

### S6 — Setup wizard (8 s)
- Three modal cards stacked in depth (Z 0 / +500 / +1000): *Claude or Codex?* → *Subscription or API key?* →
  *✓ Claude Code 2.1 · logged in via claude.ai*. Camera dollies forward through them (each 0.7 s move,
  1.6 s hold); the "Claude" and "Subscription" choices get a purple ring + tick as the camera arrives.
- Caption **"Set up in ten seconds."** on the third card.
- 7.2 zoom-out (camera Z −1500 over 0.6 s) — the cards recede into the void and the logo of S7 fades up.

### S7 — Outro (3 s)
- **Notekit Edit** wordmark (kinetic: letters settle in from ±20 px), sub **"Free in Obsidian community plugins"**,
  GitHub URL. Gentle float (wiggle(0.3, 3)). Fade to black at 2.5 s.

Music: 100–110 bpm, minimal synth pulse with a riser at 0:33 (into S5) and a hit at 0:44. Every cut lands on a beat.

---

## 4. Higgsfield shots (generated from frames)

Image-to-video, 1920×1080, 3–5 s each, used as *plates* inside the AE camera comp so the UI itself has life.
Prompts stress "no new UI elements, no text changes, keep everything legible":

| Clip | Source frame | Prompt gist | Used in |
|---|---|---|---|
| H1 | `frame-cold-open.png` | very slow cinematic push-in on a dark note-taking app, soft light sweep across the text, shallow depth of field, no text changes | S0 |
| H2 | `frame-generating.png` | the purple highlighted paragraph glows and shimmers gently, tiny particles of light drift up from the highlight, camera drifts slowly, everything else still | S2 (behind the typed text) |
| H3 | `frame-panel.png` | subtle parallax: the sidebar panel floats slightly forward from the note, soft ambient light, slow dolly | S4 background |
| H4 | `frame-devices.png` | laptop and phone outlines on dark background, a beam of purple light travels along the dashed line between them, looping | S5b |
| H5 | `frame-logo.png` | the sparkles logo glints, soft purple bloom breathing, particles, slow zoom | S7 |

Model: pick the best image-to-video model listed by `models_explore` at build time (prefer one with camera-motion
control); one job per clip via `generate_video_batch`, then review each clip and re-roll any that changes text.

---

## 5. Real edits to record before the build

Run these with the real backend (Claude Code subscription on this Mac; Codex for #2) on the trailer note
`docs/trailer/note.md` and paste the outputs into the frames — no invented output:

1. **Edit** — select the Saturday run-on sentence; instruction *"Split into short sentences and make it a bullet
   list"* → output goes into S2/S4.
2. **Insert** — cursor on the empty line under "## Packing list"; instruction *"Add a packing list for 4 days of
   mild weather, walking a lot"* → output goes into S3/S4.
3. **Thinking** for the S4 card: rerun #1 through the Anthropic API agent (summarised thinking is returned) so the
   Thinking section shows real reasoning text.

`docs/trailer/run-edits.ts` runs edits #1 and #2 through the plugin's own backend code (`src/claude-cli.ts` /
`src/codex-cli.ts`) and writes the outputs to `docs/trailer/outputs/*.txt`; the frames are then rendered at 2×
with the plugin's real `styles.css` (same renderer as `docs/screenshots/`).

---

## 6. Build order in After Effects

1. `ae_get_skill('ae-clean-rig')` (+ `ae-transition-kit`, `ae-depth-space`) — follow the rig doctrine.
2. Import frames + Higgsfield plates; one pre-comp per scene (S0…S7), 1920×1080, 30 fps.
3. `TRAILER` comp: a camera (35 mm, DoF on, aperture 40), each scene pre-comp as a 3D card at its Z slot;
   camera keyframes per §3; transitions from the kit (whip-pan, wipe, zoom-through, fold).
4. Kinetic captions: one text layer per caption with a per-character animator (position Y 40→0, opacity, 3-frame
   stagger). Typing effects via `Source Text` expressions on the instruction and output layers.
5. Shimmer: gradient ramp on the highlight matte + `offset` expression; spinner: rotation `time*450`.
6. Audit: `ae_audit_motion` + `ae_audit_frame` on every scene; export a contact sheet, fix, then render H.264.

---

## 7. As built (2026-09-21)

- **Project:** `docs/trailer/ae/Notekit-Edit-Trailer.aep` — master comp `TRAILER` (1920×1080, 30 fps, 56 s) with a real
  two-node camera, every scene as a 3D card. Scene comps `S0_NOTE … S7_OUTRO`, overlays `OV_MENU_*` / `OV_BOX_*`, and
  precomps `grp_*` / `BADGE` / `TILE` / `MODAL` / `LOGO` are all native, editable layers.
- **How it was built:** the scene frames were authored as HTML (`ae/gen-scenes.py` → `ae/html/*.html`) and turned into
  native text/shape layers with the Higgsfield `ae_build_scene_from_html` pipeline; choreography, the camera and the
  assembly were scripted in ExtendScript (`ae/jsx/*.jsx`, run through `DoScript`). Re-run order:
  `cleanup → scene-s1 … scene-s6s7 → master → plates`.
- **Real content:** the streamed bullet list is the actual Claude Code output and the packing list the actual Codex
  output from `docs/trailer/outputs/`.
- **Generated plates:** three Seedance 2.5 image-to-video plates from AE frames (cold open, devices, logo); see
  `ae/media/MANIFEST.md`. The fourth plate (glowing highlight) was generated but not used.
- **Render:** `aerender` → `ae/renders/Notekit-Edit-Trailer.mp4` (H.264, 40 Mbit/s, Best settings).
- **Not done:** music/VO — Higgsfield has no standalone music model, so the cut is silent; drop a 100–110 bpm track
  under it (hits at 0:33 and 0:44) in AE or Premiere.

### Revisions (2026-09-22)

- The "Desktop and phone" beat (old S5b) was cut; the compatibility ring now collapses straight into the wizard.
  Total runtime 52 s. `S5B_DEVICES` and its generated plate remain in the project but are not on the timeline.
- The purple sparkle tile in the compatibility ring and the outro was replaced by the Notekit logo card
  (`docs/media/logo-tile.png`, rounded corners); the outro's generated logo plate is retired.
- Thumbnail: `docs/media/trailer-thumbnail.png` (1920x1080) and `trailer-thumbnail-1280.jpg`.
