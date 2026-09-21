$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S2 choreography");
  var s2 = comp("S2_GENERATING"); s2.duration = 9;
  removeLayersNamed(s2, ["original-text", "caption:"]); resetComp(s2);
  if (s2.layer("BADGE")) throw new Error("S2 already has a BADGE precomp — rebuild S2 from scratch before rerunning");
  // layers
  var hl = layerByName(s2, "rect-31");         // 976x148 highlight @ (1040,418)
  var ul = layerByName(s2, "rect-32");         // underline 976x2 @ (1040,490)
  var out = layerByName(s2, "text-33");        // streamed output (4 lines)
  var badge = layerByName(s2, "badge-chip"), ring = layerByName(s2, "rect-35"), inner = layerByName(s2, "rect-36"), gap = layerByName(s2, "rect-37"), label = layerByName(s2, "text-38");
  var status = layerByName(s2, "text-47"); var statusIcons = [layerByName(s2, "svg-path-43"), layerByName(s2, "svg-path-44"), layerByName(s2, "svg-path-45")];
  var p3 = layerByName(s2, "text-39"), h2 = layerByName(s2, "text-40");
  removeEffects(hl); removeEffects(gap);
  // --- 0.0–0.3: the original sentence is still there (3 lines), highlighted and shimmering
  var orig = s2.layers.addText("Saturday we want to do the castle in the morning and then maybe walk down through the\rold streets to the river and get lunch somewhere there if we find a nice place and\rafter that we could take the tram to Belém for the pastries.");
  orig.name = "original-text"; var d = orig.property("Source Text").value; d.font = "HelveticaNeue"; d.fontSize = 22; d.leading = 34; d.fillColor = hex("dadada"); d.justification = ParagraphJustification.LEFT_JUSTIFY; d.tracking = 0; orig.property("Source Text").setValue(d);
  orig.position.setValue([560, 389]); orig.moveAfter(out);
  lin(O(orig), 0.3, 100); lin(O(orig), 0.42, 0);
  // highlight starts 3 lines tall, grows to 4 as the list streams in; p3/h2 shuffle down with it
  var sz = rectSize(hl); lin(sz, 0.3, [976, 114]); key(sz, 2.4, [976, 148], 22, 75);
  key(P(hl), 0.3, [1040, 401], 22, 75); key(P(hl), 2.4, [1040, 418], 75, 22);
  key(P(ul), 0.3, [1040, 456], 22, 75); key(P(ul), 2.4, [1040, 490], 75, 22);
  key(P(p3), 0.3, [560, 559], 22, 75); key(P(p3), 2.4, [560, 593], 75, 22);
  key(P(h2), 0.3, [560, 667], 22, 75); key(P(h2), 2.4, [560, 701], 75, 22);
  // shimmer: a travelling gradient ramp on the highlight (looping expression, one effect param)
  var ramp = hl.property("Effects").addProperty("ADBE Ramp"); ramp.name = "shimmer";
  ramp.property("ADBE Ramp-0002").setValue(hex("332c4f")); ramp.property("ADBE Ramp-0004").setValue(hex("5b4d94")); ramp.property("ADBE Ramp-0005").setValue(1);
  // shape layers are comp-sized, so effect points live in comp coordinates
  ramp.property("ADBE Ramp-0001").expression = "var s = 100 + (time*700) % 1900; [s, 418]";
  ramp.property("ADBE Ramp-0003").expression = "var s = 100 + (time*700) % 1900; [s + 460, 418]";
  ramp.property("ADBE Ramp-0007").expression = "time < 4.6 ? 0 : linear(time, 4.6, 4.9, 0, 100)";   // blend back to plain fill when done
  // --- streamed text types in (0.3–4.5)
  typewriter(out, 0.3, 4.2);
  // --- badge: pops in at 0, spinner spins, follows the growing text, pops out at 4.6
  gap.anchorPoint.setValue([-1, 7]); gap.position.setValue([1099, 473]); gap.rotation.expression = "time * 480";
  var idx = [badge.index, ring.index, inner.index, gap.index, label.index];
  var badgeC = s2.layers.precompose(idx, "BADGE", true); var B = layerByName(s2, "BADGE");
  B.anchorPoint.setValue([1230, 473]); B.position.setValue([1400, 439]);
  popIn(B, 0.0, 0.25, 70);
  key(P(B), 0.3, [1400, 439], 22, 75); key(P(B), 2.4, [1400, 473], 75, 22);
  popOut(B, 4.6, 0.2);
  log("ramp expr errors: " + ramp.property("ADBE Ramp-0001").expressionError + " | " + ramp.property("ADBE Ramp-0007").expressionError);
  // --- done: highlight flashes green then fades
  var fill = shapeFillColor(hl); lin(fill, 4.6, hex("332c4f")); lin(fill, 4.8, hex("1f4a30")); lin(fill, 5.4, hex("1f4a30"));
  lin(O(hl), 5.4, 100); lin(O(hl), 6.4, 0); lin(O(ul), 4.6, 100); lin(O(ul), 4.9, 0);
  // status bar text present while working
  lin(O(status), 5.1, 100); lin(O(status), 5.4, 0); for (var i = 0; i < 3; i++) { lin(O(statusIcons[i]), 5.1, 100); lin(O(statusIcons[i]), 5.4, 0); }
  caption(s2, "It rewrites in place — streaming.", 560, 940, 46, 5.0, 0.8);
  app.endUndoGroup(); log("S2 ok layers=" + s2.numLayers);
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
