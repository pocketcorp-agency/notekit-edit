$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("Higgsfield plates");
  var M = comp("TRAILER");
  function footage(name) { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i).name === name) return app.project.item(i); throw new Error("footage not found: " + name); }
  function plate(name, start, dur) { var L = M.layers.add(footage(name)); L.name = name; L.threeDLayer = true; L.startTime = start; L.inPoint = start; L.outPoint = Math.min(start + dur, start + L.source.duration); L.position.setValue([960, 540, 0]); L.motionBlur = true; L.moveAfter(layerByName(M, "CAM")); return L; }
  // cold open: the generated push-in replaces the static note for 0–3.1s and whips away with it
  var co = plate("PLATE cold open (Seedance 2.5)", 0, 3.1); var s0 = layerByName(M, "S0_NOTE"); s0.enabled = false;
  key(P(co), 2.65, [960, 540, 0], 22, 90); key(P(co), 3.0, [-2100, 540, 0], 60, 22);
  var black = layerByName(M, "fade-out"); black.moveToBeginning();
  app.endUndoGroup(); app.project.save(); log("plates placed; TRAILER layers=" + M.numLayers);
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
