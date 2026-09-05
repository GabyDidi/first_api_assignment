const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function discoverCataloguePages() {
  const bookUrls = new Set();
  let pageNum = 1;
  let pageUrl = `${TARGET_BASE}/catalogue/page-1.html`;

  while (pageNum <= 3) {
    const cacheFileName = `catalogue-page-${pageNum}.html`;
    const wasCached = fs.existsSync(path.join(CACHE_DIR, cacheFileName));
    const html = await fetchPage(pageUrl, cacheFileName);
    if (!wasCached) await sleep(500);

    const $ = cheerio.load(html);

    $("h3 a").each((i, el) => {
      const href = $(el).attr("href");
      const absoluteUrl = new URL(href, pageUrl).href;
      bookUrls.add(absoluteUrl);
    });

    const nextLink = $(".next a").attr("href");
    if (!nextLink || pageNum === 3) break;

    pageUrl = new URL(nextLink, pageUrl).href;
    pageNum++;
  }

  return { catalogue_pages: pageNum, discovered: bookUrls.size, unique_urls: [...bookUrls] };
}

async function main() {
  console.log("Scraper starting...");
  const result = await discoverCataloguePages();
  console.log(`catalogue_pages=${result.catalogue_pages} discovered=${result.discovered} unique_urls=${result.unique_urls.length}`);
}

main();