$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("Obsidianize logo tile");
  // import (or reuse) the rounded logo tile
  var tileItem = null; for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i).name === "obsidianize-logo-tile.png") tileItem = app.project.item(i);
  if (!tileItem) { tileItem = app.project.importFile(new ImportOptions(new File("/Users/maidmor/Desktop/obsidian-ai/docs/media/logo-tile.png"))); tileItem.name = "obsidianize-logo-tile.png"; }
  function swap(compName, precompName, widthPx) {
    var c = comp(compName); var pre = layerByName(c, precompName).source;
    for (var j = 1; j <= pre.numLayers; j++) pre.layer(j).enabled = false;      // old purple tile + sparkle
    var L = pre.layers.add(tileItem); L.name = "Obsidianize logo"; var s = widthPx / tileItem.width * 100; L.scale.setValue([s, s]);
    L.position.setValue([pre.width / 2, pre.height / 2]);
    var sh = L.property("Effects").addProperty("ADBE Drop Shadow"); sh.property("ADBE Drop Shadow-0002").setValue(120); sh.property("ADBE Drop Shadow-0004").setValue(10); sh.property("ADBE Drop Shadow-0005").setValue(40);
    log(compName + ": logo tile placed at " + widthPx + "px");
  }
  swap("S5_AGENTS", "TILE", 330);
  swap("S7_OUTRO", "LOGO", 420);
  // S5: drop the dim-down that handed over to the removed devices scene
  var s5 = comp("S5_AGENTS");
  for (var j = 1; j <= s5.numLayers; j++) { var L = s5.layer(j); var op = L.property("Opacity"), sc = L.property("Scale");
    for (var k = op.numKeys; k >= 1; k--) if (op.keyTime(k) >= 4.9) op.removeKey(k);
    for (var k = sc.numKeys; k >= 1; k--) if (sc.keyTime(k) >= 4.9) sc.removeKey(k); }
  // outro: the logo card sits higher, so nudge the wordmark group down a little
  var s7 = comp("S7_OUTRO"); var LOGO = layerByName(s7, "LOGO"); LOGO.position.setValue([960, 350]);
  app.endUndoGroup(); app.project.save();
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
