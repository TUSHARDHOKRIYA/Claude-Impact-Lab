// Builds the small geography tables the report form needs from data/rupee.
// Run: node scripts/build-geo.mjs. Output goes to src/lib/geo-data/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = join(root, "data", "rupee");
const out = join(root, "src", "lib", "geo-data");
mkdirSync(out, { recursive: true });

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((key, i) => [key, r[i] ?? ""])));
}

const csv = (name) => parseCsv(readFileSync(join(src, name), "utf8"));
const round = (n) => Math.round(Number(n) * 1e6) / 1e6;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const roads = csv("roads.csv").map((r) => ({
  id: r.road_id,
  name: r.road_name,
  ward: r.ward_code,
  a: [round(r.start_lat), round(r.start_lon)],
  b: [round(r.end_lat), round(r.end_lon)],
}));

const localities = csv("localities.csv").map((r) => ({
  id: `loc-${slug(r.locality)}`,
  name: r.locality,
  ward: r.ward_code,
  lat: round(r.lat),
  lng: round(r.lon),
  aliases: r.aliases ? r.aliases.split(";").map((a) => a.trim()).filter(Boolean) : [],
}));

const wardRows = new Map(csv("wards.csv").map((r) => [r.ward_code, r]));
const wardsGeo = JSON.parse(readFileSync(join(src, "wards.geojson"), "utf8"));
const wards = wardsGeo.features.map((f) => {
  const row = wardRows.get(f.properties.ward_code);
  return {
    code: f.properties.ward_code,
    name: f.properties.ward_name,
    centroid: [round(row.centroid_lat), round(row.centroid_lon)],
    ring: f.geometry.coordinates[0].map(([lng, lat]) => [round(lat), round(lng)]),
  };
});

writeFileSync(join(out, "roads.data.json"), JSON.stringify(roads));
writeFileSync(join(out, "localities.data.json"), JSON.stringify(localities));
writeFileSync(join(out, "wards.data.json"), JSON.stringify(wards));
console.log(`roads ${roads.length}, localities ${localities.length}, wards ${wards.length}`);

// Seed reports: app complaints with GPS, a few per ward, open ones first.
const CATEGORY_TYPE = {
  Pothole: "pothole",
  Waterlogging: "waterlogging",
  "Open or broken manhole": "open_manhole",
  "Choked drain / nullah overflow": "choked_drain",
  "Road cave-in": "road_cave_in",
  "Broken paver blocks": "broken_paver_blocks",
};
const TYPE_AFFECTS = {
  pothole: ["two_wheelers", "cars_and_autos"],
  waterlogging: ["walking", "buses"],
  open_manhole: ["walking", "school_route"],
  choked_drain: ["walking"],
  road_cave_in: ["cars_and_autos", "buses"],
  broken_paver_blocks: ["walking", "wheeling"],
};
const complaints = csv("complaints.csv").filter(
  (c) => c.channel === "MyBMC App" && c.lat && c.ward_code && CATEGORY_TYPE[c.category_reported] && c.language === "en",
);
const rank = (c) => (c.status === "Open" || c.status === "In Progress" ? 0 : 1);
complaints.sort((a, b) => rank(a) - rank(b) || Number(b.upvotes) - Number(a.upvotes));
const perWard = new Map();
const seeds = [];
for (const c of complaints) {
  const n = perWard.get(c.ward_code) ?? 0;
  if (n >= 4) continue;
  perWard.set(c.ward_code, n + 1);
  const issueType = CATEGORY_TYPE[c.category_reported];
  seeds.push({
    id: `rpt_seed_${c.complaint_id.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    complaintId: c.complaint_id,
    issueType,
    lat: round(c.lat),
    lng: round(c.lon),
    noticedAt: c.received_at.slice(0, 10),
    recurs: Number(c.upvotes) >= 20,
    accident: Number(c.upvotes) >= 40 ? "near_miss" : "not_sure",
    affects: TYPE_AFFECTS[issueType],
    description: c.description.slice(0, 280),
    status: c.status,
  });
}
writeFileSync(join(out, "seed-reports.data.json"), JSON.stringify(seeds));
console.log(`seed reports ${seeds.length}`);
