$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  var lastStep = "start"; app.beginUndoGroup("TRAILER master");
  // start clean
  for (var i = app.project.numItems; i >= 1; i--) { var it = app.project.item(i); if (it instanceof CompItem && it.name === "TRAILER") it.remove(); }
  var M = app.project.items.addComp("TRAILER", 1920, 1080, 1, 56, 30); M.bgColor = [0.07, 0.07, 0.078]; M.motionBlur = true; M.shutterAngle = 250; M.motionBlurSamplesPerFrame = 8;
  var bg = M.layers.addSolid([0.071, 0.071, 0.078], "BG", 1920, 1080, 1, 56); bg.name = "BG";
  var cam = M.layers.addCamera("CAM", [960, 540]); cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom").setValue(2664);
  var CP = cam.property("Position"), CI = cam.pointOfInterest;
  function camAt(t, x, y, dist, inf, outf) { key(CP, t, [x, y, -dist], inf, outf); key(CI, t, [x, y, 0], inf, outf); }
  function camAt3(t, x, y, z, dist, inf, outf) { key(CP, t, [x, y, z - dist], inf, outf); key(CI, t, [x, y, z], inf, outf); }
  function place(name, start, dur, z) { var L = M.layers.add(comp(name)); L.name = name; L.threeDLayer = true; L.startTime = start; L.inPoint = start; L.outPoint = start + dur; L.position.setValue([960, 540, z || 0]); L.motionBlur = true; return L; }
  lastStep = "S0 cold open (0–3)";
  // ---------------- S0 cold open (0–3) ----------------
  var s0 = place("S0_NOTE", 0, 3.1, 0);
  camAt(0.0, 1040, 400, 1250, 22, 60); camAt(2.6, 1090, 405, 1080, 60, 22);
  key(P(s0), 2.65, [960, 540, 0], 22, 90); key(P(s0), 3.0, [-2100, 540, 0], 60, 22);
  camAt(2.65, 1090, 405, 1080, 22, 85); camAt(3.05, 960, 540, 2664, 80, 22);
  lastStep = "S1 highlight & edit (3–9.8)";
  // ---------------- S1 highlight & edit (3–9.8) ----------------
  var s1 = place("S1_NOTE_SELECTED", 3.0, 6.8, 0);
  key(P(s1), 2.7, [2950, 540, 0], 22, 85); key(P(s1), 3.08, [960, 540, 0], 80, 22);
  camAt(4.9, 960, 540, 2664, 22, 70); camAt(5.5, 1290, 600, 1750, 70, 22);           // rack-zoom into the menu
  camAt(5.7, 1290, 600, 1750, 22, 70); camAt(6.3, 960, 540, 2664, 70, 22);           // back out as the prompt box opens
  key(P(s1), 9.2, [960, 540, 0], 22, 85); key(P(s1), 9.7, [-760, -560, 0], 85, 22);  // flies up-left
  var s1rz = s1.property("ADBE Transform Group").property("ADBE Rotate Z"); key(s1rz, 9.2, 0, 22, 85); key(s1rz, 9.7, -9, 85, 22); key(S(s1), 9.2, [100, 100, 100], 22, 85); key(S(s1), 9.7, [72, 72, 72], 85, 22);
  lastStep = "S2 generating (9.4–18)";
  // ---------------- S2 generating (9.4–18) ----------------
  var s2 = place("S2_GENERATING", 9.4, 8.65, 0);
  key(P(s2), 9.4, [960, 540, 1500], 22, 85); key(P(s2), 9.95, [960, 540, 0], 80, 22); lin(O(s2), 9.4, 0); lin(O(s2), 9.65, 100);
  var s2rot = s2.property("ADBE Transform Group").property("ADBE Rotate Y"); key(s2rot, 10.0, -6, 22, 60); key(s2rot, 16.0, 4, 60, 60); key(s2rot, 17.4, 0, 60, 22);
  camAt(10.0, 960, 540, 2664, 22, 60); camAt(16.5, 990, 520, 2380, 60, 22); camAt(17.0, 990, 520, 2380, 22, 70); camAt(17.6, 960, 540, 2664, 70, 22);
  lastStep = "S3 write at cursor (18–26)";
  // ---------------- S3 write at cursor (18–26) ----------------
  var s3 = place("S3_WRITE", 18.0, 8.05, 0); s3.inPoint = 17.6;   // enters via wipe
  var wipe = s3.property("Effects").addProperty("ADBE Linear Wipe"); wipe.property("ADBE Linear Wipe-0002").setValue(270); wipe.property("ADBE Linear Wipe-0003").setValue(0);
  var wc = wipe.property("ADBE Linear Wipe-0001"); key(wc, 17.6, 100, 22, 60); key(wc, 18.0, 0, 60, 22);
  var bar = rectLayer(M, "wipe-edge", 70, 1080, -40, 540, hex("a882ff")); bar.startTime = 17.5; bar.inPoint = 17.6; bar.outPoint = 18.05; bar.motionBlur = false;
  key(P(bar), 17.6, [-30, 540], 22, 60); key(P(bar), 18.0, [1950, 540], 60, 22); bar.property("Effects").addProperty("ADBE Glo2");
  CP.expression = "value + ((time > 18.3 && time < 25.3) ? (wiggle(0.45, 6) - value) : [0, 0, 0])";   // handheld drift only during S3
  camAt(22.0, 960, 540, 2664, 22, 70); camAt(22.7, 800, 640, 2250, 70, 22); camAt(25.0, 800, 640, 2250, 22, 70); camAt(25.6, 960, 540, 2664, 70, 22);
  key(S(s3), 25.55, [100, 100, 100], 22, 85); key(S(s3), 26.05, [430, 430, 430], 85, 22); lin(O(s3), 25.7, 100); lin(O(s3), 26.05, 0);   // zoom-through
  lastStep = "S4 edits panel (25.5–34)";
  // ---------------- S4 edits panel (25.5–34) ----------------
  var s4 = place("S4_PANEL", 25.5, 8.5, 0); s4.moveAfter(s3);
  camAt(26.2, 960, 540, 2664, 22, 60); camAt(29.0, 1170, 560, 2480, 60, 60); camAt(33.0, 1190, 660, 2480, 60, 22);
  s4.anchorPoint.setValue([0, 540, 0]); s4.position.setValue([0, 540, 0]);
  var s4rot = s4.property("ADBE Transform Group").property("ADBE Rotate Y"); key(s4rot, 33.2, 0, 22, 85); key(s4rot, 33.85, -92, 85, 22); lin(O(s4), 33.6, 100); lin(O(s4), 33.9, 0);
  lastStep = "S5 compatibility (33.55–44)";
  // ---------------- S5 compatibility (33.55–44) ----------------
  var s5 = place("S5_AGENTS", 33.55, 10.5, 0); s5.moveAfter(s4);
  key(S(s5), 33.55, [140, 140, 140], 22, 90); key(S(s5), 33.8, [100, 100, 100], 60, 22); lin(O(s5), 33.55, 0); lin(O(s5), 33.7, 100);
  hold(P(s5), 33.8, [960, 540, 0]); hold(P(s5), 33.83, [968, 534, 0]); hold(P(s5), 33.87, [954, 545, 0]); hold(P(s5), 33.9, [960, 540, 0]);
  camAt(33.6, 960, 540, 2664, 22, 60); camAt(34.3, 760, 520, 2664, 60, 60); camAt(39.0, 1160, 560, 2560, 60, 60); camAt(43.5, 880, 530, 2664, 60, 22);
  var s5b = place("S5B_DEVICES", 38.6, 5.45, 0); lin(O(s5b), 38.6, 0); lin(O(s5b), 38.9, 100);
  var s5cap = layerByName(comp("S5_AGENTS"), "text-27"); lin(O(s5cap), 4.9, 100); lin(O(s5cap), 5.3, 0);   // hand the caption slot to S5B
  key(S(s5), 43.4, [100, 100, 100], 22, 85); key(S(s5), 44.0, [0, 0, 0], 85, 22); key(S(s5b), 43.4, [100, 100, 100], 22, 85); key(S(s5b), 44.0, [0, 0, 0], 85, 22);
  lastStep = "S6 wizard dolly (43.9–52)";
  // ---------------- S6 wizard dolly (43.9–52) ----------------
  var a = place("S6A_WIZARD", 43.9, 8.2, 0), b = place("S6B_WIZARD", 43.9, 8.2, 1000), c = place("S6C_WIZARD", 43.9, 8.2, 2000);
  a.moveAfter(s5b); b.moveAfter(a); c.moveAfter(b);   // A in front of B in front of C
  camAt3(43.9, 960, 540, 0, 2664, 22, 60);
  camAt3(45.6, 960, 540, 0, 2664, 22, 70); camAt3(46.3, 960, 540, 1000, 2664, 70, 22); lin(O(a), 45.9, 100); lin(O(a), 46.2, 0);
  camAt3(47.9, 960, 540, 1000, 2664, 22, 70); camAt3(48.6, 960, 540, 2000, 2664, 70, 22); lin(O(b), 48.2, 100); lin(O(b), 48.5, 0);
  camAt3(51.3, 960, 540, 2000, 2664, 22, 80); camAt3(52.0, 960, 540, 2000, 4200, 80, 22); lin(O(c), 51.5, 100); lin(O(c), 52.0, 0);
  // S6B/S6C local clocks: they start at 43.9 but are seen later — shift their start so entrances play when the camera arrives
  b.startTime = 45.9; b.inPoint = 45.9; b.outPoint = 52.1; c.startTime = 48.2; c.inPoint = 48.2; c.outPoint = 52.1;
  lastStep = "S7 outro (52–56)";
  // ---------------- S7 outro (52–56) ----------------
  var s7 = place("S7_OUTRO", 51.9, 4.1, 0); lin(O(s7), 51.9, 0); lin(O(s7), 52.3, 100);
  hold(CP, 52.0, [960, 540, -2664]); hold(CI, 52.0, [960, 540, 0]);
  var black = M.layers.addSolid([0, 0, 0], "fade-out", 1920, 1080, 1, 56); black.startTime = 55.2; black.inPoint = 55.3; lin(O(black), 55.3, 0); lin(O(black), 56.0, 100);
  cam.moveToBeginning(); black.moveToBeginning();
  app.endUndoGroup(); app.project.save(); log("TRAILER built: " + M.numLayers + " layers, " + M.duration + "s");
} catch (e) { log("ERROR " + e.toString() + " line " + e.line + " file " + e.fileName + " | last=" + (typeof lastStep !== "undefined" ? lastStep : "?")); }
done();
