$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S4 choreography");
  var s4 = comp("S4_PANEL"); removeLayersNamed(s4, ["caption:"]); resetComp(s4);
  try { var bm = compLayer(s4, "grp_card-list-item", 3).property("Masks"); while (bm.numProperties) bm.property(1).remove(); } catch (e) {}
  var panel = layerByName(s4, "panel-sidebar");
  key(P(panel), 0.0, [2100, 547], 22, 85); key(P(panel), 0.45, [1750, 547], 80, 22);
  var c1 = compLayer(s4, "grp_card-list-item", 1), c2 = compLayer(s4, "grp_card-list-item", 2), big = compLayer(s4, "grp_card-list-item", 3), first = compLayer(s4, "grp_card-list-item", 4);
  // cards below the expanding entry slide down (positions are panel-relative: world - (1750,547))
  key(P(c1), 1.2, [0, 350 - 547], 22, 75); key(P(c1), 1.7, [0, 850 - 547], 75, 22);
  key(P(c2), 1.2, [0, 286 - 547], 22, 75); key(P(c2), 1.7, [0, 786 - 547], 75, 22);
  // status icons of the two lower cards travel with their cards
  layerByName(s4, "svg-path-68").parent = c2; layerByName(s4, "svg-circle-72").parent = c1; layerByName(s4, "svg-path-73").parent = c1; layerByName(s4, "svg-path-74").parent = c1;
  // the big entry is revealed by a growing mask (header only → full)
  var m = big.property("Masks").addProperty("ADBE Mask Atom"); m.name = "reveal"; var mp = m.property("ADBE Mask Shape");
  function rectShape(w, h) { var s = new Shape(); s.vertices = [[0, 0], [w, 0], [w, h], [0, h]]; s.closed = true; s.inTangents = []; s.outTangents = []; return s; }
  var k1 = mp.addKey(1.2); mp.setValueAtKey(k1, rectShape(340, 64)); var k2 = mp.addKey(1.7); mp.setValueAtKey(k2, rectShape(340, 564));
  mp.setTemporalEaseAtKey(k2, [new KeyframeEase(0, 75)], [new KeyframeEase(0, 22)]);
  var bigGrp = big.source; resetComp(bigGrp); var order = ["text-59", "rect-60", "text-61", "text-62", "rect-63", "text-64", "text-65", "rect-66", "text-67"];
  for (var i = 0; i < order.length; i++) fadeUp(layerByName(bigGrp, order[i]), 1.35 + i * 0.06, 0.4, 14);
  // spinner on the running entry
  var fg = first.source; resetComp(fg); var g = layerByName(fg, "rect-52"); g.anchorPoint.setValue([-2, 7]); g.position.setValue([22, 24]); g.rotation.expression = "time * 480";
  caption(s4, "Every edit, logged.", 560, 940, 46, 2.0, 0.8);
  var sub = caption(s4, "original · output · thinking", 560, 995, 28, 3.0, 0.6, hex("9a9a9a")); var d = sub.property("Source Text").value; d.font = "HelveticaNeue"; sub.property("Source Text").setValue(d);
  app.endUndoGroup(); log("S4 ok");
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
