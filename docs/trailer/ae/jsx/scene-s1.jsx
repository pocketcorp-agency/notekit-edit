$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S1 choreography");
  var s1 = comp("S1_NOTE_SELECTED");
  removeLayersNamed(s1, ["cursor", "MENU", "PROMPT BOX", "caption:"]); resetComp(s1);
  // --- the pointer drags across the sentence; the selection follows it line by line (0.5–1.4)
  var hl = layerByName(s1, "rect-31"); hl.enabled = false;                       // the builder's one-piece highlight
  removeLayersNamed(s1, ["sel-line"]);
  var lines = [];
  for (var i = 0; i < 3; i++) { var r = rectLayer(s1, "sel-line " + (i + 1), 976, 36, 552, 363 + i * 34, hex("3a3160")); r.anchorPoint.setValue([-488, 0]); r.moveAfter(hl); lines.push(r); }
  var cur = pointer(s1, "cursor"); cur.motionBlur = false;
  moveTo(cur, 0.0, 0.45, [760, 720], [558, 358]);                                 // to the start of the sentence
  var t0 = 0.55, t1 = 1.4, xEnd = 1232;                                           // drag from the first word to "pastries."
  key(P(cur), t0, [558, 358], 22, 40); key(P(cur), t1, [xEnd, 436], 40, 22);
  function fracAt(x) { return Math.max(0, Math.min(100, (x - 552) / 976 * 100)); }
  var tLine2 = t0 + (t1 - t0) * 0.31, tLine3 = t0 + (t1 - t0) * 0.72;           // when the pointer crosses into lines 2 and 3
  var xAt2 = 558 + (xEnd - 558) * 0.31, xAt3 = 558 + (xEnd - 558) * 0.72;
  // line 1: grows under the pointer, then fills to the line end the moment the pointer drops to line 2
  lin(S(lines[0]), t0, [0, 100]); lin(S(lines[0]), tLine2, [fracAt(xAt2), 100]); hold(S(lines[0]), tLine2 + 0.001, [100, 100]);
  hold(S(lines[1]), 0, [0, 100]); lin(S(lines[1]), tLine2, [0, 100]); lin(S(lines[1]), tLine3, [fracAt(xAt3), 100]); hold(S(lines[1]), tLine3 + 0.001, [100, 100]);
  hold(S(lines[2]), 0, [0, 100]); lin(S(lines[2]), tLine3, [0, 100]); lin(S(lines[2]), t1, [fracAt(xEnd), 100]);
  // --- context menu (overlay comp placed into S1 so the scene is self-contained)
  var menuComp = comp("OV_MENU_EDIT"); resetComp(menuComp); var menu = s1.layers.add(menuComp); menu.name = "MENU"; menu.motionBlur = true;
  menu.anchorPoint.setValue([1180, 470]); menu.position.setValue([1236, 442]);   // top-left at the pointer
  lin(O(menu), 0, 0); lin(O(menu), 1.6, 0); lin(O(menu), 1.72, 100);
  key(S(menu), 1.6, [90, 90], 22, 80); key(S(menu), 1.82, [100, 100], 75, 22);
  key(S(menu), 2.95, [100, 100], 22, 75); key(S(menu), 3.07, [94, 94], 75, 22); lin(O(menu), 2.95, 100); lin(O(menu), 3.07, 0);
  // hover highlight inside the menu precomp appears when the pointer arrives
  var menuGrp = compLayer(menuComp, "grp_menu-popup").source; resetComp(menuGrp); var hover = layerByName(menuGrp, "rect-17");
  lin(O(hover), 0, 0); lin(O(hover), 2.5, 0); lin(O(hover), 2.6, 100);
  moveTo(cur, 2.15, 2.65, [xEnd, 436], [1318, 608]);
  // --- prompt box
  var boxComp = comp("OV_BOX_EDIT"); resetComp(boxComp); var box = s1.layers.add(boxComp); box.name = "PROMPT BOX"; box.motionBlur = true;
  box.anchorPoint.setValue([550, 468]); box.position.setValue([550, 476]);
  lin(O(box), 0, 0); lin(O(box), 3.05, 0); lin(O(box), 3.2, 100);
  key(P(box), 3.05, [550, 484], 22, 80); key(P(box), 3.3, [550, 468], 75, 22);
  var boxGrp = compLayer(boxComp, "grp_popup-prompt-box").source; resetComp(boxGrp);
  var promptTxt = layerByName(boxGrp, "text-13"); typewriter(promptTxt, 3.25, 2.6);
  var send = layerByName(boxGrp, "rect-14");
  key(S(send), 6.05, [100, 100], 22, 75); key(S(send), 6.13, [86, 86], 75, 22); key(S(send), 6.25, [100, 100], 22, 75);
  moveTo(cur, 5.25, 5.95, [1318, 608], [1176, 552]);
  lin(O(box), 6.3, 100); lin(O(box), 6.45, 0); key(P(box), 6.3, [550, 468], 22, 75); key(P(box), 6.45, [550, 456], 75, 22);
  lin(O(cur), 6.35, 100); lin(O(cur), 6.5, 0);
  // caption
  caption(s1, "Select. Right-click. Say what should change.", 560, 940, 46, 1.6, 0.8);
  cur.moveToBeginning();
  app.endUndoGroup();
  log("S1 ok, layers=" + s1.numLayers);
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
