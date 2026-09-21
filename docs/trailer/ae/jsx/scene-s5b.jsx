$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  app.beginUndoGroup("S5B choreography");
  var c = comp("S5B_DEVICES"); if (c.layer("LAPTOP")) throw new Error("S5B already built"); resetComp(c);
  var lap = nullAt(c, "LAPTOP", 550, 555); parentAll([layerByName(c, "svg-path-1-p0"), layerByName(c, "svg-path-2-p1"), layerByName(c, "svg-path-3-p2")], lap);
  var ph = nullAt(c, "PHONE", 1340, 545); parentAll([layerByName(c, "svg-rect-4"), layerByName(c, "svg-path-5")], ph);
  key(P(lap), 0.2, [-250, 555], 22, 85); key(P(lap), 0.9, [550, 555], 78, 22);
  key(P(ph), 0.3, [2200, 545], 22, 85); key(P(ph), 1.0, [1340, 545], 78, 22);
  var line = layerByName(c, "svg-path-6"); var trim = addTrim(line); var e = trim.property("ADBE Vector Trim End"); key(e, 0.9, 0, 22, 80); key(e, 1.6, 100, 75, 22);
  var pill = layerByName(c, "rect-8"), pillT = layerByName(c, "text-9"); var PILL = precomp(c, [pill, pillT], "BRIDGE PILL"); PILL.anchorPoint.setValue([970, 522]); PILL.position.setValue([970, 522]); popIn(PILL, 1.5, 0.3, 60);
  charsIn(layerByName(c, "text-10"), 0.6, 0.8, 46); fadeUp(layerByName(c, "text-11"), 1.3, 0.5, 16);
  app.endUndoGroup(); log("S5B ok");
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
