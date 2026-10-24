// Fetches current court prices from the public Playtomic endpoint and writes a
// compact price schedule to public/prices.json.
// Runs in GitHub Actions before deploy (or locally: node scripts/fetch-prices.js).

const https = require("https");
const fs = require("fs");
const path = require("path");
const config = require("../config");

const MORNING_END = "12:00";
const PEAK_START = "13:30";
const DAYS_TO_FETCH = 9; // today + the next few days (merged for full coverage)

function parsePrice(str) {
  if (typeof str !== "string") return null;
  const m = str.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function slotRate(slot) {
  const p = parsePrice(slot.price);
  if (p == null || !slot.duration) return null;
  return p / (slot.duration / 60);
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function clubToday() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone, year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date());
}

function datePlus(days) {
  const [y, m, d] = clubToday().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function fetchAvailability(date) {
  const q = new URLSearchParams({
    tenant_id: config.tenantId,
    date,
    sport_id: config.sportId,
  });
  const url = `https://playtomic.com/api/clubs/availability?${q.toString()}`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: "application/json", "User-Agent": "PadelSplit/1.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
  });
}

async function main() {
  // Collect all slots (per court) across multiple days
  const buckets = {}; // resource_id -> { morning: [], peak: [] }
  for (const c of config.courts) buckets[c.id] = { morning: [], peak: [] };

  let fetched = 0;
  for (let i = 0; i < DAYS_TO_FETCH; i++) {
    const date = datePlus(i);
    let data;
    try {
      data = await fetchAvailability(date);
    } catch (e) {
      continue; // skip dates that fail / have no data
    }
    fetched++;
    for (const entry of data) {
      const b = buckets[entry.resource_id];
      if (!b) continue;
      for (const slot of entry.slots || []) {
        const t = slot.start_time.slice(0, 5);
        const rate = slotRate(slot);
        if (rate == null) continue;
        if (t < MORNING_END) b.morning.push(rate);
        else if (t >= PEAK_START) b.peak.push(rate);
      }
    }
  }

  const courts = {};
  for (const c of config.courts) {
    const b = buckets[c.id] || { morning: [], peak: [] };
    const morning = median(b.morning) ?? 20;
    const peak = median(b.peak) ?? (c.indoor ? 28 : 24);
    courts[c.id] = {
      name: c.name,
      indoor: c.indoor,
      morning: Math.round(morning * 100) / 100,
      peak: Math.round(peak * 100) / 100,
    };
    console.log(`${c.name}: morning ${courts[c.id].morning} €/h, peak ${courts[c.id].peak} €/h (${b.morning.length}/${b.peak.length} samples)`);
  }

  const out = {
    generated_at: new Date().toISOString(),
    currency: config.currency,
    tenant_id: config.tenantId,
    fetched_days: fetched,
    courts,
  };

  const target = path.join(__dirname, "..", "public", "prices.json");
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWritten: ${target}`);
}

main().catch((e) => {
  // Don't fail the deploy: keep the existing prices.json if the fetch failed
  const target = path.join(__dirname, "..", "public", "prices.json");
  if (fs.existsSync(target)) {
    console.warn(`Warning: fetch failed (${e.message}) — keeping existing prices.json.`);
    process.exit(0);
  }
  console.error("Price fetch failed and no existing prices.json:", e.message);
  process.exit(1);
});
