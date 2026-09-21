// Shared ExtendScript helpers for the trailer build (run inside After Effects via DoScript).
var OUT = new File("/tmp/ae-out.txt"); OUT.open("w");
function log(s) { OUT.write(s + "\n"); }
function done() { OUT.close(); }

function comp(name) { for (var i = 1; i <= app.project.numItems; i++) { var it = app.project.item(i); if (it instanceof CompItem && it.name === name) return it; } throw new Error("comp not found: " + name); }
function layerByName(c, name) { for (var j = 1; j <= c.numLayers; j++) if (c.layer(j).name === name) return c.layer(j); throw new Error("layer not found: " + name + " in " + c.name); }
function textLayer(c, substr) { for (var j = 1; j <= c.numLayers; j++) { var L = c.layer(j); if (L instanceof TextLayer && L.property("Source Text").value.text.indexOf(substr) === 0) return L; } throw new Error("text layer not found: " + substr + " in " + c.name); }
function textLayerContains(c, substr) { for (var j = 1; j <= c.numLayers; j++) { var L = c.layer(j); if (L instanceof TextLayer && L.property("Source Text").value.text.indexOf(substr) >= 0) return L; } throw new Error("text layer not found: " + substr + " in " + c.name); }
function compLayer(c, srcName, nth) { var n = 0; for (var j = 1; j <= c.numLayers; j++) { var L = c.layer(j); if (L.source instanceof CompItem && L.source.name === srcName) { n++; if (!nth || n === nth) return L; } } throw new Error("comp layer not found: " + srcName); }
function layersInBox(c, x0, y0, x1, y1, pred) { var r = []; for (var j = 1; j <= c.numLayers; j++) { var L = c.layer(j); var p = L.property("Position").value; if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1 && (!pred || pred(L))) r.push(L); } return r; }
function isSvg(L) { return L.name.indexOf("svg-") === 0; }

function clearKeys(prop) { while (prop.numKeys > 0) prop.removeKey(1); }
function clearAllKeys(L) { var names = ["Position", "Scale", "Opacity", "Rotation", "Anchor Point"]; for (var i = 0; i < names.length; i++) { try { clearKeys(L.property(names[i])); } catch (e) {} } }
function clearCompKeys(c) { for (var j = 1; j <= c.numLayers; j++) clearAllKeys(c.layer(j)); }

function easeArr(prop, speed, infl) {
  var n = 1; var t = prop.propertyValueType;
  if (t === PropertyValueType.ThreeD) n = 3; else if (t === PropertyValueType.TwoD) n = 2; else n = 1;
  var a = []; for (var i = 0; i < n; i++) a.push(new KeyframeEase(speed, infl)); return a;
}
// key(prop, time, value, inInfluence, outInfluence): bezier key with a settle-weighted ease (defaults in22/out75).
function key(prop, t, v, inf, outf) {
  if (!prop) throw new Error("key(): null property (t=" + t + ")");
  var idx = prop.addKey(t); prop.setValueAtKey(idx, v);
  try { prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER); } catch (e) {}
  try { prop.setTemporalEaseAtKey(idx, easeArr(prop, 0, inf === undefined ? 22 : inf), easeArr(prop, 0, outf === undefined ? 75 : outf)); } catch (e) {}
  // straight spatial paths: auto-bezier tangents otherwise bulge between a move and a hold
  try { if (prop.isSpatial) { var z = prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL ? [0, 0, 0] : [0, 0]; prop.setSpatialTangentsAtKey(idx, z, z); if (idx > 1) prop.setSpatialTangentsAtKey(idx - 1, z, z); } } catch (e) {}
  return idx;
}
function hold(prop, t, v) { var idx = prop.addKey(t); prop.setValueAtKey(idx, v); prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); return idx; }
function lin(prop, t, v) { var idx = prop.addKey(t); prop.setValueAtKey(idx, v); prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR); return idx; }
function P(L) { return L.property("Position"); } function S(L) { return L.property("Scale"); } function O(L) { return L.property("Opacity"); } function R(L) { return L.property("Rotation"); }
function fadeIn(L, t0, dur) { lin(O(L), t0, 0); lin(O(L), t0 + dur, 100); }
function fadeOut(L, t0, dur) { lin(O(L), t0, 100); lin(O(L), t0 + dur, 0); }
function hideUntil(L, t) { lin(O(L), 0, 0); lin(O(L), t, 0); lin(O(L), t + 0.001, 100); }
// pop: scale-in with settle (UI element appearing)
function popIn(L, t0, dur, from) { var s = S(L).value; key(S(L), t0, [from === undefined ? 90 : from, from === undefined ? 90 : from], 22, 75); key(S(L), t0 + dur, [100, 100], 75, 22); lin(O(L), t0, 0); lin(O(L), t0 + dur * 0.6, 100); }
function popOut(L, t0, dur) { key(S(L), t0, [100, 100], 22, 75); key(S(L), t0 + dur, [92, 92], 75, 22); lin(O(L), t0, 100); lin(O(L), t0 + dur, 0); }

// Typewriter via a text animator (opacity 0 outside the growing range). Hard edge (smoothness 0).
function typewriter(L, t0, dur) {
  var anim = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  anim.name = "Typewriter";
  var op = anim.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity"); op.setValue(0);
  var sel = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  try { sel.property("ADBE Text Range Advanced").property("ADBE Text Selector Smoothness").setValue(0); } catch (e) {}
  var st = sel.property("ADBE Text Percent Start");
  lin(st, t0, 0); lin(st, t0 + dur, 100);
  lin(O(L), 0, 0); lin(O(L), t0, 0); lin(O(L), t0 + 0.001, 100);
  return anim;
}
// Per-character slide-up reveal for kinetic captions.
function charsIn(L, t0, dur, dy) {
  var anim = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); anim.name = "CharsIn";
  var pos = anim.property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D"); pos.setValue([0, dy || 40, 0]);
  var op = anim.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity"); op.setValue(0);
  var sel = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  var st = sel.property("ADBE Text Percent Start");
  var i1 = st.addKey(t0); st.setValueAtKey(i1, 0); var i2 = st.addKey(t0 + dur); st.setValueAtKey(i2, 100);
  st.setTemporalEaseAtKey(i2, [new KeyframeEase(0, 75)], [new KeyframeEase(0, 22)]);
  try { sel.property("ADBE Text Range Advanced").property("ADBE Text Selector Smoothness").setValue(100); } catch (e) {}
  try { sel.property("ADBE Text Range Advanced").property("ADBE Text Levels Max Ease").setValue(60); } catch (e) {}
  lin(O(L), 0, 0); lin(O(L), t0, 0); lin(O(L), t0 + 0.001, 100);
  return anim;
}
function caption(c, text, x, y, size, t0, dur, color) {
  var L = c.layers.addText(text); L.name = "caption: " + text.substr(0, 24);
  var d = L.property("Source Text").value; d.font = "HelveticaNeue-Bold"; d.fontSize = size || 56; d.fillColor = color || [1, 1, 1]; d.justification = ParagraphJustification.LEFT_JUSTIFY; d.tracking = -10;
  L.property("Source Text").setValue(d);
  L.position.setValue([x, y]);
  try { L.motionBlur = true; } catch (e) {}
  charsIn(L, t0, dur || 0.7, 46);
  return L;
}
function shapeFillColor(L) { var g = L.property("Contents").property(1).property("Contents"); for (var k = 1; k <= g.numProperties; k++) if (g.property(k).matchName === "ADBE Vector Graphic - Fill") return g.property(k).property("ADBE Vector Fill Color"); return null; }
function rectSize(L) { var g = L.property("Contents").property(1).property("Contents"); for (var k = 1; k <= g.numProperties; k++) if (g.property(k).matchName === "ADBE Vector Shape - Rect") return g.property(k).property("ADBE Vector Rect Size"); return null; }
function parentAll(arr, parentL) { for (var i = 0; i < arr.length; i++) if (arr[i] !== parentL) arr[i].parent = parentL; }
function nullAt(c, name, x, y) { var n = c.layers.addNull(); n.name = name; n.position.setValue([x, y]); n.anchorPoint.setValue([50, 50]); return n; }
function hex(h) { return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
// macOS-style pointer built from a native path.
function pointer(c, name) {
  var L = c.layers.addShape(); L.name = name || "cursor";
  var grp = L.property("Contents").addProperty("ADBE Vector Group"); grp.name = "arrow";
  var path = grp.property("Contents").addProperty("ADBE Vector Shape - Group");
  var sh = new Shape(); var pts = [[0, 0], [0, 34], [8, 26], [14, 40], [19, 38], [13, 24], [23, 24]]; sh.vertices = pts; sh.closed = true; sh.inTangents = []; sh.outTangents = [];
  path.property("ADBE Vector Shape").setValue(sh);
  var st = grp.property("Contents").addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue([0, 0, 0]); st.property("ADBE Vector Stroke Width").setValue(2.5);
  var fl = grp.property("Contents").addProperty("ADBE Vector Graphic - Fill"); fl.property("ADBE Vector Fill Color").setValue([1, 1, 1]);
  L.property("Effects").addProperty("ADBE Drop Shadow");
  return L;
}
function moveTo(L, t0, t1, from, to, inf, outf) { key(P(L), t0, from, inf === undefined ? 22 : inf, outf === undefined ? 75 : outf); key(P(L), t1, to, 75, 22); }

// Idempotence helpers: remove layers we added earlier and strip animators/keys we set.
function removeLayersNamed(c, names) { for (var j = c.numLayers; j >= 1; j--) { var L = c.layer(j); for (var i = 0; i < names.length; i++) if (L.name === names[i] || L.name.indexOf(names[i]) === 0) { L.remove(); break; } } }
function stripAnimators(L) { try { var an = L.property("ADBE Text Properties").property("ADBE Text Animators"); while (an.numProperties > 0) an.property(1).remove(); } catch (e) {} }
function resetLayer(L) { clearAllKeys(L); stripAnimators(L); try { L.property("Opacity").setValue(100); } catch (e) {} }
function resetComp(c) { for (var j = 1; j <= c.numLayers; j++) resetLayer(c.layer(j)); }
function removeEffects(L) { var fx = L.property("Effects"); while (fx.numProperties > 0) fx.property(1).remove(); }
function fadeUp(L, t0, dur, dy) { var p = P(L).value; key(P(L), t0, [p[0], p[1] + (dy || 16)], 22, 80); key(P(L), t0 + dur, [p[0], p[1]], 75, 22); lin(O(L), 0, 0); lin(O(L), t0, 0); lin(O(L), t0 + dur * 0.6, 100); }
function rectLayer(c, name, w, h, x, y, color) { var L = c.layers.addShape(); L.name = name; var g = L.property("Contents").addProperty("ADBE Vector Group"); var r = g.property("Contents").addProperty("ADBE Vector Shape - Rect"); r.property("ADBE Vector Rect Size").setValue([w, h]); var f = g.property("Contents").addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue(color); L.position.setValue([x, y]); return L; }
function precomp(c, layers, name) { var idx = []; for (var i = 0; i < layers.length; i++) idx.push(layers[i].index); c.layers.precompose(idx, name, true); return layerByName(c, name); }
function addTrim(L) { var gc = L.property("Contents").property(1).property("Contents"); return gc.addProperty("ADBE Vector Filter - Trim"); }
