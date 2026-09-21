$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S1 choreography");
  var s1 = comp("S1_NOTE_SELECTED");
  removeLayersNamed(s1, ["cursor", "MENU", "PROMPT BOX", "caption:"]); resetComp(s1);
  // --- selection paints in from the left (0.0–1.2)
  var hl = layerByName(s1, "rect-31");                 // 976x114 highlight, centre (1040,401)
  hl.anchorPoint.setValue([-488, 0]); hl.position.setValue([552, 401]);
  key(S(hl), 0.05, [0, 100], 22, 80); key(S(hl), 1.2, [100, 100], 75, 22);
  // --- cursor
  var cur = pointer(s1, "cursor"); cur.motionBlur = true;
  moveTo(cur, 0.2, 1.25, [760, 720], [1178, 468]);
  // --- context menu (overlay comp placed into S1 so the scene is self-contained)
  var menuComp = comp("OV_MENU_EDIT"); resetComp(menuComp); var menu = s1.layers.add(menuComp); menu.name = "MENU"; menu.motionBlur = true;
  menu.anchorPoint.setValue([1180, 470]); menu.position.setValue([1180, 470]);
  lin(O(menu), 0, 0); lin(O(menu), 1.3, 0); lin(O(menu), 1.42, 100);
  key(S(menu), 1.3, [90, 90], 22, 80); key(S(menu), 1.52, [100, 100], 75, 22);
  key(S(menu), 2.7, [100, 100], 22, 75); key(S(menu), 2.82, [94, 94], 75, 22); lin(O(menu), 2.7, 100); lin(O(menu), 2.82, 0);
  // hover highlight inside the menu precomp appears when the pointer arrives
  var menuGrp = compLayer(menuComp, "grp_menu-popup").source; resetComp(menuGrp); var hover = layerByName(menuGrp, "rect-17");
  lin(O(hover), 0, 0); lin(O(hover), 2.25, 0); lin(O(hover), 2.35, 100);
  moveTo(cur, 1.9, 2.4, [1178, 468], [1262, 636]);
  // --- prompt box
  var boxComp = comp("OV_BOX_EDIT"); resetComp(boxComp); var box = s1.layers.add(boxComp); box.name = "PROMPT BOX"; box.motionBlur = true;
  box.anchorPoint.setValue([550, 468]); box.position.setValue([550, 476]);
  lin(O(box), 0, 0); lin(O(box), 2.8, 0); lin(O(box), 2.95, 100);
  key(P(box), 2.8, [550, 484], 22, 80); key(P(box), 3.05, [550, 468], 75, 22);
  var boxGrp = compLayer(boxComp, "grp_popup-prompt-box").source; resetComp(boxGrp);
  var promptTxt = layerByName(boxGrp, "text-13"); typewriter(promptTxt, 3.0, 2.6);
  var send = layerByName(boxGrp, "rect-14");
  key(S(send), 5.8, [100, 100], 22, 75); key(S(send), 5.88, [86, 86], 75, 22); key(S(send), 6.0, [100, 100], 22, 75);
  moveTo(cur, 5.0, 5.7, [1262, 636], [1176, 552]);
  lin(O(box), 6.05, 100); lin(O(box), 6.2, 0); key(P(box), 6.05, [550, 468], 22, 75); key(P(box), 6.2, [550, 456], 75, 22);
  lin(O(cur), 6.1, 100); lin(O(cur), 6.25, 0);
  // caption
  caption(s1, "Select. Right-click. Say what should change.", 560, 940, 46, 0.6, 0.8);
  cur.moveToBeginning();
  app.endUndoGroup();
  log("S1 ok, layers=" + s1.numLayers);
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
