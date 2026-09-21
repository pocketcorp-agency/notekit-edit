$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S5 choreography");
  var s5 = comp("S5_AGENTS"); if (s5.layer("RING")) throw new Error("S5 already built"); resetComp(s5);
  var cap = layerByName(s5, "text-27"); charsIn(cap, 0.0, 0.8, 46);
  // plugin tile + sparkle
  var tile = layerByName(s5, "rect-2"); var spark = [layerByName(s5, "svg-path-2"), layerByName(s5, "svg-path-3"), layerByName(s5, "svg-path-4")];
  var TILE = precomp(s5, [tile, spark[0], spark[1], spark[2]], "TILE"); TILE.anchorPoint.setValue([960, 540]); TILE.position.setValue([960, 540]);
  key(S(TILE), 1.0, [55, 55], 22, 85); key(S(TILE), 1.35, [106, 106], 60, 60); key(S(TILE), 1.6, [100, 100], 75, 22); lin(O(TILE), 1.0, 0); lin(O(TILE), 1.15, 100);
  // Codex chip was too small for the auto-precomp: group it now
  var codex = precomp(s5, [layerByName(s5, "text-11"), layerByName(s5, "rect-10"), layerByName(s5, "rect-9")], "chip-codex"); codex.anchorPoint.setValue([1219, 334]); codex.position.setValue([1219, 334]);
  // ring null rotates slowly; chips are its children and stay upright
  var ring = nullAt(s5, "RING", 960, 540); ring.rotation.expression = "time * 8";
  var chips = []; for (var j = 1; j <= s5.numLayers; j++) { var L = s5.layer(j); if (L.name === "chip-codex" || (L.source instanceof CompItem && L.source.name === "grp_chip-item")) chips.push(L); }
  // order chips clockwise from the top for the stagger
  chips.sort(function (a, b) { var pa = P(a).value, pb = P(b).value; return Math.atan2(pa[1] - 540, pa[0] - 960) - Math.atan2(pb[1] - 540, pb[0] - 960); });
  for (var i = 0; i < chips.length; i++) { var L = chips[i]; var w = P(L).value; L.parent = ring; L.rotation.expression = "-parent.transform.rotation";
    var local = [w[0] - 960 + 50, w[1] - 540 + 50]; var far = [50 + (local[0] - 50) * 2.6, 50 + (local[1] - 50) * 2.6];
    var t0 = 1.4 + i * 0.12; key(P(L), t0, far, 22, 85); key(P(L), t0 + 0.6, local, 78, 22); lin(O(L), t0, 0); lin(O(L), t0 + 0.2, 100); L.motionBlur = true;
    lin(O(L), 5.0, 100); lin(O(L), 5.5, 45); }
  key(S(ring), 5.0, [100, 100], 22, 75); key(S(ring), 5.6, [84, 84], 75, 22);
  key(S(TILE), 5.0, [100, 100], 22, 75); key(S(TILE), 5.6, [84, 84], 75, 22); lin(O(TILE), 5.0, 100); lin(O(TILE), 5.5, 45);
  app.endUndoGroup(); log("S5 ok chips=" + chips.length);
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
