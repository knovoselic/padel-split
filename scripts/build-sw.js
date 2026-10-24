// Generates public/sw.js with a unique cache name per build.
// This guarantees that every deployed version gets fresh cached assets.

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const TEMPLATE = path.join(PUBLIC_DIR, "sw.template.js");
const OUTPUT = path.join(PUBLIC_DIR, "sw.js");

function walk(dir, base = "") {
  const entries = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walk(full, rel));
    } else {
      entries.push(rel);
    }
  }
  return entries;
}

const buildId = process.env.GITHUB_SHA?.slice(0, 7) || Date.now().toString(36);
const files = walk(PUBLIC_DIR)
  .filter((f) => {
    if (f === "sw.js" || f === "sw.template.js") return false;
    if (f.startsWith(".")) return false;
    if (f.includes("/")) {
      const parts = f.split("/");
      if (parts.some((p) => p.startsWith("."))) return false;
    }
    return true;
  })
  .map((f) => `./${f.replace(/\\/g, "/")}`);

const assets = ["./", ...files.sort()];

let sw = fs.readFileSync(TEMPLATE, "utf8");
sw = sw.replace(/__BUILD_ID__/g, buildId);
sw = sw.replace(
  /const ASSETS = \[\s*\];?/,
  `const ASSETS = [\n${assets.map((a) => `  "${a}"`).join(",\n")}\n];`
);

fs.writeFileSync(OUTPUT, sw);
console.log(`Generated ${OUTPUT} with build id ${buildId} (${assets.length} assets)`);
