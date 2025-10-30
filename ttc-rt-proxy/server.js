// server.js (CommonJS)
const express = require("express");
const Gtfs = require("gtfs-realtime-bindings");

// If Node < 18, uncomment the next line and use fetch = require('node-fetch');
// const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 8080;

const cors = require("cors");
app.use(cors());
app.get("/", (_req, res) => res.send("TTC RT proxy OK. Use /alerts"));


// ✅ Point this to the TTC alerts endpoint you found.
// If they give you mode-specific URLs, put one of those here.
// For debug you can add ?format=text in curl, but keep binary for the server.
const ALERTS_URL = process.env.TTC_ALERTS_URL || "https://bustime.ttc.ca/gtfsrt/alerts";

function firstText(ts) {
  return ts?.translation?.[0]?.text || "";
}

app.get("/alerts", async (_req, res) => {
  try {
    const resp = await fetch(ALERTS_URL, {
      headers: { Accept: "application/octet-stream" },
    });
    if (!resp.ok) throw new Error(`TTC feed HTTP ${resp.status}`);
    const arrayBuf = await resp.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    const feed = Gtfs.transit_realtime.FeedMessage.decode(buf);

    const items = (feed.entity || [])
      .filter((e) => e.alert)
      .map((e) => {
        const a = e.alert;
        return {
          id: e.id || Math.random().toString(36).slice(2),
          title: firstText(a.headerText) || a.effect || "TTC Service Alert",
          description: firstText(a.descriptionText) || "",
          cause: a.cause || null,   // e.g., CONSTRUCTION, WEATHER
          effect: a.effect || null, // e.g., DELAY, DETOUR, NO_SERVICE
          activePeriod: (a.activePeriod || []).map((p) => ({
            start: p.start ? Number(p.start) * 1000 : null,
            end:   p.end   ? Number(p.end)   * 1000 : null,
          })),
          informedEntities: (a.informedEntity || []).map((ie) => ({
            routeId: ie.routeId || null,
            stopId:  ie.stopId  || null,
            tripId:  ie.trip?.tripId || null,
            routeType: ie.routeType ?? null,
          })),
        };
      });

    res.json({ updated: Date.now(), count: items.length, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ttc-rt-proxy listening on http://localhost:${PORT}`);
  console.log(`   GET /alerts → JSON`);
});
