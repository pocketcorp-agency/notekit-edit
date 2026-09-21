$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S3 choreography");
  var s3 = comp("S3_WRITE"); if (s3.layer("BADGE")) throw new Error("S3 already built");
  removeLayersNamed(s3, ["cursor", "MENU", "PROMPT BOX", "caption:", "text-cursor"]); resetComp(s3);
  var list = layerByName(s3, "text-34"), caret = layerByName(s3, "rect-33");
  var badge = layerByName(s3, "badge-chip"), ring = layerByName(s3, "rect-36"), inner = layerByName(s3, "rect-37"), gap = layerByName(s3, "rect-38"), label = layerByName(s3, "text-39");
  var status = layerByName(s3, "text-46"), sI = [layerByName(s3, "svg-path-42"), layerByName(s3, "svg-path-43"), layerByName(s3, "svg-path-44")];
  // white text cursor blinking on the empty line until the AI takes over
  var tc = rectLayer(s3, "text-cursor", 2, 26, 561, 515, hex("dadada")); tc.opacity.expression = "time < 4.0 ? ((time*2)%1 < 0.5 ? 100 : 0) : 0";
  caret.opacity.expression = "time < 4.0 || time > 7.3 ? 0 : ((time*1.1)%1 < 0.5 ? 100 : 30)";
  // pointer
  var cur = pointer(s3, "cursor"); cur.motionBlur = true;
  moveTo(cur, 0.0, 0.5, [760, 300], [568, 522]);
  // context menu at the click point
  var menuComp = comp("OV_MENU_WRITE"); resetComp(menuComp); var menu = s3.layers.add(menuComp); menu.name = "MENU"; menu.motionBlur = true;
  menu.anchorPoint.setValue([860, 516]); menu.position.setValue([582, 530]);
  lin(O(menu), 0, 0); lin(O(menu), 0.55, 0); lin(O(menu), 0.67, 100); key(S(menu), 0.55, [90, 90], 22, 80); key(S(menu), 0.77, [100, 100], 75, 22);
  key(S(menu), 1.6, [100, 100], 22, 75); key(S(menu), 1.72, [94, 94], 75, 22); lin(O(menu), 1.6, 100); lin(O(menu), 1.72, 0);
  var menuGrp = compLayer(menuComp, "grp_menu-popup").source; resetComp(menuGrp); var hover = layerByName(menuGrp, "rect-17");
  lin(O(hover), 0, 0); lin(O(hover), 1.3, 0); lin(O(hover), 1.4, 100);
  moveTo(cur, 0.95, 1.4, [568, 522], [664, 696]);
  // prompt box
  var boxComp = comp("OV_BOX_WRITE"); resetComp(boxComp); var box = s3.layers.add(boxComp); box.name = "PROMPT BOX"; box.motionBlur = true;
  box.anchorPoint.setValue([550, 516]); box.position.setValue([550, 516]);
  lin(O(box), 0, 0); lin(O(box), 1.72, 0); lin(O(box), 1.87, 100); key(P(box), 1.72, [550, 532], 22, 80); key(P(box), 1.97, [550, 516], 75, 22);
  var boxGrp = compLayer(boxComp, "grp_popup-prompt-box").source; resetComp(boxGrp);
  typewriter(layerByName(boxGrp, "text-13"), 1.9, 1.8);
  var send = layerByName(boxGrp, "rect-14"); key(S(send), 3.8, [100, 100], 22, 75); key(S(send), 3.88, [86, 86], 75, 22); key(S(send), 4.0, [100, 100], 22, 75);
  moveTo(cur, 3.0, 3.5, [664, 696], [1176, 600]);
  lin(O(box), 4.0, 100); lin(O(box), 4.15, 0); key(P(box), 4.0, [550, 516], 22, 75); key(P(box), 4.15, [550, 504], 75, 22);
  moveTo(cur, 4.05, 4.8, [1176, 600], [1560, 330]); lin(O(cur), 4.5, 100); lin(O(cur), 4.8, 0);
  // the list streams in from the cursor (real Codex output)
  typewriter(list, 4.2, 3.0);
  // badge precomp: appears at the cursor line, rides down with the growing list, leaves when done
  gap.anchorPoint.setValue([-1, 7]); gap.position.setValue([1179, 890]); gap.rotation.expression = "time * 480";
  var B = precomp(s3, [badge, ring, inner, gap, label], "BADGE"); B.anchorPoint.setValue([1280, 890]);
  popIn(B, 4.1, 0.25, 70); key(P(B), 4.2, [1180, 528], 22, 75); key(P(B), 7.2, [1280, 890], 75, 22); popOut(B, 7.3, 0.2);
  lin(O(status), 0, 0); lin(O(status), 4.0, 0); lin(O(status), 4.1, 100); lin(O(status), 7.3, 100); lin(O(status), 7.5, 0);
  for (var i = 0; i < 3; i++) { lin(O(sI[i]), 0, 0); lin(O(sI[i]), 4.0, 0); lin(O(sI[i]), 4.1, 100); lin(O(sI[i]), 7.3, 100); lin(O(sI[i]), 7.5, 0); }
  caption(s3, "No selection? It writes at the cursor.", 560, 990, 40, 4.6, 0.8);
  cur.moveToBeginning();
  app.endUndoGroup(); log("S3 ok layers=" + s3.numLayers);
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
