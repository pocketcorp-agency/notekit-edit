$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("Higgsfield plates");
  var M = comp("TRAILER");
  function plate(name, start, dur) { var L = layerByName(M, name); L.threeDLayer = true; L.startTime = start; L.inPoint = start; L.outPoint = Math.min(start + dur, start + L.source.duration); L.position.setValue([960, 540, 0]); L.motionBlur = true; L.moveAfter(layerByName(M, "CAM")); return L; }
  // cold open: the generated push-in replaces the static note for 0–3.1s and whips away with it
  var co = plate("PLATE cold open (Seedance 2.5)", 0, 3.1); var s0 = layerByName(M, "S0_NOTE"); s0.enabled = false;
  key(P(co), 2.65, [960, 540, 0], 22, 90); key(P(co), 3.0, [-2100, 540, 0], 60, 22);
  // devices: crossfade from the native build once the line is drawn (S5B local 2.2 = master 40.8)
  var dv = plate("PLATE devices (Seedance 2.5)", 40.6, 5.0); lin(O(dv), 40.6, 0); lin(O(dv), 41.1, 100);
  key(S(dv), 43.4, [100, 100, 100], 22, 85); key(S(dv), 44.0, [0, 0, 0], 85, 22);
  var s5b = layerByName(M, "S5B_DEVICES"); lin(O(s5b), 40.7, 100); lin(O(s5b), 41.1, 0);
  // logo: after the native entrance settles (S7 local 2.0 = master 53.9), the glinting plate takes over
  var lg = plate("PLATE logo (Seedance 2.5)", 53.8, 2.4); lin(O(lg), 53.8, 0); lin(O(lg), 54.4, 100);
  var s7 = layerByName(M, "S7_OUTRO"); lin(O(s7), 54.0, 100); lin(O(s7), 54.5, 0);
  var black = layerByName(M, "fade-out"); black.moveToBeginning();
  app.endUndoGroup(); app.project.save(); log("plates placed; TRAILER layers=" + M.numLayers);
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
