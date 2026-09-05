const fs = require("fs");
const path = require("path");

const TARGET_BASE = "https://books.toscrape.com";
const CACHE_DIR = path.join(__dirname, "..", "cache");

async function fetchPage(url, cacheFileName) {
  const cachePath = path.join(CACHE_DIR, cacheFileName);

  if (fs.existsSync(cachePath)) {
    const html = fs.readFileSync(cachePath, "utf-8");
    console.log(`CACHE HIT: ${cacheFileName} (${html.length} bytes)`);
    return html;
  }

  console.log(`FETCH: ${url}`);
  const response = await fetch(url, {
    headers: { "User-Agent": "FlyRankInternshipA9/1.0 (+https://github.com/GabyDidi/first_api_assignment)" },
    signal: AbortSignal.timeout(5000)
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch ${url}: status ${response.status}`);
  }

  const html = await response.text();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, html);
  console.log(`FETCH: ${cacheFileName} (${html.length} bytes)`);
  return html;
}

async function main() {
  console.log("Scraper starting...");
  await fetchPage(`${TARGET_BASE}/catalogue/page-1.html`, "catalogue-page-1.html");
}

main();