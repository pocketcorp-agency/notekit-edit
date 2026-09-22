$.evalFile(new File("/Users/maidmor/Desktop/obsidian-ai/docs/trailer/ae/jsx/lib.jsx"));
try {
  var map = {
    "Select. Right-click. Say what should change.": "Select. Right-Click. Say What Should Change.",
    "It rewrites in place — streaming.": "It Rewrites in Place — Streaming.",
    "No selection? It writes at the cursor.": "No Selection? It Writes at the Cursor.",
    "Every edit, logged.": "Every Edit, Logged.",
    "original · output · thinking": "Original · Output · Thinking",
    "Your subscription. Or any agent.": "Your Subscription. Or Any Agent.",
    "Set up in ten seconds.": "Set Up in Ten Seconds.",
    "Free in Obsidian community plugins": "Free in Obsidian Community Plugins"
  };
  var n = 0;
  for (var i = 1; i <= app.project.numItems; i++) { var c = app.project.item(i); if (!(c instanceof CompItem)) continue;
    for (var j = 1; j <= c.numLayers; j++) { var L = c.layer(j); if (!(L instanceof TextLayer)) continue; var st = L.property("Source Text"); var d = st.value;
      if (map[d.text] !== undefined) { d.text = map[d.text]; st.setValue(d); n++; } } }
  log("title-cased " + n + " layers");
} catch (e) { log("ERROR " + e.toString() + " line " + e.line); }
done();
