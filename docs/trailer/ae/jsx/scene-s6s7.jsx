$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S6/S7 choreography");
  var a = comp("S6A_WIZARD"); resetComp(a); var modal = compLayer(a, "grp_modal-dialog");
  // the whole first modal (modal + its two cards + icons) pops in together
  var group = [modal]; for (var j = 1; j <= a.numLayers; j++) { var L = a.layer(j); if (L !== modal && (L.parent === modal || (L.source instanceof CompItem && L.source.name === "grp_card-tile"))) group.push(L); }
  var M = precomp(a, group, "MODAL"); M.anchorPoint.setValue([960, 535]); M.position.setValue([960, 535]);
  key(S(M), 0.0, [78, 78], 22, 85); key(S(M), 0.45, [100, 100], 78, 22); lin(O(M), 0, 0); lin(O(M), 0.2, 100);
  var cC = comp("S6C_WIZARD"); resetComp(cC); var mg = compLayer(cC, "grp_modal-dialog").source; resetComp(mg);
  charsIn(layerByName(mg, "text-11"), 0.5, 0.8, 40); fadeUp(layerByName(mg, "rect-8"), 0.15, 0.4, 12); fadeUp(layerByName(mg, "text-10"), 0.2, 0.4, 12);
  var s7 = comp("S7_OUTRO"); if (s7.layer("LOGO")) throw new Error("S7 already built"); resetComp(s7);
  var LOGO = precomp(s7, [layerByName(s7, "rect-2"), layerByName(s7, "svg-path-2"), layerByName(s7, "svg-path-3"), layerByName(s7, "svg-path-4")], "LOGO"); LOGO.anchorPoint.setValue([960, 380]); LOGO.position.setValue([960, 380]);
  key(S(LOGO), 0.0, [50, 50], 22, 85); key(S(LOGO), 0.4, [108, 108], 60, 60); key(S(LOGO), 0.65, [100, 100], 75, 22); lin(O(LOGO), 0, 0); lin(O(LOGO), 0.15, 100);
  charsIn(layerByName(s7, "text-6"), 0.3, 0.9, 50); fadeUp(layerByName(s7, "text-7"), 1.1, 0.5, 18); fadeUp(layerByName(s7, "text-8"), 1.4, 0.5, 18);
  var fl = nullAt(s7, "FLOAT", 960, 540); fl.position.expression = "value + [0, Math.sin(time * 1.3) * 7]";
  for (var j = 1; j <= s7.numLayers; j++) { var L = s7.layer(j); if (L !== fl && !L.parent) L.parent = fl; }
  app.endUndoGroup(); log("S6/S7 ok");
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
