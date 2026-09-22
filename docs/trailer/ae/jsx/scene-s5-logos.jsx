$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S5 real logos");
  var s5 = comp("S5_AGENTS"); s5.duration = 12;
  removeLayersNamed(s5, ["logo ", "label ", "caption:"]);
  // retire the chip ring and the sparkle tile
  for (var j = 1; j <= s5.numLayers; j++) { var L = s5.layer(j); if (L.name === "RING" || L.name === "TILE" || L.name === "chip-codex" || (L.source instanceof CompItem && L.source.name === "grp_chip-item")) L.enabled = false; }
  layerByName(s5, "text-27").enabled = false;
  // centred caption
  var cap = s5.layers.addText("Your subscription. Or any agent."); cap.name = "caption: Your subscription";
  var d = cap.property("Source Text").value; d.font = "HelveticaNeue-Bold"; d.fontSize = 60; d.fillColor = [1, 1, 1]; d.justification = ParagraphJustification.CENTER_JUSTIFY; d.tracking = -10; cap.property("Source Text").setValue(d);
  cap.position.setValue([960, 430]); charsIn(cap, 0.0, 0.8, 46);
  // the seven agents, left to right
  var agents = [["claude-code", "Claude Code"], ["codex", "Codex"], ["anthropic", "Anthropic API"], ["ollama", "Ollama"], ["lm-studio", "LM Studio"], ["hermes", "Hermes Agent"], ["acp", "ACP agents"]];
  var folder = "/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/media/logos/";
  for (var i = 0; i < agents.length; i++) {
    var id = agents[i][0], label = agents[i][1]; var x = 390 + i * 190, y = 650;
    var item = null; for (var k = 1; k <= app.project.numItems; k++) if (app.project.item(k).name === "logo-" + id + ".png") item = app.project.item(k);
    if (!item) { item = app.project.importFile(new ImportOptions(new File(folder + id + ".png"))); item.name = "logo-" + id + ".png"; }
    var tile = s5.layers.add(item); tile.name = "logo " + id; tile.scale.setValue([50, 50]); tile.motionBlur = true;
    var lab = s5.layers.addText(label); lab.name = "label " + id; var ld = lab.property("Source Text").value; ld.font = "HelveticaNeue-Medium"; ld.fontSize = 20; ld.fillColor = hex("9a9a9a"); ld.justification = ParagraphJustification.CENTER_JUSTIFY; ld.tracking = 0; lab.property("Source Text").setValue(ld);
    var t0 = 1.4 + i * 0.16;
    key(P(tile), t0, [x, 1320], 22, 82); key(P(tile), t0 + 0.6, [x, y], 78, 22);
    lin(O(tile), t0, 0); lin(O(tile), t0 + 0.15, 100);
    key(P(lab), t0, [x, 1320 + 112], 22, 82); key(P(lab), t0 + 0.6, [x, y + 112], 78, 22);   // same path as its tile
    lin(O(lab), t0, 0); lin(O(lab), t0 + 0.15, 100); lab.motionBlur = true;
  }
  app.endUndoGroup(); app.project.save(); log("S5 rebuilt with " + agents.length + " logo tiles");
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
