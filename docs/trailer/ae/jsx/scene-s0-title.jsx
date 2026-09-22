$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S0 title card");
  for (var i = app.project.numItems; i >= 1; i--) { var it = app.project.item(i); if (it instanceof CompItem && it.name === "S0_TITLE") it.remove(); }
  var c = app.project.items.addComp("S0_TITLE", 1920, 1080, 1, 4, 30); c.bgColor = [1, 1, 1];
  var bg = c.layers.addSolid([1, 1, 1], "white", 1920, 1080, 1, 4);
  var t = c.layers.addText("Add AI to Your Obsidian Vault"); t.name = "title";
  var d = t.property("Source Text").value; d.font = "Didot-Bold"; d.fontSize = 112; d.fillColor = [0.07, 0.07, 0.08]; d.justification = ParagraphJustification.CENTER_JUSTIFY; d.tracking = -8; t.property("Source Text").setValue(d);
  t.position.setValue([960, 578]); charsIn(t, 0.15, 1.0, 50);
  var line = rectLayer(c, "rule", 0, 3, 960, 640, [0.07, 0.07, 0.08]); var rs = rectSize(line); key(rs, 1.0, [0, 3], 22, 80); key(rs, 1.6, [420, 3], 78, 22);
  app.endUndoGroup(); log("S0_TITLE built");
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
