$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("Higgsfield plates");
  var M = comp("TRAILER");
  function footage(name) { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i).name === name) return app.project.item(i); throw new Error("footage not found: " + name); }
  function plate(name, start, dur) { var L = M.layers.add(footage(name)); L.name = name; L.threeDLayer = true; L.startTime = start; L.inPoint = start; L.outPoint = Math.min(start + dur, start + L.source.duration); L.position.setValue([960, 540, 0]); L.motionBlur = true; L.moveAfter(layerByName(M, "CAM")); return L; }
  // (the generated cold-open plate is retired: the trailer now opens on a title card)
  var black = layerByName(M, "fade-out"); black.moveToBeginning();
  app.endUndoGroup(); app.project.save(); log("plates placed; TRAILER layers=" + M.numLayers);
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
